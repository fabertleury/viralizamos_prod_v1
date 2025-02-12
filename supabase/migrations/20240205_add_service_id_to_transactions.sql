-- Adicionar coluna service_id na tabela transactions
ALTER TABLE transactions
ADD COLUMN service_id UUID REFERENCES services(id);

-- Atualizar service_id baseado nos metadados existentes
UPDATE transactions
SET service_id = (metadata->'service'->>'id')::UUID
WHERE metadata->'service'->>'id' IS NOT NULL;

-- Adicionar coluna transaction_id na tabela orders
ALTER TABLE orders
ADD COLUMN transaction_id UUID REFERENCES transactions(id);

-- Atualizar transaction_id na tabela orders baseado nos metadados
UPDATE orders
SET transaction_id = (metadata->'payment'->>'transaction_id')::UUID
WHERE metadata->'payment'->>'transaction_id' IS NOT NULL;

-- Atualizar service_id nos orders que não tem
UPDATE orders o
SET service_id = t.service_id
FROM transactions t
WHERE t.id = o.transaction_id
AND o.service_id IS NULL;
