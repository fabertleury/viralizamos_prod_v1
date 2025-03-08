-- Verificar se a API já existe
DO $$
DECLARE
  api_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM api_order WHERE name = 'instagram_statistics'
  ) INTO api_exists;

  -- Se a API não existir, inserir
  IF NOT api_exists THEN
    INSERT INTO api_order (
      name, 
      enabled, 
      "order", 
      max_requests, 
      current_requests
    ) 
    VALUES (
      'instagram_statistics', 
      TRUE, 
      5, 
      50, 
      0
    );
    RAISE NOTICE 'API Instagram Statistics adicionada com sucesso!';
  ELSE
    RAISE NOTICE 'API Instagram Statistics já existe na tabela!';
  END IF;
END $$;
