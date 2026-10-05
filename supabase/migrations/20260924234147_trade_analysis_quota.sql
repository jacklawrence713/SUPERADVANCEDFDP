-- Migration: 006_trade_analysis_quota (LIFETIME QUOTA)
-- Implements server-authoritative lifetime Trade Analyzer quota for Free users (3 total per account)
-- Replaces insecure browser-local fdp_tc_v2 with database-backed entitlements
-- FIXES: Atomic admission with advisory locks, stale-worker finalization protection

-- ================================================================
-- PHASE 1: Create Usage/Quota Ledger Table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.trade_analysis_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quota_date DATE NOT NULL,
  request_id UUID NOT NULL,
  request_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('reserved', 'succeeded', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + INTERVAL '5 minutes',
  completed_at TIMESTAMP WITH TIME ZONE,
  result_json JSONB,

  -- Idempotency: same request_id for same logical user request
  CONSTRAINT unique_request_per_user UNIQUE (user_id, request_id)
);

CREATE INDEX idx_trade_analysis_user_date ON public.trade_analysis_usage(user_id, quota_date);
CREATE INDEX idx_trade_analysis_request ON public.trade_analysis_usage(user_id, request_id);
CREATE INDEX idx_trade_analysis_expires ON public.trade_analysis_usage(expires_at)
  WHERE status IN ('reserved', 'failed');

-- ================================================================
-- PHASE 2: Enable RLS — Authenticated Users Cannot Mutate Quota
-- ================================================================

ALTER TABLE public.trade_analysis_usage ENABLE ROW LEVEL SECURITY;

-- Authenticated users can READ their own quota data (for UI display)
CREATE POLICY "trade_analysis_users_select_own" ON public.trade_analysis_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users CANNOT INSERT, UPDATE, or DELETE quota records
CREATE POLICY "trade_analysis_users_cannot_insert" ON public.trade_analysis_usage
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "trade_analysis_users_cannot_update" ON public.trade_analysis_usage
  FOR UPDATE
  USING (false);

CREATE POLICY "trade_analysis_users_cannot_delete" ON public.trade_analysis_usage
  FOR DELETE
  USING (false);

-- ================================================================
-- PHASE 3: Quota Reservation & Finalization Functions (CORRECTED)
-- ================================================================

-- Reserve a quota slot ATOMICALLY with transaction-scoped advisory lock
-- BLOCKING ISSUE #1 FIX: pg_advisory_xact_lock ensures serialization
CREATE OR REPLACE FUNCTION public.reserve_trade_quota(
  p_user_id UUID,
  p_request_id UUID,
  p_request_fingerprint TEXT
)
RETURNS TABLE (success BOOLEAN, error_message TEXT, reservation_id UUID) AS $$
DECLARE
  v_plan TEXT;
  v_today DATE;
  v_succeeded_count INT;
  v_reserved_count INT;
  v_new_id UUID;
  v_lock_key BIGINT;
BEGIN
  -- Get server UTC date (not client clock)
  v_today := (now() AT TIME ZONE 'UTC')::date;

  -- Lifetime quota: serialize all quota admissions for this user,
  -- including requests that cross a UTC date boundary.
  v_lock_key := hashtextextended(p_user_id::text, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  -- Lock is automatically released when the transaction ends.

  -- Fetch authoritative plan from public.users
  SELECT plan INTO v_plan FROM public.users WHERE id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN QUERY SELECT false, 'profile_not_found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Paid users (pro, elite) are not quota-limited
  IF v_plan IN ('pro', 'elite') THEN
    RETURN QUERY SELECT true, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if request_id already exists (idempotency)
  IF EXISTS (
    SELECT 1 FROM public.trade_analysis_usage
    WHERE user_id = p_user_id AND request_id = p_request_id
  ) THEN
    RETURN QUERY SELECT false, 'duplicate_request_id'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Count successful analyses LIFETIME (all time, not just today)
  SELECT COUNT(*) INTO v_succeeded_count
  FROM public.trade_analysis_usage
  WHERE user_id = p_user_id AND status = 'succeeded';

  -- Count active (non-expired) reservations LIFETIME
  -- Note: reservations auto-expire after 5 minutes, so stale reservations don't block new attempts
  SELECT COUNT(*) INTO v_reserved_count
  FROM public.trade_analysis_usage
  WHERE user_id = p_user_id
    AND status = 'reserved'
    AND expires_at > now();

  -- Free limit: 3 total analyses LIFETIME (succeeded + active reservations)
  IF (v_succeeded_count + v_reserved_count) >= 3 THEN
    RETURN QUERY SELECT false, 'lifetime_limit_reached'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Reserve a slot
  v_new_id := gen_random_uuid();
  INSERT INTO public.trade_analysis_usage (
    id, user_id, quota_date, request_id, request_fingerprint, status, created_at, expires_at
  ) VALUES (
    v_new_id, p_user_id, v_today, p_request_id, p_request_fingerprint, 'reserved', now(), now() + INTERVAL '5 minutes'
  );

  RETURN QUERY SELECT true, NULL::TEXT, v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.reserve_trade_quota(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserve_trade_quota(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_trade_quota(UUID, UUID, TEXT) TO service_role;

-- ================================================================

-- Finalize quota after analysis completes (CORRECTED)
-- BLOCKING ISSUE #2 FIX: Verify reservation is not expired before finalizing
CREATE OR REPLACE FUNCTION public.finalize_trade_quota(
  p_user_id UUID,
  p_request_id UUID,
  p_succeeded BOOLEAN,
  p_result_json JSONB DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, error_message TEXT) AS $$
DECLARE
  v_current_status TEXT;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Lifetime quota reservations may legitimately be finalized after a UTC
  -- date boundary, so lookup is keyed by user_id + request_id, not quota_date.
  SELECT status, expires_at INTO v_current_status, v_expires_at
  FROM public.trade_analysis_usage
  WHERE user_id = p_user_id AND request_id = p_request_id;

  IF v_current_status IS NULL THEN
    RETURN QUERY SELECT false, 'reservation_not_found'::TEXT;
    RETURN;
  END IF;

  -- CRITICAL: Prevent stale-worker late finalization
  -- Must verify: (1) not expired, (2) currently reserved, (3) not already finalized
  IF v_expires_at <= now() THEN
    RETURN QUERY SELECT false, 'reservation_expired'::TEXT;
    RETURN;
  END IF;

  IF v_current_status != 'reserved' THEN
    RETURN QUERY SELECT false, 'invalid_state_transition'::TEXT;
    RETURN;
  END IF;

  -- Only allow success if we're actually producing a usable result
  -- Do not allow: failed → succeeded, or other invalid transitions
  UPDATE public.trade_analysis_usage
  SET
    status = CASE WHEN p_succeeded THEN 'succeeded' ELSE 'failed' END,
    completed_at = now(),
    result_json = p_result_json
  WHERE user_id = p_user_id AND request_id = p_request_id
    AND status = 'reserved'
    AND expires_at > now();

  -- Verify the update actually occurred (no race between SELECT and UPDATE)
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'state_changed_during_update'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.finalize_trade_quota(UUID, UUID, BOOLEAN, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_trade_quota(UUID, UUID, BOOLEAN, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_trade_quota(UUID, UUID, BOOLEAN, JSONB) TO service_role;

-- ================================================================

-- Get quota status for Free user
-- Returns: limit_per_day, used_count (succeeded only), reserved_count (active), remaining_count (admission capacity)
CREATE OR REPLACE FUNCTION public.get_trade_quota_status(
  p_user_id UUID
)
RETURNS TABLE (
  limit_per_day INT,
  used_count INT,
  reserved_count INT,
  remaining_count INT,
  quota_date TEXT,
  is_unlimited BOOLEAN
) AS $$
DECLARE
  v_plan TEXT;
  v_today DATE;
  v_used INT;
  v_reserved INT;
BEGIN
  v_today := (now() AT TIME ZONE 'UTC')::date;

  -- Fetch authoritative plan
  SELECT plan INTO v_plan FROM public.users WHERE id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, 0, v_today::TEXT, false;
    RETURN;
  END IF;

  -- Paid users unlimited
  IF v_plan IN ('pro', 'elite') THEN
    RETURN QUERY SELECT 999, 0, 0, 999, v_today::TEXT, true;
    RETURN;
  END IF;

  -- Free users: count SUCCEEDED analyses LIFETIME
  SELECT COUNT(*) INTO v_used
  FROM public.trade_analysis_usage
  WHERE user_id = p_user_id AND status = 'succeeded';

  -- Count active (non-expired) reservations LIFETIME
  SELECT COUNT(*) INTO v_reserved
  FROM public.trade_analysis_usage
  WHERE user_id = p_user_id
    AND status = 'reserved'
    AND expires_at > now();

  -- Admission capacity = 3 - succeeded - active_reserved (lifetime total)
  RETURN QUERY SELECT 3, v_used, v_reserved, GREATEST(0, 3 - v_used - v_reserved), v_today::TEXT, false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_trade_quota_status FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_trade_quota_status FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_trade_quota_status TO service_role;

-- ================================================================
-- PHASE 4: Helper function for idempotent result retrieval
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_trade_analysis_result(
  p_user_id UUID,
  p_request_id UUID,
  p_request_fingerprint TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  error_message TEXT,
  status TEXT,
  result_json JSONB
) AS $$
DECLARE
  v_stored_status TEXT;
  v_stored_fingerprint TEXT;
  v_stored_result JSONB;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Result retrieval is lifetime-scoped by the idempotency key and must keep
  -- working after a UTC date boundary.
  SELECT status, request_fingerprint, result_json, expires_at
  INTO v_stored_status, v_stored_fingerprint, v_stored_result, v_expires_at
  FROM public.trade_analysis_usage
  WHERE user_id = p_user_id AND request_id = p_request_id;

  IF v_stored_status IS NULL THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT, NULL::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- Validate fingerprint matches (idempotency gap fix)
  IF v_stored_fingerprint != p_request_fingerprint THEN
    RETURN QUERY SELECT false, 'request_payload_mismatch'::TEXT, NULL::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- Return status and result if succeeded
  RETURN QUERY SELECT true, NULL::TEXT, v_stored_status, v_stored_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.get_trade_analysis_result(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_trade_analysis_result(UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_trade_analysis_result(UUID, UUID, TEXT) TO service_role;

-- ================================================================
-- PHASE 5: Contract Tests (Static Verification)
-- ================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'trade_analysis_usage';

  IF v_count = 0 THEN
    RAISE EXCEPTION 'trade_analysis_usage table does not exist';
  END IF;
END $$;

DO $$
DECLARE
  v_rls_enabled BOOLEAN;
BEGIN
  SELECT c.relrowsecurity INTO v_rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'trade_analysis_usage'
    AND c.relkind = 'r';

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION 'RLS not enabled on trade_analysis_usage';
  END IF;
END $$;

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'trade_analysis_usage'
      AND constraint_name = 'unique_request_per_user'
  ) INTO v_constraint_exists;

  IF NOT v_constraint_exists THEN
    RAISE EXCEPTION 'UNIQUE constraint (user_id, request_id) does not exist';
  END IF;
END $$;
