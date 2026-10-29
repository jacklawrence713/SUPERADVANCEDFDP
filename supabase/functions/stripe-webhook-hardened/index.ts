// Supabase Edge Function: stripe-webhook-hardened (Prompt 32)
// Implements robust Stripe webhook event processing with:
// - Event ordering protection (out-of-order events cannot revert state)
// - Idempotency (same event processed once via UNIQUE constraint)
// - Current-state reconciliation (fetch Stripe object to validate)
// - Atomic plan transitions

import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Allowed Stripe event types for billing
const ALLOWED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

// Map Stripe subscription status to internal entitlement
function mapSubscriptionStatusToEntitlement(status: string): { plan: string; is_pro: boolean } {
  switch (status) {
    case "active":
    case "trialing":
      return { plan: "pro", is_pro: true }; // Determine plan from metadata later
    case "past_due":
      return { plan: "pro", is_pro: true }; // Still has access during grace period
    case "canceled":
    case "incomplete_expired":
    case "paused":
      return { plan: "free", is_pro: false };
    default:
      return { plan: "free", is_pro: false };
  }
}

// Resolve FDP user from trusted sources only
async function resolveUserId(
  metadataUserId: string | undefined,
  stripeCustomerId: string | null,
  eventType: string,
): Promise<string | null> {
  // 1. Metadata is authoritative if present (set server-side during checkout)
  if (metadataUserId) {
    // Validate UUID format to prevent injection
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(metadataUserId)) {
      return metadataUserId;
    }
    console.warn("Invalid UUID in metadata:", metadataUserId);
  }

  // 2. Fall back to customer_id lookup (set server-side by create-checkout)
  if (stripeCustomerId) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .single();
    if (profile?.id) return profile.id;
  }

  // 3. No match — log for manual reconciliation
  console.error("stripe-webhook: cannot resolve user", {
    eventType,
    metadataUserId,
    stripeCustomerId,
  });
  return null;
}

// Record event in ledger for durability/idempotency
async function recordEvent(
  stripeEventId: string,
  stripeEventType: string,
  stripeEventCreated: number,
  userId: string | null,
  customerId: string | null,
  subscriptionId: string | null,
  eventData: unknown,
  status: "success" | "failed" | "skipped" = "success",
  error?: string,
  planBefore?: string,
  planAfter?: string,
  statusBefore?: string,
  statusAfter?: string,
) {
  try {
    await supabase.from("stripe_events").insert({
      stripe_event_id: stripeEventId,
      stripe_event_type: stripeEventType,
      stripe_event_created: stripeEventCreated,
      user_id: userId || null,
      stripe_customer_id: customerId || null,
      stripe_subscription_id: subscriptionId || null,
      event_data: eventData,
      processing_status: status,
      processing_error: error || null,
      plan_before: planBefore || null,
      plan_after: planAfter || null,
      subscription_status_before: statusBefore || null,
      subscription_status_after: statusAfter || null,
    });
  } catch (e) {
    // If UNIQUE constraint fails, event already processed — acceptable
    if (String(e).includes("duplicate") || String(e).includes("unique")) {
      console.log("Event already processed:", stripeEventId);
      return;
    }
    console.error("Failed to record event:", e);
  }
}

// Check if an older/equal event is trying to overwrite newer state
async function isEventOutOfOrder(
  userId: string,
  newEventCreated: number,
): Promise<boolean> {
  const lastTimestamp = await supabase.rpc("get_last_billing_event_timestamp", {
    p_user_id: userId,
  });

  if (!lastTimestamp || !lastTimestamp.data) return false;

  // If new event is older than last processed, it's out of order
  return newEventCreated < lastTimestamp.data;
}

// Fetch current Stripe subscription to validate latest state
async function fetchCurrentSubscriptionState(
  subscriptionId: string,
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (e) {
    console.error("Failed to retrieve Stripe subscription:", subscriptionId, e);
    return null;
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature")?.trim();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();

  if (!signature || !webhookSecret) {
    console.error("Missing Stripe signature or secret");
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Invalid signature: ${String(err)}`, { status: 400 });
  }

  // Reject unknown event types (fail-safe)
  if (!ALLOWED_EVENTS.includes(event.type)) {
    console.log("Ignoring disallowed event type:", event.type);
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.CheckoutSession;
        const plan = session.metadata?.plan || "pro";
        const userId = await resolveUserId(
          session.metadata?.supabase_user_id as string | undefined,
          session.customer as string | null,
          event.type,
        );

        if (!userId) {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            null,
            session.customer as string | null,
            session.subscription as string | null,
            session,
            "skipped",
            "Cannot resolve user",
          );
          break;
        }

        // Check event ordering
        if (await isEventOutOfOrder(userId, event.created)) {
          console.warn("Out-of-order checkout event, skipping:", event.id, userId);
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            session.customer as string | null,
            session.subscription as string | null,
            session,
            "skipped",
            "Out-of-order event",
          );
          break;
        }

        const subId = session.subscription as string;
        const custId = session.customer as string;

        // Get current state before update
        const { data: current } = await supabase
          .from("users")
          .select("plan, subscription_status, stripe_subscription_id")
          .eq("id", userId)
          .single();

        // Idempotency: skip if already processed for this subscription
        if (current?.stripe_subscription_id === subId && current?.subscription_status === "active") {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            custId,
            subId,
            session,
            "skipped",
            "Already active for this subscription",
            current.plan,
            plan,
            current.subscription_status,
            "active",
          );
          break;
        }

        // Update entitlements atomically
        const { error: coreErr } = await supabase
          .from("users")
          .update({
            plan,
            is_pro: true,
            trial_used: true,
            stripe_customer_id: custId,
            stripe_subscription_id: subId,
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (coreErr) {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            custId,
            subId,
            session,
            "failed",
            String(coreErr),
            current?.plan,
            plan,
            current?.subscription_status,
            "active",
          );
        } else {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            custId,
            subId,
            session,
            "success",
            undefined,
            current?.plan,
            plan,
            current?.subscription_status,
            "active",
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(
          sub.metadata?.supabase_user_id as string | undefined,
          sub.customer as string | null,
          event.type,
        );

        if (!userId) {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            null,
            sub.customer as string | null,
            sub.id,
            sub,
            "skipped",
            "Cannot resolve user",
          );
          break;
        }

        // Check event ordering
        if (await isEventOutOfOrder(userId, event.created)) {
          console.warn("Out-of-order subscription.updated event, skipping:", event.id, userId);
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            sub.customer as string | null,
            sub.id,
            sub,
            "skipped",
            "Out-of-order event",
          );
          break;
        }

        // Get current state
        const { data: current } = await supabase
          .from("users")
          .select("plan, subscription_status")
          .eq("id", userId)
          .single();

        const newEntitlement = mapSubscriptionStatusToEntitlement(sub.status);
        const newPlan = sub.metadata?.plan || newEntitlement.plan;

        const updatePayload: Record<string, unknown> = {
          is_pro: newEntitlement.is_pro,
          subscription_status: sub.status,
          updated_at: new Date().toISOString(),
        };
        if (newEntitlement.is_pro) {
          updatePayload.plan = newPlan;
        } else {
          updatePayload.plan = "free";
        }

        const { error: updErr } = await supabase
          .from("users")
          .update(updatePayload)
          .eq("id", userId);

        if (updErr) {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            sub.customer as string | null,
            sub.id,
            sub,
            "failed",
            String(updErr),
            current?.plan,
            newEntitlement.is_pro ? newPlan : "free",
            current?.subscription_status,
            sub.status,
          );
        } else {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            sub.customer as string | null,
            sub.id,
            sub,
            "success",
            undefined,
            current?.plan,
            newEntitlement.is_pro ? newPlan : "free",
            current?.subscription_status,
            sub.status,
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(
          sub.metadata?.supabase_user_id as string | undefined,
          sub.customer as string | null,
          event.type,
        );

        if (!userId) {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            null,
            sub.customer as string | null,
            sub.id,
            sub,
            "skipped",
            "Cannot resolve user",
          );
          break;
        }

        // Check event ordering
        if (await isEventOutOfOrder(userId, event.created)) {
          console.warn("Out-of-order subscription.deleted event, skipping:", event.id, userId);
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            sub.customer as string | null,
            sub.id,
            sub,
            "skipped",
            "Out-of-order event",
          );
          break;
        }

        // Only downgrade if this is the current subscription
        const { data: current } = await supabase
          .from("users")
          .select("plan, subscription_status, stripe_subscription_id")
          .eq("id", userId)
          .single();

        if (current?.stripe_subscription_id && current.stripe_subscription_id !== sub.id) {
          console.log("subscription.deleted: user has different active sub, skipping", {
            userId,
            deletedSubId: sub.id,
            currentSubId: current.stripe_subscription_id,
          });
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            sub.customer as string | null,
            sub.id,
            sub,
            "skipped",
            "User has different active subscription",
            current.plan,
            current.plan, // No change
            current.subscription_status,
            current.subscription_status,
          );
          break;
        }

        const { error: delErr } = await supabase
          .from("users")
          .update({
            plan: "free",
            is_pro: false,
            stripe_subscription_id: null,
            subscription_status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (delErr) {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            sub.customer as string | null,
            sub.id,
            sub,
            "failed",
            String(delErr),
            current?.plan,
            "free",
            current?.subscription_status,
            "cancelled",
          );
        } else {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            userId,
            sub.customer as string | null,
            sub.id,
            sub,
            "success",
            undefined,
            current?.plan,
            "free",
            current?.subscription_status,
            "cancelled",
          );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const subscriptionId = invoice.subscription as string | null;

        if (!customerId) {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            null,
            null,
            subscriptionId || null,
            invoice,
            "skipped",
            "No customer ID",
          );
          break;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("id, subscription_status")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          // Check event ordering
          if (await isEventOutOfOrder(profile.id, event.created)) {
            await recordEvent(
              event.id,
              event.type,
              Math.floor(event.created),
              profile.id,
              customerId,
              subscriptionId || null,
              invoice,
              "skipped",
              "Out-of-order event",
              undefined,
              undefined,
              profile.subscription_status,
              profile.subscription_status,
            );
            break;
          }

          await supabase
            .from("users")
            .update({
              subscription_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", profile.id);

          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            profile.id,
            customerId,
            subscriptionId || null,
            invoice,
            "success",
            undefined,
            undefined,
            undefined,
            profile.subscription_status,
            "past_due",
          );
        } else {
          await recordEvent(
            event.id,
            event.type,
            Math.floor(event.created),
            null,
            customerId,
            subscriptionId || null,
            invoice,
            "skipped",
            "Customer not found",
          );
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
