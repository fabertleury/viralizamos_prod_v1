-- Script definitivo para corrigir o problema dos provider_ids

-- 1. Primeiro, verificar se existe um provedor com slug 'fama'
DO $$
DECLARE
  fama_provider_id uuid;
  service_count integer;
BEGIN
  -- Verificar se existe o provedor fama
  SELECT id INTO fama_provider_id FROM providers WHERE slug = 'fama';
  
  -- Se não existir, criar o provedor fama
  IF fama_provider_id IS NULL THEN
    INSERT INTO providers (
      name, 
      slug, 
      description, 
      api_url, 
      api_key, 
      status
    ) VALUES (
      'Fama Redes', 
      'fama', 
      'Provedor padrão para serviços de mídia social', 
      'https://fama-redes.com/api/v2', 
      '-- insira sua api key aqui --', 
      true
    ) RETURNING id INTO fama_provider_id;
    
    RAISE NOTICE 'Provedor Fama criado com ID: %', fama_provider_id;
  ELSE
    RAISE NOTICE 'Provedor Fama já existe com ID: %', fama_provider_id;
  END IF;
  
  -- 2. Atualizar todos os serviços com provider_id = '1'
  UPDATE services 
  SET provider_id = fama_provider_id 
  WHERE provider_id = '1';
  
  GET DIAGNOSTICS service_count = ROW_COUNT;
  RAISE NOTICE '% serviços com provider_id = ''1'' foram atualizados', service_count;
  
  -- 3. Atualizar todos os serviços com provider_id não UUID
  UPDATE services 
  SET provider_id = fama_provider_id 
  WHERE provider_id IS NOT NULL 
    AND provider_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  GET DIAGNOSTICS service_count = ROW_COUNT;
  RAISE NOTICE '% serviços com provider_id não UUID foram atualizados', service_count;
  
  -- 4. Verificar se ainda existem serviços com provider_id inválido
  SELECT COUNT(*) INTO service_count 
  FROM services 
  WHERE provider_id IS NOT NULL 
    AND provider_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  IF service_count > 0 THEN
    RAISE NOTICE 'ATENÇÃO: Ainda existem % serviços com provider_id inválido', service_count;
  ELSE
    RAISE NOTICE 'Sucesso! Todos os serviços agora têm provider_id válido';
  END IF;
END $$;
