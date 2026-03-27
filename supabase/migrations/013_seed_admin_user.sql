-- ============================================================
-- Seed Admin User
-- ============================================================
-- Creates the admin user if they don't exist, and forces
-- the password to be 'synapseadmin'. 
-- ============================================================

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Check if user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@synapse.com';

    IF v_user_id IS NULL THEN
        -- Create a brand new user
        v_user_id := gen_random_uuid();
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
            v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@synapse.com',
            crypt('synapseadmin', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(), now()
        );
        INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
        VALUES (
            gen_random_uuid(), v_user_id::text, v_user_id, format('{"sub":"%s","email":"%s"}', v_user_id::text, 'admin@synapse.com')::jsonb, 'email', now(), now(), now()
        );
    ELSE
        -- Update password for existing user in case it was created via Magic Link / OTP
        UPDATE auth.users
        SET encrypted_password = crypt('synapseadmin', gen_salt('bf'))
        WHERE id = v_user_id;
    END IF;

    -- Ensure they are in the user_roles table as admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Also, make sure they have an active profile
    INSERT INTO public.profiles (id, email, subscription_status)
    VALUES (v_user_id, 'admin@synapse.com', 'active')
    ON CONFLICT (id) DO NOTHING;

END $$;

