-- Teams Foundation Migration

CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    seat_count INT NOT NULL DEFAULT 1,
    subscription_status public.subscription_status NOT NULL DEFAULT 'free',
    subscription_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days'
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Teams: Owners and members can view their teams
CREATE POLICY "Users can view teams they belong to" 
    ON public.teams FOR SELECT 
    USING (
        owner_id = auth.uid() OR 
        id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Owners can update their teams" 
    ON public.teams FOR UPDATE 
    USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert teams" 
    ON public.teams FOR INSERT 
    WITH CHECK (owner_id = auth.uid());

-- Team Members: Members can view, Owners/Admins can manage
CREATE POLICY "Users can view members of their teams" 
    ON public.team_members FOR SELECT 
    USING (
        team_id IN (
            SELECT id FROM public.teams WHERE owner_id = auth.uid()
            UNION
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and Admins can insert members" 
    ON public.team_members FOR INSERT 
    WITH CHECK (
        team_id IN (
            SELECT id FROM public.teams WHERE owner_id = auth.uid()
            UNION
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and Admins can delete members" 
    ON public.team_members FOR DELETE 
    USING (
        team_id IN (
            SELECT id FROM public.teams WHERE owner_id = auth.uid()
            UNION
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Invites
CREATE POLICY "Users can view invites for their teams"
    ON public.team_invites FOR SELECT
    USING (
        team_id IN (
            SELECT id FROM public.teams WHERE owner_id = auth.uid()
            UNION
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and Admins can insert invites"
    ON public.team_invites FOR INSERT
    WITH CHECK (
        team_id IN (
            SELECT id FROM public.teams WHERE owner_id = auth.uid()
            UNION
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and Admins can delete invites"
    ON public.team_invites FOR DELETE
    USING (
        team_id IN (
            SELECT id FROM public.teams WHERE owner_id = auth.uid()
            UNION
            SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Helper function to accept invite
CREATE OR REPLACE FUNCTION accept_team_invite(invite_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_invite RECORD;
BEGIN
    -- Find and validate invite
    SELECT * INTO v_invite 
    FROM public.team_invites 
    WHERE token = invite_token AND expires_at > now();
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invite token';
    END IF;
    
    -- Insert member
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (v_invite.team_id, auth.uid(), v_invite.role)
    ON CONFLICT (team_id, user_id) DO NOTHING;
    
    -- Delete invite mapped to this user's email if needed
    DELETE FROM public.team_invites WHERE id = v_invite.id;
    
    RETURN v_invite.team_id;
END;
$$;


-- Add plan and seat count to manual payments
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'pro';
ALTER TABLE public.manual_payments ADD COLUMN IF NOT EXISTS seats INT DEFAULT 1;

-- Override admin_approve_payment to support team plans
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \\$\\$
DECLARE
    v_payment public.manual_payments%ROWTYPE;
    v_team_id UUID;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get payment details
    SELECT * INTO v_payment FROM public.manual_payments WHERE id = p_payment_id;

    IF v_payment IS NULL THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Update payment status
    UPDATE public.manual_payments
    SET status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_payment_id;

    -- Update user profile
    UPDATE public.profiles
    SET subscription_status = 'active',
        subscription_provider = 'instapay',
        subscription_ends_at = now() + interval '30 days',
        plan_tier = v_payment.plan
    WHERE id = v_payment.user_id;

    -- If team plan, create or update team
    IF v_payment.plan = 'team' THEN
        -- Check if team exists
        SELECT id INTO v_team_id FROM public.teams WHERE owner_id = v_payment.user_id LIMIT 1;
        
        IF v_team_id IS NOT NULL THEN
            UPDATE public.teams
            SET seat_count = v_payment.seats,
                subscription_status = 'active',
                updated_at = now()
            WHERE id = v_team_id;
        ELSE
            INSERT INTO public.teams (owner_id, name, seat_count, subscription_status)
            VALUES (v_payment.user_id, 'My Team', v_payment.seats, 'active');
        END IF;
    END IF;
END;
\\$\\$;
