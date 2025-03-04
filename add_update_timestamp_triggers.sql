-- Script para adicionar triggers de atualização de timestamp

-- Função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar e criar trigger para a tabela customers
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'customers_update_timestamp' 
        AND tgrelid = 'public.customers'::regclass
    ) THEN
        CREATE TRIGGER customers_update_timestamp
        BEFORE UPDATE ON public.customers
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
        
        RAISE NOTICE 'Trigger de atualização de timestamp adicionado à tabela customers.';
    ELSE
        RAISE NOTICE 'O trigger de atualização de timestamp já existe na tabela customers.';
    END IF;
END $$;

-- Verificar e criar trigger para a tabela transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'transactions_update_timestamp' 
        AND tgrelid = 'public.transactions'::regclass
    ) THEN
        CREATE TRIGGER transactions_update_timestamp
        BEFORE UPDATE ON public.transactions
        FOR EACH ROW
        EXECUTE FUNCTION update_timestamp();
        
        RAISE NOTICE 'Trigger de atualização de timestamp adicionado à tabela transactions.';
    ELSE
        RAISE NOTICE 'O trigger de atualização de timestamp já existe na tabela transactions.';
    END IF;
END $$;
