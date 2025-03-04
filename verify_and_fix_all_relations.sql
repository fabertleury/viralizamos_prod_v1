-- Script para verificar e corrigir todas as relações do banco de dados
-- Autor: Cascade AI
-- Data: 03/03/2025
-- ATENÇÃO: Faça backup do banco de dados antes de executar este script

-- Início da transação
BEGIN;

-- =============================================
-- PARTE 1: VERIFICAÇÃO DAS TABELAS E RELAÇÕES
-- =============================================

-- Listar todas as tabelas no esquema public
SELECT 
    table_name 
FROM 
    information_schema.tables 
WHERE 
    table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY 
    table_name;

-- Verificar chaves estrangeiras existentes
SELECT
    tc.table_schema, 
    tc.constraint_name,
    tc.table_name AS tabela_origem, 
    kcu.column_name AS coluna_origem, 
    ccu.table_name AS tabela_referenciada,
    ccu.column_name AS coluna_referenciada
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_name,
    kcu.column_name;

-- =============================================
-- PARTE 2: CORREÇÃO DAS RELAÇÕES ENTRE ORDERS, PROVIDERS E CUSTOMERS
-- =============================================

-- 1. Adicionar coluna provider_id na tabela orders (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'orders' 
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
        WHERE table_schema = 'public'
        AND table_name = 'orders' 
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
        WHERE schemaname = 'public'
        AND tablename = 'orders' 
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
        WHERE schemaname = 'public'
        AND tablename = 'orders' 
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

-- =============================================
-- PARTE 3: VERIFICAÇÃO E CORREÇÃO DA TABELA SOCIALS
-- =============================================

-- 1. Verificar se a tabela 'socials' existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'socials'
    ) THEN
        -- Criar a tabela socials se não existir
        CREATE TABLE public.socials (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            icon VARCHAR(255),
            url VARCHAR(255),
            active BOOLEAN DEFAULT true,
            order_position INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            icon_url VARCHAR(255)
        );
        
        RAISE NOTICE 'Tabela socials criada';
    ELSE
        RAISE NOTICE 'Tabela socials já existe';
    END IF;
END $$;

-- 2. Verificar e adicionar colunas que possam estar faltando na tabela socials
DO $$
DECLARE
    columns_to_check TEXT[] := ARRAY['id', 'name', 'icon', 'url', 'active', 'order_position', 'created_at', 'updated_at', 'icon_url'];
    col TEXT;
BEGIN
    FOREACH col IN ARRAY columns_to_check
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'socials'
            AND column_name = col
        ) THEN
            CASE col
                WHEN 'id' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN id UUID PRIMARY KEY DEFAULT uuid_generate_v4()';
                WHEN 'name' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN name VARCHAR(255) NOT NULL';
                WHEN 'icon' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN icon VARCHAR(255)';
                WHEN 'url' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN url VARCHAR(255)';
                WHEN 'active' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN active BOOLEAN DEFAULT true';
                WHEN 'order_position' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN order_position INTEGER DEFAULT 0';
                WHEN 'created_at' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
                WHEN 'updated_at' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
                WHEN 'icon_url' THEN
                    EXECUTE 'ALTER TABLE public.socials ADD COLUMN icon_url VARCHAR(255)';
                ELSE
                    NULL;
            END CASE;
            
            RAISE NOTICE 'Coluna % adicionada à tabela socials', col;
        END IF;
    END LOOP;
END $$;

-- 3. Criar índices para a tabela socials (se ainda não existirem)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'socials' 
        AND indexname = 'idx_socials_name'
    ) THEN
        CREATE INDEX idx_socials_name ON public.socials(name);
        RAISE NOTICE 'Índice idx_socials_name criado';
    ELSE
        RAISE NOTICE 'Índice idx_socials_name já existe';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'socials' 
        AND indexname = 'idx_socials_active'
    ) THEN
        CREATE INDEX idx_socials_active ON public.socials(active);
        RAISE NOTICE 'Índice idx_socials_active criado';
    ELSE
        RAISE NOTICE 'Índice idx_socials_active já existe';
    END IF;
END $$;

-- 4. Adicionar trigger para atualizar o campo updated_at automaticamente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'set_socials_updated_at'
    ) THEN
        CREATE OR REPLACE FUNCTION public.set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        CREATE TRIGGER set_socials_updated_at
        BEFORE UPDATE ON public.socials
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
        
        RAISE NOTICE 'Trigger set_socials_updated_at criado';
    ELSE
        RAISE NOTICE 'Trigger set_socials_updated_at já existe';
    END IF;
END $$;

-- =============================================
-- PARTE 4: VERIFICAÇÃO FINAL
-- =============================================

-- Verificar novamente as chaves estrangeiras após as correções
SELECT
    tc.table_schema, 
    tc.constraint_name,
    tc.table_name AS tabela_origem, 
    kcu.column_name AS coluna_origem, 
    ccu.table_name AS tabela_referenciada,
    ccu.column_name AS coluna_referenciada
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_name,
    kcu.column_name;

-- Commit da transação
COMMIT;
