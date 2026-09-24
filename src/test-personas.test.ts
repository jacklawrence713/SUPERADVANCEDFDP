/**
 * Test Personas Infrastructure Tests
 *
 * Verifies that test personas conform to expected structure
 * and that production safeguards work correctly.
 *
 * Prompt 25 — Test Accounts Phase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PERSONA_ANONYMOUS,
  PERSONA_FREE,
  PERSONA_PRO,
  PERSONA_ELITE,
  PERSONA_DOWNGRADED,
  validateEnvironmentIsSafe,
  TEST_PERSONAS,
  TestPersona,
  ApplicationProfile,
} from './test-personas';

describe('Test Personas — Structure & Validity', () => {
  describe('PERSONA_ANONYMOUS', () => {
    it('has correct id', () => {
      expect(PERSONA_ANONYMOUS.id).toBe('anonymous');
    });

    it('has empty profile id', () => {
      expect(PERSONA_ANONYMOUS.profile.id).toBe('');
    });

    it('is free tier', () => {
      expect(PERSONA_ANONYMOUS.profile.plan).toBe('free');
      expect(PERSONA_ANONYMOUS.profile.is_pro).toBe(false);
    });

    it('has no entitlements', () => {
      const access = PERSONA_ANONYMOUS.expectedAccess;
      expect(access.rankingsFull).toBe(false);
      expect(access.tradeAnalyzerUI).toBe(false);
      expect(access.tradeAnalyzerAPI).toBe(false);
      expect(access.leagueConnect).toBe(false);
    });

    it('describes purpose in notes', () => {
      expect(PERSONA_ANONYMOUS.notes).toContain('login-required');
    });
  });

  describe('PERSONA_FREE', () => {
    it('is a factory function', () => {
      expect(typeof PERSONA_FREE).toBe('function');
    });

    it('creates persona with correct defaults', () => {
      const free = PERSONA_FREE();
      expect(free.id).toBe('test-free');
      expect(free.profile.plan).toBe('free');
      expect(free.profile.is_pro).toBe(false);
      expect(free.email).toContain('test-localhost');
    });

    it('accepts custom baseId', () => {
      const free = PERSONA_FREE('my-free-user');
      expect(free.id).toBe('my-free-user');
      expect(free.email).toContain('my-free-user');
    });

    it('has consistent profile structure', () => {
      const free = PERSONA_FREE();
      expect(free.profile.stripe_customer_id).toBeUndefined();
      expect(free.profile.subscription_status).toBe('inactive');
      expect(free.profile.created_at).toBeDefined();
    });

    it('documents current behavior in notes', () => {
      const free = PERSONA_FREE();
      expect(free.notes).toContain('localStorage 3/day counter');
      expect(free.notes).toContain('Prompt 28');
    });

    it('allows Trade Analyzer API access (unmetered)', () => {
      const free = PERSONA_FREE();
      expect(free.expectedAccess.tradeAnalyzerAPI).toBe(true);
    });

    it('denies League features (UI-gated)', () => {
      const free = PERSONA_FREE();
      expect(free.expectedAccess.leagueConnect).toBe(false);
      expect(free.expectedAccess.tradeFinder).toBe(false);
      expect(free.expectedAccess.leagueIntelligence).toBe(false);
    });

    it('allows Vegas (current leak)', () => {
      const free = PERSONA_FREE();
      expect(free.expectedAccess.vegasLines).toBe(true);
    });
  });

  describe('PERSONA_PRO', () => {
    it('is a factory function', () => {
      expect(typeof PERSONA_PRO).toBe('function');
    });

    it('creates persona with correct structure', () => {
      const pro = PERSONA_PRO();
      expect(pro.profile.plan).toBe('pro');
      expect(pro.profile.is_pro).toBe(true);
      expect(pro.profile.stripe_customer_id).toBe('cus_test_pro');
      expect(pro.profile.subscription_status).toBe('active');
    });

    it('allows all feature access', () => {
      const pro = PERSONA_PRO();
      const access = pro.expectedAccess;
      expect(access.rankingsFull).toBe(true);
      expect(access.tradeAnalyzerUI).toBe(true);
      expect(access.leagueConnect).toBe(true);
      expect(access.vegasLines).toBe(true);
    });

    it('notes that Pro is same as Elite currently', () => {
      const pro = PERSONA_PRO();
      expect(pro.notes).toContain('identical to Elite');
    });
  });

  describe('PERSONA_ELITE', () => {
    it('is a factory function', () => {
      expect(typeof PERSONA_ELITE).toBe('function');
    });

    it('creates persona with plan=elite', () => {
      const elite = PERSONA_ELITE();
      expect(elite.profile.plan).toBe('elite');
      expect(elite.profile.is_pro).toBe(true);
    });

    it('has distinct Stripe subscription', () => {
      const elite = PERSONA_ELITE();
      expect(elite.profile.stripe_customer_id).toBe('cus_test_elite');
      expect(elite.profile.stripe_subscription_id).toBe('sub_test_elite');
    });

    it('allows all feature access', () => {
      const elite = PERSONA_ELITE();
      const access = elite.expectedAccess;
      expect(access.rankingsFull).toBe(true);
      expect(access.leagueConnect).toBe(true);
    });
  });

  describe('PERSONA_DOWNGRADED', () => {
    it('is a factory function', () => {
      expect(typeof PERSONA_DOWNGRADED).toBe('function');
    });

    it('has free tier but cancelled subscription', () => {
      const downgraded = PERSONA_DOWNGRADED();
      expect(downgraded.profile.plan).toBe('free');
      expect(downgraded.profile.is_pro).toBe(false);
      expect(downgraded.profile.subscription_status).toBe('cancelled');
      expect(downgraded.profile.stripe_customer_id).toBeDefined();
    });

    it('reverts to free access', () => {
      const downgraded = PERSONA_DOWNGRADED();
      const access = downgraded.expectedAccess;
      expect(access.rankingsFull).toBe(false);
      expect(access.leagueConnect).toBe(false);
      expect(access.billingPortal).toBe(false);
    });

    it('describes purpose in notes', () => {
      const downgraded = PERSONA_DOWNGRADED();
      expect(downgraded.notes).toContain('loss of entitlement');
    });
  });
});

describe('Test Personas — Data Integrity', () => {
  const allPersonas = [
    { key: 'anonymous', persona: PERSONA_ANONYMOUS },
    { key: 'free', persona: PERSONA_FREE() },
    { key: 'pro', persona: PERSONA_PRO() },
    { key: 'elite', persona: PERSONA_ELITE() },
    { key: 'downgraded', persona: PERSONA_DOWNGRADED() },
  ];

  it.each(allPersonas)('$key persona has required fields', ({ persona }) => {
    expect(persona).toHaveProperty('id');
    expect(persona).toHaveProperty('description');
    expect(persona).toHaveProperty('email');
    expect(persona).toHaveProperty('profile');
    expect(persona).toHaveProperty('expectedAccess');
    expect(persona).toHaveProperty('notes');
  });

  it.each(allPersonas)('$key profile is valid ApplicationProfile', ({ persona }) => {
    const profile = persona.profile;
    expect(profile).toHaveProperty('id');
    expect(profile).toHaveProperty('email');
    expect(profile).toHaveProperty('name');
    expect(profile).toHaveProperty('plan');
    expect(profile).toHaveProperty('is_pro');
    expect(profile).toHaveProperty('is_admin');
  });

  it.each(allPersonas)('$key has valid plan field', ({ persona }) => {
    const plan = persona.profile.plan;
    expect(['free', 'pro', 'elite']).toContain(plan);
  });

  it.each(allPersonas)('$key expectedAccess is complete', ({ persona }) => {
    const access = persona.expectedAccess;
    expect(access).toHaveProperty('rankingsFull');
    expect(access).toHaveProperty('tradeAnalyzerUI');
    expect(access).toHaveProperty('tradeAnalyzerAPI');
    expect(access).toHaveProperty('leagueConnect');
    expect(access).toHaveProperty('tradeFinder');
    expect(access).toHaveProperty('leagueIntelligence');
    expect(access).toHaveProperty('vegasLines');
    expect(access).toHaveProperty('valueHistory');
    expect(access).toHaveProperty('whyValueChanged');
    expect(access).toHaveProperty('billingPortal');
  });

  it.each(allPersonas)('$key expectedAccess values are booleans', ({ persona }) => {
    const access = persona.expectedAccess;
    Object.values(access).forEach((value) => {
      expect(typeof value).toBe('boolean');
    });
  });

  it.each(allPersonas)('$key notes contain actionable information', ({ persona }) => {
    expect(persona.notes).toBeTruthy();
    expect(persona.notes.length).toBeGreaterThan(10);
  });
});

describe('Test Personas — Tier Logic Verification', () => {
  it('Free has is_pro=false', () => {
    const free = PERSONA_FREE();
    expect(free.profile.is_pro).toBe(false);
  });

  it('Pro has is_pro=true', () => {
    const pro = PERSONA_PRO();
    expect(pro.profile.is_pro).toBe(true);
  });

  it('Elite has is_pro=true', () => {
    const elite = PERSONA_ELITE();
    expect(elite.profile.is_pro).toBe(true);
  });

  it('Pro and Elite both have is_pro=true but different plan', () => {
    const pro = PERSONA_PRO();
    const elite = PERSONA_ELITE();
    expect(pro.profile.is_pro).toBe(true);
    expect(elite.profile.is_pro).toBe(true);
    expect(pro.profile.plan).not.toBe(elite.profile.plan);
    expect(pro.profile.plan).toBe('pro');
    expect(elite.profile.plan).toBe('elite');
  });

  it('Downgraded has is_pro=false like Free', () => {
    const downgraded = PERSONA_DOWNGRADED();
    expect(downgraded.profile.is_pro).toBe(false);
    expect(downgraded.profile.plan).toBe('free');
  });

  it('Downgraded differs from Free by subscription_status', () => {
    const free = PERSONA_FREE();
    const downgraded = PERSONA_DOWNGRADED();
    expect(free.profile.subscription_status).toBe('inactive');
    expect(downgraded.profile.subscription_status).toBe('cancelled');
  });
});

describe('Production Guard — Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('approves local environment (localhost)', () => {
    process.env.VITE_SUPABASE_URL = 'http://localhost:54321';
    const result = validateEnvironmentIsSafe();
    expect(result.isSafe).toBe(true);
    expect(result.environment).toBe('local');
  });

  it('approves local environment (127.0.0.1)', () => {
    process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
    const result = validateEnvironmentIsSafe();
    expect(result.isSafe).toBe(true);
    expect(result.environment).toBe('local');
  });

  it('blocks production project', () => {
    process.env.VITE_SUPABASE_URL = 'https://wizdxspglxpvvogiivsv.supabase.co';
    process.env.APPROVED_STAGING_PROJECT_REF = '';
    const result = validateEnvironmentIsSafe();
    expect(result.isSafe).toBe(false);
    expect(result.environment).toBe('PRODUCTION');
    expect(result.reason).toContain('BLOCKED');
  });

  it('blocks unknown environment', () => {
    process.env.VITE_SUPABASE_URL = 'https://unknown-project.supabase.co';
    process.env.APPROVED_STAGING_PROJECT_REF = '';
    const result = validateEnvironmentIsSafe();
    expect(result.isSafe).toBe(false);
    expect(result.environment).toBe('UNKNOWN');
  });

  it('blocks missing environment', () => {
    process.env.VITE_SUPABASE_URL = '';
    const result = validateEnvironmentIsSafe();
    expect(result.isSafe).toBe(false);
    expect(result.reason).toContain('not set');
  });

  it('approves configured staging project', () => {
    process.env.VITE_SUPABASE_URL = 'https://staging-xyz.supabase.co';
    process.env.APPROVED_STAGING_PROJECT_REF = 'staging-xyz';
    const result = validateEnvironmentIsSafe();
    expect(result.isSafe).toBe(true);
    expect(result.environment).toBe('staging');
  });
});

describe('TEST_PERSONAS Registry', () => {
  it('contains all persona keys', () => {
    expect(TEST_PERSONAS).toHaveProperty('anonymous');
    expect(TEST_PERSONAS).toHaveProperty('free');
    expect(TEST_PERSONAS).toHaveProperty('pro');
    expect(TEST_PERSONAS).toHaveProperty('elite');
    expect(TEST_PERSONAS).toHaveProperty('downgraded');
  });

  it('anonymous returns correct persona', () => {
    const persona = TEST_PERSONAS.anonymous;
    expect(persona.id).toBe('anonymous');
  });

  it('free is a factory function', () => {
    expect(typeof TEST_PERSONAS.free).toBe('function');
  });

  it('pro is a factory function', () => {
    expect(typeof TEST_PERSONAS.pro).toBe('function');
  });

  it('elite is a factory function', () => {
    expect(typeof TEST_PERSONAS.elite).toBe('function');
  });

  it('downgraded is a factory function', () => {
    expect(typeof TEST_PERSONAS.downgraded).toBe('function');
  });
});

describe('Persona Usage Examples — No App Modifications', () => {
  it('Free persona can be used for API testing without code change', () => {
    const freeUser = PERSONA_FREE('integration-test-free');
    // Simulate what a future test might do:
    const mockApiCall = {
      method: 'POST',
      headers: {
        Authorization: `Bearer mock-token-for-${freeUser.profile.id}`,
      },
      body: { trade: 'sideA vs sideB' },
    };
    expect(mockApiCall.headers.Authorization).toContain(freeUser.profile.id);
    // No modification to app code — just uses the persona data
  });

  it('Pro persona can verify feature access without code change', () => {
    const proUser = PERSONA_PRO('integration-test-pro');
    // Future test would check:
    const canAccessLeague = proUser.expectedAccess.leagueConnect;
    expect(canAccessLeague).toBe(true);
    // Persona documents expected behavior without modifying app
  });

  it('Downgraded persona tracks entitlement loss', () => {
    const downgradedUser = PERSONA_DOWNGRADED('integration-test-down');
    const freeUser = PERSONA_FREE('integration-test-free');
    // Both are free tier, but downgraded has subscription history
    expect(downgradedUser.profile.plan).toBe(freeUser.profile.plan);
    expect(downgradedUser.profile.subscription_status).not.toBe(
      freeUser.profile.subscription_status
    );
  });
});

describe('No Hardcoded Bypasses', () => {
  it('Free persona cannot be modified to appear Pro via code check', () => {
    const freeUser = PERSONA_FREE();
    // This test documents that we don't have:
    // if (email === "test@...") isPro = true
    // or similar bypasses
    expect(freeUser.profile.is_pro).toBe(false);
    // The is_pro value must change only through actual data model
    // (public.users table, not via hardcoded logic)
  });

  it('Personas use actual plan field values', () => {
    const free = PERSONA_FREE();
    const pro = PERSONA_PRO();
    const elite = PERSONA_ELITE();
    // Actual field values, not magic values or bypasses
    expect(free.profile.plan).toBe('free');
    expect(pro.profile.plan).toBe('pro');
    expect(elite.profile.plan).toBe('elite');
  });

  it('Test email format is obviously fake', () => {
    const free = PERSONA_FREE();
    const pro = PERSONA_PRO();
    // Emails clearly test emails, not production addresses
    expect(free.email).toContain('@test-localhost');
    expect(pro.email).toContain('@test-localhost');
  });
});
