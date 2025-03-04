-- Script para corrigir serviços sem provider_id
-- Este script lista os serviços sem provider_id e permite atribuir um provider_id a eles

-- 1. Listar os provedores disponíveis para referência
SELECT 
  id, 
  name, 
  api_url
FROM 
  providers
ORDER BY 
  name;

-- 2. Listar os serviços sem provider_id
SELECT 
  id, 
  name, 
  external_id,
  created_at,
  updated_at
FROM 
  services 
WHERE 
  provider_id IS NULL;

-- 3. Atualizar os serviços sem provider_id
-- IMPORTANTE: Substitua 'PROVIDER_ID_AQUI' pelo ID do provedor correto para cada serviço
-- Você pode executar esta atualização para cada serviço individualmente

-- Exemplo de atualização para um serviço específico:
-- UPDATE services
-- SET provider_id = 'PROVIDER_ID_AQUI'
-- WHERE id = 'ID_DO_SERVICO_AQUI';

-- 4. Verificar se todos os serviços foram atualizados
SELECT 
  COUNT(*) AS remaining_services_without_provider_id
FROM 
  services 
WHERE 
  provider_id IS NULL;
