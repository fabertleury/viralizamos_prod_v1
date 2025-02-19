-- Adicionar novas colunas à tabela configurations existente
DO $$
BEGIN
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='type') THEN
        ALTER TABLE configurations 
        ADD COLUMN type TEXT CHECK (type IN (
            'string', 'number', 'boolean', 'text', 
            'json', 'date', 'datetime', 'email', 
            'url', 'color', 'file_path', 'currency'
        ));
    END IF;

    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='description') THEN
        ALTER TABLE configurations 
        ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='group_name') THEN
        ALTER TABLE configurations 
        ADD COLUMN group_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='is_public') THEN
        ALTER TABLE configurations 
        ADD COLUMN is_public BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='is_required') THEN
        ALTER TABLE configurations 
        ADD COLUMN is_required BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='sensitive') THEN
        ALTER TABLE configurations 
        ADD COLUMN sensitive BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='editable') THEN
        ALTER TABLE configurations 
        ADD COLUMN editable BOOLEAN DEFAULT true;
    END IF;

    -- Adicionar default_value se não existir
    IF NOT EXISTS (SELECT column_name 
                   FROM information_schema.columns 
                   WHERE table_name='configurations' AND column_name='default_value') THEN
        ALTER TABLE configurations 
        ADD COLUMN default_value TEXT;
    END IF;
END $$;

-- Atualizar dados existentes com valores padrão
UPDATE configurations 
SET 
    type = COALESCE(type, 'string'),
    description = COALESCE(description, key),
    group_name = COALESCE(group_name, 'geral'),
    is_public = COALESCE(is_public, true),
    is_required = COALESCE(is_required, false),
    editable = COALESCE(editable, true),
    sensitive = COALESCE(sensitive, false),
    default_value = COALESCE(default_value, value);

-- Criar função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_configurations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antiga se existir
DROP TRIGGER IF EXISTS update_configurations_modtime ON configurations;

-- Criar nova trigger
CREATE TRIGGER update_configurations_modtime
BEFORE UPDATE ON configurations
FOR EACH ROW
EXECUTE FUNCTION update_configurations_timestamp();

-- Inserir configurações faltantes
-- Sistema
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('sistema_nome', COALESCE((SELECT value FROM configurations WHERE key = 'sistema_nome'), 'Viralizamos'), 'string', 'Nome oficial do sistema', 'sistema', true, true, 'Viralizamos', true, false),
    ('sistema_versao', COALESCE((SELECT value FROM configurations WHERE key = 'sistema_versao'), '1.0.0'), 'string', 'Versão atual do sistema', 'sistema', true, true, '1.0.0', false, false),
    ('sistema_modo_manutencao', COALESCE((SELECT value FROM configurations WHERE key = 'sistema_modo_manutencao'), 'false'), 'boolean', 'Ativar modo de manutenção', 'sistema', true, false, 'false', true, false)
ON CONFLICT (key) DO NOTHING;

-- Segurança
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('seguranca_2fa', 'false', 'boolean', 'Ativar autenticação de dois fatores', 'seguranca', false, false, 'false', true, false),
    ('seguranca_max_tentativas_login', '5', 'number', 'Máximo de tentativas de login', 'seguranca', false, true, '5', true, false)
ON CONFLICT (key) DO NOTHING;

-- Integração
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('integracao_mercadopago_ativo', 'true', 'boolean', 'Ativar integração com Mercado Pago', 'integracao', true, false, 'true', true, false),
    ('integracao_instagram_ativo', 'true', 'boolean', 'Ativar integração com Instagram', 'integracao', true, false, 'true', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Pagamento
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('pagamento_moeda_padrao', 'BRL', 'string', 'Moeda padrão para transações', 'pagamento', true, true, 'BRL', true, false),
    ('pagamento_taxa_servico', '0.05', 'number', 'Taxa de serviço padrão', 'pagamento', true, true, '0.05', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Email
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('email_remetente_padrao', 'contato@viralizamos.com', 'email', 'Email padrão de remetente', 'email', true, true, 'contato@viralizamos.com', true, false),
    ('email_smtp_host', 'smtp.gmail.com', 'string', 'Servidor SMTP', 'email', false, false, 'smtp.gmail.com', true, false),
    ('email_smtp_porta', '587', 'number', 'Porta do servidor SMTP', 'email', false, false, '587', true, false),
    ('email_smtp_usuario', '', 'string', 'Usuário SMTP', 'email', false, false, '', true, true),
    ('email_smtp_senha', '', 'string', 'Senha SMTP', 'email', false, false, '', true, true)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Notificação
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('notificacao_email_ativo', 'true', 'boolean', 'Ativar notificações por email', 'notificacao', true, false, 'true', true, false),
    ('notificacao_whatsapp_ativo', 'true', 'boolean', 'Ativar notificações por WhatsApp', 'notificacao', true, false, 'true', true, false),
    ('notificacao_whatsapp_numero', '+5511999999999', 'string', 'Número de WhatsApp para notificações', 'notificacao', true, false, '+5511999999999', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Redes Sociais
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('social_instagram_link', 'https://www.instagram.com/viralizamos.com', 'url', 'Link do Instagram', 'social', true, false, '', true, false),
    ('social_facebook_link', '', 'url', 'Link do Facebook', 'social', true, false, '', true, false),
    ('social_twitter_link', '', 'url', 'Link do Twitter', 'social', true, false, '', true, false),
    ('social_linkedin_link', '', 'url', 'Link do LinkedIn', 'social', true, false, '', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Design
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('design_cor_primaria', '#C43582', 'color', 'Cor primária do sistema', 'design', true, true, '#C43582', true, false),
    ('design_cor_secundaria', '#6A1B9A', 'color', 'Cor secundária do sistema', 'design', true, true, '#6A1B9A', true, false),
    ('design_tema_escuro', 'false', 'boolean', 'Ativar tema escuro', 'design', true, false, 'false', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Logo
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('logo_url', '', 'file_path', 'URL da logo do sistema', 'logo', true, false, '', true, false),
    ('logo_alt_text', 'Viralizamos', 'string', 'Texto alternativo da logo', 'logo', true, true, 'Viralizamos', true, false),
    ('logo_width', '200', 'number', 'Largura da logo em pixels', 'logo', true, true, '200', true, false),
    ('logo_height', '100', 'number', 'Altura da logo em pixels', 'logo', true, true, '100', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de SEO
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('seo_title', 'Viralizamos - Impulsione suas Redes Sociais', 'string', 'Título padrão para SEO', 'seo', true, true, 'Viralizamos - Impulsione suas Redes Sociais', true, false),
    ('seo_description', 'Serviço especializado em crescimento de redes sociais', 'text', 'Descrição padrão para SEO', 'seo', true, true, 'Serviço especializado em crescimento de redes sociais', true, false),
    ('seo_keywords', 'redes sociais, instagram, crescimento, marketing digital', 'text', 'Palavras-chave para SEO', 'seo', true, true, 'redes sociais, instagram, crescimento, marketing digital', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Compliance
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('compliance_termos_uso', '', 'text', 'Termos de Uso', 'compliance', true, false, '', true, false),
    ('compliance_politica_privacidade', '', 'text', 'Política de Privacidade', 'compliance', true, false, '', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Suporte
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('suporte_ticket_ativo', 'true', 'boolean', 'Ativar sistema de tickets', 'suporte', true, false, 'true', true, false),
    ('suporte_ticket_link', 'https://suporte.viralizamos.com', 'url', 'Link para abertura de ticket', 'suporte', true, false, '', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações Avançadas
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('avancado_debug_mode', 'false', 'boolean', 'Ativar modo de depuração', 'avancado', false, false, 'false', true, false),
    ('avancado_log_nivel', 'info', 'string', 'Nível de log do sistema', 'avancado', false, true, 'info', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Limites
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('limite_max_usuarios', '1000', 'number', 'Número máximo de usuários', 'limites', false, true, '1000', true, false),
    ('limite_max_pedidos_dia', '100', 'number', 'Máximo de pedidos por dia', 'limites', false, true, '100', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de WhatsApp
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('whatsapp_numero', '+5511999999999', 'string', 'Número de WhatsApp', 'comunicacao', true, false, '+5511999999999', true, false),
    ('whatsapp_icone_ativo', 'true', 'boolean', 'Ativar ícone de WhatsApp', 'comunicacao', true, false, 'true', true, false)
ON CONFLICT (key) DO NOTHING;

-- Configurações de Ticket
INSERT INTO configurations (
    key, value, type, description, group_name, is_public, 
    is_required, default_value, editable, sensitive
) VALUES
    ('ticket_link', 'https://suporte.viralizamos.com', 'url', 'Link do Sistema de Tickets', 'comunicacao', true, false, 'https://suporte.viralizamos.com', true, false),
    ('ticket_icone_ativo', 'true', 'boolean', 'Ativar ícone de Ticket', 'comunicacao', true, false, 'true', true, false)
ON CONFLICT (key) DO NOTHING;
