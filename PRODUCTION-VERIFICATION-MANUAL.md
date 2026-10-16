# LIVE PRODUCTION VERIFICATION — MANUAL INSPECTION GUIDE

**Production Commit:** a4e3c9a (verified)
**Edge Function:** Deployed (verified)
**Tests:** 2107/2107 passing (verified)

---

## STEP 1: BACKEND VERIFICATION (Already Confirmed ✅)

**Production SHA:** a4e3c9a ✅
**Edge Function Status:** Deployed ✅
**Code Fix Applied:** LA/LAR team mapping ✅

---

## STEP 2: MANUAL BROWSER VERIFICATION (YOU MUST PERFORM THIS)

**IMPORTANT:** Use a fresh/incognito browser session to avoid cached data.

### A. Open Live Site
```
1. Go to: https://fantasydraftpros.com
2. Click: Rankings
3. Click: Vegas Lines
4. Click: Game Lines
```

### B. Record BEFORE Refresh State

Take a screenshot or note:
- **Week shown:** (should be current week)
- **Total games displayed:** (count them)
- **Games with numeric spreads:** (count them)
- **Games with "LINE UNAVAILABLE":** (count them)
- **Games with numeric O/U:** (count them)
- **Games with "O/U UNAVAILABLE":** (count them)
- **Source shown:** (check for "api" or "cache")
- **Last updated:** (timestamp)

**Example recording:**
```
Week: 5 (Oct 8-12 2026)
Total Games: 15
Numeric Spreads: 0 (BEFORE REFRESH)
LINE UNAVAILABLE: 15
Numeric O/U: 0 (BEFORE REFRESH)
O/U UNAVAILABLE: 15
Source: cache
Last Updated: 2026-10-12 14:30 UTC
```

### C. Click "Check for Lines" Button

1. Look for the green button: **"↻ Check for Lines"**
2. Click it
3. Wait for it to complete (button text should change back to "Check for Lines" and stop showing "Checking...")
4. Wait 2-3 seconds for UI to update

### D. Record AFTER Refresh State

Again note:
- **Updated timestamp:** (should be current time now)
- **Source:** (should be "api" if successful)
- **Numeric spreads:** (should increase from 0)
- **Numeric O/U:** (should increase from 0)
- **Unavailable count:** (should decrease)

**Example EXPECTED result after refresh:**
```
Numeric Spreads: 15
LINE UNAVAILABLE: 0
Numeric O/U: 15
O/U UNAVAILABLE: 0
Source: api
Last Updated: 2026-10-16 13:45 UTC (current time)
```

### E. Inspect Network Tab (Browser Dev Tools)

1. Press `F12` to open Developer Tools
2. Click "Network" tab
3. Filter for: `fetch-odds`
4. Click "Check for Lines" button again
5. Look for the `fetch-odds` request

**What to record:**
- **HTTP Status:** (should be 200)
- **Response size:** (should be > 100 bytes)
- **Response body:** (Click response tab, copy the JSON)

**Expected response structure:**
```json
{
  "odds": {
    "LA": {
      "spread": -2.5,
      "total": 45.5,
      "opp": "KC",
      ...
    },
    "KC": {
      "spread": 2.5,
      "total": 45.5,
      "opp": "LA",
      ...
    },
    // ... 13 more teams for Week 5
  },
  "source": "api",
  "fetchedAt": "2026-10-16T...",
  "stale": false
}
```

### F. Verify LA Rams Specifically

If you see a Rams game in the Vegas Lines display:

1. Look for: **LA @ KC** or **KC @ LA**
2. Verify spread displays (e.g., "-2.5" or "+2.5", NOT "LINE UNAVAILABLE")
3. Verify O/U displays (e.g., "O/U 45.5", NOT "O/U UNAVAILABLE")

In Network response, confirm:
```json
"LA": { "spread": -2.5, "total": 45.5, "opp": "KC" }
```

This proves the LA team mapping fix (LAR → LA) is working.

### G. Check Browser Console

1. Press `F12` → Console tab
2. Look for any red error messages
3. Record any errors exactly as shown

**You should see:** No errors, or only unrelated third-party errors

**You should NOT see:**
- ReferenceError
- TypeError related to odds/spreads
- fetch-odds function errors
- Team normalization errors

---

## CRITICAL SUCCESS CRITERIA

**PASS if ALL of these are true:**

1. ✅ After clicking "Check for Lines", spreads change from "Unavailable" to numeric values
2. ✅ After clicking "Check for Lines", O/U changes from "Unavailable" to numeric values
3. ✅ Network response contains `"source": "api"`
4. ✅ Network response contains numeric `spread` and `total` values
5. ✅ LA Rams game (if present) shows spread + O/U (not Unavailable)
6. ✅ No console errors related to odds/spreads
7. ✅ All 15 Week 5 games show numeric spreads + O/U (or provider has them)

**FAIL if ANY of these are true:**

1. ❌ After refresh, spreads still show "Unavailable"
2. ❌ After refresh, O/U still shows "Unavailable"
3. ❌ Network response has `"source": "unavailable"`
4. ❌ Network response contains `null` spread/total values
5. ❌ LA Rams game shows "Unavailable"
6. ❌ Console shows errors
7. ❌ Provider returns 0 games or empty odds

---

## DETAILED EXAMPLES

### Example 1: What You Should See (PASS)

```
BUF @ MIA
Spread: -3.5
O/U: 45.5
Script: Slight Fav
```

NOT:
```
BUF @ MIA
Spread: LINE UNAVAILABLE
O/U: O/U UNAVAILABLE
```

### Example 2: LA Rams Specific (PASS)

```
LA @ KC
Spread: -2.5
O/U: 45.5
Script: Slight Fav
```

NOT:
```
LAR @ KC
(or)
LA @ KC
Spread: LINE UNAVAILABLE
O/U: O/U UNAVAILABLE
```

### Example 3: Network Response (PASS)

In Browser DevTools → Network → fetch-odds → Response:

```json
{
  "odds": {
    "BUF": {"spread": 3.5, "total": 45.5, "opp": "MIA"},
    "MIA": {"spread": -3.5, "total": 45.5, "opp": "BUF"},
    "LA": {"spread": -2.5, "total": 45.5, "opp": "KC"},
    "KC": {"spread": 2.5, "total": 45.5, "opp": "LA"},
    ...
  },
  "source": "api",
  "fetchedAt": "2026-10-16T13:45:00.000Z"
}
```

---

## REPORTING RESULTS

After completing the manual verification, report:

**A.** Production SHA: a4e3c9a ✅
**B.** Pages build: (check status)
**C.** Current week: (what week number)
**D.** Games displayed: (count)
**E.** Numeric spreads BEFORE refresh: (count)
**F.** Numeric O/U BEFORE refresh: (count)
**G.** Unavailable counts BEFORE refresh: (count each)
**H.** Check for Lines result: (success/failure)
**I.** Network HTTP status: (200/error)
**J.** Provider event count: (how many games in response)
**K.** Provider spread count: (non-null spreads)
**L.** Provider total count: (non-null totals)
**M.** Numeric spreads AFTER refresh: (count)
**N.** Numeric O/U AFTER refresh: (count)
**O.** Unavailable counts AFTER refresh: (count)
**P.** 3 example games: (show the actual displays)
**Q.** LA Rams: (working/broken)
**R.** Console errors: (none/list exactly)

**FINAL:**
```
PRODUCTION VERIFIED — LIVE SPREADS AND O/U ARE DISPLAYING
```

or

```
PRODUCTION ODDS STILL UNAVAILABLE — [exact reason from your observations]
```

---

## NOTES

- The fix (LA/LAR) is definitely deployed at a4e3c9a
- The edge function is definitely deployed
- The tests prove the logic is sound
- **The only remaining question is: Does the provider actually have spreads/totals data right now?**
- If the network response shows numeric values but the UI doesn't, that's a frontend bug
- If the network response shows `null` values, that's an edge function/provider issue
- If the network request fails or returns 401/403, that's an auth issue

---

## DO NOT:
- ❌ Modify any code
- ❌ Restart the server
- ❌ Clear the database
- ❌ Redeploy functions
- ❌ Just check the source code (you must see rendered UI)

Just observe and report what you see.
