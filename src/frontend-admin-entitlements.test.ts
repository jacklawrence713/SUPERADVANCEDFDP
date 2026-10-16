/**
 * REGRESSION TEST: Frontend Admin Entitlements
 *
 * Ensures admins can access paid features (Vegas, Value History, etc.)
 * without needing a paid plan (pro/elite).
 *
 * Root cause: Frontend entitlement checks only looked at plan field,
 * not isAdmin flag. This prevented testing and admin usage of features.
 */

import { describe, it, expect } from 'vitest';
import {
  canAccessVegas,
  canAccessValueHistory,
  canAccessWhyValueChanged,
  canAccessLeagueFeatures,
  canAccessUnlimitedTradeAnalyzer,
  isPaidTier,
  isAdmin,
  UserProfile
} from './entitlements';

describe('Frontend Admin Entitlements', () => {

  const freeUser: UserProfile = {
    id: '123',
    email: 'free@example.com',
    name: 'Free User',
    plan: 'free',
    isAdmin: false,
    token: 'token'
  };

  const adminUserFree: UserProfile = {
    id: '456',
    email: 'admin@example.com',
    name: 'Admin',
    plan: 'free',
    isAdmin: true,
    token: 'token'
  };

  const proUser: UserProfile = {
    id: '789',
    email: 'pro@example.com',
    name: 'Pro User',
    plan: 'pro',
    isAdmin: false,
    token: 'token'
  };

  const adminUserPro: UserProfile = {
    id: '012',
    email: 'admin-pro@example.com',
    name: 'Admin Pro',
    plan: 'pro',
    isAdmin: true,
    token: 'token'
  };

  // ── Vegas Lines Entitlement ──────────────────────────────────────────────

  it('Free non-admin user CANNOT access Vegas lines', () => {
    expect(canAccessVegas(freeUser)).toBe(false);
  });

  it('Admin user with free plan CAN access Vegas lines', () => {
    expect(canAccessVegas(adminUserFree)).toBe(true);
  });

  it('Pro user (non-admin) CAN access Vegas lines', () => {
    expect(canAccessVegas(proUser)).toBe(true);
  });

  it('Admin user with pro plan CAN access Vegas lines', () => {
    expect(canAccessVegas(adminUserPro)).toBe(true);
  });

  // ── Value History Entitlement ───────────────────────────────────────────

  it('Free non-admin user CANNOT access Value History', () => {
    expect(canAccessValueHistory(freeUser)).toBe(false);
  });

  it('Admin user with free plan CAN access Value History', () => {
    expect(canAccessValueHistory(adminUserFree)).toBe(true);
  });

  it('Pro user (non-admin) CAN access Value History', () => {
    expect(canAccessValueHistory(proUser)).toBe(true);
  });

  // ── Why Value Changed Entitlement ───────────────────────────────────────

  it('Free non-admin user CANNOT access Why Value Changed', () => {
    expect(canAccessWhyValueChanged(freeUser)).toBe(false);
  });

  it('Admin user with free plan CAN access Why Value Changed', () => {
    expect(canAccessWhyValueChanged(adminUserFree)).toBe(true);
  });

  it('Pro user (non-admin) CAN access Why Value Changed', () => {
    expect(canAccessWhyValueChanged(proUser)).toBe(true);
  });

  // ── League Features Entitlement ──────────────────────────────────────────

  it('Free non-admin user CANNOT access League Features', () => {
    expect(canAccessLeagueFeatures(freeUser)).toBe(false);
  });

  it('Admin user with free plan CAN access League Features', () => {
    expect(canAccessLeagueFeatures(adminUserFree)).toBe(true);
  });

  it('Pro user (non-admin) CAN access League Features', () => {
    expect(canAccessLeagueFeatures(proUser)).toBe(true);
  });

  // ── Unlimited Trade Analyzer Entitlement ─────────────────────────────────

  it('Free non-admin user CANNOT access unlimited Trade Analyzer', () => {
    expect(canAccessUnlimitedTradeAnalyzer(freeUser)).toBe(false);
  });

  it('Admin user with free plan CAN access unlimited Trade Analyzer', () => {
    expect(canAccessUnlimitedTradeAnalyzer(adminUserFree)).toBe(true);
  });

  it('Pro user (non-admin) CAN access unlimited Trade Analyzer', () => {
    expect(canAccessUnlimitedTradeAnalyzer(proUser)).toBe(true);
  });

  // ── Helper Functions ─────────────────────────────────────────────────────

  it('isPaidTier returns false for free user', () => {
    expect(isPaidTier(freeUser)).toBe(false);
  });

  it('isPaidTier returns false for admin with free plan', () => {
    expect(isPaidTier(adminUserFree)).toBe(false);
  });

  it('isPaidTier returns true for pro user', () => {
    expect(isPaidTier(proUser)).toBe(true);
  });

  it('isAdmin returns true for admin user', () => {
    expect(isAdmin(adminUserFree)).toBe(true);
    expect(isAdmin(adminUserPro)).toBe(true);
  });

  it('isAdmin returns false for non-admin user', () => {
    expect(isAdmin(freeUser)).toBe(false);
    expect(isAdmin(proUser)).toBe(false);
  });

  it('Null/undefined profile treated as free tier with no admin', () => {
    expect(isPaidTier(null)).toBe(false);
    expect(isPaidTier(undefined)).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
    expect(canAccessVegas(null)).toBe(false);
    expect(canAccessVegas(undefined)).toBe(false);
  });

});
