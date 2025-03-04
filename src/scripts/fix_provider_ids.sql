-- Script para corrigir provider_id inválidos na tabela services
-- Este script identifica serviços com provider_id não UUID e os atualiza para o provider correto

-- 1. Primeiro, vamos identificar os serviços com provider_id = '1'
SELECT 
  id,
  name,
  provider_id
FROM 
  services
WHERE 
  provider_id = '1';

-- 2. Buscar o ID do provedor com slug 'fama' (que deve ser o provedor padrão)
SELECT 
  id,
  name,
  slug
FROM 
  providers
WHERE 
  slug = 'fama';

-- 3. Atualizar os serviços com provider_id = '1' para usar o ID do provedor 'fama'
-- SUBSTITUA 'PROVIDER_UUID_AQUI' pelo UUID do provedor 'fama' obtido na consulta anterior
/*
UPDATE 
  services
SET 
  provider_id = 'PROVIDER_UUID_AQUI'
WHERE 
  provider_id = '1';
*/

-- 4. Verificar se ainda existem serviços com provider_id não UUID
SELECT 
  id,
  name,
  provider_id
FROM 
  services
WHERE 
  provider_id IS NOT NULL
  AND provider_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 5. Verificar a relação entre serviços e provedores após a atualização
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
WHERE 
  s.provider_id IS NOT NULL
LIMIT 
  100;
