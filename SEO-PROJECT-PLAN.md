# FantasyDraftPros SEO Expansion — Project Plan

**Status:** In Progress (Phase 1 ✅ → Phase 2+)
**Author:** Claude Code
**Date:** 2026-10-28

## Project Summary

Increase organic search visibility for FantasyDraftPros by rebuilding the SEO architecture with:
- Dynamic SEO data (no stale hardcoding)
- Central route registry
- Expanded ranking & player discovery pages
- Topical authority hubs
- Strong internal linking
- Schema.org structured data

## Phases Overview

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ DONE | Remove stale SEO data, build dynamic SEO layer |
| 2 | 🔄 IN PROGRESS | Central SEO route registry |
| 3 | ⏳ TODO | Rebuild existing landing pages |
| 4 | ⏳ TODO | Create high-value ranking pages |
| 5 | ⏳ TODO | Player directory architecture |
| 6 | ⏳ TODO | Improve player pages with links |
| 7 | ⏳ TODO | Topical authority hubs |
| 8 | ⏳ TODO | Strategy/intent pages |
| 9 | ⏳ TODO | Trust pages (about, methodology, editorial) |
| 10 | ⏳ TODO | Guides hub |
| 11 | ⏳ TODO | Crawlable homepage links |
| 12 | ⏳ TODO | Sitewide SEO footer |
| 13 | ⏳ TODO | Internal link graph |
| 14 | ⏳ TODO | HTML sitemap |
| 15 | ⏳ TODO | XML sitemap updates |
| 16 | ⏳ TODO | Indexability threshold review |
| 17 | ⏳ TODO | Structured data (Schema.org) |
| 18 | ⏳ TODO | 404 handling |
| 19 | ⏳ TODO | Performance audit |
| 20 | ⏳ TODO | IndexNow support |
| 21 | ⏳ TODO | RSS/Feed |
| 22 | ⏳ TODO | SEO test suite expansion |
| 23 | ⏳ TODO | SEO audit report |

## Phase 1 Summary (DEPLOYED)

**Commit:** 9ed28de
**Changes:**
- Created `src/seo-data.ts` (239 lines) — Dynamic SEO data generation
- Integrated into `vite.config.ts` build pipeline
- Removed stale hardcoded dates/rankings from public HTML
- Generated position ranking pages (QB/RB/WR/TE/DL/LB/DB) with real data
- Generated 1,064 player pages (686 indexed, 378 noindex)
- Generated /fdp-value/ info page
- Exported sitemap.xml with current data

**Current Assets:**
- `src/seo-data.ts` — SeoDataContext, SeoRankedPlayer, generateSeoData()
- `src/seo-consistency.test.ts` — 505 lines of validation tests
- Player pages at `/players/{slug}/`
- Ranking pages at `/rankings/{pos}/`
- Values dated 2026-10-21

## Phase 2 — Central SEO Route Registry (CURRENT)

**Objective:** Create a single source-of-truth for all public SEO routes.

**Deliverables:**
1. `src/seo-routes.ts` — Central registry of all SEO pages
2. Update `vite.config.ts` to use registry for page generation
3. Update `src/seo-consistency.test.ts` to validate against registry
4. Ensure sitemap.xml, navigation, and footer all use registry

**Route Registry Structure:**
```ts
interface SeoRoute {
  slug: string;                  // URL path
  title: string;                 // Page <title>
  description: string;           // meta description
  category: 'ranking'|'tool'|'hub'|'guide'|'authority';
  type?: 'ranking-page'|'player-directory'|'hub-page';
  positionFilter?: string;       // For position-specific pages
  priority?: string;             // sitemap priority
  changefreq?: 'daily'|'weekly'|'monthly';
  contentType?: 'dynamic'|'static';
  requiresBuild?: boolean;
}
```

**Routes to Include:**
- Existing: dynasty-trade-analyzer, trade-calculator, trade-value-chart, rankings
- Position rankings: dynasty-{pos}-rankings
- Player directory: /players/, /players/{pos}/
- Topical hubs: /dynasty-fantasy-football/
- Guides: /guides/...
- Authority: /about/, /methodology/, /editorial-policy/
- Strategy: /dynasty-buy-low/, /dynasty-sell-high/, etc.

## Phase 3 — Rebuild Landing Pages

Regenerate core SEO pages with:
- Unique title/description
- Self-referencing canonical
- Proper H1/H2/H3 structure
- Real data freshness label (VALUES_UPDATED_AT)
- OpenGraph metadata
- Internal links to tools/rankings
- CTA to app features
- BreadcrumbList structured data

**Pages:** /dynasty-trade-analyzer/, /dynasty-trade-calculator/, /dynasty-rankings/, /superflex-trade-calculator/, etc.

## Phase 4 — High-Value Ranking Pages

Create indexable ranking pages:
- `/dynasty-qb-rankings/`
- `/dynasty-rb-rankings/`
- `/dynasty-wr-rankings/`
- `/dynasty-te-rankings/`
- `/idp-dynasty-rankings/` (split DL/LB/DB)
- `/superflex-rankings/`
- `/te-premium-rankings/`
- `/redraft-rankings/` (if supported)

Each must:
- Use real app data (not hardcoded)
- Display 30–50 relevant players
- Include player links to /players/{slug}/
- Explain format-specific differences
- Link to relevant tool/analyzer
- Include current date from VALUES_UPDATED_AT

## Phase 5 — Player Directory

Create crawlable player directories:
- `/players/` — Master index with search/sort
- `/players/qb/` — QB directory
- `/players/rb/` — RB directory
- `/players/wr/` — WR directory
- `/players/te/` — TE directory
- `/players/idp/` — IDP directory

Include position-specific rankings, FDP values, team info.

## Phase 6 — Improve Player Pages

Enhance existing player pages:
- Add position ranking page link
- Add 3-5 comparable player links (real anchors, not text)
- Add trade analyzer CTA
- Add value update date
- Ensure H1 is unique
- Validate structured data

## Phase 7 — Topical Authority Hubs

Create `/dynasty-fantasy-football/` as a comprehensive guide linking to:
- All position rankings
- Trade calculators
- Guides
- Strategy articles
- FDP Value explanation

## Phase 8 — Strategy Pages

Create data-driven pages:
- `/dynasty-buy-low/` — Players with value upside
- `/dynasty-sell-high/` — Players at peak value
- `/dynasty-trade-targets/` — Players worth trading for
- `/dynasty-draft-pick-values/` — Pick value equivalents

Only create if app has real supporting data.

## Phase 9 — Trust Pages

Create authority pages:
- `/about/` — Explain app, tools, formats supported
- `/methodology/` — FDP Value concept, age adjustments, scarcity
- `/editorial-policy/` — Data-driven, corrections process, disclaimers

## Phase 10 — Guides Hub

Create `/guides/` with evergreen articles:
- /guides/how-to-value-a-dynasty-trade/
- /guides/dynasty-trade-calculator-guide/
- /guides/superflex-strategy/
- /guides/te-premium-strategy/
- /guides/idp-dynasty-values/

Quality > quantity. Link to tools internally.

## Phase 11 — Crawlable Homepage Links

Add real HTML anchor tags to homepage/public nav:
- Not just hash routes
- Real `/rankings/qb/`, `/players/`, `/methodology/`, etc.
- Enable crawlers to discover SEO pages

## Phase 12 — Sitewide SEO Footer

Add crawlable footer with sections:
- TOOLS (analyzers, calculators)
- RANKINGS (positions, formats)
- RESEARCH (value, tools, directory)
- GUIDES (strategy articles)
- ABOUT (methodology, editorial)

## Phase 13 — Internal Link Graph

Strengthen contextual links:
- Trade Analyzer → Trade Calculator → Rankings
- Position rankings → player pages → comparable players
- Methodology → rankings → tools
- Guides → tools

## Phase 14 — HTML Sitemap

Create human-readable `/sitemap/` page:
- Organized by category
- Searchable/sortable player directory
- NOT a massive unorganized link dump

## Phase 15 — XML Sitemap

Continue generating `/sitemap.xml`:
- Include all generated pages
- Exclude redirects, noindex, soft 404s
- Use legitimate lastmod values
- Only index-eligible pages

## Phase 16 — Indexability Threshold Review

Current: `INDEX_THRESHOLD = 1000`

Review distribution:
- Total player pages
- Index-eligible count
- Noindex count
- Are all index-eligible pages quality?

Only adjust if justified.

## Phase 17 — Structured Data

Add Schema.org markup:
- Person (player pages)
- BreadcrumbList (hierarchy)
- Article (guides)
- SoftwareApplication (tools)
- Organization (site identity)

## Phase 18 — 404 Handling

Ensure:
- Invalid URLs return noindex, follow
- Don't canonical unknown URLs to homepage
- Preserve SPA routing

## Phase 19 — Performance

Audit SEO pages:
- Minimize blocking JS
- Check image dimensions
- Remove unused CSS
- Don't break app loading

## Phase 20 — IndexNow

Add optional IndexNow notification:
- Environment variable for key
- Post changed URLs after deploy
- Fail gracefully

## Phase 21 — RSS/Feed

Create `/feed.xml` if site has real content updates.

## Phase 22 — SEO Test Suite

Expand `src/seo-consistency.test.ts`:
- Unique H1 per page
- Unique title/description
- Self-referencing canonicals
- No noindex in sitemap
- No redirects in sitemap
- Sitemap URLs have pages
- Homepage links to SEO routes
- Player links to position rankings
- Comparable players are anchor links
- No stale dates
- Valid structured data
- No broken internal links

## Phase 23 — Audit Report

Create `SEO-AUDIT-RESULTS.md`:
- Before/after metrics
- Pages created
- Internal links added
- Structured data added
- Work remaining for manual actions

---

## Non-Negotiables

❌ DO NOT:
- Break authentication, Stripe, Supabase
- Modify core calculations
- Create thin pages or mass generation
- Keyword stuff or hide text
- Invent player data/injuries/news

✅ DO:
- Use real app data only
- Build from single registry
- Strong internal linking
- Focus on quality
- Keep tests passing

---

## Build Commands

```bash
npm run typecheck
npm run test:run
npm run build
```

## Git Strategy

Suggested commits:
1. `seo: central route registry and phase 2 infrastructure`
2. `seo: rebuild landing pages (phase 3)`
3. `seo: expand ranking pages and player discovery (phases 4-6)`
4. `seo: topical authority and internal linking (phases 7-13)`
5. `seo: trust pages, guides, and structured data (phases 9-17)`
6. `seo: complete remaining phases (18-23)`

---

## Next Step

→ Phase 2: Build `src/seo-routes.ts`
