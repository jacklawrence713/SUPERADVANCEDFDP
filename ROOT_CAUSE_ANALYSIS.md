# Desktop Sidebar Issue — Root Cause Analysis
**Status:** 🔍 PROBABLE CAUSE IDENTIFIED
**Viewport Issue:** 1440×900 desktop width
**Branch:** hotfix/desktop-sidebar-buttons

---

## Code Structure Verified

### Main Container Layout (Line 4676)
```javascript
React.createElement("div",{
  style:{
    display:"flex",
    flexDirection:isDesktop?"row":"column",  // KEY: row on desktop
    overflow:"hidden",
    height:"100vh"
  }
})
```

**Children in order:**
1. **Sidebar** (Line 4950): `width:220, position:sticky, flexShrink:0`
2. **Mobile Nav** (Line 4983): `!isDesktop&&...` (hidden on desktop)
3. **Ticker** (Line 5001): `overflow:hidden, flexShrink:0, NO width`
4. **Main Content** (Line 5015): `flex:1, minWidth:0`

---

## Potential Issue Identified

### The Ticker Layout Problem

**Ticker Container (Outer) - Line 5001:**
```javascript
React.createElement("div", {
  style: {
    overflow:"hidden",
    background:...,
    padding:"6px 0",
    flexShrink:0
    // ⚠️ NO width specified!
    // ⚠️ NOT flex:0 or flex:1
  }
})
```

**On Desktop (flexDirection: row):**
- Sidebar takes: 220px (fixed)
- Mobile nav: hidden (0px)
- **Ticker: ??? (content-based width, flexShrink:0)**
- Main content: `flex:1` (remaining space)

**Problem:**
If ticker width is not properly constrained, it could:
1. Grow to content width (max-content inner div)
2. Push main content off-screen or into narrow strip
3. Make main content unclickable or scrolled out of view

---

## Quick Fix Strategy

The ticker needs to be constrained on flex row layouts. Should be one of:

**Option A - Full Width Ticker:**
```javascript
// Line 5001 - add width property
{style:{overflow:"hidden", ..., width:"100%", flexShrink:0}}
```

**Option B - Flex:0 Auto:**
```javascript
// Line 5001 - let flex algorithm handle it
{style:{overflow:"hidden", ..., flex:"0 1 auto", flexShrink:0}}
```

**Option C - Remove on Desktop (not preferred per requirements):**
Already ruled out - user said "do not remove ticker"

---

## Next Steps

1. **Verify desktop layout at 1440×900**
   - Open DevTools Inspector
   - Check main flex container width/layout
   - Check ticker element width
   - Check main content wrapper width and position

2. **Test sidebar clicks with console logs**
   - Trace logging already added
   - Verify `setTab()` is being called
   - Verify tab state changes
   - Verify page renders

3. **Apply minimal fix**
   - Add width constraint to ticker
   - Test sidebar navigation
   - Verify mobile still works

---

## Investigation Complete

Code locations confirmed:
- Sidebar buttons: Line 4962-4965
- setTab function: Line 2800
- Main content render: Line 5021+
- Ticker container: Line 5001
- Main layout: Line 4676

Ready for focused testing and fix application when approved.

