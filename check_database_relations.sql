-- Script para verificar relações entre tabelas no Supabase
-- Autor: Cascade AI
-- Data: 03/03/2025

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

-- Listar todas as colunas de cada tabela
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, 
    ordinal_position;

-- Listar todas as chaves primárias
SELECT
    tc.table_schema, 
    tc.table_name, 
    kc.column_name 
FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kc 
        ON kc.table_name = tc.table_name
        AND kc.table_schema = tc.table_schema
        AND kc.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
ORDER BY 
    tc.table_schema,
    tc.table_name;

-- Listar todas as chaves estrangeiras
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

-- Verificar especificamente a tabela 'socials' (conforme mencionado na memória)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'socials'
ORDER BY 
    ordinal_position;

-- Verificar índices
SELECT
    tablename,
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
ORDER BY
    tablename,
    indexname;

-- Verificar constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    string_agg(kcu.column_name, ', ') AS columns
FROM
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
WHERE
    tc.table_schema = 'public'
GROUP BY
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type
ORDER BY
    tc.table_name,
    tc.constraint_type;
