-- ============================================================
-- Synapse - Migration 003: Multi-use pairing tokens
-- Fixes iOS QR scanner isolation: tokens are reusable so the
-- same code can be entered manually in regular Safari.
-- ============================================================
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================


-- 1. Update claim_device_token to allow MULTI-USE tokens
--    (removes the used_at IS NULL check so the same code works
--    from multiple browser contexts, e.g. QR scanner + Safari)
CREATE OR REPLACE FUNCTION public.claim_device_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Find valid, unexpired token (no longer requires used_at IS NULL)
    SELECT * INTO v_record
    FROM public.device_tokens
    WHERE token = p_token
      AND expires_at > now();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Token invalid or expired');
    END IF;

    -- Track last use time (informational, does not block reuse)
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


-- 2. Allow authenticated users to UPDATE their own device tokens
--    (so the Pair page can write fresh tokens back after refreshSession)
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


-- 3. Cleanup: extend auto-delete to 48h (tokens now live up to 24h)
CREATE OR REPLACE FUNCTION public.cleanup_expired_device_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    DELETE FROM public.device_tokens
    WHERE expires_at < now() - interval '48 hours';
$$;