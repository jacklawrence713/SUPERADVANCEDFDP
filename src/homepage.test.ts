import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { VALUES_UPDATED_AT, PRODUCT_STATS } from './logic'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpPath = resolve(rootDir, 'afdp.tsx')
const indexPath = resolve(rootDir, 'index.html')

const afdpSrc = readFileSync(afdpPath, 'utf-8')
const indexSrc = readFileSync(indexPath, 'utf-8')

// ── Primary Positioning ──────────────────────────────────────────

describe('homepage: primary positioning', () => {
  it('contains the primary headline "Fantasy Football Decisions"', () => {
    expect(afdpSrc).toContain('Fantasy Football Decisions.')
  })

  it('contains "Powered by Your League"', () => {
    expect(afdpSrc).toContain('Powered by Your League.')
  })

  it('index.html title contains the new positioning', () => {
    expect(indexSrc).toContain('Fantasy Football Decisions Powered by Your League')
  })

  it('index.html meta description mentions league connection', () => {
    const metaMatch = indexSrc.match(/<meta name="description" content="([^"]+)"/)
    expect(metaMatch).not.toBeNull()
    expect(metaMatch![1].toLowerCase()).toContain('connect your league')
  })
})

// ── CTAs ─────────────────────────────────────────────────────────

describe('homepage: CTAs', () => {
  it('has "Connect Your League" CTA', () => {
    expect(afdpSrc).toContain('"Connect Your League"')
  })

  it('has "Analyze a Trade" CTA', () => {
    expect(afdpSrc).toContain('"Analyze a Trade"')
  })

  it('Connect Your League navigates to league import for Pro users', () => {
    // The CTA should reference setTab("league") and setLeagueSubTab("leagimport")
    expect(afdpSrc).toContain('setTab("league");setLeagueSubTab("leagimport")')
  })

  it('Analyze a Trade scrolls to trade form', () => {
    expect(afdpSrc).toContain('data-trade-form')
    expect(afdpSrc).toContain('scrollIntoView')
  })
})

// ── FDP Value Link ───────────────────────────────────────────────

describe('homepage: FDP Value', () => {
  it('links to /fdp-value/ from the homepage section', () => {
    expect(afdpSrc).toContain('href:"/fdp-value/"')
  })

  it('describes FDP Value as 0-9,999 scale', () => {
    // Source uses \\u2013 escape for en-dash, check literal source text
    expect(afdpSrc).toContain('0\\u20139,999')
  })

  it('shows VALUES_UPDATED_AT in FDP Value section', () => {
    expect(afdpSrc).toContain('Last updated: "+VALUES_UPDATED_AT')
  })

  it('FDP Value section mentions format-aware', () => {
    expect(afdpSrc).toContain('Format-Aware')
  })
})

// ── Unsupported Claims Absent ────────────────────────────────────

describe('homepage: unsupported claims absent', () => {
  it('does not claim "#1" without qualification', () => {
    // The old "#1 DYNASTY FANTASY FOOTBALL TRADE CALCULATOR" badge should be gone
    expect(afdpSrc).not.toContain('#1 DYNASTY FANTASY FOOTBALL TRADE CALCULATOR')
  })

  it('does not claim Yahoo as an automatic integration', () => {
    // Yahoo should not appear in SUPPORTED_PLATFORMS
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).not.toContain('Yahoo')
  })

  it('does not claim MFL as a supported automatic integration', () => {
    // MFL exists as a "Coming Soon" import option — that's fine
    // But it should NOT be in PRODUCT_STATS.SUPPORTED_PLATFORMS
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS.join(',')).not.toContain('MFL')
  })

  it('does not claim "trusted by thousands"', () => {
    expect(afdpSrc.toLowerCase()).not.toContain('trusted by thousands')
  })

  it('does not claim "Custom scoring formula builder" in Elite tier', () => {
    expect(afdpSrc).not.toContain('Custom scoring formula builder')
  })

  it('does not claim "API Access" in comparison table', () => {
    expect(afdpSrc).not.toContain('"API Access"')
  })

  it('does not advertise Trade Finder as a homepage standalone feature', () => {
    // Trade Finder should not be in the onboarding flow as a key feature
    const onboardingSection = afdpSrc.slice(
      afdpSrc.indexOf('Welcome to Fantasy Draft Pros'),
      afdpSrc.indexOf("You're All Set!")
    )
    expect(onboardingSection.toLowerCase()).not.toContain('trade finder')
  })
})

// ── Truthful Platform Messaging ──────────────────────────────────

describe('homepage: truthful platform messaging', () => {
  it('Sleeper is listed as supported platform', () => {
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).toContain('Sleeper')
  })

  it('ESPN is listed as supported platform', () => {
    expect(PRODUCT_STATS.SUPPORTED_PLATFORMS).toContain('ESPN')
  })

  it('platform count matches supported platforms array', () => {
    expect(PRODUCT_STATS.PLATFORM_COUNT).toBe(PRODUCT_STATS.SUPPORTED_PLATFORMS.length)
  })

  it('scoring formats count is 3', () => {
    expect(PRODUCT_STATS.SCORING_FORMATS.length).toBe(3)
  })
})

// ── Branding Intact ──────────────────────────────────────────────

describe('homepage: branding identifiers', () => {
  it('contains "Fantasy Draft Pros" brand name', () => {
    expect(afdpSrc).toContain('Fantasy Draft Pros')
  })

  it('uses the FDP purple color', () => {
    expect(afdpSrc).toContain('#7c4dff')
  })

  it('references logo assets', () => {
    expect(afdpSrc).toContain('logo-shield.png')
  })

  it('index.html preserves the brand name', () => {
    expect(indexSrc).toContain('Fantasy Draft Pros')
  })
})

// ── Pricing Unchanged ────────────────────────────────────────────

describe('homepage: pricing behavior unchanged', () => {
  it('Free tier is $0', () => {
    expect(afdpSrc).toContain('"$0"')
  })

  it('Pro tier is $2.99/mo', () => {
    expect(afdpSrc).toContain('"$2.99"')
  })

  it('Elite tier is $9.99/mo', () => {
    expect(afdpSrc).toContain('"$9.99"')
  })

  it('7-day free trial exists', () => {
    expect(afdpSrc).toContain('7-day free trial')
  })
})

// ── Supported Formats on Homepage ────────────────────────────────

describe('homepage: supported formats section', () => {
  it('lists Dynasty format', () => {
    expect(afdpSrc).toContain('"Dynasty"')
  })

  it('lists Redraft format', () => {
    expect(afdpSrc).toContain('"Redraft"')
  })

  it('lists Superflex', () => {
    expect(afdpSrc).toContain('"Superflex"')
  })

  it('lists PPR', () => {
    expect(afdpSrc).toContain('"PPR"')
  })

  it('lists Half PPR', () => {
    expect(afdpSrc).toContain('"Half PPR"')
  })

  it('lists TE Premium', () => {
    expect(afdpSrc).toContain('"TE Premium"')
  })

  it('lists IDP', () => {
    expect(afdpSrc).toContain('"IDP"')
  })
})

// ── Homepage Sections Exist ──────────────────────────────────────

describe('homepage: sections exist', () => {
  it('has Trade Analyzer section', () => {
    expect(afdpSrc).toContain('HOMEPAGE: Trade Analyzer Features')
  })

  it('has League-Aware Decision Tools section', () => {
    expect(afdpSrc).toContain('League-Aware Decision Tools')
  })

  it('has FDP Value section', () => {
    expect(afdpSrc).toContain('HOMEPAGE: FDP Value')
  })

  it('has Rankings & Player Research section', () => {
    expect(afdpSrc).toContain('Rankings & Player Research')
  })

  it('has Trust / Product Facts section', () => {
    expect(afdpSrc).toContain('HOMEPAGE: Trust / Product Facts')
  })
})

// ── SEO ──────────────────────────────────────────────────────────

describe('homepage: SEO metadata', () => {
  it('has canonical URL', () => {
    expect(indexSrc).toContain('<link rel="canonical" href="https://fantasydraftpros.com/"')
  })

  it('has Open Graph tags', () => {
    expect(indexSrc).toContain('og:title')
    expect(indexSrc).toContain('og:description')
    expect(indexSrc).toContain('og:url')
  })

  it('has Twitter Card tags', () => {
    expect(indexSrc).toContain('twitter:title')
    expect(indexSrc).toContain('twitter:description')
  })

  it('has JSON-LD structured data', () => {
    expect(indexSrc).toContain('application/ld+json')
    expect(indexSrc).toContain('schema.org')
  })

  it('OG title matches page title positioning', () => {
    expect(indexSrc).toContain('og:title" content="Fantasy Draft Pros')
  })

  it('JSON-LD featureList mentions FDP Values', () => {
    expect(indexSrc).toContain('FDP Values')
  })
})
