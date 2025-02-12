-- Limpar tabelas existentes
TRUNCATE public.configurations CASCADE;
TRUNCATE public.categories CASCADE;
TRUNCATE public.socials CASCADE;
TRUNCATE public.providers CASCADE;
TRUNCATE public.profiles CASCADE;
DELETE FROM auth.users WHERE email = 'admin@viralizai.com';

-- Inserir socials primeiro para ter os IDs para as categories
INSERT INTO public.socials (name, icon, url, active, order_position, created_at, updated_at)
VALUES
    ('Instagram', 'instagram', 'https://instagram.com', true, 1, NOW(), NOW()),
    ('TikTok', 'tiktok', 'https://tiktok.com', true, 2, NOW(), NOW()),
    ('YouTube', 'youtube', 'https://youtube.com', true, 3, NOW(), NOW()),
    ('Facebook', 'facebook', 'https://facebook.com', true, 4, NOW(), NOW()),
    ('Twitter', 'twitter', 'https://twitter.com', true, 5, NOW(), NOW())
RETURNING id, name;

-- Inserir categories usando os IDs retornados das socials
DO $$ 
DECLARE
    instagram_id uuid;
    tiktok_id uuid;
    youtube_id uuid;
BEGIN
    -- Pegar IDs das redes sociais
    SELECT id INTO instagram_id FROM public.socials WHERE name = 'Instagram';
    SELECT id INTO tiktok_id FROM public.socials WHERE name = 'TikTok';
    SELECT id INTO youtube_id FROM public.socials WHERE name = 'YouTube';

    -- Inserir categories usando os IDs corretos
    INSERT INTO public.categories (name, slug, description, icon, active, order_position, social_id, created_at, updated_at)
    VALUES
        ('Seguidores Instagram', 'seguidores-instagram', 'Seguidores para Instagram', 'users', true, 1, instagram_id, NOW(), NOW()),
        ('Curtidas Instagram', 'curtidas-instagram', 'Curtidas para Instagram', 'heart', true, 2, instagram_id, NOW(), NOW()),
        ('Visualizações TikTok', 'views-tiktok', 'Visualizações para TikTok', 'eye', true, 3, tiktok_id, NOW(), NOW()),
        ('Seguidores TikTok', 'seguidores-tiktok', 'Seguidores para TikTok', 'users', true, 4, tiktok_id, NOW(), NOW()),
        ('Inscritos YouTube', 'inscritos-youtube', 'Inscritos para YouTube', 'users', true, 5, youtube_id, NOW(), NOW()),
        ('Visualizações YouTube', 'views-youtube', 'Visualizações para YouTube', 'eye', true, 6, youtube_id, NOW(), NOW());
END $$;

-- Criar usuário admin
DO $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Criar usuário usando auth.sign_up()
    SELECT id INTO new_user_id FROM auth.sign_up('admin@viralizai.com', 'admin123');

    -- Confirmar email do usuário
    UPDATE auth.users 
    SET email_confirmed_at = NOW(),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = '{}'::jsonb,
        role = 'authenticated'
    WHERE id = new_user_id;

    -- Criar perfil vinculado
    INSERT INTO public.profiles (id, email, name, role, active, created_at, updated_at)
    VALUES 
        (new_user_id, 'admin@viralizai.com', 'Admin', 'admin', true, NOW(), NOW());
END $$;

-- Inserir providers
INSERT INTO public.providers (name, slug, description, api_key, api_url, status, metadata, created_at, updated_at)
VALUES
    ('SMM Panel', 'smm-panel', 'Provedor principal de serviços', 'API_KEY', 'https://example.com/api', true, '{}', NOW(), NOW());

-- Inserir algumas configurações básicas
INSERT INTO public.configurations (key, value, type, description, group_name, is_public, created_at, updated_at)
VALUES
    ('site_name', 'ViralizAi', 'string', 'Nome do site', 'general', true, NOW(), NOW()),
    ('site_description', 'Plataforma de Marketing Digital', 'string', 'Descrição do site', 'general', true, NOW(), NOW()),
    ('currency', 'BRL', 'string', 'Moeda do site', 'general', true, NOW(), NOW()),
    ('min_order_amount', '10', 'number', 'Valor mínimo do pedido', 'orders', true, NOW(), NOW()),
    ('support_email', 'suporte@viralizai.com.br', 'string', 'Email de suporte', 'contact', true, NOW(), NOW());
