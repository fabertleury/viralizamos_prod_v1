-- Script para listar os serviços sem provider_id e os provedores disponíveis

-- 1. Listar os provedores disponíveis
SELECT 
  id, 
  name, 
  api_url
FROM 
  providers
ORDER BY 
  name;

-- 2. Listar os serviços sem provider_id com mais detalhes
SELECT 
  id, 
  name, 
  external_id,
  created_at,
  updated_at,
  preco
FROM 
  services 
WHERE 
  provider_id IS NULL
ORDER BY
  name;
