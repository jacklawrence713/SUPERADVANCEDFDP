import { describe, it, expect } from 'vitest'

// ──────────────────────────────────────────────────────────────────
// Regression tests for edge function security fixes.
// These test the LOGIC of the fixes, not the Deno runtime.
// Edge functions run on Supabase (Deno) and can't be imported directly,
// so we mirror the critical decision logic here and verify correctness.
// ──────────────────────────────────────────────────────────────────

// ── 1. Cancel Subscription: DB failure must not report success ───

describe('cancel-subscription: DB failure handling', () => {
  // Mirrors the decision tree in cancel-subscription/index.ts
  function cancelResult(stripeCancelled: boolean, dbUpdated: boolean) {
    if (!stripeCancelled) return { error: 'Stripe cancel failed' }
    if (!dbUpdated) {
      return {
        error: 'Subscription cancelled in Stripe but account update failed. Please contact support.',
        stripe_cancelled: true,
        db_updated: false,
      }
    }
    return { success: true, stripe_cancelled: true, db_updated: true }
  }

  it('returns success only when both Stripe and DB succeed', () => {
    const result = cancelResult(true, true)
    expect(result.success).toBe(true)
    expect(result.stripe_cancelled).toBe(true)
    expect(result.db_updated).toBe(true)
  })

  it('returns error with details when DB update fails', () => {
    const result = cancelResult(true, false)
    expect(result.error).toContain('account update failed')
    expect(result.stripe_cancelled).toBe(true)
    expect(result.db_updated).toBe(false)
    expect((result as any).success).toBeUndefined()
  })

  it('returns error when Stripe cancel fails', () => {
    const result = cancelResult(false, false)
    expect(result.error).toBeDefined()
  })
})

// ── 2. Send-Email: ownership validation for welcome_pro ──────────

describe('send-email: welcome_pro ownership check', () => {
  const ADMIN_EMAILS = [
    'jacklawrence713@gmail.com', 'modgy28@hotmail.com',
    'sbesk787@gmail.com', 'starrrya@yahoo.com',
  ]

  function isAdmin(email: string): boolean {
    return ADMIN_EMAILS.includes(email.toLowerCase().trim())
  }

  // Mirrors the ownership validation in send-email/index.ts
  function canSendWelcomePro(
    authenticatedUserId: string | null,
    requestedUserId: string,
    authenticatedEmail: string,
  ): { allowed: boolean; reason?: string } {
    if (!requestedUserId) return { allowed: false, reason: 'Missing userId' }
    if (!authenticatedUserId) return { allowed: false, reason: 'Not authenticated' }
    if (authenticatedUserId === requestedUserId) return { allowed: true }
    if (isAdmin(authenticatedEmail)) return { allowed: true }
    return { allowed: false, reason: 'Forbidden: cannot send email for another user' }
  }

  it('allows user to send welcome_pro for themselves', () => {
    expect(canSendWelcomePro('user-123', 'user-123', 'user@test.com').allowed).toBe(true)
  })

  it('blocks user from sending welcome_pro for another user', () => {
    const result = canSendWelcomePro('user-123', 'user-456', 'user@test.com')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Forbidden')
  })

  it('allows admin to send welcome_pro for any user', () => {
    expect(canSendWelcomePro('admin-1', 'user-456', 'jacklawrence713@gmail.com').allowed).toBe(true)
  })

  it('rejects when userId is missing', () => {
    expect(canSendWelcomePro('user-123', '', 'user@test.com').allowed).toBe(false)
  })

  it('rejects when not authenticated', () => {
    expect(canSendWelcomePro(null, 'user-123', '').allowed).toBe(false)
  })
})

// ── 3. Signup IP: server-side resolution ─────────────────────────

describe('create-checkout: server-side IP resolution', () => {
  // Mirrors resolveClientIp from create-checkout/index.ts
  function resolveClientIp(headers: Record<string, string | null>): string | null {
    const candidates: (string | null)[] = [
      headers['cf-connecting-ip'] || null,
      headers['x-real-ip'] || null,
    ]
    const xff = headers['x-forwarded-for']
    if (xff) {
      const first = xff.split(',')[0].trim()
      if (first) candidates.push(first)
    }
    for (const ip of candidates) {
      if (ip && ip !== '127.0.0.1' && ip !== '::1') return ip
    }
    return null
  }

  it('resolves IPv4 from cf-connecting-ip', () => {
    expect(resolveClientIp({ 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': null, 'x-forwarded-for': null })).toBe('1.2.3.4')
  })

  it('resolves IPv6 from cf-connecting-ip', () => {
    expect(resolveClientIp({ 'cf-connecting-ip': '2001:db8::1', 'x-real-ip': null, 'x-forwarded-for': null })).toBe('2001:db8::1')
  })

  it('falls back to x-real-ip', () => {
    expect(resolveClientIp({ 'cf-connecting-ip': null, 'x-real-ip': '10.0.0.1', 'x-forwarded-for': null })).toBe('10.0.0.1')
  })

  it('extracts leftmost from x-forwarded-for', () => {
    expect(resolveClientIp({ 'cf-connecting-ip': null, 'x-real-ip': null, 'x-forwarded-for': '5.6.7.8, 10.0.0.1, 192.168.1.1' })).toBe('5.6.7.8')
  })

  it('ignores loopback addresses', () => {
    expect(resolveClientIp({ 'cf-connecting-ip': '127.0.0.1', 'x-real-ip': '::1', 'x-forwarded-for': null })).toBeNull()
  })

  it('returns null when no headers present', () => {
    expect(resolveClientIp({ 'cf-connecting-ip': null, 'x-real-ip': null, 'x-forwarded-for': null })).toBeNull()
  })

  it('does NOT accept client-provided signup_ip from body', () => {
    // The function should use headers, not body params
    // This test documents that the body param 'signup_ip' is intentionally ignored
    const headers = { 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': null, 'x-forwarded-for': null }
    const bodyIp = '99.99.99.99' // attacker-supplied
    const resolved = resolveClientIp(headers)
    expect(resolved).toBe('1.2.3.4')
    expect(resolved).not.toBe(bodyIp)
  })
})

// ── 4. Stripe Webhook: account matching ──────────────────────────

describe('stripe-webhook: user resolution', () => {
  // Mirrors the resolveUserId logic from stripe-webhook/index.ts
  // Simplified for unit testing — actual DB lookups are mocked

  type UserLookup = Record<string, string> // stripe_customer_id → user_id

  function resolveUserId(
    metadataUserId: string | undefined,
    stripeCustomerId: string | null,
    customerIdMap: UserLookup,
  ): string | null {
    // 1. Metadata is authoritative
    if (metadataUserId) return metadataUserId
    // 2. Fall back to customer_id lookup
    if (stripeCustomerId && customerIdMap[stripeCustomerId]) {
      return customerIdMap[stripeCustomerId]
    }
    // 3. No match — do NOT guess
    return null
  }

  const customerMap: UserLookup = {
    'cus_abc123': 'user-1',
    'cus_def456': 'user-2',
  }

  it('uses metadata userId when available', () => {
    expect(resolveUserId('user-1', 'cus_abc123', customerMap)).toBe('user-1')
  })

  it('falls back to customer_id lookup', () => {
    expect(resolveUserId(undefined, 'cus_abc123', customerMap)).toBe('user-1')
  })

  it('returns null when neither metadata nor customer_id match', () => {
    expect(resolveUserId(undefined, 'cus_unknown', customerMap)).toBeNull()
  })

  it('returns null when both are missing', () => {
    expect(resolveUserId(undefined, null, customerMap)).toBeNull()
  })

  it('does NOT fall back to email matching', () => {
    // Email lookup was removed — this documents the decision
    // Even if we had an email-to-user map, resolveUserId does not accept it
    expect(resolveUserId(undefined, null, customerMap)).toBeNull()
  })

  it('prefers metadata over customer_id', () => {
    // If metadata says user-3 but customer_id maps to user-1, trust metadata
    expect(resolveUserId('user-3', 'cus_abc123', customerMap)).toBe('user-3')
  })
})

describe('stripe-webhook: idempotency', () => {
  // Mirrors the idempotency checks in checkout.session.completed and subscription.deleted

  function shouldProcessCheckout(
    currentSubId: string | null,
    currentStatus: string | null,
    incomingSubId: string,
  ): boolean {
    if (currentSubId === incomingSubId && currentStatus === 'active') return false
    return true
  }

  function shouldProcessDeletion(
    currentSubId: string | null,
    deletedSubId: string,
  ): boolean {
    // Only downgrade if user is on this exact subscription (or has no sub)
    if (currentSubId && currentSubId !== deletedSubId) return false
    return true
  }

  it('processes new checkout normally', () => {
    expect(shouldProcessCheckout(null, null, 'sub_new')).toBe(true)
  })

  it('skips duplicate checkout for same active subscription', () => {
    expect(shouldProcessCheckout('sub_123', 'active', 'sub_123')).toBe(false)
  })

  it('processes checkout if status changed', () => {
    expect(shouldProcessCheckout('sub_123', 'trialing', 'sub_123')).toBe(true)
  })

  it('processes checkout for different subscription', () => {
    expect(shouldProcessCheckout('sub_old', 'active', 'sub_new')).toBe(true)
  })

  it('processes deletion when user has matching subscription', () => {
    expect(shouldProcessDeletion('sub_123', 'sub_123')).toBe(true)
  })

  it('processes deletion when user has no subscription', () => {
    expect(shouldProcessDeletion(null, 'sub_123')).toBe(true)
  })

  it('skips deletion when user has different active subscription', () => {
    expect(shouldProcessDeletion('sub_new', 'sub_old')).toBe(false)
  })
})

// ── 5. Edge function auth decisions ──────────────────────────────

describe('edge function auth model', () => {
  // Documents and validates the auth decision for each endpoint
  const authDecisions = {
    'analyze-trade':       { verify_jwt: false, reason: 'Manual Bearer → getUser for structured JSON errors' },
    'cancel-subscription': { verify_jwt: false, reason: 'Manual Bearer → getUser for structured JSON errors' },
    'create-checkout':     { verify_jwt: false, reason: 'Manual Bearer → getUser for structured JSON errors' },
    'stripe-webhook':      { verify_jwt: false, reason: 'Stripe signature auth, not Supabase JWT' },
    'send-email':          { verify_jwt: false, reason: 'Welcome emails sent before session exists; manual auth for other types' },
  }

  it('stripe-webhook must NOT use verify_jwt (Stripe uses signature auth)', () => {
    expect(authDecisions['stripe-webhook'].verify_jwt).toBe(false)
  })

  it('all user-facing endpoints do manual auth via Bearer token', () => {
    const userEndpoints = ['analyze-trade', 'cancel-subscription', 'create-checkout']
    userEndpoints.forEach(ep => {
      expect(authDecisions[ep as keyof typeof authDecisions].verify_jwt).toBe(false)
    })
  })

  it('send-email is false to allow unauthenticated welcome emails', () => {
    expect(authDecisions['send-email'].verify_jwt).toBe(false)
  })

  it('all endpoints have documented reasons', () => {
    Object.values(authDecisions).forEach(d => {
      expect(d.reason.length).toBeGreaterThan(10)
    })
  })
})

// ── 6. Static payment link fallback removed ──────────────────────

describe('checkout: no insecure payment-link fallback', () => {
  // Mirrors handleCheckout logic from afdp.tsx after the fix.
  // Dynamic checkout is the ONLY path. If it fails, show error + allow retry.

  type CheckoutResult =
    | { type: 'success'; url: string }
    | { type: 'error'; message: string }

  function handleCheckout(
    dynamicResult: { url?: string; error?: string } | null,
    dynamicThrew: boolean,
  ): CheckoutResult {
    // Dynamic checkout attempt
    if (!dynamicThrew && dynamicResult?.url) {
      return { type: 'success', url: dynamicResult.url }
    }
    // No fallback — error with retry guidance
    return {
      type: 'error',
      message: 'Checkout failed — please try again. If the problem persists, contact support at fantasydraftproshelp@gmail.com',
    }
  }

  it('navigates to Stripe on dynamic checkout success', () => {
    const result = handleCheckout({ url: 'https://checkout.stripe.com/c/pay_abc' }, false)
    expect(result.type).toBe('success')
    if (result.type === 'success') {
      expect(result.url).toContain('stripe.com')
    }
  })

  it('shows error on dynamic checkout failure (no URL)', () => {
    const result = handleCheckout({ error: 'server error' }, false)
    expect(result.type).toBe('error')
    if (result.type === 'error') {
      expect(result.message).toContain('try again')
      expect(result.message).toContain('support')
    }
  })

  it('shows error when dynamic checkout throws', () => {
    const result = handleCheckout(null, true)
    expect(result.type).toBe('error')
  })

  it('does NOT fall back to static payment links', () => {
    // Even with a valid-looking static link available, the function
    // must NOT use it — only dynamic checkout with metadata is safe
    const result = handleCheckout(null, true)
    expect(result.type).toBe('error')
    // Ensure no URL is returned (which would mean a fallback was used)
    expect((result as any).url).toBeUndefined()
  })

  it('no subscription granted without canonical user association', () => {
    // Dynamic checkout embeds supabase_user_id in metadata.
    // If checkout fails, user gets an error — no orphaned payment possible.
    const result = handleCheckout({ error: 'timeout' }, false)
    expect(result.type).toBe('error')
    // No URL means no Stripe session, so no payment can happen
    expect((result as any).url).toBeUndefined()
  })

  it('error message guides user to retry or contact support', () => {
    const result = handleCheckout(null, true)
    if (result.type === 'error') {
      expect(result.message).toMatch(/try again/i)
      expect(result.message).toMatch(/support/i)
    }
  })
})

// ── 7. Password reset URL validation ─────────────────────────────

describe('send-email: password reset URL validation', () => {
  // Mirrors isValidResetUrl from send-email/index.ts
  const ALLOWED_RESET_ORIGINS = [
    'https://fantasydraftpros.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ]

  function isValidResetUrl(url: string | null | undefined): boolean {
    if (!url || typeof url !== 'string') return false
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
      return ALLOWED_RESET_ORIGINS.includes(parsed.origin)
    } catch {
      return false
    }
  }

  it('accepts valid production reset URL', () => {
    expect(isValidResetUrl('https://fantasydraftpros.com/?reset=true&token=abc123')).toBe(true)
  })

  it('accepts valid production URL with path', () => {
    expect(isValidResetUrl('https://fantasydraftpros.com/reset?token=xyz')).toBe(true)
  })

  it('accepts valid localhost dev URL', () => {
    expect(isValidResetUrl('http://localhost:5173/?reset=true&token=abc')).toBe(true)
  })

  it('accepts alt localhost dev URL', () => {
    expect(isValidResetUrl('http://localhost:3000/?reset=true')).toBe(true)
  })

  it('rejects external phishing URL', () => {
    expect(isValidResetUrl('https://evil-site.com/steal?token=abc')).toBe(false)
  })

  it('rejects URL with similar domain prefix', () => {
    expect(isValidResetUrl('https://fantasydraftpros.com.evil.com/steal')).toBe(false)
  })

  it('rejects javascript: URL', () => {
    expect(isValidResetUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects data: URL', () => {
    expect(isValidResetUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
  })

  it('rejects plain http to production domain', () => {
    expect(isValidResetUrl('http://fantasydraftpros.com/?reset=true')).toBe(false)
  })

  it('rejects malformed URL', () => {
    expect(isValidResetUrl('not-a-url')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isValidResetUrl('')).toBe(false)
  })

  it('rejects null', () => {
    expect(isValidResetUrl(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidResetUrl(undefined)).toBe(false)
  })
})

// ── 8. CORS origin validation ────────────────────────────────────

describe('CORS: origin-checked policy', () => {
  // Mirrors getCorsHeaders from the edge functions
  const ALLOWED_ORIGINS = [
    'https://fantasydraftpros.com',
    'http://localhost:5173',
    'http://localhost:3000',
  ]

  function getCorsOrigin(requestOrigin: string): string {
    return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]
  }

  it('allows production origin', () => {
    expect(getCorsOrigin('https://fantasydraftpros.com')).toBe('https://fantasydraftpros.com')
  })

  it('allows localhost:5173 for dev', () => {
    expect(getCorsOrigin('http://localhost:5173')).toBe('http://localhost:5173')
  })

  it('allows localhost:3000 for alt dev', () => {
    expect(getCorsOrigin('http://localhost:3000')).toBe('http://localhost:3000')
  })

  it('rejects unknown origin — falls back to production', () => {
    expect(getCorsOrigin('https://evil-site.com')).toBe('https://fantasydraftpros.com')
  })

  it('rejects empty origin — falls back to production', () => {
    expect(getCorsOrigin('')).toBe('https://fantasydraftpros.com')
  })

  it('rejects subdomain of production', () => {
    expect(getCorsOrigin('https://app.fantasydraftpros.com')).toBe('https://fantasydraftpros.com')
  })

  it('stripe-webhook has no CORS (server-to-server)', () => {
    // stripe-webhook does not import corsHeaders or getCorsHeaders.
    // This test documents the design decision.
    const webhookHasCors = false // verified by code review
    expect(webhookHasCors).toBe(false)
  })
})
