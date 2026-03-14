-- ============================================================
-- Synapse — Migration 006: Security Hardening
-- Fixes pairing token exposure and replay risk
-- ============================================================

-- 1) Pair tokens must be single-use and short-lived.
CREATE OR REPLACE FUNCTION public.claim_device_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Valid token requirements:
    -- - exact code match
    -- - never used
    -- - not expired
    -- - recently issued (10 minute window)
    SELECT * INTO v_record
    FROM public.device_tokens
    WHERE token = p_token
      AND used_at IS NULL
      AND expires_at > now()
      AND created_at > now() - interval '10 minutes'
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Token invalid or expired');
    END IF;

    UPDATE public.device_tokens
    SET used_at = now()
    WHERE id = v_record.id;

    RETURN jsonb_build_object(
        'access_token', v_record.access_token,
        'refresh_token', v_record.refresh_token
    );
END;
$$;

-- 2) Remove direct SELECT access to device_tokens from authenticated users.
DROP POLICY IF EXISTS "users_read_own_device_tokens" ON public.device_tokens;

-- 3) Keep update policy for owner only (needed for post-claim token rotation writeback).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'device_tokens'
          AND policyname = 'users_update_own_device_tokens'
    ) THEN
        CREATE POLICY "users_update_own_device_tokens"
        ON public.device_tokens FOR UPDATE TO authenticated
        USING (user_id = (SELECT auth.uid()))
        WITH CHECK (user_id = (SELECT auth.uid()));
    END IF;
END
$$;

-- 4) Aggressive cleanup for used/expired pair tokens.
CREATE OR REPLACE FUNCTION public.cleanup_expired_device_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    DELETE FROM public.device_tokens
    WHERE used_at IS NOT NULL
       OR expires_at < now() - interval '30 minutes';
$$;

-- 5) Harden enforce_rate_limit logic: check trial expiry correctly.
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_minute_count INT;
    v_hour_count INT;
    v_sub_status TEXT;
    v_trial_ends_at TIMESTAMPTZ;
BEGIN
    SELECT subscription_status, trial_ends_at
    INTO v_sub_status, v_trial_ends_at
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_sub_status IS NULL THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Subscription required');
    END IF;

    IF v_sub_status = 'trial' THEN
        IF v_trial_ends_at IS NULL OR v_trial_ends_at <= now() THEN
            RETURN jsonb_build_object('allowed', false, 'reason', 'Trial expired');
        END IF;
    ELSIF v_sub_status <> 'active' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Subscription required');
    END IF;

    SELECT COUNT(*) INTO v_minute_count
    FROM public.prompt_logs
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 minute';

    IF v_minute_count >= 10 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Rate limit: max 10 prompts per minute');
    END IF;

    SELECT COUNT(*) INTO v_hour_count
    FROM public.prompt_logs
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 hour';

    IF v_hour_count >= 200 THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Rate limit: max 200 prompts per hour');
    END IF;

    RETURN jsonb_build_object('allowed', true);
END;
$$;
