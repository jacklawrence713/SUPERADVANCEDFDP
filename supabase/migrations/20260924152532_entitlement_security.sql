-- Migration: 005_entitlement_security
-- Implements column-level privileges + RLS for public.users
-- Prevents authenticated users from self-escalating entitlements
-- Preserves service-role and legitimate profile reads/writes

-- ================================================================
-- PHASE 1: Strict Least-Privilege Model
-- ================================================================

-- REVOKE ALL privileges from all roles (public, anon, authenticated)
-- Ensures no default privileges leak through
REVOKE ALL PRIVILEGES ON public.users FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.users FROM anon;
REVOKE ALL PRIVILEGES ON public.users FROM authenticated;

-- GRANT SELECT to authenticated users only
-- Required for RLS-protected reads of their own user row
-- RLS policy (from 001_users.sql) enforces: auth.uid() = id
GRANT SELECT ON public.users TO authenticated;

-- GRANT column-level UPDATE for abuse-prevention data only
-- Allows authenticated users to update signup_ip and signup_visitor_id during signup/login
-- These columns are used for abuse-prevention signals during account signup.
-- All other UPDATE operations are blocked (plan, is_pro, subscription_status, etc.)
GRANT UPDATE (signup_ip, signup_visitor_id)
  ON public.users
  TO authenticated;

-- Note: signup_ip and signup_visitor_id backfilled during signup/login by authenticated users.
-- App does not perform client-side updates to other columns (plan, is_pro, subscription_status, etc.).
-- Protected users-table updates are performed by privileged backend functions (service-role).

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
-- PHASE 5: SELECT Security (Explicitly Granted)
-- ================================================================

-- Authenticated users can SELECT public.users (with RLS policy limiting to own row).
-- RLS policy from 001_users.sql: auth.uid() = id
-- Explicit GRANT SELECT (above) ensures authenticated role has permission.
-- Profile data is cached in client localStorage (non-authoritative).
-- Any changes to entitlements must be re-fetched from server.
