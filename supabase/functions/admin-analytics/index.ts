import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getSupabaseUrl, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json"
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    // Use service role credentials for admin operations
    const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
      auth: { persistSession: false }
    });

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.substring(7);

    // Verify user and check admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: corsHeaders
      });
    }

    // Check admin status - if users table fails, allow through with email check
    let isAdmin = false;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!userError && userData?.is_admin) {
      isAdmin = true;
    } else if (userError) {
      // If query fails, fall back to email check
      const adminEmails = ["admin@fantasydraftpros.com", "jlawrence@cmgfi.com"];
      isAdmin = adminEmails.includes((user.email || "").toLowerCase());
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: corsHeaders
      });
    }

    // Build 14-day date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch all analytics events for the period (limit to prevent timeout)
    const { data: allEvents, error: eventsError } = await supabase
      .from("analytics_events")
      .select("created_at, visitor_id, event_type, event_data")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(2000);

    if (eventsError) {
      console.error("Analytics events query error:", eventsError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch analytics events",
          code: eventsError.code,
          details: eventsError.message
        }),
        {
          status: 400,
          headers: corsHeaders
        }
      );
    }

    // Count all-time trades
    const { data: tradeEvents, error: tradeError } = await supabase
      .from("analytics_events")
      .select("id", { count: "exact" })
      .eq("event_type", "trade_analyzed");

    const totalTrades = tradeError ? 0 : (tradeEvents?.length || 0);

    // Get unique visitors from all events
    const visitorSet = new Set<string>();
    (allEvents || []).forEach((e: any) => {
      if (e.visitor_id) visitorSet.add(e.visitor_id);
    });

    // Separate events: daily page views, user events (with emails), recent activity
    const daily = (allEvents || []).filter((e: any) => e.event_type === "page_view");
    const userEvents = (allEvents || []).filter((e: any) =>
      e.event_data?.user_email && (e.event_type === "trade_analyzed" || e.event_type === "page_view")
    );
    const recent = (allEvents || []).slice(0, 100);

    // Build feature usage (event type distribution)
    const featureCounts: Record<string, number> = {};
    (allEvents || []).forEach((e: any) => {
      const eventType = e.event_type || "unknown";
      featureCounts[eventType] = (featureCounts[eventType] || 0) + 1;
    });
    const features = Object.entries(featureCounts)
      .map(([event_type, count]) => [event_type, count] as [string, number])
      .sort((a, b) => b[1] - a[1]);

    return new Response(
      JSON.stringify({
        daily: daily || [],
        dailyEvents: allEvents || [],
        userEvents: userEvents || [],
        recent: recent || [],
        features: features || [],
        totalVisitors: visitorSet.size,
        trades: totalTrades,
        success: true
      }),
      {
        headers: corsHeaders
      }
    );
  } catch (err) {
    console.error("Admin analytics error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(err)
      }),
      {
        status: 500,
        headers: corsHeaders
      }
    );
  }
});
