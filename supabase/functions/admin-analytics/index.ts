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

    // Fetch daily analytics events for unique visitor calculation
    const { data: dailyEvents, error: eventsError } = await supabase
      .from("analytics_events")
      .select("created_at, visitor_id, event_type, event_data")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    // Build unique visitors by day
    const uniqueVisitorsByDay: Record<string, Set<string>> = {};
    const dailyEventCounts: Record<string, number> = {};

    if (dailyEvents) {
      dailyEvents.forEach((event: any) => {
        const day = event.created_at.slice(0, 10);
        if (!uniqueVisitorsByDay[day]) uniqueVisitorsByDay[day] = new Set();
        if (!dailyEventCounts[day]) dailyEventCounts[day] = 0;
        uniqueVisitorsByDay[day].add(event.visitor_id);
        dailyEventCounts[day]++;
      });
    }

    const uniqueVisitors = Object.entries(uniqueVisitorsByDay).map(([day, visitors]) => ({
      visitor_date: day,
      unique_count: visitors.size,
      total_events: dailyEventCounts[day]
    })).sort((a, b) => b.visitor_date.localeCompare(a.visitor_date));

    // Fetch Week 6 odds
    const { data: week6Odds } = await supabase
      .from("odds_archive")
      .select("*")
      .eq("nfl_week", 6)
      .eq("nfl_season", 2026)
      .order("game_date", { ascending: true });

    // Fetch Week 7 odds
    const { data: week7Odds } = await supabase
      .from("odds_archive")
      .select("*")
      .eq("nfl_week", 7)
      .eq("nfl_season", 2026)
      .order("game_date", { ascending: true });

    return new Response(
      JSON.stringify({
        uniqueVisitors: uniqueVisitors || [],
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
