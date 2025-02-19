-- Seed para tabela de configurações

-- Configurações de Logo
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('logo_url', '', 'string', 'URL da logo do sistema', 'logo', true),
    ('logo_alt_text', 'Viralizamos', 'string', 'Texto alternativo da logo', 'logo', true),
    ('logo_width', '200', 'number', 'Largura da logo em pixels', 'logo', true),
    ('logo_height', '100', 'number', 'Altura da logo em pixels', 'logo', true);

-- Configurações de SEO
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('seo_title', 'Viralizamos - Impulsione suas Redes Sociais', 'string', 'Título padrão para SEO', 'seo', true),
    ('seo_description', 'Serviço especializado em crescimento de redes sociais', 'string', 'Descrição padrão para SEO', 'seo', true),
    ('seo_keywords', 'redes sociais, instagram, crescimento, marketing digital', 'string', 'Palavras-chave para SEO', 'seo', true);

-- Configurações de Comunicação
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('whatsapp_numero', '+5511999999999', 'string', 'Número de WhatsApp para contato', 'comunicacao', true),
    ('whatsapp_ativo', 'true', 'boolean', 'Status de ativação do ícone de WhatsApp', 'comunicacao', true),
    ('ticket_link', 'https://suporte.viralizamos.com', 'string', 'Link para abertura de ticket', 'comunicacao', true),
    ('ticket_ativo', 'true', 'boolean', 'Status de ativação do ícone de Ticket', 'comunicacao', true);

-- Configurações de SMTP
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('smtp_host', 'smtp.gmail.com', 'string', 'Servidor SMTP', 'smtp', false),
    ('smtp_port', '587', 'number', 'Porta do servidor SMTP', 'smtp', false),
    ('smtp_username', '', 'string', 'Usuário do SMTP', 'smtp', false),
    ('smtp_password', '', 'string', 'Senha do SMTP', 'smtp', false),
    ('smtp_secure', 'true', 'boolean', 'Conexão segura SMTP', 'smtp', false);

-- Templates de Email
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('email_template_welcome', 'Bem-vindo ao Viralizamos!', 'text', 'Template de email de boas-vindas', 'email_templates', false),
    ('email_template_reset_password', 'Redefinição de senha solicitada', 'text', 'Template de redefinição de senha', 'email_templates', false),
    ('email_template_support', 'Resposta do suporte Viralizamos', 'text', 'Template de email de suporte', 'email_templates', false);

-- Configurações de Compliance
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('termos_uso', '', 'text', 'Termos de Uso', 'compliance', true),
    ('politica_privacidade', '', 'text', 'Política de Privacidade', 'compliance', true);

-- Configurações de Redes Sociais
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('instagram_link', 'https://www.instagram.com/viralizamos.com', 'string', 'Link do Instagram', 'redes_sociais', true),
    ('facebook_link', '', 'string', 'Link do Facebook', 'redes_sociais', true),
    ('twitter_link', '', 'string', 'Link do Twitter', 'redes_sociais', true),
    ('linkedin_link', '', 'string', 'Link do LinkedIn', 'redes_sociais', true);

-- Configurações de Aparência
INSERT INTO configurations (key, value, type, description, group_name, is_public) VALUES
    ('cor_primaria', '#C43582', 'string', 'Cor primária do sistema', 'aparencia', true),
    ('cor_secundaria', '#6A1B9A', 'string', 'Cor secundária do sistema', 'aparencia', true),
    ('tema_escuro', 'false', 'boolean', 'Ativar tema escuro', 'aparencia', true);
