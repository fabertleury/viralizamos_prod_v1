-- Adicionar coluna page_link se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='api_configurations' AND column_name='page_link'
    ) THEN
        ALTER TABLE api_configurations 
        ADD COLUMN page_link TEXT;
    END IF;
END $$;

-- Atualizar registros existentes com links de página
UPDATE api_configurations SET 
    page_link = CASE 
        WHEN context = 'homepage_profile_check' THEN '/'
        WHEN context = 'profile_analysis' THEN '/analisar-perfil'
        WHEN context = 'checkout_likes_step1' THEN '/checkout/curtidas'
        WHEN context = 'checkout_likes_step2' THEN '/checkout/curtidas'
        WHEN context = 'checkout_followers_step1' THEN '/checkout/seguidores'
        ELSE page_link
    END
WHERE page_link IS NULL;
