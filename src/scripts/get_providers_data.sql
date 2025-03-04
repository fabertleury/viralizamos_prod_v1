-- Consulta para verificar a estrutura da tabela providers (colunas e tipos)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM 
  information_schema.columns
WHERE 
  table_name = 'providers'
ORDER BY 
  ordinal_position;

-- Consulta para retornar TODOS os dados cadastrados na tabela providers
SELECT 
  id,
  name,
  slug,
  description,
  api_key,
  api_url,
  status,
  metadata,
  created_at,
  updated_at
FROM 
  providers;

-- Verificar quantos provedores estão cadastrados
SELECT COUNT(*) as total_providers FROM providers;