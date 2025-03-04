-- Script para atualizar os serviços sem provider_id

-- IMPORTANTE: Substitua os valores de PROVIDER_ID_AQUI pelos IDs corretos dos provedores
-- Você pode obter os IDs dos provedores executando a primeira consulta do script get_services_and_providers.sql

-- 1. Atualizar o serviço "Curtidas Brasileiras"
UPDATE services
SET 
  provider_id = 'PROVIDER_ID_AQUI', -- Substitua pelo ID do provedor correto
  updated_at = NOW()
WHERE 
  id = '36a546db-836d-492f-abea-cd8ce93dddd4';

-- 2. Atualizar o serviço "Visualizações em REELS"
UPDATE services
SET 
  provider_id = 'PROVIDER_ID_AQUI', -- Substitua pelo ID do provedor correto
  updated_at = NOW()
WHERE 
  id = '13cb4e3e-63c2-4265-a080-fa86267fd368';

-- 3. Verificar se todos os serviços foram atualizados
SELECT 
  COUNT(*) AS remaining_services_without_provider_id
FROM 
  services 
WHERE 
  provider_id IS NULL;
