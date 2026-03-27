-- Manually activate and approve (make admin) user 059778d9-0a17-4281-b6f3-334f75b8d4e5

-- 1. Set subscription status to 'active'
UPDATE public.profiles
SET subscription_status = 'active'
WHERE id = '059778d9-0a17-4281-b6f3-334f75b8d4e5';

-- 2. Make user an admin (approved by admin)
INSERT INTO public.user_roles (user_id, role)
VALUES ('059778d9-0a17-4281-b6f3-334f75b8d4e5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
