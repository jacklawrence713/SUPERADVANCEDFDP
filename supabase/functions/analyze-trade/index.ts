// Supabase Edge Function: analyze-trade (CORRECTED)
// Implements Prompt 28: Server-authoritative quota enforcement + AI trade analysis
// FIXES: Atomic admission, stale-worker protection, result storage, request fingerprint binding
import Anthropic from "npm:@anthropic-ai/sdk@0.29.2";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { createHash } from "node:crypto";
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

/**
 * Generate request fingerprint from canonical trade payload + all result-affecting context
 * Binds request_id to its original analysis payload AND contextual factors
 * Prevents: request_id X for Trade A, then request_id X for Trade B
 * Prevents: request_id X with context Y, then request_id X with context Z
 */
function generateRequestFingerprint(payload: {
  sideA: any[];
  sideB: any[];
  tvA: number;
  tvB: number;
  scoring?: string;
  posImpact?: any[];
  ageContext?: any;
  draftCapital?: any;
  rosterFit?: any;
  warnings?: string[];
  formatNotes?: string[];
}): string {
  const canonical = JSON.stringify({
    sideA: payload.sideA.map(p => ({ name: p.name, pos: p.pos, val: p.val })),
    sideB: payload.sideB.map(p => ({ name: p.name, pos: p.pos, val: p.val })),
    tvA: payload.tvA,
    tvB: payload.tvB,
    scoring: payload.scoring || "PPR Dynasty",
    posImpact: payload.posImpact
      ? payload.posImpact.map(p => ({ pos: p.pos, net: p.net })).sort((a, b) => a.pos.localeCompare(b.pos))
      : null,
    ageContext: payload.ageContext
      ? { avgA: payload.ageContext.avgA ?? null, avgB: payload.ageContext.avgB ?? null }
      : null,
    draftCapital: payload.draftCapital
      ? { valSent: payload.draftCapital.valSent, valReceived: payload.draftCapital.valReceived, net: payload.draftCapital.net }
      : null,
    rosterFit: payload.rosterFit
      ? { team: payload.rosterFit.team, valDelta: payload.rosterFit.valDelta, lineupDelta: payload.rosterFit.lineupDelta ?? null }
      : null,
    warnings: payload.warnings ? [...payload.warnings].sort() : null,
    formatNotes: payload.formatNotes ? [...payload.formatNotes].sort() : null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Generate fallback analysis if Claude fails
 */
function generateFallbackAnalysis(sideA: any[], sideB: any[], tvA: number, tvB: number): string {
  const diff = tvA - tvB;
  const maxVal = Math.max(tvA, tvB);
  const pct = maxVal > 0 ? Math.abs(diff / maxVal) * 100 : 0;
  const winner = pct < 8 ? "fair trade" : diff > 0 ? "Team B wins" : "Team A wins";

  const sideANames = sideA.map(p => p.name).join(", ");
  const sideBNames = sideB.map(p => p.name).join(", ");

  return `Based on Dynasty values (Team A: ${tvA}, Team B: ${tvB}), this is a ${winner} at ${pct.toFixed(1)}% differential. Team A sends ${sideANames} while Team B sends ${sideBNames}.`;
}

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let quotaStatus = { unlimited: false, limit_per_day: 2, used_count: 0, reserved_count: 0, remaining_count: 2, quota_date: "" };
  let userPlan = "free";
  let userId = "";

  try {
    // ================================================================
    // STEP 1: AUTHENTICATION (Prompt 27)
    // ================================================================

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "missing_auth" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      getSupabaseUrl(),
      getSupabaseSecretKey()
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token", code: "invalid_token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = user.id;

    // ================================================================
    // STEP 2: ENTITLEMENTS (Prompt 27)
    // ================================================================

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found", code: "profile_not_found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userPlan = profile.plan || "free";
    if (!["free", "pro", "elite"].includes(userPlan)) {
      userPlan = "free";
    }

    // ================================================================
    // STEP 3: REQUEST VALIDATION & FINGERPRINT
    // ================================================================

    const requestBody = await req.json();
    const { sideA, sideB, tvA, tvB, scoring, posImpact, ageContext, draftCapital, rosterFit, warnings, formatNotes, requestId } = requestBody;

    if (!sideA || !sideB) {
      return new Response(
        JSON.stringify({ error: "Missing trade sides", code: "invalid_request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!requestId || typeof requestId !== "string" || !UUID_REGEX.test(requestId)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid request_id (must be UUID)", code: "invalid_request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IDEMPOTENCY FIX: Generate fingerprint binding request_id to payload + all result-affecting context
    const requestFingerprint = generateRequestFingerprint({
      sideA,
      sideB,
      tvA,
      tvB,
      scoring,
      posImpact,
      ageContext,
      draftCapital,
      rosterFit,
      warnings,
      formatNotes,
    });

    // ================================================================
    // STEP 4: CHECK FOR EXISTING REQUEST (IDEMPOTENT REPLAY)
    // ================================================================

    if (userPlan === "free") {
      const { data: existingResult } = await supabase.rpc(
        "get_trade_analysis_result",
        { p_user_id: userId, p_request_id: requestId, p_request_fingerprint: requestFingerprint }
      );

      if (existingResult && existingResult[0]) {
        const result = existingResult[0];

        // Fetch fresh quota status
        const { data: quotaData } = await supabase.rpc("get_trade_quota_status", { p_user_id: userId });
        if (quotaData && quotaData[0]) {
          quotaStatus = quotaData[0];
        }

        if (result.status === "succeeded" && result.result_json) {
          // Replay stored successful result (no Claude call, no quota re-consumption)
          return new Response(
            JSON.stringify({
              analysis: result.result_json.analysis,
              verdict: result.result_json.verdict,
              fairnessPct: result.result_json.fairnessPct,
              quota: quotaStatus,
              _replayed: true,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (result.status === "reserved") {
          // Request currently processing
          return new Response(
            JSON.stringify({ error: "Request in progress", code: "request_in_progress", quota: quotaStatus }),
            { status: 425, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else if (result.status === "failed") {
          // Previous attempt failed, may retry
          // Fall through to new attempt
        }
      }

      // Payload mismatch check
      if (existingResult && existingResult[0]?.error_message === "request_payload_mismatch") {
        return new Response(
          JSON.stringify({ error: "Request payload mismatch", code: "request_id_conflict" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ================================================================
    // STEP 5: QUOTA ENFORCEMENT (Free users only)
    // ================================================================

    if (userPlan === "free") {
      // Reserve quota with ATOMIC lock + fingerprint binding
      const { data: reserveResult, error: reserveError } = await supabase.rpc(
        "reserve_trade_quota",
        { p_user_id: userId, p_request_id: requestId, p_request_fingerprint: requestFingerprint }
      );

      if (reserveError) {
        console.error("[analyze-trade] reserve_trade_quota RPC error:", reserveError);
        return new Response(
          JSON.stringify({ error: "Quota check failed", code: "quota_error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!reserveResult[0]?.success) {
        const errorMsg = reserveResult[0]?.error_message || "unknown_error";

        const { data: quotaData } = await supabase.rpc("get_trade_quota_status", { p_user_id: userId });
        if (quotaData && quotaData[0]) {
          quotaStatus = quotaData[0];
        }

        return new Response(
          JSON.stringify({
            error: "Daily limit reached",
            code: errorMsg === "daily_limit_reached" ? "daily_limit_reached" : "quota_error",
            quota: quotaStatus,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ================================================================
    // STEP 6: DETERMINISTIC TRADE CALCULATION
    // ================================================================

    const diff = tvA - tvB;
    const maxVal = Math.max(tvA, tvB);
    const pct = maxVal > 0 ? Math.abs(diff / maxVal) * 100 : 0;
    const winner = pct < 8 ? "fair trade" : diff > 0 ? "Team B wins" : "Team A wins";

    // ================================================================
    // STEP 7: AI EXPLANATION (Optional — fallback if Claude fails)
    // ================================================================

    let analysis = "";

    try {
      const anthropic = new Anthropic({
        apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
      });

      const posLine = posImpact && posImpact.length > 0
        ? "\nPositional impact: " + posImpact.map((d: any) => `${d.pos}: ${d.net > 0 ? "+" : ""}${d.net}`).join(", ")
        : "";
      const ageLine = ageContext
        ? "\nAge context: Team A avg " + (ageContext.avgA != null ? ageContext.avgA.toFixed(1) : "unknown") + ", Team B avg " + (ageContext.avgB != null ? ageContext.avgB.toFixed(1) : "unknown")
        : "";
      const pickLine = draftCapital
        ? "\nDraft capital: Sent " + draftCapital.valSent + ", Received " + draftCapital.valReceived + ", Net " + (draftCapital.net > 0 ? "+" : "") + draftCapital.net
        : "";
      const rosterLine = rosterFit
        ? "\nRoster fit (" + rosterFit.team + "): Roster value change " + (rosterFit.valDelta > 0 ? "+" : "") + rosterFit.valDelta + (rosterFit.lineupDelta != null ? ". Lineup value change: " + (rosterFit.lineupDelta > 0 ? "+" : "") + rosterFit.lineupDelta : "")
        : "";
      const warnLine = warnings && warnings.length > 0 ? "\nWarnings: " + warnings.join("; ") : "";
      const fmtLine = formatNotes && formatNotes.length > 0 ? "\nFormat notes: " + formatNotes.join("; ") : "";

      const prompt = `You are an expert fantasy football trade analyst for Fantasy Draft Pros. Analyze this trade using ONLY the supplied facts.

Scoring: ${scoring || "PPR Dynasty"}

Team A gives: ${sideA.map((p: any) => `${p.name} (${p.pos}, Age ${p.age || "unknown"}, Value ${p.val || 0})`).join(", ")}
Team A total: ${tvA}

Team B gives: ${sideB.map((p: any) => `${p.name} (${p.pos}, Age ${p.age || "unknown"}, Value ${p.val || 0})`).join(", ")}
Team B total: ${tvB}

Value differential: ${pct.toFixed(1)}% (${winner})${posLine}${ageLine}${pickLine}${rosterLine}${warnLine}${fmtLine}

Rules:
- Use ONLY supplied values and facts
- Do NOT invent stats, news, injuries, or depth chart information
- Do NOT alter the trade totals or fairness percentage
- Distinguish raw trade fairness from roster fit if roster context is provided
- If age is unknown for a player, do not guess their age
- Give a sharp 2-4 sentence analysis mentioning player names`;

      const message = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      });

      analysis = (message.content[0] as any).text || "";
    } catch (claudeErr) {
      console.error("[analyze-trade] Claude API error:", claudeErr);
      analysis = generateFallbackAnalysis(sideA, sideB, tvA, tvB);
    }

    if (!analysis) {
      analysis = generateFallbackAnalysis(sideA, sideB, tvA, tvB);
    }

    // ================================================================
    // STEP 8: PREPARE RESULT FOR STORAGE
    // ================================================================

    const resultJson = {
      analysis,
      verdict: winner,
      fairnessPct: pct.toFixed(1),
    };

    // ================================================================
    // STEP 9: FINALIZE QUOTA (Free users only) - CRITICAL ORDERING
    // ================================================================

    const analysisUsable = !!analysis;

    if (userPlan === "free") {
      // CRITICAL: Finalize BEFORE returning response
      // If finalization fails, do NOT return successful result
      const { error: finalizeError } = await supabase.rpc("finalize_trade_quota", {
        p_user_id: userId,
        p_request_id: requestId,
        p_succeeded: analysisUsable,
        p_result_json: analysisUsable ? resultJson : null,
      });

      if (finalizeError || !analysisUsable) {
        console.error("[analyze-trade] finalize_trade_quota error:", finalizeError);
        if (!analysisUsable) {
          // No usable result, release reservation
          return new Response(
            JSON.stringify({ error: "Analysis failed", code: "analysis_failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Finalization failure - fail safely
        return new Response(
          JSON.stringify({ error: "Quota finalization failed", code: "quota_finalization_error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ================================================================
    // STEP 10: FETCH QUOTA STATUS FOR RESPONSE
    // ================================================================

    if (userPlan === "free") {
      const { data: quotaData } = await supabase.rpc("get_trade_quota_status", { p_user_id: userId });
      if (quotaData && quotaData[0]) {
        quotaStatus = quotaData[0];
      }
    } else {
      quotaStatus = {
        unlimited: true,
        limit_per_day: 999,
        used_count: 0,
        reserved_count: 0,
        remaining_count: 999,
        quota_date: new Date().toISOString().split("T")[0],
      };
    }

    // ================================================================
    // STEP 11: RETURN SUCCESS RESPONSE
    // ================================================================

    return new Response(
      JSON.stringify({
        analysis,
        verdict: winner,
        fairnessPct: pct.toFixed(1),
        quota: quotaStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[analyze-trade] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Analysis failed", code: "internal_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
