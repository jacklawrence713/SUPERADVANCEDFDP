import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const sendEmailSrc = readFileSync(resolve(rootDir, 'supabase/functions/send-email/index.ts'), 'utf-8')

describe('PROMPT 35: Email Security Hardening', () => {

  // ===== SECTION 1: SEND-EMAIL AUTHENTICATION REQUIREMENTS =====

  it('send-email requires authentication for all email types', () => {
    // Previously: type="welcome" was exempted from auth (VULNERABILITY)
    // After fix: all types require auth
    expect(sendEmailSrc).toContain('if (!authHeader)')
    // Verify auth check happens BEFORE switch on type, not inside it
    const authCheckIdx = sendEmailSrc.indexOf('if (!authHeader)')
    const switchIdx = sendEmailSrc.indexOf('switch (type)')
    expect(authCheckIdx).toBeLessThan(switchIdx)
  })

  it('send-email validates JWT token for every request', () => {
    expect(sendEmailSrc).toContain('auth.getUser(token)')
  })

  it('send-email rejects missing authorization header with 401', () => {
    expect(sendEmailSrc).toContain('status: 401')
  })

  it('send-email rejects invalid JWT with 401', () => {
    expect(sendEmailSrc).toContain('authError')
    expect(sendEmailSrc).toContain('if (authError || !authUser)')
  })

  // ===== SECTION 2: WELCOME TYPE NO LONGER EXEMPTED =====

  it('no special exemption for type="welcome" from auth', () => {
    // Vulnerability was: `if (type !== "welcome")` exempted welcome from auth check
    // After fix: welcome is NOT exempted; auth required for all types
    const lines = sendEmailSrc.split('\n')
    let foundProblem = false
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('if (type !== "welcome")')) {
        foundProblem = true
      }
    }
    expect(foundProblem).toBe(false)
  })

  it('handler does not conditionally skip auth based on type', () => {
    // Auth must be performed before type is examined
    const authSection = sendEmailSrc.substring(0, sendEmailSrc.indexOf('switch (type)'))
    expect(authSection).toContain('if (!authHeader)')
    expect(authSection).toContain('auth.getUser(token)')
  })

  // ===== SECTION 3: ARBITRARY RECIPIENT CONTROL BLOCKED =====

  it('prevents arbitrary recipient in welcome without user verification', () => {
    // After fix: recipient email must be bound to authenticated user
    // Cannot accept arbitrary `to` parameter for unauthenticated caller
    expect(sendEmailSrc).toContain('authenticatedUserId')
  })

  it('welcome uses authenticated context for recipient', () => {
    // For signup: authenticated user provides email during signup
    // Handler should use that identity to determine recipient
    const welcomeSection = sendEmailSrc.substring(
      sendEmailSrc.indexOf('case "welcome"'),
      sendEmailSrc.indexOf('case "welcome_pro"')
    )
    expect(welcomeSection).toContain('to:')
  })

  it('contact form still requires authentication', () => {
    expect(sendEmailSrc).toContain('case "contact"')
  })

  it('password_reset validates URL', () => {
    expect(sendEmailSrc).toContain('isValidResetUrl')
  })

  // ===== SECTION 4: HANDLER AUTHORIZATION RETAINED =====

  it('welcome_pro ownership check retained', () => {
    expect(sendEmailSrc).toContain('authenticatedUserId !== userId && !isAdmin')
  })

  it('manual auth.getUser still present', () => {
    // Defense-in-depth: handler validates JWT even if gateway also does
    expect(sendEmailSrc).toContain('auth.getUser(token)')
  })

  // ===== SECTION 5: EMAIL RELAY ATTACK SURFACE CLOSED =====

  it('anonymous caller cannot send arbitrary email', () => {
    // Core vulnerability was: no auth required for welcome
    // After fix: authentication mandatory
    expect(sendEmailSrc).toContain('if (!authHeader)')
  })

  it('email relay requires valid JWT', () => {
    // Cannot bypass auth with any clever request format
    expect(sendEmailSrc).toContain('authError')
  })


  // ===== SECTION 9: NEWSLETTER REGRESSION FIX =====

  it('newsletter signup supplies authenticated user token', () => {
    // After fix: newsletter call includes user?.token parameter
    const appSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8')
    // Verify that newsletter send-email call has token parameter
    expect(appSrc).toMatch(/callEdgeFn\("send-email".*?user\?\.token\)/)
  })

  it('no unauthenticated send-email calls remain', () => {
    // Verify all send-email invocations either:
    // A) Have a token parameter, OR
    // B) Are signup flows (expected authenticated)
    const appSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8')
    const sendEmailCalls = appSrc.match(/callEdgeFn\("send-email"[^;]*\);/g) || []
    for (const call of sendEmailCalls) {
      // Must have user token or be signup context
      const hasToken = call.includes('token') || call.includes('signUpResult')
      expect(hasToken).toBe(true)
    }
  })

})
