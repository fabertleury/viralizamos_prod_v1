-- Script para execução da correção definitiva dos provider_ids
-- Este script combina as melhores partes dos scripts anteriores e fornece uma solução completa

DO $$
DECLARE
  fama_provider_id uuid;
  service_count integer;
  invalid_count integer;
BEGIN
  -- 1. Verificar o estado atual dos provedores
  RAISE NOTICE '=== VERIFICANDO ESTADO ATUAL DOS PROVEDORES ===';
  
  -- Verificar se existe o provedor com slug 'fama'
  SELECT id INTO fama_provider_id FROM providers WHERE slug = 'fama';
  
  IF fama_provider_id IS NULL THEN
    RAISE NOTICE 'Provedor com slug "fama" não encontrado. Verificando outros provedores...';
    
    -- Verificar se existe algum outro provedor que possa ser usado
    SELECT id INTO fama_provider_id FROM providers WHERE status = true LIMIT 1;
    
    IF fama_provider_id IS NULL THEN
      RAISE EXCEPTION 'Nenhum provedor ativo encontrado. É necessário cadastrar pelo menos um provedor antes de executar este script.';
    ELSE
      RAISE NOTICE 'Usando provedor com ID % como padrão para correção', fama_provider_id;
    END IF;
  ELSE
    RAISE NOTICE 'Provedor com slug "fama" encontrado. ID: %', fama_provider_id;
  END IF;
  
  -- 2. Verificar serviços com provider_id inválido
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICANDO SERVIÇOS COM PROVIDER_ID INVÁLIDO ===';
  
  SELECT COUNT(*) INTO invalid_count 
  FROM services 
  WHERE provider_id IS NOT NULL 
    AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  RAISE NOTICE 'Encontrados % serviços com provider_id inválido (não UUID)', invalid_count;
  
  -- 3. Verificar serviços com provider_id = '1'
  SELECT COUNT(*) INTO service_count 
  FROM services 
  WHERE provider_id::text = '1';
  
  RAISE NOTICE 'Encontrados % serviços com provider_id = ''1''', service_count;
  
  -- 4. Atualizar todos os serviços com provider_id = '1'
  RAISE NOTICE '';
  RAISE NOTICE '=== CORRIGINDO SERVIÇOS COM PROVIDER_ID INVÁLIDO ===';
  
  UPDATE services 
  SET provider_id = fama_provider_id 
  WHERE provider_id::text = '1';
  
  GET DIAGNOSTICS service_count = ROW_COUNT;
  RAISE NOTICE '% serviços com provider_id = ''1'' foram atualizados para usar o provedor %', service_count, fama_provider_id;
  
  -- 5. Atualizar todos os serviços com provider_id não UUID
  UPDATE services 
  SET provider_id = fama_provider_id 
  WHERE provider_id IS NOT NULL 
    AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  GET DIAGNOSTICS service_count = ROW_COUNT;
  RAISE NOTICE '% serviços com provider_id não UUID foram atualizados para usar o provedor %', service_count, fama_provider_id;
  
  -- 6. Verificar se ainda existem serviços com provider_id inválido
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICANDO RESULTADO DA CORREÇÃO ===';
  
  SELECT COUNT(*) INTO invalid_count 
  FROM services 
  WHERE provider_id IS NOT NULL 
    AND provider_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  IF invalid_count > 0 THEN
    RAISE WARNING 'ATENÇÃO: Ainda existem % serviços com provider_id inválido', invalid_count;
  ELSE
    RAISE NOTICE 'SUCESSO! Todos os serviços agora têm provider_id válido';
  END IF;
  
  -- 7. Verificar serviços sem provider_id
  SELECT COUNT(*) INTO service_count 
  FROM services 
  WHERE provider_id IS NULL;
  
  IF service_count > 0 THEN
    RAISE NOTICE '% serviços não têm provider_id definido. Estes serviços não serão processados corretamente.', service_count;
    RAISE NOTICE 'Considere atualizar estes serviços com um provider_id válido usando:';
    RAISE NOTICE 'UPDATE services SET provider_id = ''%'' WHERE provider_id IS NULL;', fama_provider_id;
  ELSE
    RAISE NOTICE 'Todos os serviços têm provider_id definido.';
  END IF;
  
  -- 8. Verificar serviços com provider_id que não existe na tabela providers
  SELECT COUNT(*) INTO service_count 
  FROM services s
  LEFT JOIN providers p ON s.provider_id = p.id
  WHERE s.provider_id IS NOT NULL AND p.id IS NULL;
  
  IF service_count > 0 THEN
    RAISE WARNING 'ATENÇÃO: % serviços têm provider_id que não existe na tabela providers', service_count;
    RAISE NOTICE 'Considere atualizar estes serviços com um provider_id válido usando:';
    RAISE NOTICE 'UPDATE services SET provider_id = ''%'' WHERE provider_id IN (SELECT s.provider_id FROM services s LEFT JOIN providers p ON s.provider_id = p.id WHERE p.id IS NULL);', fama_provider_id;
  ELSE
    RAISE NOTICE 'Todos os serviços têm provider_id que existe na tabela providers.';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CORREÇÃO CONCLUÍDA ===';
  RAISE NOTICE 'Todos os serviços com provider_id inválido foram corrigidos.';
  RAISE NOTICE 'Verifique os logs acima para mais detalhes.';
END $$;

-- Consulta para verificar o resultado final
SELECT 
  s.id as service_id,
  s.name as service_name,
  s.provider_id,
  p.name as provider_name,
  p.slug as provider_slug
FROM 
  services s
LEFT JOIN 
  providers p ON s.provider_id = p.id
WHERE 
  s.provider_id IS NOT NULL
ORDER BY 
  p.name, s.name
LIMIT 
  100;
