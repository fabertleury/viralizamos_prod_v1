-- Script para atualizar o provider_id dos serviços

-- IMPORTANTE: Execute primeiro o script fix_provider_ids_final.sql para identificar os serviços com provider_id inválido

-- Substitua PROVIDER_UUID pelo UUID do provedor correto para cada serviço
-- Exemplo: Para atualizar todos os serviços com provider_id = '1' para usar o provedor com UUID '123e4567-e89b-12d3-a456-426614174000'

/*
UPDATE services
SET provider_id = 'PROVIDER_UUID'
WHERE provider_id::text = '1';
*/

-- Exemplo: Para atualizar um serviço específico

/*
UPDATE services
SET provider_id = 'PROVIDER_UUID'
WHERE id = 'SERVICE_UUID';
*/

-- Verificar se a atualização foi bem-sucedida
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

-- Se não retornar nenhum resultado, todos os serviços agora têm provider_id válido
