// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout session for Pro/Elite upgrade
// Trial eligibility determined server-side; trial claim deferred to webhook
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { getSupabaseUrl, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const ALLOWED_ORIGINS = [
  "https://fantasydraftpros.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

const PRICE_IDS: Record<string, string> = {
  pro_monthly: Deno.env.get("STRIPE_PRICE_PRO_MONTHLY") || "",
  pro_yearly: Deno.env.get("STRIPE_PRICE_PRO_YEARLY") || "",
  elite_monthly: Deno.env.get("STRIPE_PRICE_ELITE_MONTHLY") || "",
  elite_yearly: Deno.env.get("STRIPE_PRICE_ELITE_YEARLY") || "",
};

// Resolve originating IP from trusted infrastructure headers.
// Supabase Edge Functions run behind a proxy that sets these.
// Falls back gracefully if no header is available.
function resolveClientIp(req: Request): string | null {
  // Supabase / Cloudflare set these headers server-side
  const candidates = [
    req.headers.get("cf-connecting-ip"),       // Cloudflare
    req.headers.get("x-real-ip"),              // Nginx / Supabase proxy
  ];
  // x-forwarded-for: take leftmost (original client) entry
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) candidates.push(first);
  }
  for (const ip of candidates) {
    if (ip && ip !== "127.0.0.1" && ip !== "::1") return ip;
  }
  return null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
      getSupabaseUrl(),
      getSupabaseSecretKey()
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan = "pro", billing = "monthly", visitor_id } = await req.json();
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

    // Resolve IP server-side from trusted infrastructure headers
    const serverIp = resolveClientIp(req);

    // Store IP + visitor_id on user row if not already set
    const updates: Record<string, unknown> = {};
    if (serverIp && !profile?.signup_ip) updates.signup_ip = serverIp;
    if (visitor_id && !profile?.signup_visitor_id) updates.signup_visitor_id = visitor_id;
    if (Object.keys(updates).length > 0) {
      await supabase.from("users").update(updates).eq("id", user.id);
    }

    // Determine if trial should be offered
    // Trial claim is deferred to webhook (checkout.session.completed)
    // This prevents burning trial if Stripe Checkout creation fails.
    // Only offer trial if NOT already used.
    const trialUsed = profile?.trial_used || false;
    const trialEligible = !trialUsed;

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
        ...(trialEligible ? { trial_period_days: 7 } : {}),
        metadata: { supabase_user_id: user.id, plan },
      },
      success_url: `${Deno.env.get("SITE_URL") || "https://fantasydraftpros.com"}/?checkout=success`,
      cancel_url: `${Deno.env.get("SITE_URL") || "https://fantasydraftpros.com"}/?checkout=cancelled`,
      metadata: { supabase_user_id: user.id, plan },
    });

    return new Response(JSON.stringify({ url: session.url, trial_eligible: trialEligible }), {
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
