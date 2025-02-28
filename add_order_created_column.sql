-- Adicionar coluna order_created na tabela transactions
ALTER TABLE transactions 
ADD COLUMN order_created BOOLEAN DEFAULT false;

-- Atualizar transações existentes para false
UPDATE transactions 
SET order_created = false 
WHERE order_created IS NULL;
