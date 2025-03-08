-- Criação da tabela api_order para controlar a ordem e requisições das APIs
CREATE TABLE IF NOT EXISTS public.api_order (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  "order" INTEGER NOT NULL,
  max_requests INTEGER DEFAULT 1000,
  current_requests INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir dados iniciais
INSERT INTO public.api_order (name, enabled, "order", max_requests, current_requests)
VALUES 
  ('rocketapi_get_info', true, 1, 100, 0),
  ('instagram_scraper', true, 2, 50, 0),
  ('instagram360', true, 3, 50, 0),
  ('instagram_scraper_ai', true, 4, 30, 0),
  ('realtime_instagram_scraper', true, 5, 50, 0),
  ('instagram_public_api', true, 6, 1000, 0),
  ('instagram_web_profile_api', true, 7, 1000, 0),
  ('instagram_dimensions_api', true, 8, 1000, 0),
  ('html_scraping', true, 9, 1000, 0)
ON CONFLICT (id) DO NOTHING;

-- Adicionar função para atualizar o timestamp de updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Adicionar trigger para atualizar o timestamp automaticamente
DROP TRIGGER IF EXISTS update_api_order_updated_at ON public.api_order;
CREATE TRIGGER update_api_order_updated_at
BEFORE UPDATE ON public.api_order
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
