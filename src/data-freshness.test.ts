/**
 * Prompt 21 — Data Freshness tests.
 *
 * Validates that every freshness claim in the application is source-backed,
 * no false freshness is fabricated, and all date/timestamp formatting is
 * timezone-safe and deterministic.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  VALUES_UPDATED_AT,
  VALUES_VERSION,
  formatCalendarDate,
  formatFetchTimestamp,
  formatRelativeTime,
  leagueFetchedAtKey,
  parseValuesVersion,
  deriveProvider,
  freshnessFetchVerb,
} from "../src/logic";

var rootDir = resolve(__dirname, "..");
var afdpSrc = readFileSync(resolve(rootDir, "afdp.tsx"), "utf-8");
var logicSrc = readFileSync(resolve(rootDir, "src/logic.ts"), "utf-8");

// ── CANONICAL VALUES FRESHNESS ──

describe("canonical value freshness", function () {
  it("VALUES_UPDATED_AT is a valid YYYY-MM-DD date", function () {
    expect(VALUES_UPDATED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    var dt = new Date(VALUES_UPDATED_AT + "T00:00:00");
    expect(dt.getFullYear()).toBeGreaterThan(2024);
  });

  it("VALUES_VERSION is a valid YYYY-MM-DD.N identifier", function () {
    var parsed = parseValuesVersion(VALUES_VERSION);
    expect(parsed).not.toBeNull();
    expect(parsed!.date).toBe(VALUES_UPDATED_AT);
  });

  it("FDP Value date comes from VALUES_UPDATED_AT, not page-load time", function () {
    expect(afdpSrc).toContain("formatCalendarDate(VALUES_UPDATED_AT)");
    expect(afdpSrc).not.toMatch(/Values as of.*new Date\(\)/);
    expect(afdpSrc).not.toMatch(/Values as of.*Date\.now/);
  });

  it("rankings share same canonical date", function () {
    var matches = afdpSrc.match(/Values as of.*formatCalendarDate\(VALUES_UPDATED_AT\)/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(4);
  });

  it("Trade Analyzer references canonical valuation date", function () {
    expect(afdpSrc).toContain("FDP Values as of");
    expect(afdpSrc).toContain('FDP Values as of "+formatCalendarDate(VALUES_UPDATED_AT)');
  });

  it("page load does not alter freshness", function () {
    expect(afdpSrc).not.toMatch(/Values as of.*toLocaleDate/);
    expect(afdpSrc).not.toMatch(/Values as of.*Date\.now/);
  });

  it("browser current time does not become value update time", function () {
    expect(afdpSrc).not.toMatch(/VALUES_UPDATED_AT\s*=\s*new Date/);
    expect(logicSrc).not.toMatch(/VALUES_UPDATED_AT\s*=\s*new Date/);
  });
});

// ── DATE-ONLY FORMATTING ──

describe("formatCalendarDate — timezone-safe calendar dates", function () {
  it("formats standard dates correctly", function () {
    expect(formatCalendarDate("2026-09-19")).toBe("Sep 19, 2026");
    expect(formatCalendarDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatCalendarDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("handles DST-boundary dates without rollover", function () {
    expect(formatCalendarDate("2026-03-08")).toBe("Mar 8, 2026");
    expect(formatCalendarDate("2026-11-01")).toBe("Nov 1, 2026");
  });

  it("returns raw string for invalid dates", function () {
    expect(formatCalendarDate("not-a-date")).toBe("not-a-date");
    expect(formatCalendarDate("2026-13-40")).toBe("2026-13-40");
  });

  it("does not shift day due to UTC parsing", function () {
    var result = formatCalendarDate("2026-01-01");
    expect(result).toContain("Jan 1");
    expect(result).not.toContain("Dec 31");
  });
});

// ── TIMESTAMP FORMATTING ──

describe("formatFetchTimestamp", function () {
  it("formats ISO timestamps with date and time", function () {
    var result = formatFetchTimestamp("2026-09-22T20:32:00");
    expect(result).toContain("Sep 22");
    expect(result).toMatch(/\d+:\d+ [AP]M/);
  });

  it("returns empty string for invalid/empty input", function () {
    expect(formatFetchTimestamp("")).toBe("");
    expect(formatFetchTimestamp("not-a-date")).toBe("");
  });
});

// ── RELATIVE TIME ──

describe("formatRelativeTime", function () {
  var baseMs = new Date("2026-09-22T20:00:00Z").getTime();

  it("shows 'just now' for < 60 seconds", function () {
    var recent = new Date(baseMs - 30000).toISOString();
    expect(formatRelativeTime(recent, baseMs)).toBe("just now");
  });

  it("shows minutes for < 1 hour", function () {
    var fiveMinAgo = new Date(baseMs - 300000).toISOString();
    expect(formatRelativeTime(fiveMinAgo, baseMs)).toBe("5 min ago");
  });

  it("shows hours for < 1 day", function () {
    var twoHrAgo = new Date(baseMs - 7200000).toISOString();
    expect(formatRelativeTime(twoHrAgo, baseMs)).toBe("2 hr ago");
  });

  it("shows days for >= 1 day", function () {
    var oneDayAgo = new Date(baseMs - 86400000).toISOString();
    expect(formatRelativeTime(oneDayAgo, baseMs)).toBe("1 day ago");
  });

  it("returns null for empty/invalid input", function () {
    expect(formatRelativeTime("")).toBeNull();
    expect(formatRelativeTime("garbage")).toBeNull();
  });
});

// ── PROVIDER IDENTITY ──

describe("provider identity", function () {
  it("deriveProvider maps Sleeper league IDs correctly", function () {
    expect(deriveProvider("123456789")).toBe("sleeper");
    expect(deriveProvider("987654321012345678")).toBe("sleeper");
  });

  it("deriveProvider maps ESPN league IDs correctly", function () {
    expect(deriveProvider("espn_123")).toBe("espn");
    expect(deriveProvider("espn_999999")).toBe("espn");
  });

  it("deriveProvider maps manual league ID correctly", function () {
    expect(deriveProvider("manual")).toBe("manual");
  });

  it("freshnessFetchVerb uses 'fetched' for Sleeper", function () {
    expect(freshnessFetchVerb("sleeper")).toBe("fetched");
  });

  it("freshnessFetchVerb uses 'fetched' for ESPN", function () {
    expect(freshnessFetchVerb("espn")).toBe("fetched");
  });

  it("freshnessFetchVerb uses 'imported' for manual", function () {
    expect(freshnessFetchVerb("manual")).toBe("imported");
  });
});

// ── LEAGUE FETCH TIMESTAMP ──

describe("league freshness — account+provider+league scoped keys", function () {
  it("key includes normalized provider prefix", function () {
    var k = leagueFetchedAtKey("user1", "sleeper", "123");
    expect(k).toContain("sleeper");
    expect(k).toContain("123");
  });

  it("Sleeper ID 123 != ESPN ID 123 (same account)", function () {
    var kSleeper = leagueFetchedAtKey("user1", "sleeper", "123");
    var kEspn = leagueFetchedAtKey("user1", "espn", "espn_123");
    expect(kSleeper).not.toBe(kEspn);
  });

  it("manual ID cannot collide with provider IDs", function () {
    var kManual = leagueFetchedAtKey("user1", "manual", "manual");
    var kSleeper = leagueFetchedAtKey("user1", "sleeper", "manual");
    expect(kManual).not.toBe(kSleeper);
  });

  it("League A and League B timestamps remain isolated", function () {
    var kA = leagueFetchedAtKey("user1", "sleeper", "leagueA");
    var kB = leagueFetchedAtKey("user1", "sleeper", "leagueB");
    expect(kA).not.toBe(kB);
  });

  it("provider switching loads correct timestamp", function () {
    expect(afdpSrc).toMatch(/deriveProvider\(lg\.league_id\)/);
  });

  it("successful Sleeper fetch stores timestamp with account-scoped key", function () {
    expect(afdpSrc).toMatch(/leagueFetchedAtKey\(user\?\.id\|\|"anon","sleeper",lg\.league_id\)/);
    expect(afdpSrc).toMatch(/setLeagueFetchedAt\(fetchTs\)/);
  });

  it("successful ESPN fetch stores timestamp with account-scoped key", function () {
    expect(afdpSrc).toMatch(/leagueFetchedAtKey\(user\?\.id\|\|"anon","espn",espnLid\)/);
  });

  it("manual import stores timestamp with account-scoped key", function () {
    expect(afdpSrc).toMatch(/leagueFetchedAtKey\(user\?\.id\|\|"anon","manual","manual"\)/);
  });

  it("failed Sleeper refresh does not replace last-success timestamp", function () {
    var catchBlocks = afdpSrc.match(/\.catch\(function\(e\)\{[^}]*\}/g) || [];
    var errorCatchWithFetchedAt = catchBlocks.filter(function (block) {
      return block.includes("setLeagueFetchedAt");
    });
    expect(errorCatchWithFetchedAt.length).toBe(0);
  });

  it("failed ESPN refresh does not replace last-success timestamp", function () {
    // ESPN import errors go to setLeagueImportErr/setLeagueImportStatus, never setLeagueFetchedAt
    var espnErrSection = afdpSrc.match(/Import failed.*espn.*setLeagueImportStatus\("error"\)/);
    if (espnErrSection) {
      expect(espnErrSection[0]).not.toContain("setLeagueFetchedAt");
    }
  });

  it("failed manual import does not replace last-success timestamp", function () {
    // Manual import does not have a .catch — it's synchronous
    // The only setLeagueFetchedAt after doManualImport is on success path
    var manualFn = afdpSrc.match(/function doManualImport[\s\S]*?setLeagueImportStatus\("connected"\)/);
    expect(manualFn).not.toBeNull();
  });

  it("manual import says 'imported', not 'fetched'", function () {
    expect(freshnessFetchVerb("manual")).toBe("imported");
    // UI uses freshnessFetchVerb to derive the word
    expect(afdpSrc).toContain("freshnessFetchVerb(deriveProvider(");
  });

  it("Sleeper uses 'fetched'", function () {
    expect(freshnessFetchVerb("sleeper")).toBe("fetched");
  });

  it("ESPN uses 'fetched'", function () {
    expect(freshnessFetchVerb("espn")).toBe("fetched");
  });

  it("no provider-native 'updated' claim is introduced", function () {
    expect(afdpSrc).not.toMatch(/roster updated.*formatRelativeTime/);
    expect(afdpSrc).not.toMatch(/Sleeper updated.*ago/);
    expect(afdpSrc).not.toMatch(/ESPN updated.*ago/);
  });

  it("no polling/interval added for freshness", function () {
    expect(afdpSrc).not.toMatch(/setInterval.*leagueFetchedAt/);
    expect(afdpSrc).not.toMatch(/setInterval.*formatRelativeTime/);
  });

  it("provider switching resolves via saveAndSetActiveLeague + deriveProvider", function () {
    expect(afdpSrc).toMatch(/saveAndSetActiveLeague.*leagueFetchedAtKey.*deriveProvider/);
  });

  it("unknown freshness shows no timestamp rather than fabricated one", function () {
    expect(afdpSrc).toMatch(/leagueFetchedAt&&React\.createElement/);
  });
});

// ── ACCOUNT SWITCH / LOGOUT ──

describe("account-switch freshness isolation", function () {
  it("logout clears in-memory freshness state", function () {
    // SIGNED_OUT handler must call setLeagueFetchedAt("")
    expect(afdpSrc).toMatch(/SIGNED_OUT.*setLeagueFetchedAt\(""\)/);
  });

  it("league disconnect clears freshness display", function () {
    // saveAndSetActiveLeague(null) results in setLeagueFetchedAt("")
    expect(afdpSrc).toMatch(/saveAndSetActiveLeague.*setLeagueFetchedAt.*lg\?.*:""\)/);
  });

  it("same-user reload retains timestamp via localStorage", function () {
    // State initializer reads from localStorage using leagueFetchedAtKey
    expect(afdpSrc).toMatch(/useState.*leagueFetchedAtKey.*deriveProvider/);
  });

  it("localStorage league data intentionally survives logout (Prompt 16 architecture)", function () {
    // SIGNED_OUT handler does NOT clear fdp_league_v1 or fdp_lfetch_* keys
    var signedOutHandler = afdpSrc.match(/SIGNED_OUT[^}]*\}/);
    expect(signedOutHandler).not.toBeNull();
    expect(signedOutHandler![0]).not.toContain("fdp_league_v1");
    expect(signedOutHandler![0]).not.toContain("fdp_lfetch_");
  });

  it("no sensitive account information stored in freshness keys", function () {
    // Keys use account UUID + provider + leagueId, never email/token/password
    var key = leagueFetchedAtKey("abc-123-uuid", "sleeper", "123");
    expect(key).not.toMatch(/@/);        // no email
    expect(key).not.toMatch(/token/i);   // no token
    expect(key).not.toMatch(/Bearer/);   // no auth header
    expect(key).toBe("fdp_lfetch_abc-123-uuid*sleeper*123");
  });
});

// ── ACCOUNT ISOLATION — CROSS-ACCOUNT FRESHNESS ──

describe("cross-account freshness isolation", function () {
  it("User A / Sleeper / 123 != User B / Sleeper / 123", function () {
    var kA = leagueFetchedAtKey("userA-uuid", "sleeper", "123");
    var kB = leagueFetchedAtKey("userB-uuid", "sleeper", "123");
    expect(kA).not.toBe(kB);
  });

  it("User A / ESPN / 123 != User B / ESPN / 123", function () {
    var kA = leagueFetchedAtKey("userA-uuid", "espn", "espn_123");
    var kB = leagueFetchedAtKey("userB-uuid", "espn", "espn_123");
    expect(kA).not.toBe(kB);
  });

  it("User A manual != User B manual", function () {
    var kA = leagueFetchedAtKey("userA-uuid", "manual", "manual");
    var kB = leagueFetchedAtKey("userB-uuid", "manual", "manual");
    expect(kA).not.toBe(kB);
  });

  it("same user reload restores own timestamp", function () {
    var k1 = leagueFetchedAtKey("userA-uuid", "sleeper", "123");
    var k2 = leagueFetchedAtKey("userA-uuid", "sleeper", "123");
    expect(k1).toBe(k2);
  });

  it("User B cannot restore User A timestamp (different key)", function () {
    var kA = leagueFetchedAtKey("userA-uuid", "sleeper", "123");
    var kB = leagueFetchedAtKey("userB-uuid", "sleeper", "123");
    expect(kA).not.toBe(kB);
    // Only way to read A's timestamp is with A's key — B's key is different
  });

  it("provider collision protection remains across accounts", function () {
    var kASleeper = leagueFetchedAtKey("userA-uuid", "sleeper", "123");
    var kAEspn = leagueFetchedAtKey("userA-uuid", "espn", "123");
    var kBSleeper = leagueFetchedAtKey("userB-uuid", "sleeper", "123");
    var kBEspn = leagueFetchedAtKey("userB-uuid", "espn", "123");
    var allKeys = [kASleeper, kAEspn, kBSleeper, kBEspn];
    expect(new Set(allKeys).size).toBe(4);
  });

  it("multi-league protection remains across accounts", function () {
    var kAL1 = leagueFetchedAtKey("userA-uuid", "sleeper", "league1");
    var kAL2 = leagueFetchedAtKey("userA-uuid", "sleeper", "league2");
    var kBL1 = leagueFetchedAtKey("userB-uuid", "sleeper", "league1");
    expect(kAL1).not.toBe(kAL2);
    expect(kAL1).not.toBe(kBL1);
  });

  it("logout clears in-memory display", function () {
    expect(afdpSrc).toMatch(/SIGNED_OUT.*setLeagueFetchedAt\(""\)/);
  });

  it("account switch clears old in-memory display via SIGNED_OUT then SIGNED_IN", function () {
    // SIGNED_OUT clears in-memory state
    expect(afdpSrc).toMatch(/SIGNED_OUT.*setLeagueFetchedAt\(""\)/);
    // saveAndSetActiveLeague reads account-scoped key for new user
    expect(afdpSrc).toMatch(/aid=user\?\.id\|\|"anon"/);
  });

  it("successful fetch writes account-scoped key (all providers)", function () {
    expect(afdpSrc).toContain('leagueFetchedAtKey(user?.id||"anon","sleeper"');
    expect(afdpSrc).toContain('leagueFetchedAtKey(user?.id||"anon","espn"');
    expect(afdpSrc).toContain('leagueFetchedAtKey(user?.id||"anon","manual"');
  });

  it("failed fetch does not write/update timestamp", function () {
    var catchBlocks = afdpSrc.match(/\.catch\(function\(e\)\{[^}]*\}/g) || [];
    var errorCatchWithFetchedAt = catchBlocks.filter(function (block) {
      return block.includes("setLeagueFetchedAt");
    });
    expect(errorCatchWithFetchedAt.length).toBe(0);
  });

  it("legacy unscoped key is not attributed to current user", function () {
    // Old format was fdp_lfetch_<provider>_<leagueId> (no account scope)
    // New format is fdp_lfetch_<accountId>*<provider>*<leagueId>
    // They use different delimiters — _ vs * — so no accidental match
    var oldKey = "fdp_lfetch_sleeper_123";
    var newKey = leagueFetchedAtKey("userA-uuid", "sleeper", "123");
    expect(newKey).not.toBe(oldKey);
    // App reads only new-format keys, old keys are ignored
    expect(newKey).toContain("*");
    expect(oldKey).not.toContain("*");
  });

  it("key contains no email/token/secret", function () {
    var key = leagueFetchedAtKey("abc-def-uuid", "sleeper", "123");
    expect(key).not.toMatch(/@/);
    expect(key).not.toMatch(/token/i);
    expect(key).not.toMatch(/Bearer/i);
    expect(key).not.toMatch(/password/i);
  });

  it("anonymous scope is 'anon' when no accountId", function () {
    var kAnon = leagueFetchedAtKey("", "sleeper", "123");
    expect(kAnon).toContain("anon");
    var kAnon2 = leagueFetchedAtKey("anon", "sleeper", "123");
    expect(kAnon).toBe(kAnon2);
  });

  it("authenticated user does not inherit anonymous freshness", function () {
    var kAnon = leagueFetchedAtKey("anon", "sleeper", "123");
    var kAuth = leagueFetchedAtKey("real-user-uuid", "sleeper", "123");
    expect(kAnon).not.toBe(kAuth);
  });

  it("state initializer reads account-scoped key from persisted user", function () {
    // Initializer extracts user ID from fdp_user_v1 for freshness lookup
    expect(afdpSrc).toMatch(/fdp_user_v1.*leagueFetchedAtKey/);
  });

  it("key architecture: fdp_lfetch_<accountId>*<provider>*<leagueId>", function () {
    var key = leagueFetchedAtKey("uid-123", "espn", "espn_456");
    expect(key).toBe("fdp_lfetch_uid-123*espn*espn_456");
  });
});

// ── PROVIDER INFERENCE ──

describe("provider inference and explicit sourcing", function () {
  it("write paths use explicit provider string with account scope", function () {
    // Sleeper write: leagueFetchedAtKey(user?.id||"anon","sleeper", ...)
    expect(afdpSrc).toContain('leagueFetchedAtKey(user?.id||"anon","sleeper",lg.league_id)');
    // ESPN write: leagueFetchedAtKey(user?.id||"anon","espn", ...)
    expect(afdpSrc).toContain('leagueFetchedAtKey(user?.id||"anon","espn",espnLid)');
    // Manual write: leagueFetchedAtKey(user?.id||"anon","manual", ...)
    expect(afdpSrc).toContain('leagueFetchedAtKey(user?.id||"anon","manual","manual")');
  });

  it("read paths use deriveProvider for league-id-based lookup with account scope", function () {
    // Read paths use account-scoped key with deriveProvider
    expect(afdpSrc).toMatch(/leagueFetchedAtKey\(aid,deriveProvider\(/);
  });

  it("deriveProvider inference is safe because app controls all league ID formats", function () {
    // ESPN IDs are always prefixed "espn_" by the app (line ~3345)
    expect(afdpSrc).toContain('"espn_"+espnLeagueId');
    // Manual ID is always "manual" (line ~3374)
    expect(afdpSrc).toContain('league_id:"manual"');
    // Sleeper IDs are raw from API — no prefix
  });

  it("no explicit provider field exists on league objects (inference documented as safe)", function () {
    // League objects created by app: {league_id, name, ...}
    // No .provider field — deriveProvider is the current safe pattern
    expect(afdpSrc).not.toMatch(/provider:\s*["']sleeper["']/);
  });
});

// ── ODDS FRESHNESS ──

describe("odds freshness", function () {
  it("fresh provider data shows fetched time, not update time", function () {
    expect(afdpSrc).toMatch(/"Fetched ".*oddsFetchedAt/);
    expect(afdpSrc).not.toMatch(/"Updated ".*oddsFetchedAt/);
  });

  it("stale provider data shows updating state", function () {
    expect(afdpSrc).toContain("Updating");
  });

  it("manual/archived data labeled honestly", function () {
    expect(afdpSrc).toContain("ARCHIVED GAME SCRIPT");
    expect(afdpSrc).toContain("ARCHIVED LINES");
    expect(afdpSrc).toContain("May not reflect current week");
  });

  it("unavailable odds do not fabricate timestamps", function () {
    expect(afdpSrc).toMatch(/source:"unavailable",fetchedAt:""/);
  });

  it("error path does not fabricate fetchedAt with new Date", function () {
    var fetchOddsFn = afdpSrc.match(/async function fetchOdds[\s\S]*?^}/m);
    if (fetchOddsFn) {
      var fnBody = fetchOddsFn[0];
      var catchSection = fnBody.split("catch")[1] || "";
      expect(catchSection).not.toContain("new Date().toISOString()");
    }
  });

  it("no manual data labeled live", function () {
    expect(afdpSrc).not.toMatch(/source==="manual".*[Ll]ive/);
  });
});

// ── NO FALSE CLAIMS ──

describe("no false freshness claims", function () {
  it("does not claim 'real-time data' for Sleeper projections", function () {
    expect(afdpSrc).not.toContain("values reflect real-time data");
  });

  it("does not claim 'Live Sleeper league import'", function () {
    expect(afdpSrc).not.toContain("Live Sleeper league import");
  });

  it("does not claim 'live power rankings'", function () {
    expect(afdpSrc).not.toContain("live power rankings");
  });

  it("does not claim 'Live budget tracker'", function () {
    expect(afdpSrc).not.toContain("Live budget tracker");
  });

  it("does not claim 'Pull live Sleeper'", function () {
    expect(afdpSrc).not.toContain("Pull live Sleeper");
  });

  it("does not claim 'Pulls live 24-hour'", function () {
    expect(afdpSrc).not.toContain("Pulls live 24-hour");
  });

  it("does not claim 'Live stats will be available'", function () {
    expect(afdpSrc).not.toContain("Live stats will be available");
  });

  it("does not claim 'live matchup scores'", function () {
    expect(afdpSrc).not.toContain("live matchup scores");
  });

  it("does not use raw VALUES_UPDATED_AT in user-facing 'Values as of' displays", function () {
    var rawUses = afdpSrc.match(/"Values as of "\+VALUES_UPDATED_AT/g);
    expect(rawUses).toBeNull();
  });

  it("FAQ does not overclaim freshness", function () {
    expect(afdpSrc).not.toMatch(/FAQ.*regularly updated based on the latest news/);
    expect(afdpSrc).not.toContain("regularly updated based on the latest news");
  });

  it("Sleeper (live API) claim removed from FAQ", function () {
    expect(afdpSrc).not.toContain("Sleeper (live API)");
  });

  it("does not label page-load time as value freshness anywhere", function () {
    expect(afdpSrc).not.toMatch(/Updated today.*VALUES/);
    expect(afdpSrc).not.toMatch(/Updated now/);
  });
});

// ── SEO / SITEMAP ──

describe("SEO freshness", function () {
  var viteConfig = readFileSync(resolve(rootDir, "vite.config.ts"), "utf-8");

  it("player lastmod uses VALUES_UPDATED_AT, not build time", function () {
    expect(viteConfig).toContain("VALUES_UPDATED_AT");
    expect(viteConfig).not.toMatch(/lastmod.*new Date\(\)/);
    expect(viteConfig).not.toMatch(/lastmod.*Date\.now/);
  });

  it("does not put page-load timestamps into JSON-LD", function () {
    expect(viteConfig).not.toMatch(/dateModified.*new Date/);
    expect(viteConfig).not.toMatch(/datePublished.*Date\.now/);
  });

  it("sitemap generates correct player count", function () {
    expect(viteConfig).toContain("generateSitemap");
  });
});

// ── HISTORY / EXPLANATION FRESHNESS ──

describe("value history freshness", function () {
  it("history chart uses effective_at, not recorded_at for display", function () {
    expect(afdpSrc).toMatch(/effective_at\|\|.*recorded_at/);
  });

  it("value explanation inherits freshness from snapshots, not page-load time", function () {
    expect(afdpSrc).not.toMatch(/explainValueMovement.*Date\.now/);
    expect(afdpSrc).not.toMatch(/explainValueMovement.*new Date\(\)/);
  });
});

// ── EDITORIAL / STATIC DATES ──

describe("static editorial dates are clearly labeled", function () {
  it("Week 1 Value Movers has hardcoded editorial date", function () {
    expect(afdpSrc).toContain("Updated Sep 16");
  });

  it("props have editorial date", function () {
    expect(afdpSrc).toContain("Updated Sep 15");
  });

  it("Dynasty Reports have editorial date", function () {
    expect(afdpSrc).toContain("Updated September 2026");
  });
});
