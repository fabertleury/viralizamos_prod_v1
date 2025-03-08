-- Script para adicionar a API Instagram230 à tabela api_order no Supabase
-- Verifica se a API já existe antes de inserir

-- Primeiro, verificar se a API já existe
DO $$
DECLARE
  api_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM api_order WHERE name = 'instagram230'
  ) INTO api_exists;

  -- Se a API não existir, inserir
  IF NOT api_exists THEN
    INSERT INTO api_order (name, enabled, "order", max_requests, current_requests)
    VALUES ('instagram230', true, (SELECT COALESCE(MAX("order"), 0) + 1 FROM api_order), 100, 0);
    
    RAISE NOTICE 'API Instagram230 adicionada com sucesso.';
  ELSE
    RAISE NOTICE 'API Instagram230 já existe na tabela.';
  END IF;
END
$$;
