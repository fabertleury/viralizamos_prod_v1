-- Consulta para retornar todos os dados da tabela providers
SELECT 
  id,
  name,
  slug,
  api_key,
  api_url,
  status,
  created_at,
  updated_at,
  service_mapping,
  services,
  metadata
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

-- Consulta para verificar se existe um provedor com id = '1'
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
  id = '1';

-- Consulta para verificar a relação entre serviços e provedores
SELECT 
  s.id as service_id,
  s.name as service_name,
  s.provider_id,
  p.id as provider_table_id,
  p.name as provider_name,
  p.slug as provider_slug
FROM 
  services s
LEFT JOIN 
  providers p ON s.provider_id = p.id
LIMIT 
  100;
