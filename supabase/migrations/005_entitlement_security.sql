-- Migration: 005_entitlement_security
-- Implements column-level privileges + RLS for public.users
-- Prevents authenticated users from self-escalating entitlements
-- Preserves service-role and legitimate profile reads/writes

-- ================================================================
-- PHASE 1: Column-Level Write Protection
-- ================================================================

-- REVOKE broad UPDATE privilege from authenticated role
-- Prevents any direct UPDATE on public.users by authenticated users
REVOKE UPDATE ON public.users FROM authenticated;

-- Note: No GRANT UPDATE needed.
-- App does not perform legitimate client-side profile edits.
-- signup_ip and signup_visitor_id are updated server-side only (during signup).
-- All other updates are via Stripe webhooks (service-role writes).

-- ================================================================
-- PHASE 2: Preserve Row-Level Security for Reads
-- ================================================================

-- SELECT policy already exists from 001_users.sql
-- Users can still read their own row
-- CREATE POLICY "users_select_own" ON public.users
--   FOR SELECT USING (auth.uid() = id);

-- ================================================================
-- PHASE 3: Verify Protected Columns
-- ================================================================

-- Protected Server-Managed Columns (no authenticated write):
-- plan                    - Stripe webhook manages
-- is_pro                  - Derived from plan via webhook
-- is_admin                - Manual admin grant only
-- subscription_status     - Stripe webhook manages
-- stripe_customer_id      - Stripe creates/manages
-- stripe_subscription_id  - Stripe creates/manages
-- trial_used              - Server tracking only
-- signup_ip               - Server capture during signup (service-role)
-- signup_visitor_id       - Server capture during signup (service-role)

-- User-Editable Columns: NONE
-- The app does not support profile editing via client updates.
-- name, email, etc. remain read-only to authenticated clients.

-- ================================================================
-- PHASE 4: Service Role Bypass (Implicit)
-- ================================================================

-- Service role (used by Edge Functions, webhooks) automatically bypasses RLS.
-- No explicit grant needed.
-- Stripe webhook functions can continue updating all columns.

-- Test this security model:
--
-- As authenticated user (should FAIL):
-- UPDATE public.users SET plan='pro' WHERE id=auth.uid();
-- UPDATE public.users SET is_pro=true WHERE id=auth.uid();
-- UPDATE public.users SET subscription_status='active' WHERE id=auth.uid();
--
-- These should all fail with: ERROR: permission denied for table users
--
-- As service role (should SUCCEED):
-- UPDATE public.users SET plan='pro' WHERE id=user_id;
-- UPDATE public.users SET is_pro=true WHERE id=user_id;
-- UPDATE public.users SET subscription_status='active' WHERE id=user_id;
--
-- These should all succeed (no column restrictions for service role).

-- ================================================================
-- PHASE 5: SELECT Security
-- ================================================================

-- Authenticated users can SELECT their own public.users row (for initial profile load).
-- This remains unchanged from 001_users.sql.
-- Profile data is cached in client localStorage (non-authoritative).
-- Any changes to entitlements must be re-fetched from server.
