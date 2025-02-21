-- Tabela para armazenar análises compartilhadas
CREATE TABLE shared_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    profile_data JSONB NOT NULL,
    content_data JSONB NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
    view_count INTEGER DEFAULT 0
);

-- Índice para busca rápida por username
CREATE INDEX idx_shared_analyses_username ON shared_analyses(username);

-- Função para limpar análises expiradas
CREATE OR REPLACE FUNCTION delete_expired_analyses()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM shared_analyses WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para executar a limpeza periodicamente
CREATE TRIGGER clean_expired_analyses
AFTER INSERT ON shared_analyses
EXECUTE FUNCTION delete_expired_analyses();
