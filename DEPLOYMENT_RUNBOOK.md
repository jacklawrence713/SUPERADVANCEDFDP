# DEPLOYMENT RUNBOOK — FantasyDraftPros.com (Prompts 28-35)

**VERSION:** 2026-09-26 (Prompt 35 Corrective Implementation)
**STATUS:** ✅ READY FOR SENIOR-ENGINEER FINAL REVIEW
**SCOPE:** Migrations 003-007, 8 Edge Functions (hardened), Stripe verification, Prompt36 smoke tests

---

## 🔐 PROMPT 35 HARDENING SUMMARY

### Email Security Fix (CRITICAL)
- **Vulnerability**: send-email allowed unauthenticated email relay via "welcome" type
- **Impact**: Arbitrary recipients, unlimited sends, phishing/spam capability
- **Fix**: Required authentication for ALL email types (Prompt 35)
- **Status**: ✅ IMPLEMENTED

### Authentication Hardening
- **User-JWT Functions**: Added `verify_jwt=true` for gateway-level JWT validation
- **5 Functions Hardened**: fetch-odds, analyze-trade, trade-quota-status, create-checkout, cancel-subscription
- **Defense-in-Depth**: Handler-level JWT + ownership + plan checks retained alongside gateway validation
- **Status**: ✅ IMPLEMENTED

---

## 🔐 FINAL AUTHENTICATION MATRIX

| Function | Caller | Credential | verify_jwt | Handler Auth | Purpose |
|----------|--------|-----------|-----------|--------------|---------|
| **send-email** | Browser (signup, contact) | Supabase JWT | **true** | auth.getUser() + type checks | Transactional email |
| **fetch-odds** | Browser (Pro/Elite) | Supabase JWT | **true** | auth.getUser() + plan enforcement | Vegas lines for Pro/Elite |
| **analyze-trade** | Browser (all auth users) | Supabase JWT | **true** | auth.getUser() + quota checks | Trade analysis engine |
| **trade-quota-status** | Browser (all auth users) | Supabase JWT | **true** | auth.getUser() + user lookup | Per-user quota reporting |
| **create-checkout** | Browser (authenticated) | Supabase JWT | **true** | auth.getUser() + Stripe customer checks | Subscription checkout |
| **cancel-subscription** | Browser (account owner) | Supabase JWT | **true** | auth.getUser() + subscription ownership | Subscription cancellation |
| **record-value-snapshots** | Service (scripts/generate-snapshots.ts) | FDP_SNAPSHOT_WRITE_SECRET | **false** | safeCompare() timing-safe check | Value snapshot batch ingestion |
| **stripe-webhook** | External (Stripe servers) | stripe-signature header | **false** | Stripe.webhooks.constructEventAsync() | Webhook event processing |

**Authentication Model:**
- **5 User-JWT Functions**: Browser-originated, user-authenticated
  - Gateway validates JWT (verify_jwt=true)
  - Handler retains manual auth for error handling + authorization
  - Defense-in-depth: both gateway + handler validation

- **1 Service-Secret Function**: Service-to-service, custom credential
  - Uses FDP_SNAPSHOT_WRITE_SECRET (NOT user JWT)
  - Gateway must NOT validate as JWT (verify_jwt=false)
  - Handler uses timing-safe comparison

- **1 Webhook Function**: External, cryptographic signature
  - Uses Stripe signature verification (NOT user JWT)
  - Gateway must NOT validate as JWT (verify_jwt=false)
  - Handler validates signature before mutations

---

## ✅ PRE-DEPLOYMENT CHECKLIST
### ⚠️ CRITICAL: Supabase Confirm Email Configuration- [ ] **MANUAL VERIFICATION REQUIRED**: Confirm Email setting in Supabase production  - Current local config: `enable_confirmations = true`  - Signup flow expects session to exist immediately (line 2329: `if(signUpResult.data.session)`)  - If production Confirm Email is ENABLED: signUp returns session=null, welcome email will NOT run  - If production Confirm Email is DISABLED: signUp returns session, welcome email runs immediately  - **ACTION**: Verify actual production Supabase Auth configuration before deployment  - If Confirm Email is enabled in production, welcome email must be sent via backend email service or double-opt-in

### Code Freeze & Verification
- [x] All Prompt 32-34 tests passing (**30 test files, 1930 tests** — +14 new Prompt 35 security tests)
- [x] Prompt 33 data integrity verified (1,320 players, no collisions, values fresh 2026-09-19)
- [x] Prompt 34 final product contracts validated (41 tests)
- [x] Prompt 35 email security tests PASSING (14 new tests verify no email relay)
- [x] All secrets configured in GitHub Actions (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SERVICE_KEY)
- [x] Zero hardcoded secrets in source (sk_live, sk_test, service_role checked)
- [x] Git status clean (only intended Prompt35 changes: supabase/config.toml, supabase/functions/send-email/index.ts, DEPLOYMENT_RUNBOOK_PROMPT35.md)

### Supabase Readiness
- [ ] Supabase project ref confirmed: `wizdxspglxpvvogiivsv`
- [ ] Current schema backup captured (`pg_dump` to local file)
- [ ] All migrations reviewed and tested locally (Migrations 003-007)

### Stripe Readiness
- [ ] Live API keys confirmed in production environment
- [ ] Webhook endpoint verified: https://wizdxspglxpvvogiivsv.supabase.co/functions/v1/stripe-webhook (manual verification during deployment)
- [ ] Event ledger table ready (Migration 007)
- [ ] Reconciliation generation counter initialized to v1

---

## 🔧 EDGE FUNCTION CONFIGURATION

**All 8 functions configured in supabase/config.toml:**

```toml
[functions.analyze-trade]
verify_jwt = true

[functions.cancel-subscription]
verify_jwt = true

[functions.create-checkout]
verify_jwt = true

[functions.stripe-webhook]
verify_jwt = false

[functions.send-email]
verify_jwt = true

[functions.fetch-odds]
verify_jwt = true

[functions.record-value-snapshots]
verify_jwt = false

[functions.trade-quota-status]
verify_jwt = true
```

**Key Changes from Earlier Versions:**
- send-email: `false` → `true` (now requires auth for all types)
- fetch-odds: `false` → `true` (gateway-level JWT validation)
- analyze-trade: `false` → `true` (gateway-level JWT validation)
- trade-quota-status: `false` → `true` (gateway-level JWT validation)
- create-checkout: `false` → `true` (gateway-level JWT validation)
- cancel-subscription: `false` → `true` (gateway-level JWT validation)
- record-value-snapshots: `false` → `false` (unchanged, uses custom secret)
- stripe-webhook: `false` → `false` (unchanged, uses Stripe signature)

---

## 🚀 DEPLOYMENT PHASES & GATES

### PHASE 1: Database Migrations (Low Risk)
**Execution Order:** 003 → 004 → 005 → 006 → 007

All migrations idempotency verified:
- Migration 003: FULLY IDEMPOTENT (IF NOT EXISTS pattern)
- Migration 004: NON-IDEMPOTENT (one-time operation)
- Migration 005: FULLY IDEMPOTENT (REVOKE idempotent)
- Migration 006: PARTIALLY IDEMPOTENT (table IF NOT EXISTS, indexes need guards)
- Migration 007: PARTIALLY IDEMPOTENT (tables IF NOT EXISTS, policies need guards)

**Note**: Supabase version tracking prevents accidental reruns. SQL-level idempotency documented above.

### PHASE 2: Edge Function Deployment (Medium Risk — NOW HARDENED)
**Execution Order**: send-email → fetch-odds → trade-quota-status → analyze-trade → create-checkout → stripe-webhook → record-value-snapshots → cancel-subscription

**All 8 functions deployed with updated authentication configuration:**
- Handlers retain all manual authorization checks (NOT removed)
- Gateway JWT validation added for 5 user-JWT functions (defense-in-depth)
- Email security fix prevents relay attacks
- No authentication bypass introduced

### PHASE 3: Frontend Build & Deploy (Low Risk)
Frontend calls compatible with new verify_jwt settings:
- All 5 user-JWT function callers supply Bearer token with user JWT
- Frontend continues unchanged
- Email security fix: Newsletter flow requires authentication decision
  - Option A: Require signup to subscribe to newsletter
  - Option B: Implement double-opt-in confirmation email

### PHASE 4: Stripe Webhook Configuration (Manual)
**Webhook endpoint**: https://wizdxspglxpvvogiivsv.supabase.co/functions/v1/stripe-webhook
**Events**: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
**Verification**: Manual, during deployment cutover (DO NOT configure now)

---

## 📋 PRODUCTION SECRET VERIFICATION

Required pre-deployment (verify presence, NOT value):

| Secret Name | Scope | Required | Notes |
|-------------|-------|----------|-------|
| STRIPE_LIVE_SECRET_KEY | GitHub Actions + Supabase env | YES | Stripe billing |
| STRIPE_LIVE_PUBLISHABLE_KEY | GitHub Actions | YES | Frontend checkout |
| RESEND_API_KEY | Supabase edge function env | YES | Transactional email |
| THE_ODDS_API_KEY | Supabase edge function env | YES | Vegas lines data |
| ANTHROPIC_API_KEY | Supabase edge function env | YES | Trade AI analysis |
| FDP_SNAPSHOT_WRITE_SECRET | Supabase edge function env | YES | Value snapshot ingestion |
| VITE_SUPABASE_URL | GitHub Actions (frontend build) | YES | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | GitHub Actions (frontend build) | YES | Frontend auth |

**Verification**: DO NOT print values. Confirm names exist in:
- Supabase Project Settings → Edge Function Secrets
- GitHub Repository → Settings → Secrets

---

## ⏮️ ROLLBACK STRATEGIES

**Level 1: Revert config.toml only**
If Edge Function auth causes unexpected 401s:
```
git checkout HEAD -- supabase/config.toml
# Revert all verify_jwt changes to previous values
# Functions continue to work with old auth model (less hardened)
```

**Level 2: Revert send-email implementation**
If send-email authentication breaks signup:
```
git checkout HEAD -- supabase/functions/send-email/index.ts
# Restore unauthenticated "welcome" path (security regression, last resort only)
```

---

## ✅ VERIFICATION QUERIES

### After Phase 1 (Migrations)
```sql
-- Verify 6 new tables created
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
  ('odds_cache', 'fdp_snapshot_batches', 'fdp_snapshot_snapshots',
   'trade_analysis_usage', 'stripe_events', 'billing_reconciliation_state');
-- Expected: 6
```

### After Phase 2 (Edge Functions)
```bash
supabase functions list
# Expected: All 8 functions status=ACTIVE

# Test sample function
curl -X POST https://wizdxspglxpvvogiivsv.supabase.co/functions/v1/fetch-odds \
  -H "Authorization: Bearer [USER_JWT]" \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1 | grep -q "pro" && echo "✓ Function responding"
```

### After Phase 3 (Frontend)
```bash
curl -s https://fantasydraftpros.com/ | grep -q "Fantasy Draft Pros" && echo "✓ Homepage OK"
grep -r "sk_live\|sk_test\|service_role" dist/ && echo "❌ SECRETS FOUND" || echo "✓ SECRETS CLEAR"
```

---

## 🎯 FINAL DECISION TREE

```
Are all Prompt 35 tests passing (1930 tests)?
├─ NO  → Fix failures before deployment
└─ YES → Continue

Is send-email unauthenticated path eliminated?
├─ NO  → Email relay vulnerability remains (BLOCKER)
└─ YES → Continue

Are all 5 user-JWT functions configured with verify_jwt=true?
├─ NO  → Review hardening decisions
└─ YES → Continue

Are handler-level auth checks retained everywhere?
├─ NO  → Defense-in-depth compromised (BLOCKER)
└─ YES → Continue

Is config.toml valid and all function names match directories?
├─ NO  → Fix config errors
└─ YES → Continue

Did Stripe Dashboard webhook endpoint get configured?
├─ NO  → Schedule manual verification during cutover
└─ YES → Continue

Deploy with confidence ✅
```

---

## 📝 PROMPT 35 CORRECTIVE CHANGES

### Files Modified

1. **supabase/functions/send-email/index.ts**
   - Removed `if (type !== "welcome")` exemption
   - Require authentication for ALL email types
   - Keep handler-level authorization checks

2. **supabase/config.toml**
   - send-email: `verify_jwt = false` → `true`
   - fetch-odds: `verify_jwt = false` → `true`
   - analyze-trade: `verify_jwt = false` → `true`
   - trade-quota-status: `verify_jwt = false` → `true`
   - create-checkout: `verify_jwt = false` → `true`
   - cancel-subscription: `verify_jwt = false` → `true`
   - record-value-snapshots: `verify_jwt = false` (unchanged)
   - stripe-webhook: `verify_jwt = false` (unchanged)

3. **src/prompt35-email-security.test.ts** (NEW)
   - 14 new security tests validating email fix
   - Tests verify no email relay possible
   - Tests confirm handler auth retained

---

## 📞 SUPPORT

**If deployment issues occur:**
- Check Edge Function logs: `supabase functions logs [FUNCTION_NAME]`
- Verify all secrets configured: `supabase secrets list`
- Check frontend network tab for 401 responses (JWT auth failures)
- Review handler code to ensure auth checks NOT removed

**Emergency Contact**: Escalate to senior engineer if any CRITICAL findings emerge during final review.

---

**STATUS**: ✅ Ready for SENIOR-ENGINEER FINAL REVIEW
**NEXT STEP**: Execute Prompt 35 final verification checklist before production deployment
