// Supabase Edge Function: analyze-trade
// Calls Claude API to generate real AI trade analysis
import Anthropic from "npm:@anthropic-ai/sdk@0.29.2";
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
    // Auth check — require signed-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sideA, sideB, tvA, tvB, scoring, posImpact, ageContext, draftCapital, rosterFit, warnings, formatNotes } = await req.json();

    if (!sideA || !sideB) {
      return new Response(JSON.stringify({ error: "Missing trade sides" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    const diff = tvA - tvB;
    const maxVal = Math.max(tvA, tvB);
    const pct = maxVal > 0 ? Math.abs(diff / maxVal) * 100 : 0;
    const winner = pct < 8 ? "fair trade" : diff > 0 ? "Team B wins" : "Team A wins";

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

    const analysis = (message.content[0] as any).text || "";

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-trade error:", err);
    return new Response(JSON.stringify({ error: "Analysis failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
