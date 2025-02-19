-- Criar tabela de depoimentos
CREATE TABLE depoimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    texto TEXT NOT NULL,
    avatar TEXT,
    estrelas INTEGER CHECK (estrelas BETWEEN 1 AND 5),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_depoimentos_modtime
BEFORE UPDATE ON depoimentos
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
