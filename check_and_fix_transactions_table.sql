-- Script para verificar e adicionar a coluna external_id à tabela transactions se não existir
DO $$
BEGIN
    -- Verificar se a coluna external_id existe
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'external_id'
    ) THEN
        -- Adicionar a coluna external_id
        EXECUTE 'ALTER TABLE public.transactions ADD COLUMN external_id TEXT';
        
        -- Criar índice para melhorar a performance de consultas
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON public.transactions (external_id)';
        
        RAISE NOTICE 'Coluna external_id adicionada à tabela transactions com sucesso.';
    ELSE
        RAISE NOTICE 'A coluna external_id já existe na tabela transactions.';
    END IF;
END $$;
