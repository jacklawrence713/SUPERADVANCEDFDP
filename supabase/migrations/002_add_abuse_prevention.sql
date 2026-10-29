-- Migration: 002_add_abuse_prevention
-- Adds IP + browser fingerprint tracking to prevent duplicate trial abuse

-- Add columns for tracking signup identity
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_ip TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_visitor_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_users_signup_ip ON public.users(signup_ip) WHERE signup_ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_signup_visitor_id ON public.users(signup_visitor_id) WHERE signup_visitor_id IS NOT NULL;
