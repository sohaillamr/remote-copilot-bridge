DO $$
BEGIN
    DELETE FROM auth.users WHERE email = 'admin@synapse.com';
END $$;
