-- Script para corrigir provider_ids inválidos usando os provedores existentes

-- Parte 1: Listar todos os provedores disponíveis (para referência)
SELECT 
  id,
  name,
  slug
FROM 
  providers
ORDER BY 
  name;

-- Parte 2: Identificar serviços com provider_id inválido (não UUID)
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

-- Parte 3: Identificar serviços com provider_id = '1'
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

-- Parte 4: Atualizar serviços com provider_id = '1' para usar o provedor "Fama nas redes"
UPDATE services 
SET provider_id = 'dcd15b48-d42b-476d-b360-90f0b68cce2d' -- ID do provedor "Fama nas redes"
WHERE provider_id::text = '1';

-- Parte 5: Atualizar outros serviços com provider_id inválido para usar o provedor apropriado
-- IMPORTANTE: Você pode modificar esta parte para definir qual provedor usar para cada serviço específico
UPDATE services 
SET provider_id = 'dcd15b48-d42b-476d-b360-90f0b68cce2d' -- ID do provedor "Fama nas redes"
WHERE provider_id IS NOT NULL 
  AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Parte 6: Verificar se ainda existem serviços com provider_id inválido
SELECT 
  COUNT(*) as remaining_invalid_services
FROM 
  services 
WHERE 
  provider_id IS NOT NULL 
  AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Parte 7: Mostrar a relação entre serviços e provedores após a correção
SELECT 
  s.id as service_id,
  s.name as service_name,
  s.provider_id,
  s.external_id,
  p.id as provider_id_from_table,
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
