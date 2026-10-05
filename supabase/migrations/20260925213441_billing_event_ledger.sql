-- Migration: 007_billing_event_ledger
-- Implements durable Stripe webhook event tracking with true reconciliation generation
-- UNIQUE(stripe_event_id) ensures same event processed exactly once
-- Reconciliation generation prevents stale-fetch-late-write races
-- processing_state tracks lifecycle: received → processing → success/failed/skipped

-- ================================================================
-- Billing Reconciliation State (tracks generation per subscription)
-- ================================================================
-- Each subscription has its own reconciliation generation counter.
-- Prevents concurrent handlers from applying stale Stripe state.
-- Scoped to subscription (preferred) or customer (fallback for pre-subscription).

CREATE TABLE IF NOT EXISTS public.billing_reconciliation_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope: subscription-scoped (primary), customer-scoped (fallback)
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Reconciliation generation: incremented before each reconciliation attempt
  -- Newer generation supersedes older generation for same subscription
  current_generation BIGINT NOT NULL DEFAULT 0,

  -- Audit timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_recon_sub_id ON public.billing_reconciliation_state(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_recon_cust_id ON public.billing_reconciliation_state(stripe_customer_id);

-- Customer-only fallback rows also need a unique conflict target.
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_recon_customer_fallback
  ON public.billing_reconciliation_state(stripe_customer_id)
  WHERE stripe_subscription_id IS NULL AND stripe_customer_id IS NOT NULL;

-- ================================================================
-- Event Ledger Table: Durable webhook processing history
-- ================================================================

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event identity and audit
  stripe_event_id TEXT UNIQUE NOT NULL,
  stripe_event_type TEXT NOT NULL,
  stripe_event_created BIGINT NOT NULL,  -- Stripe timestamp (audit only, NOT for ordering)

  -- Entity identification
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Processing lifecycle
  processing_state TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_state IN ('received', 'processing', 'success', 'failed', 'skipped', 'superseded')),
  processing_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Reconciliation generation at time of processing
  reconciliation_generation BIGINT,

  -- Attempt tracking
  attempt_count INT DEFAULT 1,

  -- Event data snapshot (for audit and replay debugging)
  event_data JSONB,

  -- Billing state before/after (for reconciliation)
  plan_before TEXT,
  plan_after TEXT,
  subscription_status_before TEXT,
  subscription_status_after TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_user_id ON public.stripe_events(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_customer_id ON public.stripe_events(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_subscription_id ON public.stripe_events(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_state ON public.stripe_events(processing_state);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created ON public.stripe_events(stripe_event_created DESC);

-- ================================================================
-- Begin Billing Reconciliation (allocate generation for subscription)
-- ================================================================
-- Called before fetching current Stripe state.
-- Atomically increments generation for given subscription/customer.
-- Returns the generation that handler must use for finalization.
-- Prevents concurrent handlers from applying stale Stripe snapshots.

CREATE OR REPLACE FUNCTION begin_billing_reconciliation(
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_new_generation BIGINT;
BEGIN
  -- Prefer subscription scope, fall back to customer
  IF p_stripe_subscription_id IS NOT NULL THEN
    -- Subscription-scoped reconciliation
    INSERT INTO public.billing_reconciliation_state (
      stripe_subscription_id,
      stripe_customer_id,
      current_generation,
      updated_at
    ) VALUES (
      p_stripe_subscription_id,
      p_stripe_customer_id,
      1,
      NOW()
    )
    ON CONFLICT (stripe_subscription_id) DO UPDATE SET
      current_generation = current_generation + 1,
      updated_at = NOW()
    RETURNING current_generation INTO v_new_generation;
  ELSIF p_stripe_customer_id IS NOT NULL THEN
    -- Customer-scoped reconciliation (fallback for pre-subscription)
    INSERT INTO public.billing_reconciliation_state (
      stripe_customer_id,
      current_generation,
      updated_at
    ) VALUES (
      p_stripe_customer_id,
      1,
      NOW()
    )
    ON CONFLICT (stripe_customer_id)
      WHERE stripe_subscription_id IS NULL AND stripe_customer_id IS NOT NULL
    DO UPDATE SET
      current_generation = billing_reconciliation_state.current_generation + 1,
      updated_at = NOW()
    RETURNING current_generation INTO v_new_generation;
  ELSE
    RAISE EXCEPTION 'begin_billing_reconciliation requires subscription_id or customer_id';
  END IF;

  RETURN v_new_generation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ================================================================
-- Finalize Billing Reconciliation
REVOKE EXECUTE ON FUNCTION public.begin_billing_reconciliation(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.begin_billing_reconciliation(TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.begin_billing_reconciliation(TEXT, TEXT) TO service_role;

-- ================================================================
-- Finalize Billing Reconciliation (compare-and-apply at write time)
-- ================================================================
-- Atomically:
-- 1. Verify submitted generation is current for subscription
-- 2. If current: update user billing state and mark event processed
-- 3. If superseded: skip write but mark event processed (prevent retry loop)
-- This prevents stale Stripe state from overwriting newer state.

CREATE OR REPLACE FUNCTION finalize_reconciliation(
  p_stripe_event_id TEXT,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_submitted_generation BIGINT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_plan TEXT DEFAULT NULL,
  p_is_pro BOOLEAN DEFAULT NULL,
  p_subscription_status TEXT DEFAULT NULL,
  p_plan_before TEXT DEFAULT NULL,
  p_plan_after TEXT DEFAULT NULL,
  p_subscription_status_before TEXT DEFAULT NULL,
  p_subscription_status_after TEXT DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  generation_current BIGINT,
  generation_submitted BIGINT,
  user_updated BOOLEAN
) AS $$
DECLARE
  v_current_generation BIGINT;
  v_user_updated BOOLEAN := FALSE;
  v_user_update_count INT := 0;
BEGIN
  IF p_submitted_generation IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'finalize_reconciliation requires submitted_generation and user_id';
  END IF;

  -- Lock the reconciliation row so begin/finalize cannot race between
  -- generation comparison and the user-state write.
  IF p_stripe_subscription_id IS NOT NULL THEN
    SELECT current_generation INTO v_current_generation
      FROM public.billing_reconciliation_state
      WHERE stripe_subscription_id = p_stripe_subscription_id
      FOR UPDATE;
  ELSIF p_stripe_customer_id IS NOT NULL THEN
    SELECT current_generation INTO v_current_generation
      FROM public.billing_reconciliation_state
      WHERE stripe_customer_id = p_stripe_customer_id
        AND stripe_subscription_id IS NULL
      FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'finalize_reconciliation requires subscription_id or customer_id';
  END IF;

  -- Check if submitted generation is still current
  IF v_current_generation IS NULL THEN
    v_current_generation := 0;
  END IF;

  -- Only the exact currently allocated generation may write billing state.
  IF p_submitted_generation = v_current_generation THEN
    IF p_plan IS NOT NULL OR p_is_pro IS NOT NULL OR p_subscription_status IS NOT NULL THEN
      UPDATE public.users
        SET
          plan = COALESCE(p_plan, plan),
          is_pro = COALESCE(p_is_pro, is_pro),
          subscription_status = COALESCE(p_subscription_status, subscription_status),
          updated_at = NOW()
        WHERE id = p_user_id;
      GET DIAGNOSTICS v_user_update_count = ROW_COUNT;
      v_user_updated := (v_user_update_count = 1);
    END IF;
  END IF;

  -- Mark event as processed (regardless of generation)
  -- This prevents infinite retry loops while preserving retry capability
  INSERT INTO public.stripe_events (
    stripe_event_id,
    stripe_event_type,
    stripe_event_created,
    stripe_subscription_id,
    stripe_customer_id,
    user_id,
    processing_state,
    reconciliation_generation,
    plan_before,
    plan_after,
    subscription_status_before,
    subscription_status_after
  ) VALUES (
    p_stripe_event_id,
    'reconciliation.finalized',
    EXTRACT(EPOCH FROM NOW())::BIGINT,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_user_id,
    CASE WHEN p_submitted_generation = v_current_generation THEN 'success' ELSE 'superseded' END,
    p_submitted_generation,
    p_plan_before,
    p_plan_after,
    p_subscription_status_before,
    p_subscription_status_after
  )
  ON CONFLICT (stripe_event_id) DO UPDATE SET
    processing_state = CASE
      WHEN stripe_events.processing_state IN ('success', 'superseded') THEN stripe_events.processing_state
      ELSE EXCLUDED.processing_state
    END,
    reconciliation_generation = GREATEST(
      COALESCE(stripe_events.reconciliation_generation, 0),
      COALESCE(EXCLUDED.reconciliation_generation, 0)
    ),
    attempt_count = stripe_events.attempt_count + 1,
    processed_at = NOW()
  WHERE stripe_events.processing_state IN ('received', 'processing', 'failed');

  RETURN QUERY SELECT
    (p_submitted_generation = v_current_generation)::BOOLEAN,
    v_current_generation,
    p_submitted_generation,
    v_user_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.finalize_reconciliation(TEXT, TEXT, TEXT, BIGINT, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_reconciliation(TEXT, TEXT, TEXT, BIGINT, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_reconciliation(TEXT, TEXT, TEXT, BIGINT, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ================================================================
-- Upsert Stripe Event (handles retry of failed events)
-- ================================================================
-- INSERT new event or UPDATE existing failed event.
-- If event already processed successfully: no change (idempotent).
-- If event failed: allow retry by updating status.

CREATE OR REPLACE FUNCTION upsert_stripe_event(
  p_stripe_event_id TEXT,
  p_stripe_event_type TEXT,
  p_stripe_event_created BIGINT,
  p_user_id UUID DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL,
  p_event_data JSONB DEFAULT NULL,
  p_processing_state TEXT DEFAULT 'received',
  p_processing_error TEXT DEFAULT NULL,
  p_plan_before TEXT DEFAULT NULL,
  p_plan_after TEXT DEFAULT NULL,
  p_subscription_status_before TEXT DEFAULT NULL,
  p_subscription_status_after TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.stripe_events (
    stripe_event_id,
    stripe_event_type,
    stripe_event_created,
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    event_data,
    processing_state,
    processing_error,
    plan_before,
    plan_after,
    subscription_status_before,
    subscription_status_after
  ) VALUES (
    p_stripe_event_id,
    p_stripe_event_type,
    p_stripe_event_created,
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_event_data,
    p_processing_state,
    p_processing_error,
    p_plan_before,
    p_plan_after,
    p_subscription_status_before,
    p_subscription_status_after
  )
  ON CONFLICT (stripe_event_id) DO UPDATE SET
    processing_state = CASE
      WHEN stripe_events.processing_state IN ('success', 'superseded') THEN stripe_events.processing_state
      ELSE EXCLUDED.processing_state
    END,
    processing_error = EXCLUDED.processing_error,
    plan_before = EXCLUDED.plan_before,
    plan_after = EXCLUDED.plan_after,
    subscription_status_before = EXCLUDED.subscription_status_before,
    subscription_status_after = EXCLUDED.subscription_status_after,
    attempt_count = stripe_events.attempt_count + 1,
    processed_at = NOW()
  WHERE stripe_events.processing_state IN ('failed', 'processing')
    OR EXCLUDED.processing_state IN ('processing', 'failed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.upsert_stripe_event(TEXT, TEXT, BIGINT, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_stripe_event(TEXT, TEXT, BIGINT, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_stripe_event(TEXT, TEXT, BIGINT, UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ================================================================
-- Atomic Trial Claiming (prevents concurrent trial claiming for same user)
-- ================================================================
-- Uses pg_advisory_xact_lock to ensure only one concurrent request succeeds.
-- Returns true if trial claimed successfully, false if already claimed.

CREATE OR REPLACE FUNCTION claim_trial_for_user(
  p_user_id UUID
) RETURNS boolean AS $$
DECLARE
  v_lock_id BIGINT;
  v_already_claimed BOOLEAN;
BEGIN
  -- Generate stable lock ID from user_id (64-bit integer)
  v_lock_id := ('x' || substring(md5(p_user_id::TEXT), 1, 15))::bit(60)::BIGINT;

  -- Acquire exclusive transaction-level advisory lock keyed to user_id
  PERFORM pg_advisory_xact_lock(v_lock_id);

  -- Check if user exists and whether the trial was already claimed.
  SELECT COALESCE(trial_used, false) INTO v_already_claimed
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND OR v_already_claimed THEN
    RETURN false;
  END IF;

  -- Mark trial as used atomically under the per-user lock.
  UPDATE public.users
    SET trial_used = true, updated_at = NOW()
    WHERE id = p_user_id
      AND COALESCE(trial_used, false) = false;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.claim_trial_for_user(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_trial_for_user(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_for_user(UUID) TO service_role;

-- ================================================================
-- RLS: Service role only
-- ================================================================

ALTER TABLE public.billing_reconciliation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_recon_service_role_only" ON public.billing_reconciliation_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_events_service_role_only" ON public.stripe_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- Design Notes
-- ================================================================
-- RECONCILIATION GENERATION:
--   Each subscription has its own generation counter (scoped).
--   Prevents stale-fetch-late-write races:
--   - Handler A: fetches ACTIVE (gen 100)
--   - Handler B: fetches CANCELED (gen 101), writes FREE
--   - Handler A: attempts write, gen 100 < current 101, rejected
--   - Result: FDP correctly stays FREE
--
-- BEGIN vs FINALIZE:
--   begin_billing_reconciliation(): allocates generation before fetch
--   finalize_reconciliation(): enforces generation at write time
--   Ensures atomicity of generation check + state write.
--
-- IDEMPOTENCY:
--   UNIQUE(stripe_event_id) ensures Stripe event processed exactly once.
--   processing_state tracks: received → processing → success/failed/superseded
--   Successful/superseded events are never reprocessed.
--
-- FAILED EVENT RETRY:
--   processing_state 'failed' remains retryable.
--   ON CONFLICT logic allows retry without UNIQUE violation.
--   Successful state ('success') blocks reprocessing.
--
-- SUPERSEDED EVENTS:
--   When newer generation completes, older generation writes are skipped.
--   Event marked 'superseded' (not 'failed').
--   Prevents endless retry loops.
--
-- TRIAL ATOMICITY:
--   claim_trial_for_user() uses pg_advisory_xact_lock for per-user atomicity.
--   Prevents concurrent requests from both claiming trial.
--
-- DIFFERENT SUBSCRIPTIONS:
--   Generation for sub_A does not interfere with sub_B.
--   Each subscription has independent counter.
-- ================================================================
