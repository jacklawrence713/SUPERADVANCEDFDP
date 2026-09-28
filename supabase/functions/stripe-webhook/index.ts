// Supabase Edge Function: stripe-webhook
// HARDENED: Generation-guarded reconciliation prevents stale-fetch-late-write races
// Trial claiming deferred to webhook to prevent burning trial on Stripe failures
// Processes Stripe webhook events with:
// - Signature verification (Stripe SDK)
// - User resolution (metadata → customer_id lookup)
// - Generation allocation (begin_billing_reconciliation)
// - Current Stripe state reconciliation
// - Trial claiming (only if subscription confirmed trialing)
// - Generation-guarded finalization (prevent stale writes)
// - Event idempotency via UNIQUE(stripe_event_id)

import Stripe from "npm:stripe@14.21.0";
import { getSupabaseUrl, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey()
);

// Allowed event types for billing
const ALLOWED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
];

// Map Stripe subscription status to entitlement
function mapSubscriptionStatusToEntitlement(status: string): { plan: string; is_pro: boolean } {
  switch (status) {
    case "active":
    case "trialing":
      return { plan: "pro", is_pro: true };
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

// Resolve user by Supabase user ID stored in Stripe metadata.
// Falls back to stripe_customer_id lookup (reliable — set during checkout).
// Does NOT fall back to email matching (ambiguous, could match wrong account).
async function resolveUserId(
  metadataUserId: string | undefined,
  stripeCustomerId: string | null,
  eventType: string,
): Promise<string | null> {
  // 1. Metadata is authoritative (set server-side during checkout)
  if (metadataUserId) {
    // Validate UUID format to prevent injection
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(metadataUserId)) {
      return metadataUserId;
    }
    console.warn("Invalid UUID in metadata:", metadataUserId);
  }

  // 2. Fall back to customer_id lookup (set by create-checkout)
  if (stripeCustomerId) {
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .single();
    if (profile?.id) return profile.id;
  }

  // 3. No match — log for reconciliation, do NOT guess
  console.error("stripe-webhook: cannot resolve user", {
    eventType,
    metadataUserId,
    stripeCustomerId,
  });
  return null;
}

// Fetch current Stripe subscription state (CRITICAL for reconciliation)
// Events are triggers; current Stripe state is the authority
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
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan || "pro";
        const userId = await resolveUserId(
          session.metadata?.supabase_user_id as string | undefined,
          session.customer as string | null,
          event.type,
        );

        if (!userId) {
          // Record unresolvable event
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: null,
            p_stripe_customer_id: session.customer as string | null,
            p_stripe_subscription_id: session.subscription as string | null,
            p_event_data: session,
            p_processing_state: "skipped",
            p_processing_error: "Cannot resolve user",
          });
          break;
        }

        const subId = session.subscription as string;
        const custId = session.customer as string;

        // Allocate reconciliation generation for this subscription
        const { data: genResult, error: genError } = await supabase.rpc(
          "begin_billing_reconciliation",
          {
            p_stripe_subscription_id: subId,
            p_stripe_customer_id: custId,
          }
        );

        if (genError || !genResult) {
          console.error("Failed to allocate generation:", genError);
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: userId,
            p_stripe_customer_id: custId,
            p_stripe_subscription_id: subId,
            p_event_data: session,
            p_processing_state: "failed",
            p_processing_error: "Failed to allocate generation",
          });
          break;
        }

        const generation = genResult as number;

        // Fetch CURRENT subscription state from Stripe (NOT event snapshot)
        const currentSub = await fetchCurrentSubscriptionState(subId);

        if (!currentSub) {
          console.warn("checkout.session.completed: subscription not found in Stripe:", subId);
          await supabase.rpc("finalize_reconciliation", {
            p_stripe_event_id: event.id,
            p_stripe_subscription_id: subId,
            p_stripe_customer_id: custId,
            p_submitted_generation: generation,
            p_user_id: userId,
            p_plan: null,
            p_is_pro: null,
            p_subscription_status: null,
          });
          break;
        }

        // Get current user state for audit
        const { data: current } = await supabase
          .from("users")
          .select("plan, subscription_status")
          .eq("id", userId)
          .single();

        const subscription_status = currentSub.status;

        // If subscription is trialing, atomically claim trial for user
        // This prevents concurrent handlers from both claiming trial
        // Must happen AFTER confirming subscription exists and is actually trialing
        if (subscription_status === "trialing") {
          const { data: trialClaimed, error: trialError } = await supabase.rpc(
            "claim_trial_for_user",
            { p_user_id: userId }
          );
          if (trialError) {
            console.warn(`Failed to claim trial for user ${userId}:`, trialError);
            // Continue anyway - trial claim is advisory; user still got the subscription
          } else if (!trialClaimed) {
            console.log(`Trial already claimed for user ${userId}; another handler won race`);
          }
        }

        // Finalize reconciliation with generation guard
        // This prevents stale Stripe state from overwriting newer state
        await supabase.rpc("finalize_reconciliation", {
          p_stripe_event_id: event.id,
          p_stripe_subscription_id: subId,
          p_stripe_customer_id: custId,
          p_submitted_generation: generation,
          p_user_id: userId,
          p_plan: plan,
          p_is_pro: true,
          p_subscription_status: subscription_status,
          p_plan_before: current?.plan,
          p_plan_after: plan,
          p_subscription_status_before: current?.subscription_status,
          p_subscription_status_after: subscription_status,
        });

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
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: null,
            p_stripe_customer_id: sub.customer as string | null,
            p_stripe_subscription_id: sub.id,
            p_event_data: sub,
            p_processing_state: "skipped",
            p_processing_error: "Cannot resolve user",
          });
          break;
        }

        // Allocate generation for this subscription
        const { data: genResult, error: genError } = await supabase.rpc(
          "begin_billing_reconciliation",
          {
            p_stripe_subscription_id: sub.id,
            p_stripe_customer_id: sub.customer as string | null,
          }
        );

        if (genError || !genResult) {
          console.error("Failed to allocate generation:", genError);
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: userId,
            p_stripe_customer_id: sub.customer as string | null,
            p_stripe_subscription_id: sub.id,
            p_event_data: sub,
            p_processing_state: "failed",
            p_processing_error: "Failed to allocate generation",
          });
          break;
        }

        const generation = genResult as number;

        // Fetch CURRENT subscription state from Stripe (NOT event snapshot)
        const currentSub = await fetchCurrentSubscriptionState(sub.id);

        // Get current user state for audit
        const { data: current } = await supabase
          .from("users")
          .select("plan, subscription_status")
          .eq("id", userId)
          .single();

        if (!currentSub) {
          // Subscription no longer exists in Stripe (likely deleted)
          await supabase.rpc("finalize_reconciliation", {
            p_stripe_event_id: event.id,
            p_stripe_subscription_id: sub.id,
            p_stripe_customer_id: sub.customer as string | null,
            p_submitted_generation: generation,
            p_user_id: userId,
            p_plan: "free",
            p_is_pro: false,
            p_subscription_status: "cancelled",
            p_plan_before: current?.plan,
            p_plan_after: "free",
            p_subscription_status_before: current?.subscription_status,
            p_subscription_status_after: "cancelled",
          });
          break;
        }

        // Derive entitlement from CURRENT Stripe subscription state
        const entitlement = mapSubscriptionStatusToEntitlement(currentSub.status);
        const newPlan = currentSub.metadata?.plan || entitlement.plan;

        // Finalize with generation guard
        await supabase.rpc("finalize_reconciliation", {
          p_stripe_event_id: event.id,
          p_stripe_subscription_id: sub.id,
          p_stripe_customer_id: sub.customer as string | null,
          p_submitted_generation: generation,
          p_user_id: userId,
          p_plan: entitlement.is_pro ? newPlan : "free",
          p_is_pro: entitlement.is_pro,
          p_subscription_status: currentSub.status,
          p_plan_before: current?.plan,
          p_plan_after: entitlement.is_pro ? newPlan : "free",
          p_subscription_status_before: current?.subscription_status,
          p_subscription_status_after: currentSub.status,
        });

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
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: null,
            p_stripe_customer_id: sub.customer as string | null,
            p_stripe_subscription_id: sub.id,
            p_event_data: sub,
            p_processing_state: "skipped",
            p_processing_error: "Cannot resolve user",
          });
          break;
        }

        // Allocate generation for this subscription
        const { data: genResult, error: genError } = await supabase.rpc(
          "begin_billing_reconciliation",
          {
            p_stripe_subscription_id: sub.id,
            p_stripe_customer_id: sub.customer as string | null,
          }
        );

        if (genError || !genResult) {
          console.error("Failed to allocate generation:", genError);
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: userId,
            p_stripe_customer_id: sub.customer as string | null,
            p_stripe_subscription_id: sub.id,
            p_event_data: sub,
            p_processing_state: "failed",
            p_processing_error: "Failed to allocate generation",
          });
          break;
        }

        const generation = genResult as number;

        // Fetch CURRENT subscription state to confirm deletion
        const currentSub = await fetchCurrentSubscriptionState(sub.id);

        const { data: current } = await supabase
          .from("users")
          .select("plan, subscription_status, stripe_subscription_id")
          .eq("id", userId)
          .single();

        // Check if user has a different active subscription
        if (current?.stripe_subscription_id && current.stripe_subscription_id !== sub.id) {
          console.log("subscription.deleted: user has different active sub, skipping", {
            userId,
            deletedSubId: sub.id,
            currentSubId: current.stripe_subscription_id,
          });
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: userId,
            p_stripe_customer_id: sub.customer as string | null,
            p_stripe_subscription_id: sub.id,
            p_event_data: sub,
            p_processing_state: "skipped",
            p_processing_error: "User has different active subscription",
          });
          break;
        }

        // If subscription still exists in Stripe, it was likely reactivated
        // Reconcile to current state instead of blindly downgrading
        if (currentSub) {
          const entitlement = mapSubscriptionStatusToEntitlement(currentSub.status);
          const plan = currentSub.metadata?.plan || entitlement.plan;

          await supabase.rpc("finalize_reconciliation", {
            p_stripe_event_id: event.id,
            p_stripe_subscription_id: sub.id,
            p_stripe_customer_id: sub.customer as string | null,
            p_submitted_generation: generation,
            p_user_id: userId,
            p_plan: entitlement.is_pro ? plan : "free",
            p_is_pro: entitlement.is_pro,
            p_subscription_status: currentSub.status,
            p_plan_before: current?.plan,
            p_plan_after: entitlement.is_pro ? plan : "free",
            p_subscription_status_before: current?.subscription_status,
            p_subscription_status_after: currentSub.status,
          });
          break;
        }

        // Subscription confirmed deleted in Stripe
        await supabase.rpc("finalize_reconciliation", {
          p_stripe_event_id: event.id,
          p_stripe_subscription_id: sub.id,
          p_stripe_customer_id: sub.customer as string | null,
          p_submitted_generation: generation,
          p_user_id: userId,
          p_plan: "free",
          p_is_pro: false,
          p_subscription_status: "cancelled",
          p_plan_before: current?.plan,
          p_plan_after: "free",
          p_subscription_status_before: current?.subscription_status,
          p_subscription_status_after: "cancelled",
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string | null;
        const subscriptionId = invoice.subscription as string | null;

        if (!customerId) {
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: null,
            p_stripe_customer_id: null,
            p_stripe_subscription_id: subscriptionId || null,
            p_event_data: invoice,
            p_processing_state: "skipped",
            p_processing_error: "No customer ID",
          });
          break;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("id, subscription_status")
          .eq("stripe_customer_id", customerId)
          .single();

        if (!profile) {
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: null,
            p_stripe_customer_id: customerId,
            p_stripe_subscription_id: subscriptionId || null,
            p_event_data: invoice,
            p_processing_state: "skipped",
            p_processing_error: "Customer not found in FDP",
          });
          break;
        }

        // Allocate generation (customer-scoped for payment failures)
        const { data: genResult, error: genError } = await supabase.rpc(
          "begin_billing_reconciliation",
          {
            p_stripe_subscription_id: subscriptionId,
            p_stripe_customer_id: customerId,
          }
        );

        if (genError || !genResult) {
          console.error("Failed to allocate generation:", genError);
          await supabase.rpc("upsert_stripe_event", {
            p_stripe_event_id: event.id,
            p_stripe_event_type: event.type,
            p_stripe_event_created: Math.floor(event.created),
            p_user_id: profile.id,
            p_stripe_customer_id: customerId,
            p_stripe_subscription_id: subscriptionId || null,
            p_event_data: invoice,
            p_processing_state: "failed",
            p_processing_error: "Failed to allocate generation",
          });
          break;
        }

        const generation = genResult as number;

        // If subscription ID provided, fetch current state to verify it's still past_due
        if (subscriptionId) {
          const currentSub = await fetchCurrentSubscriptionState(subscriptionId);
          if (currentSub && currentSub.status !== "past_due") {
            // Payment succeeded or status changed; don't downgrade
            await supabase.rpc("upsert_stripe_event", {
              p_stripe_event_id: event.id,
              p_stripe_event_type: event.type,
              p_stripe_event_created: Math.floor(event.created),
              p_user_id: profile.id,
              p_stripe_customer_id: customerId,
              p_stripe_subscription_id: subscriptionId,
              p_event_data: invoice,
              p_processing_state: "skipped",
              p_processing_error: `Subscription status is ${currentSub.status}, not past_due`,
            });
            break;
          }
        }

        // Mark subscription as past_due (still has access during grace period)
        await supabase.rpc("finalize_reconciliation", {
          p_stripe_event_id: event.id,
          p_stripe_subscription_id: subscriptionId,
          p_stripe_customer_id: customerId,
          p_submitted_generation: generation,
          p_user_id: profile.id,
          p_plan: null,
          p_is_pro: null,
          p_subscription_status: "past_due",
          p_subscription_status_before: profile.subscription_status,
          p_subscription_status_after: "past_due",
        });

        break;
      }
    }

    // Always return 200 to prevent Stripe retries
    // Errors are logged and recorded in event ledger
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    // Return 200 so Stripe doesn't retry on application errors
    return new Response(JSON.stringify({ error: String(err), received: false }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
