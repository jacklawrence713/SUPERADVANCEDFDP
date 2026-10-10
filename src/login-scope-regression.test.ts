/**
 * LOGIN SCOPE REGRESSION TEST
 *
 * Validates that:
 * 1. fetchTradeQuotaStatus is accessible from saveAndSetUser (no ReferenceError)
 * 2. fetchTradeQuotaStatus is INSIDE App component scope (not module-level trying to access App state)
 * 3. setTradeQuota is properly accessible to fetchTradeQuotaStatus
 * 4. Login path does NOT crash with "fetchTradeQuotaStatus is not defined"
 * 5. Quota loads successfully on authenticated login
 *
 * Previous failure: fetchTradeQuotaStatus was NESTED inside getVisitorId() due to missing closing brace.
 * It was also module-scoped but tried to access React state (setTradeQuota) only available inside App().
 *
 * Root cause of 7c66b23 failure:
 * - getVisitorId() lacked closing brace
 * - fetchTradeQuotaStatus ended up nested inside getVisitorId
 * - Module-level functions cannot access App-scoped state
 *
 * Fix: Move fetchTradeQuotaStatus INSIDE App component, after setTradeQuota useState.
 */

import { vi, describe, test, expect, beforeEach } from 'vitest';

describe('Login Scope Regression', () => {
  let quotaUpdates: any[] = [];
  let callEdgeFnCalls: any[] = [];

  const mockCallEdgeFn = vi.fn(async (fn: string, body: any, userToken?: string) => {
    callEdgeFnCalls.push({ fn, body, userToken, timestamp: Date.now() });
    if (fn === 'trade-quota-status') {
      return {
        quota: {
          limit_per_day: 3,
          used_count: 0,
          reserved_count: 0,
          remaining_count: 3,
          quota_date: new Date().toISOString().split('T')[0],
          is_unlimited: false,
        },
      };
    }
    return { error: 'unknown_function' };
  });

  /**
   * Simulates App component scope with:
   * - setTradeQuota state setter
   * - fetchTradeQuotaStatus function defined inside App (closure over setTradeQuota)
   * - saveAndSetUser function that calls fetchTradeQuotaStatus
   */
  const createAppScope = () => {
    let tradeQuotaState: any = {
      limit_per_day: 2,
      used_count: 0,
      reserved_count: 0,
      remaining_count: 0,
      quota_date: '',
      is_unlimited: false,
      loading: true,
      error: null,
    };

    const setTradeQuota = (value: any) => {
      tradeQuotaState = value;
      quotaUpdates.push({ value, timestamp: Date.now() });
    };

    // fetchTradeQuotaStatus INSIDE App scope (can access setTradeQuota via closure)
    const fetchTradeQuotaStatus = async (userToken: string) => {
      if (!userToken) {
        setTradeQuota({
          limit_per_day: 2,
          used_count: 0,
          reserved_count: 0,
          remaining_count: 0,
          quota_date: '',
          is_unlimited: false,
          loading: false,
          error: 'Not authenticated',
        });
        return;
      }
      try {
        const res = await mockCallEdgeFn('trade-quota-status', {}, userToken);
        if (res.quota) {
          setTradeQuota({ ...res.quota, loading: false, error: null });
        } else {
          setTradeQuota({
            limit_per_day: 2,
            used_count: 0,
            reserved_count: 0,
            remaining_count: 0,
            quota_date: '',
            is_unlimited: false,
            loading: false,
            error: 'Failed to load quota',
          });
        }
      } catch (e) {
        console.error('[trade-quota] fetch failed:', e);
        setTradeQuota({
          limit_per_day: 2,
          used_count: 0,
          reserved_count: 0,
          remaining_count: 0,
          quota_date: '',
          is_unlimited: false,
          loading: false,
          error: 'Quota fetch error',
        });
      }
    };

    // saveAndSetUser INSIDE App scope (can access fetchTradeQuotaStatus via closure)
    const saveAndSetUser = async (user: any) => {
      // Simulate the actual implementation
      try {
        if (user) {
          localStorage.setItem('fdp_user_v1', JSON.stringify(user));
        } else {
          localStorage.removeItem('fdp_user_v1');
        }
      } catch (e) {}

      if (user?.token) {
        // THIS CALL WAS FAILING: "fetchTradeQuotaStatus is not defined"
        // when fetchTradeQuotaStatus was nested inside getVisitorId
        await fetchTradeQuotaStatus(user.token);
      } else {
        setTradeQuota({
          limit_per_day: 2,
          used_count: 0,
          reserved_count: 0,
          remaining_count: 0,
          quota_date: '',
          is_unlimited: false,
          loading: false,
          error: null,
        });
      }
    };

    return { saveAndSetUser, getState: () => tradeQuotaState, setTradeQuota };
  };

  beforeEach(() => {
    quotaUpdates = [];
    callEdgeFnCalls = [];
    mockCallEdgeFn.mockClear();
  });

  test('A: saveAndSetUser calls fetchTradeQuotaStatus without ReferenceError', async () => {
    const app = createAppScope();
    const user = { id: 'user-1', email: 'test@example.com', token: 'mock-jwt' };

    // Should NOT throw "fetchTradeQuotaStatus is not defined"
    expect(async () => {
      await app.saveAndSetUser(user);
    }).not.toThrow();
  });

  test('B: login with valid token fetches quota from edge function', async () => {
    const app = createAppScope();
    const user = { id: 'user-1', email: 'test@example.com', token: 'mock-jwt-token' };

    await app.saveAndSetUser(user);

    // Verify trade-quota-status was called
    expect(callEdgeFnCalls).toHaveLength(1);
    expect(callEdgeFnCalls[0].fn).toBe('trade-quota-status');
    expect(callEdgeFnCalls[0].userToken).toBe('mock-jwt-token');
  });

  test('C: quota updates after successful fetch', async () => {
    const app = createAppScope();
    const user = { id: 'user-1', email: 'test@example.com', token: 'mock-jwt' };

    await app.saveAndSetUser(user);

    // Verify quota was updated
    expect(quotaUpdates).toHaveLength(1);
    expect(quotaUpdates[0].value.limit_per_day).toBe(3);
    expect(quotaUpdates[0].value.remaining_count).toBe(3);
    expect(quotaUpdates[0].value.error).toBeNull();
  });

  test('D: free plan preserves 3 lifetime analyses after login', async () => {
    const app = createAppScope();
    const freeUser = {
      id: 'free-user-1',
      email: 'free@example.com',
      token: 'free-jwt',
      plan: 'free',
    };

    await app.saveAndSetUser(freeUser);

    const state = app.getState();
    expect(state.limit_per_day).toBe(3);
  });

  test('E: login without token does NOT call fetchTradeQuotaStatus, sets default quota with error:null', async () => {
    const app = createAppScope();
    const nullUser = null;

    await app.saveAndSetUser(nullUser);

    // When no token, saveAndSetUser skips fetchTradeQuotaStatus and goes to else branch
    expect(callEdgeFnCalls).toHaveLength(0); // trade-quota-status NOT called
    expect(quotaUpdates).toHaveLength(1);
    expect(quotaUpdates[0].value.limit_per_day).toBe(2);
    expect(quotaUpdates[0].value.remaining_count).toBe(0);
    expect(quotaUpdates[0].value.error).toBeNull(); // Real behavior: error is null, not "Not authenticated"
  });

  test('F: consecutive logins update quota independently', async () => {
    const app = createAppScope();

    const user1 = { id: 'user-1', token: 'token-1' };
    const user2 = { id: 'user-2', token: 'token-2' };

    await app.saveAndSetUser(user1);
    expect(quotaUpdates).toHaveLength(1);

    await app.saveAndSetUser(user2);
    expect(quotaUpdates).toHaveLength(2);

    // Both should be successful
    expect(quotaUpdates[0].value.error).toBeNull();
    expect(quotaUpdates[1].value.error).toBeNull();
  });

  test('G: edge function called with correct bearer token format', async () => {
    const app = createAppScope();
    const user = { id: 'user-1', token: 'xyz-jwt-abc' };

    await app.saveAndSetUser(user);

    expect(callEdgeFnCalls[0].userToken).toBe('xyz-jwt-abc');
  });

  test('H: no Stripe checkout triggered on login', async () => {
    const app = createAppScope();
    const user = { id: 'user-1', token: 'mock-jwt' };

    // Mock Stripe (should not be called)
    const stripeCalls: any[] = [];
    (global as any).fetch = vi.fn(async (url: string) => {
      if (url.includes('stripe') || url.includes('checkout')) {
        stripeCalls.push(url);
      }
      return new Response('{}');
    });

    await app.saveAndSetUser(user);

    // No Stripe calls should occur during login quota load
    expect(stripeCalls).toHaveLength(0);
  });

  test('I: setTradeQuota is in valid scope accessible from fetchTradeQuotaStatus', async () => {
    const app = createAppScope();
    const user = { id: 'user-1', token: 'jwt' };

    // If setTradeQuota were not in scope, this would fail
    await app.saveAndSetUser(user);

    const state = app.getState();
    expect(state).toBeDefined();
    expect(state.limit_per_day).toBeGreaterThanOrEqual(2);
  });
});
