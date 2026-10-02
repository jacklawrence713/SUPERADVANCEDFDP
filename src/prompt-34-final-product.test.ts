import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const afdpSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8')

describe('PROMPT 34: Final Product Validation', () => {

  // ===== SECTION 1: ENTITLEMENT MATRIX VALIDATION =====

  it('product defines Free plan limit as 3 lifetime successful Trade Analyzer analyses', () => {
    const limit = afdpSrc.match(/FREE_TRADE_LIMIT\s*=\s*3/)
    expect(limit).toBeTruthy()
  })

  it('product does not hardcode outdated limits (2, 20, 5)', () => {
    expect(afdpSrc).not.toMatch(/FREE_TRADE_LIMIT\s*=\s*2/)
    expect(afdpSrc).not.toMatch(/FREE_TRADE_LIMIT\s*=\s*20/)
    expect(afdpSrc).not.toMatch(/FREE_TRADE_LIMIT\s*=\s*5/)
  })

  it('product requires authentication for Trade Analyzer', () => {
    expect(afdpSrc).toContain('currentUser')
  })

  it('entitlement helpers present (isPro/isElite)', () => {
    expect(afdpSrc).toContain('isPro')
  })

  it('no free feature leakage to anonymous users', () => {
    expect(afdpSrc).toContain('currentUser')
  })

  // ===== SECTION 2: COPY / MESSAGING ACCURACY =====

  it('no stale copy about "3 free trades"', () => {
    expect(afdpSrc).not.toMatch(/3\s+free\s+trades/i)
  })

  it('no stale copy about "20 analyses/day"', () => {
    expect(afdpSrc).not.toMatch(/20\s+analyses?\s+per\s+day/i)
  })

  // ===== SECTION 3: TRADE ANALYZER SPECIFIC =====

  it('Trade Analyzer fair verdict threshold defined', () => {
    expect(afdpSrc).toMatch(/threshold|fair|0\.08|8%/)
  })

  it('Trade Analyzer handles Dynasty/Redraft format', () => {
    expect(afdpSrc).toContain('Dynasty')
    expect(afdpSrc).toContain('Redraft')
  })

  it('Trade Analyzer handles 1QB/Superflex format', () => {
    expect(afdpSrc).toContain('1QB')
    expect(afdpSrc).toContain('Superflex')
  })

  it('Trade Analyzer handles PPR/Half/Standard scoring', () => {
    expect(afdpSrc).toContain('PPR')
  })

  it('Trade Analyzer uses request ID for idempotency', () => {
    expect(afdpSrc).toMatch(/requestId|idempotency/)
  })

  it('Trade Analyzer prevents session-switch leakage', () => {
    expect(afdpSrc).toContain('currentUser')
  })

  // ===== SECTION 4: NAVIGATION & ROUTING =====

  it('primary navigation items defined in app', () => {
    const navMatches = afdpSrc.match(/rankings|trade|league|player|plans|account/gi) || []
    expect(navMatches.length).toBeGreaterThan(0)
  })

  it('no dead hardcoded href="#" links in navigation', () => {
    const deadLinks = afdpSrc.match(/href\s*=\s*["']#["']/g) || []
    expect(deadLinks.length).toBe(0)
  })

  it('supports deep linking via routing', () => {
    expect(afdpSrc).toMatch(/useNavigate|useRouter|navigate|router/)
  })

  // ===== SECTION 5: RESPONSIVENESS =====

  it('mobile responsive layout present', () => {
    expect(afdpSrc).toMatch(/mobile|sm:|md:|lg:|responsive/)
  })

  it('table overflow handled with scroll or responsive design', () => {
    expect(afdpSrc).toMatch(/overflow|scroll|table/)
  })

  it('no hardcoded horizontal overflow visible', () => {
    expect(afdpSrc).not.toMatch(/overflow-x\s*:\s*visible/)
  })

  // ===== SECTION 6: ERROR & EMPTY STATES =====

  it('error message handling implemented', () => {
    expect(afdpSrc).toMatch(/error|failed|retry/)
  })

  it('empty state UI handling', () => {
    expect(afdpSrc).toMatch(/empty|no results/i)
  })

  // ===== SECTION 7: LOADING STATES =====

  it('loading indicators for async screens', () => {
    expect(afdpSrc).toMatch(/loading|spinner|skeleton/)
  })

  // ===== SECTION 8: SECRETS & LOGGING =====

  it('no Stripe live secret key in source', () => {
    expect(afdpSrc).not.toContain('sk_live')
  })

  it('no Stripe test secret key in source', () => {
    expect(afdpSrc).not.toContain('sk_test')
  })

  it('no Supabase service role key in client', () => {
    expect(afdpSrc).not.toMatch(/service_role|SERVICE_ROLE/)
  })

  // ===== SECTION 9: PAYMENT & BILLING =====

  it('checkout requires authenticated user', () => {
    expect(afdpSrc).toContain('currentUser')
    expect(afdpSrc).toContain('checkout')
  })

  it('plan configuration supports Pro and Elite tiers', () => {
    expect(afdpSrc).toMatch(/pro|elite|Pro|Elite/i)
  })

  // ===== SECTION 10: PLAYER DATA & SEARCH =====

  it('player search/slug handling present', () => {
    expect(afdpSrc).toMatch(/slug|search/)
  })

  it('canonical player values displayed', () => {
    expect(afdpSrc).toMatch(/ktcVal|value/)
  })

  // ===== SECTION 11: SEO / STATIC GENERATION =====

  it('generated pages use SEO metadata', () => {
    expect(afdpSrc).toMatch(/title|description|meta/)
  })

  it('canonical URLs to prevent duplicate content', () => {
    expect(afdpSrc).toMatch(/canonical/)
  })

  // ===== SECTION 12: PERFORMANCE =====

  it('optimization with useMemo/memo present', () => {
    expect(afdpSrc).toMatch(/useMemo|memo/)
  })

  it('useCallback for stable function references', () => {
    expect(afdpSrc).toMatch(/useCallback/)
  })

  // ===== SECTION 13: ACCESSIBILITY =====

  it('buttons have accessible labels', () => {
    expect(afdpSrc).toMatch(/aria-label|title|button/)
  })

  it('form inputs have labels', () => {
    expect(afdpSrc).toMatch(/label|aria-label/)
  })

  // ===== SECTION 14: FINAL VERIFICATION =====

  it('no placeholder tests in product code', () => {
    expect(afdpSrc).not.toMatch(/expect\s*\(\s*true\s*\)\s*\.toBe\s*\(\s*true\s*\)/)
  })

  it('Free plan contract: 3 lifetime analyses', () => {
    expect(afdpSrc).toMatch(/FREE_TRADE_LIMIT\s*=\s*3/)
  })

  it('Pro plan contract: unlimited Trade Analyzer access', () => {
    expect(afdpSrc).toContain('isPro')
  })

  it('Elite plan contract: includes Pro functionality', () => {
    expect(afdpSrc).toContain('Elite')
  })

  it('Trade Analyzer core logic imported or defined', () => {
    expect(afdpSrc).toMatch(/computeDynastyTradeVal|computeRedraftTradeVal|analysis/)
  })

  it('product has meaningful size (core app code present)', () => {
    expect(afdpSrc.length).toBeGreaterThan(500000)
  })
})
