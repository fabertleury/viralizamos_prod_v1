-- Script para verificar o estado atual dos provider_ids
-- Execute este script para entender o estado atual do banco de dados antes de aplicar a correção

-- 1. Verificar todos os provedores disponíveis
SELECT 
  id,
  name,
  slug,
  api_url,
  status,
  created_at
FROM 
  providers
ORDER BY 
  name;

-- 2. Verificar serviços com provider_id inválido (não UUID)
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

-- 3. Verificar serviços com provider_id = '1'
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

-- 4. Verificar serviços sem provider_id
SELECT 
  id,
  name,
  provider_id,
  external_id,
  type
FROM 
  services
WHERE 
  provider_id IS NULL;

-- 5. Verificar serviços com provider_id que não existe na tabela providers
SELECT 
  s.id,
  s.name,
  s.provider_id,
  s.external_id,
  s.type
FROM 
  services s
LEFT JOIN 
  providers p ON s.provider_id = p.id
WHERE 
  s.provider_id IS NOT NULL 
  AND p.id IS NULL;

-- 6. Estatísticas gerais
SELECT 
  'Total de provedores' as descrição, 
  COUNT(*) as quantidade 
FROM 
  providers
UNION ALL
SELECT 
  'Provedores ativos', 
  COUNT(*) 
FROM 
  providers 
WHERE 
  status = true
UNION ALL
SELECT 
  'Total de serviços', 
  COUNT(*) 
FROM 
  services
UNION ALL
SELECT 
  'Serviços com provider_id', 
  COUNT(*) 
FROM 
  services 
WHERE 
  provider_id IS NOT NULL
UNION ALL
SELECT 
  'Serviços com provider_id inválido', 
  COUNT(*) 
FROM 
  services 
WHERE 
  provider_id IS NOT NULL
  AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
UNION ALL
SELECT 
  'Serviços com provider_id = ''1''', 
  COUNT(*) 
FROM 
  services 
WHERE 
  provider_id::text = '1'
UNION ALL
SELECT 
  'Serviços sem provider_id', 
  COUNT(*) 
FROM 
  services 
WHERE 
  provider_id IS NULL
UNION ALL
SELECT 
  'Serviços com provider_id inexistente', 
  COUNT(*) 
FROM 
  services s
LEFT JOIN 
  providers p ON s.provider_id = p.id
WHERE 
  s.provider_id IS NOT NULL 
  AND p.id IS NULL;
