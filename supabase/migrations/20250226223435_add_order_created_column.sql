-- Adicionar coluna order_created na tabela transactions
ALTER TABLE transactions 
ADD COLUMN order_created BOOLEAN DEFAULT false;