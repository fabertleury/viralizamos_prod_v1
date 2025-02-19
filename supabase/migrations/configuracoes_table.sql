-- Criar tabela de configurações
CREATE TABLE configuracoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_numero TEXT,
    whatsapp_ativo BOOLEAN DEFAULT false,
    ticket_ativo BOOLEAN DEFAULT false,
    ticket_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configuracoes_modtime
BEFORE UPDATE ON configuracoes
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
