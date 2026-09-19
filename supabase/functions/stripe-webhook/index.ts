// Supabase Edge Function: stripe-webhook
// Handles Stripe payment events and updates user plan in Supabase
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Resolve user by Supabase user ID stored in Stripe metadata.
// Falls back to stripe_customer_id lookup (reliable — set during checkout).
// Does NOT fall back to email matching (ambiguous, could match wrong account).
async function resolveUserId(
  metadataUserId: string | undefined,
  stripeCustomerId: string | null,
  eventType: string,
): Promise<string | null> {
  // 1. Metadata is authoritative
  if (metadataUserId) return metadataUserId;

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

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature")?.trim();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")?.trim();

  if (!signature || !webhookSecret) {
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.CheckoutSession;
        const plan = session.metadata?.plan || "pro";
        const userId = await resolveUserId(
          session.metadata?.supabase_user_id,
          session.customer as string | null,
          event.type,
        );
        if (!userId) {
          // Log and return 200 so Stripe doesn't retry — needs manual reconciliation
          console.error("checkout.session.completed: unresolved user, skipping update", {
            eventId: event.id,
            sessionId: session.id,
            customerId: session.customer,
          });
          break;
        }
        const subId = session.subscription as string;
        const custId = session.customer as string;
        // Idempotency: only update if subscription_status is not already 'active'
        // for this specific subscription, or if this is a different subscription
        const { data: current } = await supabase
          .from("users")
          .select("stripe_subscription_id, subscription_status")
          .eq("id", userId)
          .single();
        if (current?.stripe_subscription_id === subId && current?.subscription_status === "active") {
          // Already processed — idempotent skip
          break;
        }
        const { error: coreErr } = await supabase.from("users").update({
          plan,
          is_pro: true,
          trial_used: true,
          stripe_customer_id: custId,
          stripe_subscription_id: subId,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
        if (coreErr) console.error("checkout.session.completed update failed:", coreErr);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(
          sub.metadata?.supabase_user_id,
          sub.customer as string | null,
          event.type,
        );
        if (!userId) break;
        const isActive = sub.status === "active" || sub.status === "trialing";
        // Detect plan from subscription metadata if available
        const plan = sub.metadata?.plan;
        const updatePayload: Record<string, unknown> = {
          is_pro: isActive,
          subscription_status: sub.status,
          updated_at: new Date().toISOString(),
        };
        if (plan) updatePayload.plan = plan;
        if (!isActive) {
          updatePayload.plan = "free";
          updatePayload.is_pro = false;
        }
        const { error: updErr } = await supabase.from("users").update(updatePayload).eq("id", userId);
        if (updErr) console.error("subscription.updated failed:", updErr);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(
          sub.metadata?.supabase_user_id,
          sub.customer as string | null,
          event.type,
        );
        if (!userId) break;
        // Idempotency: only downgrade if currently tied to this subscription
        const { data: current } = await supabase
          .from("users")
          .select("stripe_subscription_id")
          .eq("id", userId)
          .single();
        if (current?.stripe_subscription_id && current.stripe_subscription_id !== sub.id) {
          // User has a different active subscription — don't downgrade
          console.log("subscription.deleted: user has different active sub, skipping", {
            userId,
            deletedSubId: sub.id,
            currentSubId: current.stripe_subscription_id,
          });
          break;
        }
        const { error: delErr } = await supabase.from("users").update({
          plan: "free",
          is_pro: false,
          stripe_subscription_id: null,
          subscription_status: "cancelled",
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
        if (delErr) console.error("subscription.deleted failed:", delErr);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (profile) {
          await supabase.from("users").update({
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          }).eq("id", profile.id);
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
