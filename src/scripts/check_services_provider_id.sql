-- Consulta para verificar serviços com provider_id inválido
SELECT 
  id,
  name,
  provider_id,
  external_id,
  type,
  created_at,
  updated_at
FROM 
  services
WHERE 
  provider_id IS NOT NULL
  AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Consulta para verificar serviços com provider_id = '1'
SELECT 
  id,
  name,
  provider_id,
  external_id,
  type,
  created_at,
  updated_at
FROM 
  services
WHERE 
  provider_id::text = '1';

-- Consulta para verificar a relação entre serviços e provedores
SELECT 
  s.id as service_id,
  s.name as service_name,
  s.provider_id,
  s.external_id,
  p.id as provider_table_id,
  p.name as provider_name,
  p.slug as provider_slug
FROM 
  services s
LEFT JOIN 
  providers p ON s.provider_id = p.id
WHERE 
  s.provider_id IS NOT NULL
LIMIT 
  100;

-- Verificar total de serviços com provider_id
SELECT 
  COUNT(*) as total_services_with_provider 
FROM 
  services 
WHERE 
  provider_id IS NOT NULL;
