-- Script para verificar e adicionar a relação entre transactions e customers

-- Verificar se existe a coluna customer_id na tabela transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'customer_id'
    ) THEN
        -- Adicionar a coluna customer_id
        EXECUTE 'ALTER TABLE public.transactions ADD COLUMN customer_id UUID REFERENCES public.customers(id)';
        
        -- Criar índice para melhorar a performance de consultas
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions (customer_id)';
        
        RAISE NOTICE 'Coluna customer_id adicionada à tabela transactions com sucesso.';
    ELSE
        RAISE NOTICE 'A coluna customer_id já existe na tabela transactions.';
    END IF;
END $$;

-- Função para atualizar o customer_id nas transações existentes
CREATE OR REPLACE FUNCTION update_transaction_customer_ids()
RETURNS void AS $$
DECLARE
    trans RECORD;
    found_customer_id UUID;
BEGIN
    -- Para cada transação que tem customer_email mas não tem customer_id
    FOR trans IN 
        SELECT id, customer_email 
        FROM public.transactions 
        WHERE customer_email IS NOT NULL 
        AND transactions.customer_id IS NULL
    LOOP
        -- Buscar o ID do cliente pelo email
        SELECT id INTO found_customer_id
        FROM public.customers
        WHERE email = trans.customer_email
        LIMIT 1;
        
        -- Se encontrou o cliente, atualizar a transação
        IF found_customer_id IS NOT NULL THEN
            UPDATE public.transactions
            SET customer_id = found_customer_id
            WHERE id = trans.id;
            
            RAISE NOTICE 'Atualizada transação % com customer_id %', trans.id, found_customer_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar a função para atualizar as relações
SELECT update_transaction_customer_ids();

-- Criar uma função trigger para manter a relação atualizada
CREATE OR REPLACE FUNCTION update_transaction_customer_id()
RETURNS TRIGGER AS $$
DECLARE
    found_customer_id UUID;
BEGIN
    -- Se temos um email de cliente, buscar ou criar o registro na tabela customers
    IF NEW.customer_email IS NOT NULL AND NEW.customer_id IS NULL THEN
        -- Buscar o cliente pelo email
        SELECT id INTO found_customer_id
        FROM public.customers
        WHERE email = NEW.customer_email
        LIMIT 1;
        
        -- Se não encontrou, criar um novo cliente
        IF found_customer_id IS NULL THEN
            INSERT INTO public.customers (
                email, 
                name, 
                phone,
                metadata
            ) VALUES (
                NEW.customer_email,
                NEW.customer_name,
                NEW.customer_phone,
                COALESCE(NEW.metadata, '{}'::jsonb)
            )
            RETURNING id INTO found_customer_id;
        END IF;
        
        -- Atualizar o customer_id na transação
        NEW.customer_id := found_customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar e criar trigger para manter a relação atualizada
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'transactions_update_customer_id' 
        AND tgrelid = 'public.transactions'::regclass
    ) THEN
        CREATE TRIGGER transactions_update_customer_id
        BEFORE INSERT OR UPDATE ON public.transactions
        FOR EACH ROW
        EXECUTE FUNCTION update_transaction_customer_id();
        
        RAISE NOTICE 'Trigger para atualização automática de customer_id adicionado à tabela transactions.';
    ELSE
        RAISE NOTICE 'O trigger para atualização automática de customer_id já existe na tabela transactions.';
    END IF;
END $$;
