-- Criar tabela para armazenar o histórico de verificações por usuário
CREATE TABLE IF NOT EXISTS instagram_verification_history (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  api_name VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Criar índice para acelerar consultas por username
  CONSTRAINT idx_username_api UNIQUE (username, api_name)
);
