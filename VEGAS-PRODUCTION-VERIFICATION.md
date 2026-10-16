# Vegas Production Verification Checklist

**Production Commit:** 0c951b4
**Changes Deployed:**
- LA/LAR team normalization fix
- Admin entitlement bypass for Vegas odds

---

## AUTOMATED VERIFICATION (Server-Side)

✅ **Code Review:**
- fetch-odds includes: `select("plan,is_admin")`
- fetch-odds checks: `if (!isAdmin && !hasPaidPlan)`
- Admins (is_admin=true) can access regardless of plan value

✅ **Test Coverage:**
- 2115/2115 tests passing (including 8 admin-specific tests)
- Security tests verify admin bypass works
- Live odds parsing tests verify spreads/totals logic

✅ **Deployment:**
- Admin entitlement code deployed at 0c951b4
- fetch-odds Edge Function deployed to production

---

## MANUAL BROWSER VERIFICATION REQUIRED

To complete the verification, you must:

### Step 1: Open Production Site
```
https://fantasydraftpros.com
```

### Step 2: Verify Your Account Status
- Check: Are you logged in?
- Check: Do you have admin or pro access?

### Step 3: Navigate to Vegas Lines
```
Rankings → Vegas Lines → Game Lines
```

### Step 4: Record BEFORE Refresh
```
Current Week: ___
Total Games Shown: ___
Games with numeric Spread: ___
Games with "LINE UNAVAILABLE": ___
Games with numeric O/U: ___
Games with "O/U UNAVAILABLE": ___
Last Updated: ___
Source: (api/cache/unavailable)
```

### Step 5: Click "Check for Lines"
- Button should start showing "Checking..."
- Wait for completion (button returns to normal)

### Step 6: Record AFTER Refresh
```
HTTP Status (from DevTools): ___
Updated Timestamp: ___
New Source: ___
Numeric Spreads (new count): ___
Numeric O/U (new count): ___
Unavailable Count (new): ___
```

### Step 7: Inspect Network Response
Press F12 → Network Tab
- Find: `fetch-odds` request
- Check Response Tab
- Record safe values:
  ```
  HTTP Status: ___
  Response Size: ___ bytes
  error field (if any): ___
  events returned: ___
  events with spread: ___
  events with total: ___
  ```

### Step 8: Check for Errors
Press F12 → Console Tab
```
ReferenceError? ___
TypeError? ___
fetch-odds error? ___
Other errors? ___
```

---

## Possible Results

### STATE A: 403 Forbidden (Admin Fix Not Applied)
```
HTTP 403
error: "insufficient_entitlement"
```
**Action:** Debug why admin code didn't work. Check:
- is_admin field exists in users table
- Deployed function includes admin code
- Database can return is_admin field

### STATE B: 200 OK but Odds Null
```
HTTP 200
odds: { "BUF": { spread: null, total: null } }
source: "api"
```
**Action:** Provider is accessible but not returning spreads/totals. Check:
- Provider API returning markets
- Parser extracting values correctly
- LA/LAR normalization working

### STATE C: 200 OK with Odds, but UI Says Unavailable
```
HTTP 200
odds: { "BUF": { spread: -3.5, total: 45.5 } }
UI shows: "LINE UNAVAILABLE"
```
**Action:** Frontend merge/display bug. Check:
- Frontend receiving response correctly
- Spread/total null checks using !==
- LA team matching

### STATE D: Everything Works
```
HTTP 200
Numeric spreads displaying
Numeric O/U displaying
No console errors
```
**Action:** Deployment successful. No changes needed.

---

## What NOT to Report

- Do NOT include JWT/token
- Do NOT include API key
- Do NOT include user email
- Do NOT include user UUID
- Do NOT include service-role secrets

---

## How to Report Results

Once you've completed manual verification, provide:

```
A. Production SHA: 0c951b4
B. Current account: Admin? (yes/no)
C. Current account: Plan? (free/pro/elite/other)
D. HTTP Status: ___
E. Response contains numeric spreads: (yes/no)
F. Response contains numeric O/U: (yes/no)
G. Frontend displays spreads: (yes/no/unavailable)
H. Frontend displays O/U: (yes/no/unavailable)
I. Console errors: (yes/no) [if yes, list]
J. Exact error (if any): ___

FINAL: [Choose one]
PRODUCTION VERIFIED — LIVE SPREADS AND O/U ARE DISPLAYING
PRODUCTION BACKEND VERIFIED — MANUAL BROWSER CHECK REQUIRED
ADMIN ENTITLEMENT STILL BLOCKED — [reason]
PRODUCTION ODDS STILL UNAVAILABLE — [reason]
```

---

## Current State Summary

**What We Know:**
- ✅ Code deployed with admin entitlement fix
- ✅ LA/LAR normalization fix deployed
- ✅ All tests passing locally
- ✅ All security tests passing
- ⏳ **Live production behavior: UNKNOWN (requires manual verification)**

**Next Step:** Complete manual browser verification above.
