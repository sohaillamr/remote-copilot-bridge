-- ============================================================
-- Synapse — Migration 002: Features Update
-- Per-tool model selector, QR login, student plan
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. DEVICE TOKENS (for QR code cross-device login)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.device_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token           TEXT NOT NULL UNIQUE,
    access_token    TEXT NOT NULL,
    refresh_token   TEXT NOT NULL DEFAULT '',
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can create their own device tokens
CREATE POLICY "users_insert_own_device_tokens"
ON public.device_tokens FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can view their own tokens
CREATE POLICY "users_read_own_device_tokens"
ON public.device_tokens FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON public.device_tokens(token);

-- Cleanup: auto-delete expired tokens (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_expired_device_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    DELETE FROM public.device_tokens
    WHERE expires_at < now() - interval '1 hour';
$$;


-- ──────────────────────────────────────────────────────────────
-- 2. CLAIM DEVICE TOKEN (callable by anon/unauthenticated)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.claim_device_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Find valid, unused, unexpired token
    SELECT * INTO v_record
    FROM public.device_tokens
    WHERE token = p_token
      AND used_at IS NULL
      AND expires_at > now();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Token invalid or expired');
    END IF;

    -- Mark as used (one-time only)
    UPDATE public.device_tokens
    SET used_at = now()
    WHERE id = v_record.id;

    -- Return session tokens
    RETURN jsonb_build_object(
        'access_token', v_record.access_token,
        'refresh_token', v_record.refresh_token
    );
END;
$$;

-- Grant access so unauthenticated users (scanning QR) can claim tokens
GRANT EXECUTE ON FUNCTION public.claim_device_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_device_token(TEXT) TO authenticated;


-- ──────────────────────────────────────────────────────────────
-- 3. STUDENT PLAN FIELDS ON PROFILES
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'pro',
    ADD COLUMN IF NOT EXISTS edu_email TEXT,
    ADD COLUMN IF NOT EXISTS edu_verified_at TIMESTAMPTZ;

-- Update handle_new_user to set plan_tier = 'pro' by default
-- (already handled by DEFAULT, no trigger change needed)


-- ──────────────────────────────────────────────────────────────
-- 4. ADD tool_name COLUMN TO MESSAGES
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.messages
    ADD COLUMN IF NOT EXISTS tool_name TEXT DEFAULT '';
