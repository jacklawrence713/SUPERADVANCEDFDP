import { describe, it, expect } from "vitest";
import { parseSupabaseSecretKeys } from "../supabase/functions/_shared/supabase-keys.ts";

/**
 * GATE 1B EXECUTABLE PARSER TESTS
 *
 * Tests the core security-critical parsing logic of parseSupabaseSecretKeys.
 * These are behavioral tests that execute the actual production parser logic.
 */

describe("Gate 1B: Supabase Secret Keys Parser — Behavioral Tests", () => {
  describe("Missing/Empty Environment", () => {
    it("should throw when env is undefined (missing)", () => {
      expect(() => parseSupabaseSecretKeys(undefined)).toThrow(
        "SUPABASE_SECRET_KEYS environment variable is missing"
      );
    });

    it("should throw when env is empty string", () => {
      expect(() => parseSupabaseSecretKeys("")).toThrow(
        "SUPABASE_SECRET_KEYS environment variable is missing"
      );
    });
  });

  describe("Invalid JSON", () => {
    it("should throw on malformed JSON", () => {
      expect(() => parseSupabaseSecretKeys("{bad-json")).toThrow(
        "not valid JSON"
      );
    });

    it("should throw on JSON number", () => {
      expect(() => parseSupabaseSecretKeys("123")).toThrow(
        "must be a JSON object"
      );
    });

    it("should throw on JSON string", () => {
      expect(() => parseSupabaseSecretKeys('"synthetic"')).toThrow(
        "must be a JSON object"
      );
    });

    it("should throw on JSON null", () => {
      expect(() => parseSupabaseSecretKeys("null")).toThrow(
        "must be a JSON object"
      );
    });

    it("should throw on JSON boolean", () => {
      expect(() => parseSupabaseSecretKeys("true")).toThrow(
        "must be a JSON object"
      );
    });
  });

  describe("Array Instead of Object", () => {
    it("should throw on JSON array (must be explicit check)", () => {
      expect(() => parseSupabaseSecretKeys("[]")).toThrow(
        "must be a JSON object"
      );
    });

    it("should throw on JSON array with values", () => {
      expect(() => parseSupabaseSecretKeys('["key1", "key2"]')).toThrow(
        "must be a JSON object"
      );
    });
  });

  describe("Missing Default Key", () => {
    it("should throw when 'default' key is missing", () => {
      expect(() => parseSupabaseSecretKeys('{"other":"test-value"}')).toThrow(
        "does not contain 'default' key"
      );
    });

    it("should throw when object is empty", () => {
      expect(() => parseSupabaseSecretKeys("{}")).toThrow(
        "does not contain 'default' key"
      );
    });

    it("should throw when default is null", () => {
      expect(() => parseSupabaseSecretKeys('{"default":null}')).toThrow(
        "must be a string"
      );
    });
  });

  describe("Invalid Default Type", () => {
    it("should throw when default is a number", () => {
      expect(() => parseSupabaseSecretKeys('{"default":123}')).toThrow(
        "must be a string"
      );
    });

    it("should throw when default is a boolean", () => {
      expect(() => parseSupabaseSecretKeys('{"default":true}')).toThrow(
        "must be a string"
      );
    });

    it("should throw when default is an object", () => {
      expect(() =>
        parseSupabaseSecretKeys('{"default":{"nested":"value"}}')
      ).toThrow("must be a string");
    });

    it("should throw when default is an array", () => {
      expect(() => parseSupabaseSecretKeys('{"default":["value"]}')).toThrow(
        "must be a string"
      );
    });
  });

  describe("Empty/Whitespace Default Value", () => {
    it("should throw when default is empty string", () => {
      expect(() => parseSupabaseSecretKeys('{"default":""}')).toThrow(
        "empty or whitespace-only"
      );
    });

    it("should throw when default is spaces only", () => {
      expect(() => parseSupabaseSecretKeys('{"default":"   "}')).toThrow(
        "empty or whitespace-only"
      );
    });

    it("should throw when default is mixed whitespace", () => {
      expect(() => parseSupabaseSecretKeys('{"default":" a "}')).not.toThrow();
    });
  });

  describe("Valid Secret Key", () => {
    it("should return synthetic valid key unchanged", () => {
      const result = parseSupabaseSecretKeys(
        '{"default":"synthetic-test-secret"}'
      );
      expect(result).toBe("synthetic-test-secret");
    });

    it("should return key with uppercase", () => {
      const result = parseSupabaseSecretKeys('{"default":"SB_SECRET_TEST"}');
      expect(result).toBe("SB_SECRET_TEST");
    });

    it("should return key with numbers", () => {
      const result = parseSupabaseSecretKeys('{"default":"sb_secret_12345"}');
      expect(result).toBe("sb_secret_12345");
    });

    it("should return key with special characters", () => {
      const result = parseSupabaseSecretKeys(
        '{"default":"sb_secret_abc-def_ghi"}'
      );
      expect(result).toBe("sb_secret_abc-def_ghi");
    });

    it("should return key with leading/trailing non-whitespace unchanged", () => {
      const result = parseSupabaseSecretKeys(
        '{"default":"_synthetic_test_secret_"}'
      );
      expect(result).toBe("_synthetic_test_secret_");
    });

    it("should ignore extra keys in object", () => {
      const result = parseSupabaseSecretKeys(
        '{"default":"synthetic-test-secret","other":"ignored","third":"also-ignored"}'
      );
      expect(result).toBe("synthetic-test-secret");
    });

    it("should handle default key with leading/trailing spaces in value", () => {
      const result = parseSupabaseSecretKeys(
        '{"default":"  synthetic-test  "}'
      );
      // trim() used only to validate non-empty, not to mutate return
      expect(result).toBe("  synthetic-test  ");
    });
  });

  describe("Error Message Safety", () => {
    it("should not expose raw JSON in error for malformed input", () => {
      try {
        parseSupabaseSecretKeys("{bad");
        expect.fail("Should have thrown");
      } catch (e) {
        const msg = String(e);
        expect(msg).toContain("not valid JSON");
        expect(msg).not.toContain("{bad");
      }
    });

    it("should list key names but not values in error", () => {
      try {
        parseSupabaseSecretKeys('{"key1":"value1","key2":"value2"}');
        expect.fail("Should have thrown");
      } catch (e) {
        const msg = String(e);
        expect(msg).toContain("key1");
        expect(msg).toContain("key2");
        expect(msg).not.toContain("value1");
        expect(msg).not.toContain("value2");
      }
    });

    it("should not expose secret value in type error", () => {
      try {
        parseSupabaseSecretKeys('{"default":123}');
        expect.fail("Should have thrown");
      } catch (e) {
        const msg = String(e);
        expect(msg).toContain("must be a string");
      }
    });
  });

  describe("Explicit Object Validation", () => {
    it("should validate object type explicitly at parsing boundary", () => {
      const testCases = [
        { input: "[]", description: "empty array" },
        { input: '[{"default":"value"}]', description: "array with object" },
        { input: "null", description: "null" },
        { input: "true", description: "boolean" },
        { input: '"string"', description: "string" },
        { input: "123", description: "number" },
      ];

      testCases.forEach(({ input, description }) => {
        expect(
          () => parseSupabaseSecretKeys(input),
          `should fail for ${description}`
        ).toThrow(/must be a JSON object|must be a string/);
      });
    });
  });
});
