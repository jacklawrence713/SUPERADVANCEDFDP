import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getSupabaseUrl, getSupabaseSecretKey } from "../_shared/supabase-keys.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey());

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const token = authHeader.substring(7);

    // Verify user and check admin status
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
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
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
    }

    // Build 14-day date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch all analytics events for the period
    const { data: allEvents, error: eventsError } = await supabase
      .from("analytics_events")
      .select("created_at, visitor_id, event_type, event_data")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.error("Analytics events query error:", eventsError);
      return new Response(JSON.stringify({ error: "Failed to fetch analytics events", details: eventsError.message }), { status: 400 });
    }

    // Count all-time trades
    const { data: allTimeEvents, error: allTimeError } = await supabase
      .from("analytics_events")
      .select("event_type", { count: "exact" })
      .eq("event_type", "trade_analyzed");

    const totalTrades = allTimeEvents?.length || 0;

    // Calculate unique visitors all-time
    const { data: allTimeVisitors, error: visitorError } = await supabase
      .from("analytics_events")
      .select("visitor_id", { count: "exact", head: true });

    const totalAllTimeVisitors = new Set(
      (allTimeVisitors || []).map((e: any) => e.visitor_id)
    ).size;

    // Separate events: daily page views, user events (with emails), recent activity
    const daily = (allEvents || []).filter((e: any) => e.event_type === "page_view");
    const userEvents = (allEvents || []).filter((e: any) =>
      e.event_data?.user_email && (e.event_type === "trade_analyzed" || e.event_type === "page_view")
    );
    const recent = (allEvents || []).slice(0, 100); // Last 100 events for anonymous visitor feed

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
        totalVisitors: totalAllTimeVisitors,
        trades: totalTrades,
        success: true
      }),
      {
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    console.error("Admin analytics error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500 }
    );
  }
});
