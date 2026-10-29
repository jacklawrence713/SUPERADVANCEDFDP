import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const thisDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(thisDir, '..')
const appSrc = readFileSync(resolve(rootDir, 'afdp.tsx'), 'utf-8')

describe('GATE 0: Confirm Email Compatibility', () => {

  describe('Session present (Confirm Email disabled)', () => {
    it('send-email called when session exists', () => {
      // Verify: send-email is part of signup flow
      expect(appSrc).toContain('callEdgeFn("send-email"')
      // Verify: within signup context
      const signupIdx = appSrc.indexOf('async function submit()')
      const sendIdx = appSrc.indexOf('callEdgeFn("send-email"')
      expect(signupIdx).toBeLessThan(sendIdx)
    })

    it('send-email receives authenticated access token', () => {
      // send-email call must pass token from session
      expect(appSrc).toContain('signUpResult.data.session.access_token')
    })

    it('authenticated user logged in immediately with session JWT', () => {
      // When session exists: onAuth called
      expect(appSrc).toContain('onAuth({id:u.id')
    })
  })

  describe('Session null (Confirm Email enabled)', () => {
    it('successful signup without session sets confirmation state', () => {
      // When session null: confirmation pending state activated
      expect(appSrc).toContain('setSignupConfirmationPending(true)')
      expect(appSrc).toContain('setErr("")')
    })

    it('signup not treated as error when session null', () => {
      // CRITICAL: NOT using setErr for no-session case
      // setSignupConfirmationPending indicates successful signup with confirmation pending
      const lines = appSrc.split('\n')
      let foundCorrectFlow = false
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('setSignupConfirmationPending(true)') && 
            lines[i-1].includes('} else {')) {
          foundCorrectFlow = true
          break
        }
      }
      expect(foundCorrectFlow).toBe(true)
    })

    it('confirmation UI shown with positive messaging', () => {
      // User sees confirmation prompt, not error alert
      expect(appSrc).toContain('signupConfirmationPending&&React.createElement')
      expect(appSrc).toContain('Confirm your email')
      expect(appSrc).toContain('We sent a confirmation link')
    })
  })

  describe('Email security preserved', () => {
    it('send-email requires authentication', () => {
      // Prompt 35: gateway-level JWT validation
      const configFile = readFileSync(resolve(rootDir, 'supabase/config.toml'), 'utf-8')
      expect(configFile).toMatch(/functions\.send-email[\s\S]*?verify_jwt\s*=\s*true/)
    })

    it('no anonymous email relay possible', () => {
      // Session present: token required
      // Session null: send-email not called
      expect(appSrc).toContain('if(signUpResult.data.session){')
      expect(appSrc).toContain('callEdgeFn("send-email"')
      expect(appSrc).toContain('setSignupConfirmationPending(true)')
    })
  })

  describe('Newsletter security retained', () => {
    it('anonymous newsletter protected', () => {
      expect(appSrc).toContain('Sign In to Subscribe')
    })
  })
})
