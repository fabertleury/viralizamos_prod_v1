-- Criar tabela de configurações
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  category TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL, -- text, textarea, json, boolean, color
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar função para atualizar o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar o updated_at
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO settings (key, value, category, label, type, description) VALUES
  ('header_scripts', '', 'scripts', 'Scripts do Header', 'textarea', 'Scripts que serão inseridos no <head> do site (ex: Google Analytics, Meta Pixel)'),
  ('footer_scripts', '', 'scripts', 'Scripts do Footer', 'textarea', 'Scripts que serão inseridos antes do </body> do site'),
  ('footer_text', 'Viralizai © 2024. Todos os direitos reservados.', 'footer', 'Texto do Footer', 'text', 'Texto que aparece no rodapé do site'),
  ('footer_links', '[]', 'footer', 'Links do Footer', 'json', 'Links que aparecem no rodapé do site (formato JSON: [{"label": "Sobre", "url": "/sobre"}])'),
  ('primary_color', '#EC4899', 'theme', 'Cor Primária', 'color', 'Cor principal do tema do site'),
  ('secondary_color', '#F472B6', 'theme', 'Cor Secundária', 'color', 'Cor secundária do tema do site'),
  ('site_name', 'Viralizai', 'general', 'Nome do Site', 'text', 'Nome que aparece no título das páginas'),
  ('site_description', 'Serviços para Redes Sociais', 'general', 'Descrição do Site', 'text', 'Descrição que aparece nos resultados de busca'),
  ('maintenance_mode', 'false', 'general', 'Modo Manutenção', 'boolean', 'Ativar modo de manutenção do site'),
  ('maintenance_message', 'Site em manutenção. Voltaremos em breve!', 'general', 'Mensagem de Manutenção', 'text', 'Mensagem exibida quando o site estiver em manutenção');

-- Criar políticas de segurança
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Somente administradores podem editar configurações"
ON settings
USING (
  auth.jwt()->>'role' = 'admin'
)
WITH CHECK (
  auth.jwt()->>'role' = 'admin'
);

CREATE POLICY "Todos podem visualizar configurações"
ON settings FOR SELECT
TO authenticated
USING (true);
