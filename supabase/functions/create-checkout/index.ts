// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout session for Pro/Elite upgrade
// Includes duplicate account detection to prevent trial abuse
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_IDS: Record<string, string> = {
  pro_monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") || "",
  pro_yearly: Deno.env.get("STRIPE_PRICE_PRO_YEARLY") || "",
  elite_monthly: Deno.env.get("STRIPE_PRICE_ELITE_MONTHLY") || "",
  elite_yearly: Deno.env.get("STRIPE_PRICE_ELITE_YEARLY") || "",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan = "pro", billing = "monthly", signup_ip, visitor_id } = await req.json();
    const priceKey = `${plan}_${billing}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Invalid plan/billing combination" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, name, trial_used, signup_ip, signup_visitor_id")
      .eq("id", user.id)
      .single();

    // Store IP + visitor_id on user row if not already set
    const updates: Record<string, unknown> = {};
    if (signup_ip && !profile?.signup_ip) updates.signup_ip = signup_ip;
    if (visitor_id && !profile?.signup_visitor_id) updates.signup_visitor_id = visitor_id;
    if (Object.keys(updates).length > 0) {
      await supabase.from("users").update(updates).eq("id", user.id);
    }

    // Determine if trial should be granted
    let trialUsed = profile?.trial_used || false;

    // Check for duplicate accounts by IP or visitor_id (skip if already trial_used)
    if (!trialUsed) {
      const ip = signup_ip || profile?.signup_ip;
      const vid = visitor_id || profile?.signup_visitor_id;

      if (ip || vid) {
        // Build OR conditions for duplicate check
        let query = supabase
          .from("users")
          .select("id")
          .eq("trial_used", true)
          .neq("id", user.id)
          .limit(1);

        if (ip && vid) {
          query = query.or(`signup_ip.eq.${ip},signup_visitor_id.eq.${vid}`);
        } else if (ip) {
          query = query.eq("signup_ip", ip);
        } else {
          query = query.eq("signup_visitor_id", vid);
        }

        const { data: dupes } = await query;
        if (dupes && dupes.length > 0) {
          trialUsed = true;
          // Mark this user as trial_used so future checks are fast
          await supabase.from("users").update({ trial_used: true }).eq("id", user.id);
          console.log(`Duplicate trial blocked for user ${user.id} (IP: ${ip}, VID: ${vid})`);
        }
      }
    }

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: profile?.name || user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        ...(trialUsed ? {} : { trial_period_days: 7 }),
        metadata: { supabase_user_id: user.id, plan },
      },
      success_url: `${Deno.env.get("SITE_URL") || "https://fantasydraftpros.com"}/?checkout=success`,
      cancel_url: `${Deno.env.get("SITE_URL") || "https://fantasydraftpros.com"}/?checkout=cancelled`,
      metadata: { supabase_user_id: user.id, plan },
    });

    return new Response(JSON.stringify({ url: session.url, trial_blocked: trialUsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
