-- Script SQL para limpar transações e lidar com restrições de chave estrangeira
-- Este script modifica a restrição de chave estrangeira para adicionar ON DELETE CASCADE
-- e depois exclui as transações desejadas

BEGIN;

-- Primeiro, verificamos se a restrição existe
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_transaction_id_fkey'
        AND table_name = 'orders'
    ) INTO constraint_exists;

    IF constraint_exists THEN
        -- Remover a restrição existente
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT orders_transaction_id_fkey';
        
        -- Adicionar a nova restrição com ON DELETE CASCADE
        EXECUTE 'ALTER TABLE orders ADD CONSTRAINT orders_transaction_id_fkey
                FOREIGN KEY (transaction_id)
                REFERENCES transactions (id)
                ON DELETE CASCADE';
                
        RAISE NOTICE 'Restrição de chave estrangeira modificada com sucesso para incluir ON DELETE CASCADE';
    ELSE
        RAISE NOTICE 'A restrição orders_transaction_id_fkey não existe. Verificando o nome correto da restrição...';
        
        -- Tentar encontrar o nome correto da restrição
        DECLARE
            constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'orders'
                AND kcu.column_name = 'transaction_id';
                
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || constraint_name;
                EXECUTE 'ALTER TABLE orders ADD CONSTRAINT ' || constraint_name || '
                        FOREIGN KEY (transaction_id)
                        REFERENCES transactions (id)
                        ON DELETE CASCADE';
                RAISE NOTICE 'Restrição % modificada com sucesso para incluir ON DELETE CASCADE', constraint_name;
            ELSE
                RAISE NOTICE 'Nenhuma restrição de chave estrangeira encontrada para a coluna transaction_id na tabela orders';
            END IF;
        END;
    END IF;
END $$;

-- Opção 1: Excluir transações específicas por ID
-- DELETE FROM transactions WHERE id IN ('id1', 'id2', 'id3');

-- Opção 2: Excluir transações com base em critérios
-- Por exemplo, excluir transações com mais de 30 dias
-- DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '30 days';

-- Opção 3: Excluir transações com status específico
-- DELETE FROM transactions WHERE status = 'failed';

-- Opção 4: Excluir todas as transações (use com cuidado!)
-- DELETE FROM transactions;

-- Descomente a opção desejada acima para executar a exclusão

-- Verificar quantas transações foram excluídas
-- SELECT COUNT(*) FROM transactions;

COMMIT;

-- Nota: Para reverter a alteração da restrição de chave estrangeira, execute:
/*
BEGIN;
ALTER TABLE orders DROP CONSTRAINT orders_transaction_id_fkey;
ALTER TABLE orders ADD CONSTRAINT orders_transaction_id_fkey
    FOREIGN KEY (transaction_id)
    REFERENCES transactions (id);
COMMIT;
*/
