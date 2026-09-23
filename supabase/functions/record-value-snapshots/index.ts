// Supabase Edge Function: record-value-snapshots
// Records a batch of canonical FDP Value snapshots to the database.
//
// Authorization: FDP_SNAPSHOT_WRITE_SECRET required (dedicated write key).
// The Edge Function uses its own SUPABASE_SERVICE_ROLE_KEY for DB writes.
// Callers never transmit the broad service-role key.
//
// DO NOT deploy until migration 004 is applied.
//
// Request body:
// {
//   "values_version": "2026-09-19.1",
//   "context": { "league_type": "dynasty", "scoring": "PPR", "superflex": false, "te_premium": false, "idp": false },
//   "snapshots": [
//     { "player_slug": "josh-allen", "player_name": "Josh Allen", "pos": "QB", "value": 9100 },
//     ...
//   ]
// }
//
// Flow:
// 1. Validate inputs (reject, never clamp)
// 2. Check for existing batch:
//    - complete → 409 Conflict (immutable)
//    - pending → 409 Conflict (concurrent)
//    - failed → delete failed batch + rows, proceed with fresh batch
// 3. Create batch (status=pending)
// 4. Insert all snapshots
// 5. Verify recorded_count = expected_count
// 6. Mark batch complete
//
// Each context is independently complete.

import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = [
  "https://fantasydraftpros.com",
  "http://localhost:5173",
];

const VALID_LEAGUE_TYPES = ["dynasty", "redraft"];
const VALID_SCORING = ["PPR", "Half", "Standard"];
const VALID_POS = ["QB", "RB", "WR", "TE", "K", "DST", "DL", "LB", "DB"];
const VERSION_RE = /^\d{4}-\d{2}-\d{2}\.\d+$/;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

/** Constant-time string comparison to prevent timing attacks on secret. */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const VALID_TEP_LEVELS = [0, 0.25, 0.5, 1.0];

/** Parse "YYYY-MM-DD.N" into effective date string. Validates calendar date. */
function parseEffectiveDate(version: string): string | null {
  const m = version.match(/^(\d{4}-\d{2}-\d{2})\.\d+$/);
  if (!m) return null;
  // Validate calendar date: reject impossible dates like 2026-13-40
  const parts = m[1].split("-");
  const y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return m[1];
}

function jsonErr(msg: string, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const writeSecret = Deno.env.get("FDP_SNAPSHOT_WRITE_SECRET");
    if (!supabaseUrl || !serviceRoleKey || !writeSecret) {
      return jsonErr("Server misconfigured", 500, cors);
    }

    // Verify caller using dedicated write secret (not the broad service-role key)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!safeCompare(token, writeSecret)) {
      return jsonErr("Unauthorized", 401, cors);
    }

    const body = await req.json();
    const { values_version, context, snapshots } = body;

    // ── Input validation: reject invalid data, never clamp ──

    if (!values_version || typeof values_version !== "string" || !VERSION_RE.test(values_version)) {
      return jsonErr("values_version required (format: YYYY-MM-DD.N)", 400, cors);
    }
    const effectiveDate = parseEffectiveDate(values_version);
    if (!effectiveDate) {
      return jsonErr("Could not parse effective date from values_version", 400, cors);
    }

    if (!context || typeof context !== "object") {
      return jsonErr("context object required", 400, cors);
    }
    if (!VALID_LEAGUE_TYPES.includes(context.league_type)) {
      return jsonErr("Invalid league_type. Must be: " + VALID_LEAGUE_TYPES.join(", "), 400, cors);
    }
    if (!VALID_SCORING.includes(context.scoring)) {
      return jsonErr("Invalid scoring. Must be: " + VALID_SCORING.join(", "), 400, cors);
    }
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return jsonErr("snapshots array required (non-empty)", 400, cors);
    }
    if (snapshots.length > 2000) {
      return jsonErr("Too many snapshots (max 2000)", 400, cors);
    }

    // Validate each snapshot row
    const slugsSeen = new Set<string>();
    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i];
      if (!s.player_slug || typeof s.player_slug !== "string") {
        return jsonErr(`Row ${i}: player_slug required`, 400, cors);
      }
      if (slugsSeen.has(s.player_slug)) {
        return jsonErr(`Row ${i}: duplicate player_slug "${s.player_slug}"`, 400, cors);
      }
      slugsSeen.add(s.player_slug);
      if (!s.player_name || typeof s.player_name !== "string") {
        return jsonErr(`Row ${i}: player_name required`, 400, cors);
      }
      if (!VALID_POS.includes(s.pos)) {
        return jsonErr(`Row ${i}: invalid pos "${s.pos}"`, 400, cors);
      }
      if (typeof s.value !== "number" || !Number.isInteger(s.value) || s.value < 0 || s.value > 9999) {
        return jsonErr(`Row ${i}: value must be integer 0-9999, got ${s.value}`, 400, cors);
      }
      // Validate optional valuation_factors
      if (s.valuation_factors != null) {
        const vf = s.valuation_factors;
        if (typeof vf !== "object" || Array.isArray(vf)) {
          return jsonErr(`Row ${i}: valuation_factors must be an object`, 400, cors);
        }
        // Schema version
        if (typeof vf.v !== "number" || !Number.isInteger(vf.v) || vf.v < 1) {
          return jsonErr(`Row ${i}: valuation_factors.v must be a positive integer`, 400, cors);
        }
        // Valuation path
        const VALID_PATHS = ["ktc", "rank_decay", "proj_floor", "vbd", "rank_floor"];
        if (typeof vf.path !== "string" || !VALID_PATHS.includes(vf.path)) {
          return jsonErr(`Row ${i}: valuation_factors.path must be one of: ${VALID_PATHS.join(", ")}`, 400, cors);
        }
        // Required numeric factor fields
        for (const field of ["projection", "positional_baseline", "raw_value", "age", "pos_rank"] as const) {
          if (typeof vf[field] !== "number" || !Number.isFinite(vf[field])) {
            return jsonErr(`Row ${i}: valuation_factors.${field} must be a finite number`, 400, cors);
          }
        }
        if (vf.pos_rank < 1 || !Number.isInteger(vf.pos_rank)) {
          return jsonErr(`Row ${i}: valuation_factors.pos_rank must be a positive integer`, 400, cors);
        }
        if (vf.raw_value < 0) {
          return jsonErr(`Row ${i}: valuation_factors.raw_value must be >= 0`, 400, cors);
        }
        // Optional factor fields
        if (vf.ktc_value !== undefined && (typeof vf.ktc_value !== "number" || !Number.isFinite(vf.ktc_value) || vf.ktc_value < 0)) {
          return jsonErr(`Row ${i}: valuation_factors.ktc_value must be a non-negative number`, 400, cors);
        }
        if (vf.dynasty_bonus !== undefined && (typeof vf.dynasty_bonus !== "number" || !Number.isFinite(vf.dynasty_bonus) || vf.dynasty_bonus < 0)) {
          return jsonErr(`Row ${i}: valuation_factors.dynasty_bonus must be a non-negative number`, 400, cors);
        }
      }
    }

    const db = createClient(supabaseUrl, serviceRoleKey);
    const ctxLeague = context.league_type;
    const ctxScoring = context.scoring;
    if (typeof context.te_premium !== "number" || !VALID_TEP_LEVELS.includes(context.te_premium)) {
      return jsonErr("Invalid te_premium. Must be one of: " + VALID_TEP_LEVELS.join(", "), 400, cors);
    }
    const ctxSF = !!context.superflex;
    const ctxTEP = context.te_premium as number;
    const ctxIDP = !!context.idp;

    // ── Check for existing batch with same version+context ──
    const { data: existingBatches } = await db
      .from("fdp_snapshot_batches")
      .select("id, status")
      .eq("values_version", values_version)
      .eq("league_type", ctxLeague)
      .eq("scoring", ctxScoring)
      .eq("superflex", ctxSF)
      .eq("te_premium", ctxTEP)
      .eq("idp", ctxIDP);

    if (existingBatches && existingBatches.length > 0) {
      for (const eb of existingBatches) {
        if (eb.status === "complete") {
          return jsonErr("Batch already exists for this version+context. Historical snapshots are immutable.", 409, cors);
        }
        if (eb.status === "pending") {
          return jsonErr("A pending batch already exists for this version+context. Concurrent duplicate rejected.", 409, cors);
        }
        if (eb.status === "failed") {
          // Clean up failed batch and its partial rows (CASCADE handles snapshot rows)
          await db.from("fdp_snapshot_batches").delete().eq("id", eb.id);
        }
      }
    }

    // Step 1: Create batch (status=pending)
    const { data: batchData, error: batchErr } = await db
      .from("fdp_snapshot_batches")
      .insert({
        values_version,
        effective_at: effectiveDate,
        league_type: ctxLeague,
        scoring: ctxScoring,
        superflex: ctxSF,
        te_premium: ctxTEP,
        idp: ctxIDP,
        expected_count: snapshots.length,
        recorded_count: 0,
        status: "pending",
      })
      .select("id")
      .single();

    if (batchErr) {
      return jsonErr(batchErr.message, 500, cors);
    }

    const batchId = batchData.id;

    // Step 2: Insert all snapshot rows
    const rows = snapshots.map((s: {
      player_slug: string; player_name: string; pos: string; value: number;
      valuation_factors?: Record<string, number> | null;
    }) => ({
      batch_id: batchId,
      player_slug: s.player_slug,
      player_name: s.player_name,
      pos: s.pos,
      value: s.value,
      league_type: ctxLeague,
      scoring: ctxScoring,
      superflex: ctxSF,
      te_premium: ctxTEP,
      idp: ctxIDP,
      values_version,
      effective_at: effectiveDate,
      valuation_factors: s.valuation_factors ?? null,
    }));

    const { error: insertErr } = await db.from("fdp_value_snapshots").insert(rows);
    if (insertErr) {
      // Mark batch as failed
      await db.from("fdp_snapshot_batches").update({ status: "failed" }).eq("id", batchId);
      return jsonErr(insertErr.message, 500, cors);
    }

    // Step 3: Verify recorded count matches expected
    const { count: recordedCount } = await db
      .from("fdp_value_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId);

    if (recordedCount !== snapshots.length) {
      await db.from("fdp_snapshot_batches").update({ status: "failed" }).eq("id", batchId);
      return jsonErr(`Row count mismatch: expected ${snapshots.length}, recorded ${recordedCount}`, 500, cors);
    }

    // Step 4: Mark batch complete
    await db.from("fdp_snapshot_batches").update({
      status: "complete",
      recorded_count: snapshots.length,
      completed_at: new Date().toISOString(),
    }).eq("id", batchId);

    return new Response(JSON.stringify({
      batch_id: batchId,
      inserted: snapshots.length,
      values_version,
      effective_at: effectiveDate,
      context: `${ctxLeague}:${ctxScoring}:${ctxSF ? "SF" : "1QB"}:${ctxTEP ? "TEP" : "noTEP"}`,
      status: "complete",
    }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Internal error" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
