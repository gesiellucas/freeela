CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
INSERT INTO public.users (auth_user_id, email, full_name) VALUES ('9bf13b59-ec1c-4070-b176-37bfa36e7b75', 'gesiel@admin.com.br', 'Gesiel') ON CONFLICT DO NOTHING;
