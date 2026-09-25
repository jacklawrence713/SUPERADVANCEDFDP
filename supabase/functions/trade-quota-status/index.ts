// Supabase Edge Function: trade-quota-status
// Returns server-authoritative Trade Analyzer quota for authenticated user
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ================================================================
    // AUTHENTICATION
    // ================================================================

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "missing_auth" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", code: "invalid_token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ================================================================
    // FETCH QUOTA STATUS
    // ================================================================

    const { data: quotaData, error: quotaError } = await supabase.rpc(
      "get_trade_quota_status",
      { p_user_id: user.id }
    );

    if (quotaError) {
      console.error("[trade-quota-status] get_trade_quota_status error:", quotaError);
      return new Response(
        JSON.stringify({ error: "Quota lookup failed", code: "quota_error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!quotaData || quotaData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Quota not found", code: "quota_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quotaStatus = quotaData[0];

    return new Response(
      JSON.stringify({
        quota: {
          limit_per_day: quotaStatus.limit_per_day,
          used_count: quotaStatus.used_count,
          reserved_count: quotaStatus.reserved_count,
          remaining_count: quotaStatus.remaining_count,
          quota_date: quotaStatus.quota_date,
          is_unlimited: quotaStatus.is_unlimited,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[trade-quota-status] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Status lookup failed", code: "internal_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
