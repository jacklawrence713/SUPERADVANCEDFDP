/**
 * Supabase API Key Management Helper
 *
 * Provides secure access to Supabase authentication credentials for Edge Functions.
 * Handles modern secret-key architecture with fail-closed error handling.
 *
 * Architecture:
 * - Production: SUPABASE_SECRET_KEYS environment variable (JSON map)
 * - Expected key name: "default"
 * - Never logs key values
 * - Throws on missing/malformed configuration
 */

/**
 * Parse and validate SUPABASE_SECRET_KEYS JSON input.
 *
 * Pure function: takes raw string input, returns validated secret key.
 * This is the core logic that must be tested.
 *
 * @param rawSecretKeysJson - Raw JSON string from environment variable
 * @throws Error if input is missing, malformed, or invalid
 * @returns The secret key value (string)
 */
export function parseSupabaseSecretKeys(rawSecretKeysJson: string | undefined): string {
  // Validation 1: Must be provided
  if (!rawSecretKeysJson) {
    throw new Error(
      "Server misconfiguration: SUPABASE_SECRET_KEYS environment variable is missing. " +
      "Edge Function requires SUPABASE_SECRET_KEYS JSON map with 'default' key."
    );
  }

  // Validation 2: Must be valid JSON
  let secretKeys: Record<string, string>;
  try {
    secretKeys = JSON.parse(rawSecretKeysJson);
  } catch (parseErr) {
    throw new Error(
      "Server misconfiguration: SUPABASE_SECRET_KEYS is not valid JSON. " +
      `Parse error: ${String(parseErr)}`
    );
  }

  // Validation 3: Must be object (not null, not array, not primitive)
  if (
    typeof secretKeys !== "object" ||
    secretKeys === null ||
    Array.isArray(secretKeys)
  ) {
    throw new Error(
      "Server misconfiguration: SUPABASE_SECRET_KEYS must be a JSON object (not array or null). " +
      `got ${typeof secretKeys}${Array.isArray(secretKeys) ? " (array)" : ""}`
    );
  }

  // Validation 4: Must contain 'default' key (use 'in' operator to allow empty string value)
  if (!("default" in secretKeys)) {
    throw new Error(
      "Server misconfiguration: SUPABASE_SECRET_KEYS does not contain 'default' key. " +
      "Available keys: " + Object.keys(secretKeys).join(", ")
    );
  }

  const defaultKey = secretKeys["default"];

  // Validation 5: Default key must be a string
  if (typeof defaultKey !== "string") {
    throw new Error(
      "Server misconfiguration: SUPABASE_SECRET_KEYS['default'] must be a string. " +
      `got ${typeof defaultKey}`
    );
  }

  // Validation 6: Default key must not be empty/whitespace-only
  if (defaultKey.trim() === "") {
    throw new Error(
      "Server misconfiguration: SUPABASE_SECRET_KEYS['default'] is empty or whitespace-only"
    );
  }

  // Return original key unchanged (validation used trim() to check, not to modify)
  return defaultKey;
}

/**
 * Get the Supabase secret key from the hosted Edge Function environment.
 *
 * Production wrapper: reads environment variable and delegates to parseSupabaseSecretKeys.
 *
 * @throws Error if SUPABASE_SECRET_KEYS is missing, malformed, or invalid
 * @returns The secret key value
 */
export function getSupabaseSecretKey(): string {
  return parseSupabaseSecretKeys(Deno.env.get("SUPABASE_SECRET_KEYS"));
}

/**
 * Get the Supabase URL from environment.
 *
 * @throws Error if SUPABASE_URL is missing
 * @returns The Supabase project URL
 */
export function getSupabaseUrl(): string {
  const url = Deno.env.get("SUPABASE_URL");

  if (!url) {
    throw new Error(
      "Server misconfiguration: SUPABASE_URL environment variable is missing"
    );
  }

  return url;
}
