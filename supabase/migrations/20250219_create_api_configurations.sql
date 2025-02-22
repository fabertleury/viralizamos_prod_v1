-- Criar extensão para UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de configurações de API
CREATE TABLE api_configurations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  context TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  rapid_api_key TEXT NOT NULL,
  rapid_api_host TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  page_link TEXT
);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_api_configuration_modtime
BEFORE UPDATE ON api_configurations
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Políticas de segurança RLS (Row Level Security)
-- Habilitar RLS na tabela
ALTER TABLE api_configurations ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Usuários autenticados podem ver configurações de API" 
ON api_configurations 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Política para permitir atualização apenas para administradores
CREATE POLICY "Apenas administradores podem atualizar configurações de API"
ON api_configurations 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT id 
    FROM public.profiles 
    WHERE role = 'admin'
  )
);

-- Inserir configurações iniciais
INSERT INTO api_configurations (
  context, 
  name, 
  type, 
  endpoint, 
  rapid_api_key, 
  rapid_api_host, 
  description,
  page_link
) VALUES 
-- Homepage - Verificação de Perfil
('homepage_profile_check', 
 'RocketAPI - Verificação de Perfil', 
 'profile_info', 
 'https://rocketapi-for-instagram.p.rapidapi.com/instagram/user/get_info', 
 'ac2bed47cfmsh79e4935fdffe586p1a8283jsn727e6ff4a6a0', 
 'rocketapi-for-instagram.p.rapidapi.com',
 'API para verificação de perfil na homepage',
 NULL
),

-- Análise de Perfil
('profile_analysis', 
 'Instagram Scraper API - Perfil', 
 'profile_info', 
 'https://instagram-scraper-api2.p.rapidapi.com/v1/info', 
 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8', 
 'instagram-scraper-api2.p.rapidapi.com',
 'API para análise detalhada de perfil do Instagram',
 NULL
),

-- Checkout de Curtidas - Step 1 (Verificação)
('checkout_likes_step1', 
 'RocketAPI - Verificação de Perfil', 
 'profile_info', 
 'https://rocketapi-for-instagram.p.rapidapi.com/instagram/user/get_info', 
 'ac2bed47cfmsh79e4935fdffe586p1a8283jsn727e6ff4a6a0', 
 'rocketapi-for-instagram.p.rapidapi.com',
 'API para verificação de perfil no checkout de curtidas',
 NULL
),

-- Checkout de Curtidas - Step 2 (Posts)
('checkout_likes_step2', 
 'Instagram Scraper API - Posts', 
 'posts', 
 'https://instagram-scraper-api2.p.rapidapi.com/v1/posts', 
 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8', 
 'instagram-scraper-api2.p.rapidapi.com',
 'API para buscar posts no checkout de curtidas',
 NULL
);

-- Comentário final
COMMENT ON TABLE api_configurations IS 'Tabela para armazenar configurações de APIs utilizadas no sistema';
