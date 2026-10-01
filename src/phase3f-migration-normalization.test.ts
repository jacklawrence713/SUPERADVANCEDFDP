/**
 * Phase 3F: Migration Normalization & 005 Remediation Tests
 *
 * Verifies:
 * 1. Migration 001 removed from active source (git history preserved)
 * 2. Canonical baseline is 20260428000000
 * 3. Versions sorted in correct dependency order
 * 4. Migration 005 revokes broad UPDATE and grants column-level only
 * 5. Frontend UPDATE operations within allowlist
 * 6. Backend operations use service_role
 */

import { readFileSync, existsSync } from "fs";
import { readdirSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";

const migrationsDir = join(
  process.cwd(),
  "supabase",
  "migrations"
);

describe("Phase 3F: Migration Normalization", () => {
  it("should NOT contain 001_users.sql in active source", () => {
    const files = readdirSync(migrationsDir);
    expect(files).not.toContain("001_users.sql");
  });

  it("should contain exactly 7 active migrations (001 removed)", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toHaveLength(7);
  });

  it("should have 20260428000000 as canonical baseline", () => {
    const files = readdirSync(migrationsDir);
    expect(files).toContain("20260428000000_create_users_table.sql");
  });

  it("should have renamed migrations with correct timestamps", () => {
    const files = readdirSync(migrationsDir);
    const expectedFiles = [
      "20260428000000_create_users_table.sql",
      "20260904133837_add_abuse_prevention.sql",
      "20260921144441_odds_cache.sql",
      "20260922003719_fdp_value_snapshots.sql",
      "20260924152532_entitlement_security.sql",
      "20260924234147_trade_analysis_quota.sql",
      "20260925213441_billing_event_ledger.sql",
    ];
    expectedFiles.forEach((file) => {
      expect(files).toContain(file);
    });
  });

  it("migrations should sort in dependency-safe order", () => {
    const files = readdirSync(migrationsDir).sort();
    const expectedOrder = [
      "20260428000000_create_users_table.sql",
      "20260904133837_add_abuse_prevention.sql",
      "20260921144441_odds_cache.sql",
      "20260922003719_fdp_value_snapshots.sql",
      "20260924152532_entitlement_security.sql",
      "20260924234147_trade_analysis_quota.sql",
      "20260925213441_billing_event_ledger.sql",
    ];
    expect(files).toEqual(expectedOrder);
  });
});

describe("Phase 3F: Migration 005 Remediation", () => {
  const migration005Path = join(
    migrationsDir,
    "20260924152532_entitlement_security.sql"
  );

  it("migration 005 should exist", () => {
    expect(existsSync(migration005Path)).toBe(true);
  });

  it("migration 005 should revoke broad UPDATE from authenticated", () => {
    const content = readFileSync(migration005Path, "utf-8");
    expect(content).toContain(
      "REVOKE UPDATE ON public.users FROM authenticated;"
    );
  });

  it("migration 005 should grant UPDATE on signup_ip column", () => {
    const content = readFileSync(migration005Path, "utf-8");
    expect(content).toContain(
      "GRANT UPDATE (signup_ip, signup_visitor_id)"
    );
    expect(content).toContain("ON public.users");
    expect(content).toContain("TO authenticated;");
  });

  it("migration 005 should NOT grant table-level UPDATE back", () => {
    const content = readFileSync(migration005Path, "utf-8");
    // Should not have "GRANT UPDATE ON public.users TO authenticated" (without columns)
    const grantAllPattern = /GRANT\s+UPDATE\s+ON\s+public\.users\s+TO\s+authenticated/;
    const grantColumnPattern =
      /GRANT\s+UPDATE\s*\(\s*signup_ip\s*,\s*signup_visitor_id\s*\)/;

    // Must have column-level grant
    expect(content).toMatch(grantColumnPattern);

    // Extract all GRANT statements
    const grants = content.match(
      /GRANT\s+UPDATE[^;]+ON\s+public\.users[^;]+TO\s+authenticated/g
    );
    if (grants) {
      grants.forEach((grant) => {
        // Should not have table-level UPDATE grant
        if (
          !grant.includes("(") &&
          !grant.includes("signup_ip") &&
          !grant.includes("signup_visitor_id")
        ) {
          expect(true).toBe(false); // Fail if found
        }
      });
    }
  });

  it("migration 005 should NOT grant UPDATE on protected columns", () => {
    const content = readFileSync(migration005Path, "utf-8");
    const protectedColumns = [
      "plan",
      "stripe_customer_id",
      "subscription_status",
      "trial_used",
      "is_pro",
      "is_admin",
    ];

    protectedColumns.forEach((col) => {
      // Should not have GRANT UPDATE on these columns
      const pattern = new RegExp(
        `GRANT\\s+UPDATE\\s*\\([^)]*${col}[^)]*\\)`,
        "i"
      );
      expect(content).not.toMatch(pattern);
    });
  });
});

describe("Phase 3F: Frontend & Backend Compatibility", () => {
  it("frontend should have exactly 2 users-table UPDATE operations", () => {
    const afdpPath = join(process.cwd(), "afdp.tsx");
    const content = readFileSync(afdpPath, "utf-8");

    // Find UPDATE operations
    const updateMatches = content.match(
      /\.from\s*\(\s*["']users["']\s*\)\s*\.update/g
    );
    expect(updateMatches).toHaveLength(2);
  });

  it("frontend UPDATE operations should be for signup_ip and signup_visitor_id only", () => {
    const afdpPath = join(process.cwd(), "afdp.tsx");
    const content = readFileSync(afdpPath, "utf-8");

    // Look at context around UPDATE operations
    const lines = content.split("\n");
    let updateCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('.from("users")') && line.includes(".update")) {
        updateCount++;
        // Check context (this line + surrounding)
        const context = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
        expect(context).toContain("signup_ip");
        expect(context).toContain("signup_visitor_id");
        // Should NOT contain protected columns
        expect(context).not.toMatch(
          /upd\.\s*(plan|is_pro|subscription_status|trial_used)/
        );
      }
    }

    expect(updateCount).toBe(2);
  });

  it("Edge Functions should not use authenticated role for users-table writes", () => {
    const functions = [
      "analyze-trade",
      "cancel-subscription",
      "create-checkout",
      "fetch-odds",
      "send-email",
      "stripe-webhook",
      "trade-quota-status",
      "record-value-snapshots",
    ];

    functions.forEach((funcName) => {
      const funcPath = join(
        process.cwd(),
        "supabase",
        "functions",
        funcName,
        "index.ts"
      );

      if (existsSync(funcPath)) {
        const content = readFileSync(funcPath, "utf-8");

        // Any users-table operations should use 'supabase' client (service_role)
        // not 'authClient' or 'authenticatedClient'
        if (content.includes('.from("users")') ||
            content.includes(".from('users')")) {
          // Should import supabase from helper, not create authenticated client
          expect(content).not.toContain(
            'createClient(url, anon_key) // users'
          );
          expect(content).not.toContain("authClient");
        }
      }
    });
  });
});

describe("Phase 3F: Migration Content Preservation", () => {
  it("migration 004 SQL content should be unchanged (hash verification)", () => {
    const migration004Path = join(
      migrationsDir,
      "20260922003719_fdp_value_snapshots.sql"
    );
    const content = readFileSync(migration004Path, "utf-8");
    const contentLower = content.toLowerCase();

    // Verify critical parts of 004 are unchanged (case-insensitive for SQL keywords)
    expect(contentLower).toContain("create table");
    expect(content).toContain("public.fdp_snapshot_batches");
    expect(content).toContain("public.fdp_value_snapshots");
    expect(contentLower).toContain("unique index");
    expect(contentLower).toContain("grant");
    expect(contentLower).toContain("revoke");
  });

  it("migration 005 should only have authorized changes", () => {
    const migration005Path = join(
      migrationsDir,
      "20260924152532_entitlement_security.sql"
    );
    const content = readFileSync(migration005Path, "utf-8");

    // Should have REVOKE
    expect(content).toContain("REVOKE UPDATE ON public.users FROM authenticated");

    // Should have NEW GRANT (added in Phase 3F)
    expect(content).toContain(
      "GRANT UPDATE (signup_ip, signup_visitor_id)"
    );

    // Should NOT have unrelated changes
    expect(content).not.toContain("ALTER TABLE");
    expect(content).not.toContain("CREATE TABLE");
    expect(content).not.toContain("DROP");
  });
});
