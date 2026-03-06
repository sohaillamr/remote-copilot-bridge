-- ============================================================
-- Synapse — Admin RPC Functions
-- ============================================================
-- Server-side functions for the admin dashboard.
-- All gated by is_admin() check — non-admins get an exception.
-- Called from the frontend via supabase.rpc('function_name', params)
-- ============================================================


-- ──────────────────────────────────────────────────────────────
-- 1. DASHBOARD OVERVIEW (6 KPI cards)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN json_build_object(
        'total_users',    (SELECT count(*) FROM auth.users),
        'paid_users',     (SELECT count(*) FROM public.profiles WHERE subscription_status = 'active'),
        'trial_users',    (SELECT count(*) FROM public.profiles WHERE subscription_status = 'trial'),
        'free_users',     (SELECT count(*) FROM public.profiles WHERE subscription_status = 'free'),
        'churned_users',  (SELECT count(*) FROM public.profiles WHERE subscription_status IN ('cancelled', 'expired')),
        'mrr_cents',      (
            SELECT count(*) * 500  -- $5 per user
            FROM public.profiles
            WHERE subscription_status = 'active'
        ),
        'prompts_today',  (
            SELECT count(*) FROM public.prompt_logs
            WHERE created_at > now() - interval '1 day'
        ),
        'prompts_week',   (
            SELECT count(*) FROM public.prompt_logs
            WHERE created_at > now() - interval '7 days'
        ),
        'agents_online',  (
            SELECT count(*) FROM public.agents
            WHERE is_online = true
            AND last_seen_at > now() - interval '2 minutes'
        ),
        'total_agents',   (SELECT count(*) FROM public.agents),
        'error_rate',     (
            SELECT CASE
                WHEN count(*) = 0 THEN 0
                ELSE round(
                    count(*) FILTER (WHERE status IN ('error', 'timeout'))::numeric
                    / count(*)::numeric * 100, 1
                )
            END
            FROM public.prompt_logs
            WHERE created_at > now() - interval '24 hours'
        )
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 2. SIGNUP GROWTH (chart data)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_signups_over_time(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                date_trunc('day', created_at)::date AS day,
                count(*) AS signups
            FROM auth.users
            WHERE created_at > now() - make_interval(days => days_back)
            GROUP BY 1
            ORDER BY 1
        ) t
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 3. MRR OVER TIME (chart data)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_mrr_over_time()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- MRR = count of active subscribers × $5 at each month boundary
    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                date_trunc('month', pe.created_at)::date AS month,
                count(DISTINCT pe.user_id) FILTER (
                    WHERE pe.event_name = 'subscription_payment_success'
                ) * 500 AS mrr_cents,
                count(DISTINCT pe.user_id) FILTER (
                    WHERE pe.event_name = 'subscription_payment_success'
                ) AS subscribers
            FROM public.payment_events pe
            WHERE pe.created_at > now() - interval '12 months'
            GROUP BY 1
            ORDER BY 1
        ) t
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 4. USAGE BY TOOL (pie/bar chart)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_usage_by_tool(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                tool,
                count(*) AS prompt_count,
                count(DISTINCT user_id) AS unique_users,
                round(avg(duration_ms))::int AS avg_latency_ms,
                count(*) FILTER (WHERE status = 'error') AS error_count
            FROM public.prompt_logs
            WHERE created_at > now() - make_interval(days => days_back)
            GROUP BY tool
            ORDER BY prompt_count DESC
        ) t
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 5. TOP USERS BY USAGE
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_top_users(max_results int DEFAULT 50)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                p.id,
                p.email,
                p.display_name,
                p.subscription_status,
                p.subscription_provider,
                p.trial_ends_at,
                p.subscription_ends_at,
                p.created_at,
                p.banned_at,
                COALESCE(pl.prompt_count, 0) AS prompt_count,
                pl.last_active,
                COALESCE(ag.agent_count, 0) AS agent_count,
                COALESCE(ag.online_count, 0) AS online_agents
            FROM public.profiles p
            LEFT JOIN (
                SELECT
                    user_id,
                    count(*) AS prompt_count,
                    max(created_at) AS last_active
                FROM public.prompt_logs
                GROUP BY user_id
            ) pl ON pl.user_id = p.id
            LEFT JOIN (
                SELECT
                    user_id,
                    count(*) AS agent_count,
                    count(*) FILTER (WHERE is_online) AS online_count
                FROM public.agents
                GROUP BY user_id
            ) ag ON ag.user_id = p.id
            ORDER BY COALESCE(pl.prompt_count, 0) DESC
            LIMIT max_results
        ) t
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 6. USER DETAIL (single user deep-dive)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_user_detail(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN json_build_object(
        'profile', (
            SELECT row_to_json(p)
            FROM public.profiles p
            WHERE p.id = target_user_id
        ),
        'agents', (
            SELECT json_agg(row_to_json(a))
            FROM public.agents a
            WHERE a.user_id = target_user_id
        ),
        'prompt_stats', json_build_object(
            'total', (SELECT count(*) FROM public.prompt_logs WHERE user_id = target_user_id),
            'last_7d', (SELECT count(*) FROM public.prompt_logs WHERE user_id = target_user_id AND created_at > now() - interval '7 days'),
            'last_30d', (SELECT count(*) FROM public.prompt_logs WHERE user_id = target_user_id AND created_at > now() - interval '30 days'),
            'by_tool', (
                SELECT json_agg(row_to_json(t))
                FROM (
                    SELECT tool, count(*) AS count
                    FROM public.prompt_logs
                    WHERE user_id = target_user_id
                    GROUP BY tool
                ) t
            )
        ),
        'recent_conversations', (
            SELECT json_agg(row_to_json(c))
            FROM (
                SELECT id, tool, title, created_at, updated_at
                FROM public.conversations
                WHERE user_id = target_user_id
                ORDER BY updated_at DESC
                LIMIT 10
            ) c
        ),
        'payment_events', (
            SELECT json_agg(row_to_json(pe))
            FROM (
                SELECT event_name, provider, created_at
                FROM public.payment_events
                WHERE user_id = target_user_id
                ORDER BY created_at DESC
                LIMIT 20
            ) pe
        )
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 7. CHURN BY MONTH
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_churn_by_month()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                date_trunc('month', pe.created_at)::date AS month,
                count(DISTINCT pe.user_id) FILTER (
                    WHERE pe.event_name IN ('subscription_cancelled', 'subscription_expired')
                ) AS churned,
                (SELECT count(*) FROM public.profiles WHERE subscription_status = 'active') AS current_active
            FROM public.payment_events pe
            WHERE pe.created_at > now() - interval '12 months'
            GROUP BY 1
            ORDER BY 1
        ) t
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 8. ADMIN ACTIONS (extend trial, ban user)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_extend_trial(target_user_id uuid, extra_days int DEFAULT 7)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.profiles
    SET
        trial_ends_at = GREATEST(COALESCE(trial_ends_at, now()), now()) + make_interval(days => extra_days),
        subscription_status = 'trial',
        updated_at = now()
    WHERE id = target_user_id;

    RETURN json_build_object(
        'success', true,
        'user_id', target_user_id,
        'extra_days', extra_days,
        'new_trial_ends_at', (SELECT trial_ends_at FROM public.profiles WHERE id = target_user_id)
    );
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_ban_user(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.profiles
    SET
        banned_at = now(),
        subscription_status = 'expired',
        updated_at = now()
    WHERE id = target_user_id;

    RETURN json_build_object(
        'success', true,
        'user_id', target_user_id,
        'banned_at', now()
    );
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_unban_user(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    UPDATE public.profiles
    SET
        banned_at = NULL,
        subscription_status = 'free',
        updated_at = now()
    WHERE id = target_user_id;

    RETURN json_build_object(
        'success', true,
        'user_id', target_user_id
    );
END;
$$;


-- ──────────────────────────────────────────────────────────────
-- 9. PROMPTS OVER TIME (usage chart)
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_prompts_over_time(days_back int DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    RETURN (
        SELECT json_agg(row_to_json(t))
        FROM (
            SELECT
                date_trunc('day', created_at)::date AS day,
                count(*) AS prompts,
                count(DISTINCT user_id) AS active_users
            FROM public.prompt_logs
            WHERE created_at > now() - make_interval(days => days_back)
            GROUP BY 1
            ORDER BY 1
        ) t
    );
END;
$$;
