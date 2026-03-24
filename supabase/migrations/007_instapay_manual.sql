-- ============================================================
-- Migration 007: Instapay Manual Payments
-- ============================================================

-- 1. Create the `manual_payments` table
CREATE TABLE IF NOT EXISTS public.manual_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EGP',
    screenshot_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Turn on RLS
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;

-- Users can insert and read their own manual payments
CREATE POLICY "Users can insert their own manual payments"
    ON public.manual_payments
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own manual payments"
    ON public.manual_payments
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Admins can view and update all manual payments
CREATE POLICY "Admins can view all manual payments"
    ON public.manual_payments
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can update manual payments"
    ON public.manual_payments
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());

-- 2. Create the storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for receipts bucket
-- Allow authenticated users to upload their own receipts
CREATE POLICY "Users can upload receipts"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK ( bucket_id = 'receipts' );

-- Users can read their own
CREATE POLICY "Users can view own receipts"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING ( bucket_id = 'receipts' AND auth.uid() = owner );

-- Admins can read all receipts
CREATE POLICY "Admins can view all receipts"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING ( bucket_id = 'receipts' AND public.is_admin() );

-- Admins can delete receipts
CREATE POLICY "Admins can delete any receipts"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING ( bucket_id = 'receipts' AND public.is_admin() );

-- Admin function to approve a payment
CREATE OR REPLACE FUNCTION public.admin_approve_payment(p_payment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
DECLARE
    v_user_id UUID;
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Get user_id from payment
    SELECT user_id INTO v_user_id FROM public.manual_payments WHERE id = p_payment_id;
    
    IF v_user_id IS NULL THEN
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
        subscription_ends_at = now() + interval '30 days'
    WHERE id = v_user_id;

    -- Also check trial_ends_at? Doesn't matter if subscription_status is active.
END;
\$\$;

-- Admin function to reject a payment
CREATE OR REPLACE FUNCTION public.admin_reject_payment(p_payment_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS \$\$
BEGIN
    IF NOT (SELECT public.is_admin()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Update payment status
    UPDATE public.manual_payments 
    SET status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    WHERE id = p_payment_id;
END;
\$\$;
