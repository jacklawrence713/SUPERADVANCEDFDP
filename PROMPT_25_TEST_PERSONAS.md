# Prompt 25 — Test Accounts & Security Personas

**Phase:** Infrastructure for Prompts 26-34
**Status:** Audit-only, no monetization fixes
**Date:** 2026-09-24
**Current HEAD:** 644e868

---

## Purpose

Establish SAFE, repeatable test personas for security/entitlement testing in subsequent prompts.

These personas:
- **Do NOT fix** monetization vulnerabilities
- **Do NOT add** hardcoded app bypasses
- **Do provide** documented, production-guarded test infrastructure
- **Enable** future Prompts 26-34 to validate behavior safely

---

## Test Personas

### 1. ANONYMOUS
- **No account**
- **No authentication**
- **No entitlements**

**Purpose:** Test login-required behavior, 401 API responses, route protection.

**Current behavior:** All features blocked.

---

### 2. FREE
- **Authenticated:** Yes
- **Plan:** free
- **is_pro:** false
- **Subscription:** inactive

**Purpose:** Test paywall, browser-local quota, RLS vulnerabilities, API entitlement gaps.

**Current behavior (IMPORTANT):**
- UI shows "3/day" counter (browser localStorage `fdp_tc_v2`)
- Counter is **NOT server-enforced** — Free user can call analyze-trade infinitely if authenticated
- League features: UI-gated only (hidden component, no backend validation)
- Vegas: **leaks to Free** (no entitlement check, Prompt 27 will fix)
- Value History: top 20 players via UI filter; all available via API
- Can self-modify `is_pro` via SQL UPDATE (RLS vulnerability, Prompt 26 will test)

**Test use:**
```typescript
import { PERSONA_FREE } from './src/test-personas';

const freeUser = PERSONA_FREE('my-test-user');
// freeUser.profile = { id, email, plan='free', is_pro=false, ... }
// freeUser.expectedAccess = { tradeAnalyzerUI: true, tradeAnalyzerAPI: true, ... }
```

---

### 3. PRO
- **Authenticated:** Yes
- **Plan:** pro
- **is_pro:** true
- **Subscription:** active

**Purpose:** Test Pro feature access, Pro vs Elite distinction, subscription lifecycle.

**Current behavior:**
- Identical to Elite in current code (is_pro boolean doesn't distinguish)
- All league features visible
- All rankings available

**Test use:**
```typescript
import { PERSONA_PRO } from './src/test-personas';

const proUser = PERSONA_PRO('my-pro-user');
// proUser.profile.plan = 'pro'
// proUser.expectedAccess.leagueConnect = true
```

---

### 4. ELITE
- **Authenticated:** Yes
- **Plan:** elite
- **is_pro:** true
- **Subscription:** active

**Purpose:** Test Elite tier distinction, future Elite-specific features.

**Current behavior:**
- Same UI access as Pro (is_pro boolean identical)
- Plan field distinguishes Elite from Pro for future use

**Important:** Prompt 27 will decide feature differentiation. Plan field is ready for it.

**Test use:**
```typescript
import { PERSONA_ELITE } from './src/test-personas';

const eliteUser = PERSONA_ELITE('my-elite-user');
// eliteUser.profile.plan = 'elite' (distinct from Pro)
```

---

### 5. DOWNGRADED
- **Authenticated:** Yes
- **Plan:** free
- **is_pro:** false
- **Subscription:** cancelled (previously active)

**Purpose:** Test loss of entitlement, stale state, downgrade flows.

**Current behavior:**
- Reverted to Free access
- Subscription history retained (for support/re-upgrade flows)
- League data remains but features unavailable

**Test use:**
```typescript
import { PERSONA_DOWNGRADED } from './src/test-personas';

const downUser = PERSONA_DOWNGRADED('formerly-pro');
// downUser.profile.subscription_status = 'cancelled'
// downUser.expectedAccess.leagueConnect = false
```

---

## Production Guard

**CRITICAL:** Fixture tools automatically block against production.

### How it works:

```typescript
import { validateEnvironmentIsSafe } from './src/test-personas';

const validation = validateEnvironmentIsSafe();
if (!validation.isSafe) {
  throw new Error(`Cannot use fixtures: ${validation.reason}`);
}
```

### Automatic checks:

1. **Local** (APPROVED): `localhost`, `127.0.0.1`
2. **Staging** (APPROVED): Explicit `APPROVED_STAGING_PROJECT_REF` env var
3. **Production** (BLOCKED): Known production project reference `wizdxspglxpvvogiivsv`
4. **Unknown** (BLOCKED): Any unrecognized Supabase URL

**Fail-closed:** Unknown environment = rejected.

---

## Persona Registry

Centralized access via `TEST_PERSONAS`:

```typescript
import { TEST_PERSONAS } from './src/test-personas';

const anonymous = TEST_PERSONAS.anonymous;
const free = TEST_PERSONAS.free(); // Factory
const pro = TEST_PERSONAS.pro('custom-id'); // Accepts custom baseId
const elite = TEST_PERSONAS.elite();
const downgraded = TEST_PERSONAS.downgraded();
```

---

## Current Access Matrix — Documented Baseline

This matrix documents CURRENT behavior (Prompt 25). Not fixes.

| Feature | Anonymous | Free | Pro | Elite | Downgraded |
|---------|-----------|------|-----|-------|------------|
| **Rankings** | Blocked | Top 20 (UI) | All | All | Top 20 (UI) |
| **Trade Analyzer UI** | Blocked | Visible (3/day counter) | Visible (unlimited) | Visible (unlimited) | Visible (3/day) |
| **Trade Analyzer API** | 401 | OK (no server limit) | OK | OK | OK (no limit) |
| **League Connect** | Blocked | Hidden (UI gate) | Visible | Visible | Hidden |
| **Trade Finder** | Blocked | Hidden | Visible | Visible | Hidden |
| **League Intelligence** | Blocked | Hidden | Visible | Visible | Hidden |
| **Vegas Lines** | Blocked (UI) | Visible (**leaks**) | Visible | Visible | Visible (**leaks**) |
| **Value History** | Blocked | Top 20 (UI), all (API) | All | All | Top 20 (UI), all (API) |
| **Why Value Changed** | Blocked | Available (no gate) | Available | Available | Available |
| **Billing Portal** | Hidden | Show "Upgrade" | Show "Manage" | Show "Manage" | Show "Upgrade" |

**Key:**
- "UI" = client-side JavaScript gate (bypassable)
- "API" = server validation
- "Leaks" = should be gated but isn't
- No server limit = Free can call infinitely if authenticated

---

## Persona Access Documentation

Each persona documents:

1. **Current UI behavior** (what the app shows)
2. **Current functional access** (what actually works)
3. **Known gaps** (where monetization enforcement is missing)
4. **Purpose** (what future tests will verify)

Example — Free persona notes:

> CURRENT BEHAVIOR: Browser localStorage 3/day counter + unmetered API. Prompt 28 will enforce 3 lifetime.

This tells future readers:
- ✅ What the current state is
- ⚠️ What's vulnerable
- 📍 Where the fix will go

---

## No Monetization Fixes

Prompt 25 does **NOT**:

- ❌ Fix public.users RLS (is_pro still modifiable by user)
- ❌ Add server-side trade-count enforcement
- ❌ Gate analyze-trade by is_pro
- ❌ Gate Vegas to Pro/Elite
- ❌ Gate Value History server-side
- ❌ Modify Stripe webhook logic
- ❌ Change Trial abuse prevention
- ❌ Add hardcoded test bypasses

Prompt 25 **DOES**:

- ✅ Document current state
- ✅ Provide test personas
- ✅ Add production guards
- ✅ Create test infrastructure
- ✅ Enable safe future testing

---

## Usage in Future Prompts

### Prompt 26 — Monetization Audit / Confirmation
```typescript
// Test that Free persona actually has unmetered API access
const freeUser = PERSONA_FREE('verify-unmetered');
const token = await obtainTestToken(freeUser);
const response = await callAnalyzeTrade(trade, token);
// Currently succeeds (no is_pro check)
// Will fail after Prompt 28 (server-side enforcement)
```

### Prompt 27 — Entitlements
```typescript
// Test Vegas gate
const freeUser = PERSONA_FREE();
const proUser = PERSONA_PRO();
// Verify Vegas requires Pro tier
// Update expectedAccess when gate is added
```

### Prompt 28 — Secure 3 Free Trades
```typescript
// Test lifetime quota enforcement
const freeUser = PERSONA_FREE();
// Send 3 analyses
// Verify 4th is rejected by server
// Update profile to test retry/failure semantics
```

### Prompt 29 — Try to Hack It
```typescript
// Security testing using personas
const freeUser = PERSONA_FREE('hacker-test');
// Attempt: UPDATE public.users SET is_pro=true
// Attempt: Direct analyze-trade call with Free token
// Verify current vulnerabilities
// Document which are fixed by earlier prompts
```

---

## Persona Factory Pattern

Personas are factories to support parameterization:

```typescript
// Default ID
const user1 = PERSONA_FREE(); // id = 'test-free'

// Custom ID (e.g., for parallel test runs)
const user2 = PERSONA_FREE('parallel-test-1');
const user3 = PERSONA_FREE('parallel-test-2');

// Each has distinct id and email
expect(user2.id).toBe('parallel-test-1');
expect(user3.id).toBe('parallel-test-2');
```

This enables:
- Multiple concurrent test personas
- Deterministic IDs for reproducible tests
- Namespacing (e.g., `feat/X-test-free`, `integration-test-free`)

---

## Profile Structure

Each persona includes `ApplicationProfile`:

```typescript
interface ApplicationProfile {
  id: string; // UUID or test ID
  email: string; // fdp-{id}@test-localhost
  name: string;
  plan: 'free' | 'pro' | 'elite';
  is_pro: boolean;
  is_admin: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: string;
  created_at?: string;
  updated_at?: string;
}
```

This matches the `public.users` table structure FDP actually queries.

---

## Expected Access Documentation

Each persona includes `expectedAccess`:

```typescript
expectedAccess: {
  rankingsFull: boolean;
  tradeAnalyzerUI: boolean;
  tradeAnalyzerAPI: boolean;
  leagueConnect: boolean;
  tradeFinder: boolean;
  leagueIntelligence: boolean;
  vegasLines: boolean;
  valueHistory: boolean;
  whyValueChanged: boolean;
  billingPortal: boolean;
}
```

These are reference values for test assertions:

```typescript
const freeUser = PERSONA_FREE();
if (freeUser.expectedAccess.leagueConnect) {
  // Feature expected to work
  await testLeagueConnect(freeUser);
}
```

Current values document the current system state, not fixes.

---

## No Passwords or Secrets

Personas use:
- ❌ No plaintext passwords
- ❌ No API keys or tokens
- ❌ No Bearer tokens in code
- ✅ Obviously fake test Stripe IDs (e.g., `cus_test_pro`)
- ✅ Fake test emails (e.g., `fdp-test-free@test-localhost`)
- ✅ Environment variables for actual test infrastructure (credentials in .env, never in code)

---

## Test Coverage (Prompt 25)

Tests verify:

1. **Persona structure** — all required fields present
2. **Data integrity** — consistent profile data
3. **Tier logic** — correct plan/is_pro combinations
4. **Production guard** — blocks against production, approves local
5. **No bypasses** — personas use actual data model, not magic values
6. **Registry** — TEST_PERSONAS accessible and correct

Run tests:
```bash
npm test -- src/test-personas.test.ts
```

Expected: All pass, 0 failures.

---

## Files Added (Prompt 25)

- `src/test-personas.ts` — Persona definitions + production guard
- `src/test-personas.test.ts` — 40+ tests verifying personas
- `PROMPT_25_TEST_PERSONAS.md` — This file

**Total net-new code:** ~500 lines (personas + tests)

**No changes to:**
- afdp.tsx
- src/logic.ts
- Supabase migrations
- src/edge-functions/*
- RLS policies
- App entitlement logic

---

## What Prompts 26-34 Will Use These For

### Prompt 26 — Monetization Audit / Confirmation
Verify personas reflect actual current behavior.

### Prompt 27 — Free vs Pro Entitlements
Add backend feature gates using personas for testing.

### Prompt 28 — Secure 3 Free Trades
Implement server-side lifetime quota, test with Free persona.

### Prompt 29 — Try to Hack It
Use personas to test RLS vulnerabilities, API bypasses, multi-device attacks.

### Prompt 30 — Paywall UX
Test upgrade flows using Free→Pro progression.

### Prompt 31 — Pro Page
Document tier features using persona expectedAccess.

### Prompt 32 — Billing Security
Test Stripe integration, downgrade flows using Downgraded persona.

### Prompt 33 — Data Integrity
Verify trade analysis history per persona tier.

### Prompt 34 — Product Test
End-to-end testing across all personas.

---

## Environment Validation Examples

### ✅ Local (approved)
```bash
VITE_SUPABASE_URL=http://localhost:54321 npm test
```
→ `validateEnvironmentIsSafe()` returns `{ isSafe: true, environment: 'local' }`

### ✅ Staging (approved with env var)
```bash
VITE_SUPABASE_URL=https://staging-xyz.supabase.co \
APPROVED_STAGING_PROJECT_REF=staging-xyz npm test
```
→ `{ isSafe: true, environment: 'staging' }`

### ❌ Production (blocked)
```bash
VITE_SUPABASE_URL=https://wizdxspglxpvvogiivsv.supabase.co npm test
```
→ `{ isSafe: false, environment: 'PRODUCTION', reason: '...' }`

Fixture creation aborts immediately.

---

## Next Steps

### Prompt 26 — Monetization Audit / Confirmation
- Verify each persona's current behavior
- Document findings
- Prepare for Prompt 27 fixes

### Prompt 27 — Free vs Pro Entitlements
- Use Free, Pro, Elite personas
- Add backend feature gates
- Update persona expectedAccess values

### Prompt 28 — Secure 3 Free Trades
- Use Free persona for quota testing
- Implement server-side tracking
- Document failed-analysis handling

---

## Summary

**Prompt 25 establishes:**
- Safe test personas (Anonymous, Free, Pro, Elite, Downgraded)
- Production-guarded fixture creation
- Baseline access matrix (current behavior, not fixes)
- Test infrastructure for Prompts 26-34
- Zero monetization fixes (setup only)

**No source changes to application logic, RLS, Stripe, or entitlement enforcement.**

**Ready for Prompt 26 — Monetization Audit / Confirmation.**
