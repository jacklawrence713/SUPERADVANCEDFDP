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

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
    }

    // Fetch unique visitors data
    const { data: uniqueVisitors } = await supabase.rpc("get_unique_visitors", {
      p_start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: new Date().toISOString()
    });

    // Fetch top visitors
    const { data: topVisitors } = await supabase.rpc("get_top_visitors", { p_limit: 10 });

    // Fetch daily summary
    const { data: dailySummary } = await supabase.rpc("get_daily_visitor_summary", { p_days: 14 });

    // Fetch event breakdown
    const { data: eventBreakdown } = await supabase.rpc("get_event_type_breakdown", { p_days: 14 });

    // Fetch Week 6 historical odds
    const { data: week6Odds } = await supabase
      .from("odds_archive")
      .select("*")
      .eq("nfl_week", 6)
      .eq("nfl_season", 2026)
      .order("game_date", { ascending: true });

    // Fetch Week 7 historical odds
    const { data: week7Odds } = await supabase
      .from("odds_archive")
      .select("*")
      .eq("nfl_week", 7)
      .eq("nfl_season", 2026)
      .order("game_date", { ascending: true });

    // Fetch daily analytics events
    const { data: dailyEvents } = await supabase
      .from("analytics_events")
      .select("*")
      .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    return new Response(
      JSON.stringify({
        uniqueVisitors: uniqueVisitors || [],
        topVisitors: topVisitors || [],
        dailySummary: dailySummary?.[0] || null,
        eventBreakdown: eventBreakdown || [],
        week6Odds: week6Odds || [],
        week7Odds: week7Odds || [],
        dailyEvents: dailyEvents || [],
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
