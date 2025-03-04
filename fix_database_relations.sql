-- Script para corrigir as relações entre orders, providers e customers
-- ATENÇÃO: Faça backup do banco de dados antes de executar este script

-- Início da transação
BEGIN;

-- 1. Adicionar coluna provider_id na tabela orders (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN provider_id UUID REFERENCES public.providers(id);
        RAISE NOTICE 'Coluna provider_id adicionada à tabela orders';
    ELSE
        RAISE NOTICE 'Coluna provider_id já existe na tabela orders';
    END IF;
END $$;

-- 2. Adicionar coluna customer_id na tabela orders (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id);
        RAISE NOTICE 'Coluna customer_id adicionada à tabela orders';
    ELSE
        RAISE NOTICE 'Coluna customer_id já existe na tabela orders';
    END IF;
END $$;

-- 3. Criar índices para as colunas de chave estrangeira (se ainda não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'orders' 
        AND indexname = 'idx_orders_provider_id'
    ) THEN
        CREATE INDEX idx_orders_provider_id ON public.orders(provider_id);
        RAISE NOTICE 'Índice idx_orders_provider_id criado';
    ELSE
        RAISE NOTICE 'Índice idx_orders_provider_id já existe';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'orders' 
        AND indexname = 'idx_orders_customer_id'
    ) THEN
        CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
        RAISE NOTICE 'Índice idx_orders_customer_id criado';
    ELSE
        RAISE NOTICE 'Índice idx_orders_customer_id já existe';
    END IF;
END $$;

-- 4. Preencher a coluna provider_id com base nos metadados existentes
UPDATE public.orders
SET provider_id = providers.id
FROM public.providers
WHERE orders.metadata->>'provider' = providers.name
  AND orders.provider_id IS NULL;

-- 5. Preencher a coluna customer_id com base nos metadados existentes
UPDATE public.orders
SET customer_id = customers.id
FROM public.customers
WHERE (orders.metadata->>'email' = customers.email OR orders.metadata->>'customer_email' = customers.email)
  AND orders.customer_id IS NULL;

-- 6. Verificar e corrigir relações entre orders e profiles (usuários)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'user_id'
    ) THEN
        -- Verificar se a relação já existe
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_name = 'orders'
              AND kcu.column_name = 'user_id'
        ) THEN
            -- Adicionar a chave estrangeira se não existir
            ALTER TABLE public.orders 
            ADD CONSTRAINT fk_orders_user_id 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id);
            
            RAISE NOTICE 'Chave estrangeira fk_orders_user_id criada';
        ELSE
            RAISE NOTICE 'Chave estrangeira para user_id já existe';
        END IF;
    END IF;
END $$;

-- 7. Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN public.orders.provider_id IS 'Referência ao provedor que processará o pedido';
COMMENT ON COLUMN public.orders.customer_id IS 'Referência ao cliente que fez o pedido';

-- 8. Criar uma view para facilitar a consulta de pedidos com todas as relações
CREATE OR REPLACE VIEW public.orders_full_view AS
SELECT 
    o.*,
    p.name AS provider_name,
    p.slug AS provider_slug,
    c.name AS customer_name,
    c.email AS customer_email,
    s.name AS service_name,
    s.type AS service_type,
    t.amount AS transaction_amount,
    t.status AS transaction_status
FROM 
    public.orders o
LEFT JOIN 
    public.providers p ON o.provider_id = p.id
LEFT JOIN 
    public.customers c ON o.customer_id = c.id
LEFT JOIN 
    public.services s ON o.service_id = s.id
LEFT JOIN 
    public.transactions t ON o.transaction_id = t.id;

COMMENT ON VIEW public.orders_full_view IS 'Visão completa dos pedidos com todas as relações';

-- Commit da transação
COMMIT;
