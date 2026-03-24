-- ============================================================
-- Synapse — Migration 009: Team Dashboard & Analytics
-- Implements team-based usage tracking, correct rate limits for members
-- ============================================================

-- 1. Fix enforce_rate_limit so team members tap into their team's active subscription
CREATE OR REPLACE FUNCTION public.enforce_rate_limit(p_user_id UUID)
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
    v_team_status TEXT;
BEGIN
    SELECT subscription_status, trial_ends_at
    INTO v_sub_status, v_trial_ends_at
    FROM public.profiles
    WHERE id = p_user_id;

    -- Check if user is in an active team
    SELECT t.subscription_status INTO v_team_status
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_user_id AND t.subscription_status = 'active'
    LIMIT 1;

    -- If the user themselves doesn't own an active team and isn't part of one
    IF v_team_status IS NULL THEN
        -- But wait, check if the user themself is a team owner of an active team (in case they aren't in team_members)
        SELECT subscription_status INTO v_team_status
        FROM public.teams
        WHERE owner_id = p_user_id AND subscription_status = 'active'
        LIMIT 1;
    END IF;

    IF v_team_status IS NULL THEN
        -- Fallback to personal subscription logic
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
    END IF;

    -- Rate limits (Teams might have higher limits later, using standard for now)
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

-- 2. Add an RPC to fetch team analytics
CREATE OR REPLACE FUNCTION public.get_team_analytics(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role TEXT;
    v_result JSONB;
BEGIN
    -- Verify caller is owner or admin of the team
    SELECT role INTO v_role 
    FROM public.team_members 
    WHERE team_id = p_team_id AND user_id = auth.uid();
    
    IF v_role NOT IN ('owner', 'admin') AND NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id AND owner_id = auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Must be Team Owner or Admin.';
    END IF;

    -- Aggregate prompt logs for all team members over 30 days
    SELECT jsonb_build_object(
        'total_prompts', COALESCE(COUNT(pl.id), 0),
        'usage_by_member', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'user_id', all_members.user_id,
                    'email', p.email,
                    'role', COALESCE(tm.role, CASE WHEN all_members.user_id = t.owner_id THEN 'owner' ELSE 'member' END),
                    'prompt_count', COALESCE(m.prompt_count, 0)
                )
            )
            FROM (
                SELECT owner_id as user_id FROM public.teams WHERE id = p_team_id
                UNION
                SELECT user_id FROM public.team_members WHERE team_id = p_team_id
            ) all_members
            LEFT JOIN public.profiles p ON p.id = all_members.user_id
            LEFT JOIN public.team_members tm ON tm.user_id = all_members.user_id AND tm.team_id = p_team_id
            LEFT JOIN public.teams t ON t.id = p_team_id
            LEFT JOIN (
                SELECT user_id, COUNT(id) as prompt_count
                FROM public.prompt_logs
                WHERE created_at > now() - interval '30 days'
                GROUP BY user_id
            ) m ON m.user_id = all_members.user_id
        ), '[]'::jsonb),
        'usage_over_time', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', day_series.day::DATE,
                    'count', COALESCE(counts.count, 0)
                ) ORDER BY day_series.day
            )
            FROM generate_series(now() - interval '29 days', now(), '1 day'::interval) as day_series(day)
            LEFT JOIN (
                SELECT date_trunc('day', created_at) as day, COUNT(id) as count
                FROM public.prompt_logs
                WHERE created_at > now() - interval '30 days'
                  AND user_id IN (
                      SELECT owner_id FROM public.teams WHERE id = p_team_id
                      UNION
                      SELECT user_id FROM public.team_members WHERE team_id = p_team_id
                  )
                GROUP BY date_trunc('day', created_at)
            ) counts ON counts.day = date_trunc('day', day_series.day)
        ), '[]'::jsonb)
    ) INTO v_result
    FROM public.teams t_main 
    LEFT JOIN public.prompt_logs pl 
      ON pl.created_at > now() - interval '30 days' 
      AND pl.user_id IN (
          SELECT owner_id FROM public.teams WHERE id = p_team_id
          UNION
          SELECT user_id FROM public.team_members WHERE team_id = p_team_id
      )
    WHERE t_main.id = p_team_id;

    RETURN v_result;
END;
$$;
