-- ============================================================
-- Synapse — Migration 004: Server-side rate limiting
-- Adds a rate-limit check function for prompt sending
-- ============================================================

-- Rate limit function: returns true if user is within limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_user_id UUID,
    p_max_per_minute INT DEFAULT 10,
    p_max_per_hour INT DEFAULT 200
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_minute_count INT;
    v_hour_count INT;
BEGIN
    -- Count prompts in last minute
    SELECT COUNT(*) INTO v_minute_count
    FROM public.prompt_logs
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 minute';

    IF v_minute_count >= p_max_per_minute THEN
        RETURN FALSE;
    END IF;

    -- Count prompts in last hour
    SELECT COUNT(*) INTO v_hour_count
    FROM public.prompt_logs
    WHERE user_id = p_user_id
      AND created_at > now() - interval '1 hour';

    IF v_hour_count >= p_max_per_hour THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.check_rate_limit(UUID, INT, INT) TO authenticated;

-- Index for fast rate-limit lookups
CREATE INDEX IF NOT EXISTS idx_prompt_logs_user_created
ON public.prompt_logs(user_id, created_at DESC);
