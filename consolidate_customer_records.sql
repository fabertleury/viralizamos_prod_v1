-- Script para consolidar registros de clientes duplicados

-- Função para consolidar clientes com o mesmo email
CREATE OR REPLACE FUNCTION consolidate_customers_by_email()
RETURNS void AS $$
DECLARE
    email_record RECORD;
    primary_customer_id UUID;
    duplicate_customer RECORD;
BEGIN
    -- Para cada email com múltiplos registros
    FOR email_record IN 
        SELECT email, COUNT(*) as count
        FROM public.customers
        GROUP BY email
        HAVING COUNT(*) > 1
    LOOP
        RAISE NOTICE 'Consolidando registros para o email: %', email_record.email;
        
        -- Selecionar o registro mais recente como primário
        SELECT id INTO primary_customer_id
        FROM public.customers
        WHERE email = email_record.email
        ORDER BY created_at DESC
        LIMIT 1;
        
        RAISE NOTICE 'Cliente primário selecionado: %', primary_customer_id;
        
        -- Para cada registro duplicado
        FOR duplicate_customer IN
            SELECT id
            FROM public.customers
            WHERE email = email_record.email
            AND id != primary_customer_id
        LOOP
            -- Atualizar todas as transações que apontam para o cliente duplicado
            UPDATE public.transactions
            SET customer_id = primary_customer_id
            WHERE customer_id = duplicate_customer.id;
            
            RAISE NOTICE 'Transações do cliente % atualizadas para apontar para %', duplicate_customer.id, primary_customer_id;
            
            -- Excluir o registro duplicado
            DELETE FROM public.customers
            WHERE id = duplicate_customer.id;
            
            RAISE NOTICE 'Cliente duplicado excluído: %', duplicate_customer.id;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Consolidação de clientes concluída.';
END;
$$ LANGUAGE plpgsql;

-- Executar a função para consolidar os clientes
SELECT consolidate_customers_by_email();

-- Criar um índice único para garantir que não haja duplicação no futuro
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'idx_customers_email_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_customers_email_unique ON public.customers (email);
        RAISE NOTICE 'Índice único criado para o campo email na tabela customers.';
    ELSE
        RAISE NOTICE 'O índice único para o campo email já existe na tabela customers.';
    END IF;
END $$;

-- Atualizar o trigger para lidar com conflitos de email
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
        ELSE
            -- Cliente existe, atualizar se necessário
            -- Atualizar apenas se o nome não estiver vazio e for diferente do atual
            IF NEW.customer_name IS NOT NULL AND NEW.customer_name != '' THEN
                UPDATE public.customers
                SET 
                    name = CASE 
                        WHEN name IS NULL OR name = '' OR name = email THEN NEW.customer_name
                        ELSE name  -- Manter o nome existente se já tiver um nome válido
                    END,
                    phone = COALESCE(public.customers.phone, NEW.customer_phone),
                    updated_at = NOW()
                WHERE id = found_customer_id;
            END IF;
        END IF;
        
        -- Atualizar o customer_id na transação
        NEW.customer_id := found_customer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
