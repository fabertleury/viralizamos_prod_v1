-- Script para validar se todos os serviços têm um provider_id válido
-- Executar este script para identificar serviços que precisam de correção

-- 1. Verificar serviços sem provider_id
SELECT 
  id, 
  name, 
  provider_id, 
  external_id,
  created_at,
  updated_at
FROM 
  services 
WHERE 
  provider_id IS NULL;

-- 2. Verificar serviços com provider_id que não é um UUID válido
-- Não é necessário verificar isso, pois o PostgreSQL já garante que o campo UUID só aceita valores válidos
-- Se um valor inválido for inserido, o PostgreSQL retornará um erro

-- 3. Verificar serviços com provider_id que não existe na tabela providers
SELECT 
  s.id, 
  s.name, 
  s.provider_id, 
  s.external_id,
  s.created_at,
  s.updated_at
FROM 
  services s
LEFT JOIN 
  providers p ON s.provider_id = p.id
WHERE 
  s.provider_id IS NOT NULL 
  AND p.id IS NULL;

-- 4. Verificar serviços sem external_id
SELECT 
  id, 
  name, 
  provider_id, 
  external_id,
  created_at,
  updated_at
FROM 
  services 
WHERE 
  external_id IS NULL;

-- 5. Resumo da situação dos serviços
SELECT 
  COUNT(*) AS total_services,
  COUNT(CASE WHEN provider_id IS NULL THEN 1 END) AS services_without_provider_id,
  COUNT(CASE WHEN external_id IS NULL THEN 1 END) AS services_without_external_id,
  COUNT(CASE WHEN s.provider_id IS NOT NULL AND p.id IS NULL THEN 1 END) AS services_with_nonexistent_provider
FROM 
  services s
LEFT JOIN
  providers p ON s.provider_id = p.id;
