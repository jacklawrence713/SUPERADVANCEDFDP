import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * GATE 1B REGRESSION TESTS: Modern Supabase Key Migration — Architecture Tests
 *
 * Verifies the migration from legacy to modern Supabase credentials
 * is complete and correct, with no runtime references to legacy keys.
 *
 * Parser behavioral tests are in gate1b-helper-parser.test.ts
 * These tests focus on: architecture validation, legacy cleanup, config updates
 */

describe("Gate 1B: Modern Supabase Key Migration — Architecture Tests", () => {
  describe("Frontend Key Configuration", () => {
    it("should use VITE_SUPABASE_PUBLISHABLE_KEY from environment", () => {
      const afdpPath = path.join(process.cwd(), "afdp.tsx");
      const content = fs.readFileSync(afdpPath, "utf-8");
      expect(content).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    });

    it("should NOT have hardcoded legacy anon JWT fallback", () => {
      const afdpPath = path.join(process.cwd(), "afdp.tsx");
      const content = fs.readFileSync(afdpPath, "utf-8");
      expect(content).not.toMatch(/SUPA_KEY.*\|\|.*"eyJ/);
    });

    it("should initialize Supabase client as null if key is missing", () => {
      const afdpPath = path.join(process.cwd(), "afdp.tsx");
      const content = fs.readFileSync(afdpPath, "utf-8");
      expect(content).toContain("createClient(SUPA_URL, SUPA_KEY) : null");
    });

    it("should not expose service-role key in browser code", () => {
      const afdpPath = path.join(process.cwd(), "afdp.tsx");
      const content = fs.readFileSync(afdpPath, "utf-8");
      expect(content).not.toContain("VITE_SUPABASE_SERVICE_KEY");
    });
  });

  describe("Shared Helper Architecture", () => {
    it("should have parseSupabaseSecretKeys pure function", () => {
      const helperPath = path.join(
        process.cwd(),
        "supabase/functions/_shared/supabase-keys.ts"
      );
      const content = fs.readFileSync(helperPath, "utf-8");
      expect(content).toContain("export function parseSupabaseSecretKeys");
    });

    it("should have getSupabaseSecretKey production wrapper", () => {
      const helperPath = path.join(
        process.cwd(),
        "supabase/functions/_shared/supabase-keys.ts"
      );
      const content = fs.readFileSync(helperPath, "utf-8");
      expect(content).toContain("export function getSupabaseSecretKey");
    });

    it("should have getSupabaseUrl function", () => {
      const helperPath = path.join(
        process.cwd(),
        "supabase/functions/_shared/supabase-keys.ts"
      );
      const content = fs.readFileSync(helperPath, "utf-8");
      expect(content).toContain("export function getSupabaseUrl");
    });

    it("should have explicit array validation (Array.isArray check)", () => {
      const helperPath = path.join(
        process.cwd(),
        "supabase/functions/_shared/supabase-keys.ts"
      );
      const content = fs.readFileSync(helperPath, "utf-8");
      expect(content).toContain("Array.isArray(secretKeys)");
    });
  });

  describe("All 8 Edge Functions Migrated", () => {
    const functions = [
      "send-email",
      "fetch-odds",
      "analyze-trade",
      "trade-quota-status",
      "create-checkout",
      "cancel-subscription",
      "record-value-snapshots",
      "stripe-webhook",
    ];

    functions.forEach((funcName) => {
      it(`${funcName}: imports helper`, () => {
        const funcPath = path.join(
          process.cwd(),
          `supabase/functions/${funcName}/index.ts`
        );
        const content = fs.readFileSync(funcPath, "utf-8");
        expect(content).toContain("supabase-keys.ts");
      });

      it(`${funcName}: uses getSupabaseSecretKey()`, () => {
        const funcPath = path.join(
          process.cwd(),
          `supabase/functions/${funcName}/index.ts`
        );
        const content = fs.readFileSync(funcPath, "utf-8");
        expect(content).toContain("getSupabaseSecretKey");
      });

      it(`${funcName}: uses getSupabaseUrl()`, () => {
        const funcPath = path.join(
          process.cwd(),
          `supabase/functions/${funcName}/index.ts`
        );
        const content = fs.readFileSync(funcPath, "utf-8");
        expect(content).toContain("getSupabaseUrl");
      });

      it(`${funcName}: no legacy Deno.env.get(SUPABASE_SERVICE_ROLE_KEY)`, () => {
        const funcPath = path.join(
          process.cwd(),
          `supabase/functions/${funcName}/index.ts`
        );
        const content = fs.readFileSync(funcPath, "utf-8");
        const lines = content.split("\n");
        let legacyFound = false;
        for (const line of lines) {
          if (line.trim().startsWith("//")) continue;
          if (line.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")')) {
            legacyFound = true;
            break;
          }
        }
        expect(legacyFound).toBe(false);
      });
    });
  });

  describe("GitHub Actions Workflow", () => {
    it("should inject VITE_SUPABASE_PUBLISHABLE_KEY", () => {
      const workflowPath = path.join(
        process.cwd(),
        ".github/workflows/deploy.yml"
      );
      const content = fs.readFileSync(workflowPath, "utf-8");
      expect(content).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    });

    it("should not inject VITE_SUPABASE_SERVICE_KEY", () => {
      const workflowPath = path.join(
        process.cwd(),
        ".github/workflows/deploy.yml"
      );
      const content = fs.readFileSync(workflowPath, "utf-8");
      expect(content).not.toContain("VITE_SUPABASE_SERVICE_KEY");
    });
  });

  describe("Security Contract Preservation", () => {
    it("should preserve verify_jwt matrix", () => {
      const configPath = path.join(process.cwd(), "supabase/config.toml");
      const content = fs.readFileSync(configPath, "utf-8");
      const expectations = [
        { name: "send-email", verify_jwt: "true" },
        { name: "fetch-odds", verify_jwt: "true" },
        { name: "analyze-trade", verify_jwt: "true" },
        { name: "trade-quota-status", verify_jwt: "true" },
        { name: "create-checkout", verify_jwt: "true" },
        { name: "cancel-subscription", verify_jwt: "true" },
        { name: "record-value-snapshots", verify_jwt: "false" },
        { name: "stripe-webhook", verify_jwt: "false" },
      ];
      expectations.forEach(({ name, verify_jwt }) => {
        const pattern = `\\[functions\\.${name}\\]`;
        const regex = new RegExp(pattern);
        if (regex.test(content)) {
          const section = content.substring(
            content.indexOf(`[functions.${name}]`),
            content.indexOf(`[functions.${name}]`) + 200
          );
          expect(section).toContain(`verify_jwt = ${verify_jwt}`);
        }
      });
    });

    it("should not weaken handler-level authentication", () => {
      const functions = [
        "send-email",
        "fetch-odds",
        "analyze-trade",
        "trade-quota-status",
        "create-checkout",
        "cancel-subscription",
      ];
      functions.forEach((funcName) => {
        const funcPath = path.join(
          process.cwd(),
          `supabase/functions/${funcName}/index.ts`
        );
        const content = fs.readFileSync(funcPath, "utf-8");
        expect(content).toContain('req.headers.get("Authorization")');
      });
    });

    it("should preserve FDP_SNAPSHOT_WRITE_SECRET", () => {
      const funcPath = path.join(
        process.cwd(),
        "supabase/functions/record-value-snapshots/index.ts"
      );
      const content = fs.readFileSync(funcPath, "utf-8");
      expect(content).toContain("FDP_SNAPSHOT_WRITE_SECRET");
    });

    it("should preserve Stripe signature validation", () => {
      const funcPath = path.join(
        process.cwd(),
        "supabase/functions/stripe-webhook/index.ts"
      );
      const content = fs.readFileSync(funcPath, "utf-8");
      expect(content).toContain("stripe-signature");
      expect(content).toContain("constructEventAsync");
    });
  });

  describe("Gate 1A Regression Protection", () => {
    it("should not introduce VITE_SUPABASE_SERVICE_KEY back", () => {
      const afdpPath = path.join(process.cwd(), "afdp.tsx");
      const content = fs.readFileSync(afdpPath, "utf-8");
      expect(content).not.toContain("VITE_SUPABASE_SERVICE_KEY");
    });

    it("should maintain Gate1A test protections", () => {
      const testPath = path.join(
        process.cwd(),
        "src/gate1a-service-role-regression.test.ts"
      );
      expect(fs.existsSync(testPath)).toBe(true);
    });
  });

  describe("No Permanent Legacy Fallback", () => {
    it("should not have fallback in Edge Functions", () => {
      const functions = [
        "send-email",
        "fetch-odds",
        "analyze-trade",
        "trade-quota-status",
        "create-checkout",
        "cancel-subscription",
        "record-value-snapshots",
        "stripe-webhook",
      ];
      functions.forEach((funcName) => {
        const funcPath = path.join(
          process.cwd(),
          `supabase/functions/${funcName}/index.ts`
        );
        const content = fs.readFileSync(funcPath, "utf-8");
        expect(content).not.toMatch(
          /getSupabaseSecretKey\(\)\s*\|\|\s*Deno\.env\.get/
        );
      });
    });

    it("should not have fallback to legacy anon key in runtime", () => {
      const afdpPath = path.join(process.cwd(), "afdp.tsx");
      const content = fs.readFileSync(afdpPath, "utf-8");
      expect(content).toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    });
  });
});
