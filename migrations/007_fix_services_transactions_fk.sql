-- Primeiro remove a constraint existente
ALTER TABLE transactions
DROP CONSTRAINT transactions_service_id_fkey;

-- Adiciona a constraint novamente com ON DELETE SET NULL
ALTER TABLE transactions
ADD CONSTRAINT transactions_service_id_fkey
FOREIGN KEY (service_id)
REFERENCES services(id)
ON DELETE SET NULL;
