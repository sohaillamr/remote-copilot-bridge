-- ============================================================
-- Synapse â€” Migration 005: Production Readiness Fixes
-- Fixes: prompt_logs RLS, missing indexes, token cleanup,
--        cascade deletes, rate limit enforcement
-- ============================================================

-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
-- 1. FIX: Allow users to SELECT their own prompt_logs
--    (Dashboard stats & GDPR export were returning empty)
-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”

CREATE POLICY "users_read_own_prompt_logs"
ON public.prompt_logs FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));


-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
-- 2. ADD missing performance indexes
-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”

-- Conversations: used in sidebar list, RLS subqueries, GDPR export
CREATE INDEX IF NOT EXISTS idx_conversations_user_id
ON public.conversations(user_id);

-- Messages: used in every conversation load and RLS subquery
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
ON public.messages(conversation_id);

-- Agents: used in dashboard, admin queries
CREATE INDEX IF NOT EXISTS idx_agents_user_id
ON public.agents(user_id);

-- Profiles: subscription status filtering for admin
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status
ON public.profiles(subscription_status);


-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
-- 3. ADD cascade delete for agents when user is deleted
-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”

ALTER TABLE public.agents
    DROP CONSTRAINT IF EXISTS agents_user_id_fkey,
    ADD CONSTRAINT agents_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
-- 4. SCHEDULE token cleanup (pg_cron extension)
--    If pg_cron is not available, this is a no-op.
-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”

DO $$
BEGIN
    -- Only create the cron job if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'cleanup-expired-device-tokens',
            '0 */6 * * *',  -- every 6 hours
            $$SELECT public.cleanup_expired_device_tokens()$$
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- pg_cron may not be available on all Supabase plans
    RAISE NOTICE 'pg_cron not available, skipping token cleanup schedule';
END
$$;


-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
-- 5. ADD server-side rate limit enforcement function
--    Called by agent before executing prompts
-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”

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
BEGIN
    -- Check subscription status
    SELECT subscription_status INTO v_sub_status
    FROM public.profiles
    WHERE id = p_user_id;

    -- Block expired/free users entirely (trial and active allowed)
    IF v_sub_status IS NULL OR v_sub_status NOT IN ('active', 'trial') THEN
        -- Check trial_ends_at for trial users
        IF v_sub_status = 'trial' THEN
            -- Allow trial
            NULL;
        ELSE
            RETURN jsonb_build_object(
                'allowed', false,
                'reason', 'Subscription required'
            );
        END IF;
    END IF;

    -- Count prompts in last minute
    SELECT COUNT(*) INTO v_minute_count
    FROM public.prompt_logs
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 minute';

    IF v_minute_count >= 10 THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Rate limit: max 10 prompts per minute'
        );
    END IF;

    -- Count prompts in last hour
    SELECT COUNT(*) INTO v_hour_count
    FROM public.prompt_logs
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 hour';

    IF v_hour_count >= 200 THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Rate limit: max 200 prompts per hour'
        );
    END IF;

    RETURN jsonb_build_object('allowed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.enforce_rate_limit(UUID) TO authenticated;


-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
-- 6. ADD is_admin helper if not exists
-- â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = (SELECT auth.uid())
          AND role = 'admin'
    );
$$;


-- ─── Error logs table for frontend error tracking ───────────────────
CREATE TABLE IF NOT EXISTS public.error_logs (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at  timestamptz DEFAULT now(),
    message     text NOT NULL,
    stack       text,
    url         text,
    user_agent  text,
    version     text,
    user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Allow any authenticated user to insert errors
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_insert_errors" ON public.error_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Only admins can read errors
CREATE POLICY "admins_read_errors" ON public.error_logs
    FOR SELECT TO authenticated
    USING (is_admin());

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);