-- ============================================================
-- Synapse — Migration 007: Performance Indices
-- Adds critical indexing for rate limit RPC optimization
-- ============================================================

-- The enforce_rate_limit function performs a count across prompt_logs.
-- This requires scanning the table unless an index is present.
-- We create a composite index on (user_id, created_at).

CREATE INDEX IF NOT EXISTS idx_prompt_logs_user_id_created_at
ON public.prompt_logs (user_id, created_at DESC);

-- Also add an index on agent_id to speed up agent lookups and heartbeat updates
CREATE INDEX IF NOT EXISTS idx_agents_id_is_online
ON public.agents (id, is_online);

-- Add index on user_id for agents to optimize team syncs
CREATE INDEX IF NOT EXISTS idx_agents_user_id
ON public.agents (user_id);
