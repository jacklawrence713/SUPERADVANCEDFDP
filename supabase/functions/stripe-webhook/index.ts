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
        // Try metadata first (Checkout Sessions), fall back to email (Payment Links)
        let userId = session.metadata?.supabase_user_id;
        if (!userId) {
          const email = session.customer_details?.email || session.customer_email;
          if (email) {
            const { data: profile } = await supabase
              .from("users")
              .select("id")
              .eq("email", email)
              .single();
            userId = profile?.id;
          }
        }
        if (userId) {
          const { error: coreErr } = await supabase.from("users").update({
            plan,
            is_pro: true,
            trial_used: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: "active",
            updated_at: new Date().toISOString(),
          }).eq("id", userId);
          if (coreErr) console.error("checkout.session.completed update failed:", coreErr);
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        let userId = sub.metadata?.supabase_user_id;
        if (!userId) {
          const { data: profile } = await supabase.from("users").select("id").eq("stripe_customer_id", sub.customer as string).single();
          userId = profile?.id;
        }
        if (userId) {
          const isActive = sub.status === "active" || sub.status === "trialing";
          const { error: updErr } = await supabase.from("users").update({
            is_pro: isActive,
            subscription_status: sub.status,
            updated_at: new Date().toISOString(),
          }).eq("id", userId);
          if (updErr) console.error("subscription.updated failed:", updErr);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        let userId = sub.metadata?.supabase_user_id;
        if (!userId) {
          const { data: profile } = await supabase.from("users").select("id").eq("stripe_customer_id", sub.customer as string).single();
          userId = profile?.id;
        }
        if (userId) {
          const { error: delErr } = await supabase.from("users").update({
            plan: "free",
            is_pro: false,
            stripe_subscription_id: null,
            subscription_status: "cancelled",
            updated_at: new Date().toISOString(),
          }).eq("id", userId);
          if (delErr) console.error("subscription.deleted failed:", delErr);
        }
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
