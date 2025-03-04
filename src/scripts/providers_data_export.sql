-- Consulta para retornar todos os dados da tabela providers
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
  providers
ORDER BY 
  name ASC;

-- Consulta para verificar a estrutura da tabela providers
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

-- Consulta para verificar se existe um provedor com slug 'fama'
SELECT 
  id,
  name,
  slug,
  api_key,
  api_url,
  status
FROM 
  providers
WHERE 
  slug = 'fama';

-- Consulta para verificar serviços com provider_id inválido (não UUID)
SELECT 
  id,
  name,
  provider_id,
  external_id,
  type
FROM 
  services
WHERE 
  provider_id IS NOT NULL
  AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Consulta para verificar serviços com provider_id como texto
SELECT 
  id,
  name,
  provider_id,
  external_id,
  type
FROM 
  services
WHERE 
  provider_id::text = '1';
