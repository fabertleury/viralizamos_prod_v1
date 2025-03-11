-- Script para adicionar a coluna 'order' à tabela 'services'
-- Execute este script no seu banco de dados Supabase

-- Adicionar a coluna 'order' com valor padrão NULL
ALTER TABLE services ADD COLUMN "order" INTEGER;

-- Atualizar todos os serviços existentes com uma ordem baseada em ROW_NUMBER
-- Isso garante que todos os serviços tenham uma ordem inicial sem tentar converter UUID para integer
WITH ordered_services AS (
  SELECT 
    id, 
    ROW_NUMBER() OVER (ORDER BY id) as row_num
  FROM services
)
UPDATE services
SET "order" = os.row_num
FROM ordered_services os
WHERE services.id = os.id;

-- Adicionar um índice para melhorar o desempenho das consultas de ordenação
CREATE INDEX idx_services_order ON services ("order");

-- Comentário sobre a coluna
COMMENT ON COLUMN services."order" IS 'Coluna para controlar a ordem de exibição dos serviços. Valores menores aparecem primeiro.';

-- Instruções de uso:
/*
  Para ordenar os serviços por esta coluna, use:
  
  SELECT * FROM services ORDER BY "order" ASC;
  
  Para atualizar a ordem de um serviço específico:
  
  UPDATE services SET "order" = 1 WHERE id = 'id_do_servico';
*/
