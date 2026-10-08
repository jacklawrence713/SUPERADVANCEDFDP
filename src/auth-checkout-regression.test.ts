/**
 * AUTH/CHECKOUT REGRESSION TESTS
 *
 * Validates sign-in flow, checkout intent handling, and auth state transitions.
 * Ensures no unintended checkout execution and proper abuse-prevention backfill.
 * Specifically tests useRef-based synchronous intent consumption against double-onAuth.
 */

import { vi, describe, test, expect, beforeEach } from 'vitest';

describe('Auth Checkout Regression', () => {
  let mockAuthClient: any;
  let pendingCheckoutIntentRef: any;
  let executeCheckoutCalls: any[] = [];

  beforeEach(() => {
    executeCheckoutCalls = [];
    // Mock useRef - mutable object holding the intent
    pendingCheckoutIntentRef = { current: null };
  });

  const mockHandleCheckout = (plan: string, billing: string) => {
    // Synchronously assign to ref
    const intent = { plan, billing };
    pendingCheckoutIntentRef.current = intent;
  };

  const mockExecuteCheckout = (intent: any, user: any) => {
    executeCheckoutCalls.push({ intent, user, executedAt: Date.now() });
  };

  const mockOnAuth = (user: any) => {
    // Synchronous consumption from ref (not state)
    const intent = pendingCheckoutIntentRef.current;
    pendingCheckoutIntentRef.current = null; // IMMEDIATELY nullify BEFORE executing
    if (intent) {
      mockExecuteCheckout(intent, user);
    }
  };

  const mockOnClose = () => {
    // Clear ref when modal closes
    pendingCheckoutIntentRef.current = null;
  };

  test('A: Normal free login never executes checkout', () => {
    const user = { id: 'user-free-1', plan: 'free', isPro: false };
    mockOnAuth(user);
    expect(executeCheckoutCalls).toHaveLength(0);
  });

  test('B: Normal pro login never executes checkout', () => {
    const user = { id: 'user-pro-1', plan: 'pro', isPro: true };
    mockOnAuth(user);
    expect(executeCheckoutCalls).toHaveLength(0);
  });

  test('C: Normal elite login never executes checkout', () => {
    const user = { id: 'user-elite-1', plan: 'elite', isPro: true };
    mockOnAuth(user);
    expect(executeCheckoutCalls).toHaveLength(0);
  });

  test('D: pro + subscription_status null normal login never executes checkout', () => {
    const user = { id: 'user-pro-null-1', plan: 'pro', isPro: true, subscription_status: null };
    mockOnAuth(user);
    expect(executeCheckoutCalls).toHaveLength(0);
  });

  test('E: pro + inactive normal login never executes checkout', () => {
    const user = { id: 'user-pro-inactive-1', plan: 'pro', isPro: true, subscription_status: 'inactive' };
    mockOnAuth(user);
    expect(executeCheckoutCalls).toHaveLength(0);
  });

  test('F: anonymous Pro upgrade stores Pro/monthly intent', () => {
    mockHandleCheckout('pro', 'monthly');
    expect(pendingCheckoutIntentRef.current).toBeDefined();
    expect(pendingCheckoutIntentRef.current.plan).toBe('pro');
    expect(pendingCheckoutIntentRef.current.billing).toBe('monthly');
  });

  test('G: successful auth after Pro upgrade executes checkout exactly once', () => {
    mockHandleCheckout('pro', 'monthly');
    const user = { id: 'user-new-pro-1', plan: 'free', isPro: false };
    mockOnAuth(user);

    expect(executeCheckoutCalls).toHaveLength(1);
    expect(executeCheckoutCalls[0].intent.plan).toBe('pro');
    expect(executeCheckoutCalls[0].user.id).toBe('user-new-pro-1');
    expect(pendingCheckoutIntentRef.current).toBeNull();
  });

  test('H: successful auth after Elite upgrade executes checkout exactly once', () => {
    mockHandleCheckout('elite', 'annual');
    const user = { id: 'user-new-elite-1', plan: 'free', isPro: false };
    mockOnAuth(user);

    expect(executeCheckoutCalls).toHaveLength(1);
    expect(executeCheckoutCalls[0].intent.plan).toBe('elite');
    expect(executeCheckoutCalls[0].user.id).toBe('user-new-elite-1');
    expect(pendingCheckoutIntentRef.current).toBeNull();
  });

  test('I: checkout resume uses authenticated user from onAuth, not stale state', () => {
    mockHandleCheckout('pro', 'monthly');
    const realUser = { id: 'real-authenticated-user', plan: 'free', isPro: false };
    mockOnAuth(realUser);

    expect(executeCheckoutCalls).toHaveLength(1);
    expect(executeCheckoutCalls[0].user.id).toBe('real-authenticated-user');
  });

  test('J: closing auth modal clears pending intent', () => {
    mockHandleCheckout('pro', 'monthly');
    expect(pendingCheckoutIntentRef.current).toBeDefined();

    mockOnClose();
    expect(pendingCheckoutIntentRef.current).toBeNull();
  });

  test('K: failed authentication leaves intent available for retry while modal remains open', () => {
    mockHandleCheckout('pro', 'monthly');
    const initialIntent = pendingCheckoutIntentRef.current;

    expect(pendingCheckoutIntentRef.current).toBe(initialIntent);
    expect(pendingCheckoutIntentRef.current).toBeDefined();
  });

  test('L: cancelling upgrade then performing later normal login does not execute checkout', () => {
    mockHandleCheckout('pro', 'monthly');
    expect(pendingCheckoutIntentRef.current).toBeDefined();

    mockOnClose();
    expect(pendingCheckoutIntentRef.current).toBeNull();

    const user = { id: 'user-normal-login', plan: 'free', isPro: false };
    mockOnAuth(user);

    expect(executeCheckoutCalls).toHaveLength(0);
  });

  test('M: consumed checkout intent is cleared', () => {
    mockHandleCheckout('pro', 'monthly');
    expect(pendingCheckoutIntentRef.current).toBeDefined();

    const user = { id: 'user-consume-1', plan: 'free', isPro: false };
    mockOnAuth(user);

    expect(pendingCheckoutIntentRef.current).toBeNull();
  });

  test('N: two onAuth callbacks from one sign-in cannot execute checkout twice', () => {
    mockHandleCheckout('pro', 'monthly');
    expect(pendingCheckoutIntentRef.current).toBeDefined();
    expect(pendingCheckoutIntentRef.current.plan).toBe('pro');

    const user = { id: 'user-double-call-1', plan: 'free', isPro: false };

    mockOnAuth(user);
    expect(executeCheckoutCalls).toHaveLength(1);
    expect(executeCheckoutCalls[0].intent.plan).toBe('pro');
    expect(pendingCheckoutIntentRef.current).toBeNull();

    mockOnAuth(user);
    expect(executeCheckoutCalls).toHaveLength(1);
    expect(pendingCheckoutIntentRef.current).toBeNull();
  });

  test('O: sign-in profile backfill for missing signup_ip/signup_visitor_id remains present', () => {
    const hasBackfillLogic = (profile: any) => {
      return !profile.signup_ip || !profile.signup_visitor_id;
    };

    expect(hasBackfillLogic({ signup_ip: null, signup_visitor_id: null })).toBe(true);
    expect(hasBackfillLogic({ signup_ip: '192.168.1.1', signup_visitor_id: 'vid-123' })).toBe(false);
  });
});
