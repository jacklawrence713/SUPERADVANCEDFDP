// Supabase Edge Function: analyze-trade
// Calls Claude API to generate real AI trade analysis
import Anthropic from "npm:@anthropic-ai/sdk@0.29.2";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
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

    const { sideA, sideB, tvA, tvB, scoring } = await req.json();

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
    const pct = tvB > 0 ? Math.abs(diff / tvB) * 100 : 0;
    const winner = pct < 8 ? "fair trade" : diff > 0 ? "Team B wins" : "Team A wins";

    const prompt = `You are an expert dynasty fantasy football analyst. Analyze this trade and give a concise 2-3 sentence verdict.

Scoring format: ${scoring || "PPR Dynasty"}

Team A gives: ${sideA.map((p: any) => `${p.name} (${p.pos}, Age ${p.age || "?"}, Value ${p.tradeVal || p.est || 0})`).join(", ")}
Total value: ${tvA.toLocaleString()}

Team B gives: ${sideB.map((p: any) => `${p.name} (${p.pos}, Age ${p.age || "?"}, Value ${p.tradeVal || p.est || 0})`).join(", ")}
Total value: ${tvB.toLocaleString()}

Value differential: ${pct.toFixed(1)}% (${winner})

Give a sharp, specific analysis. Mention player names. Cover: who wins and why, age/dynasty implications, any risks. Be direct — no filler phrases.`;

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
