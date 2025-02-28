-- Adicionar coluna order_created à tabela transactions
ALTER TABLE transactions 
ADD COLUMN order_created BOOLEAN DEFAULT false;

-- Atualizar transações aprovadas existentes
UPDATE transactions 
SET order_created = true 
WHERE status = 'approved';