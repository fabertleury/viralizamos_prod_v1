-- Script para verificar e corrigir a tabela 'socials'
-- Autor: Cascade AI
-- Data: 03/03/2025

-- Verificar se a tabela 'socials' existe
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'socials'
);

-- Verificar a estrutura da tabela 'socials'
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

-- Verificar se todas as colunas mencionadas na memória existem
SELECT 
    CASE WHEN COUNT(*) = 9 THEN 'Todas as colunas existem' ELSE 'Faltam colunas' END as status
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'socials'
    AND column_name IN ('id', 'name', 'icon', 'url', 'active', 'order_position', 'created_at', 'updated_at', 'icon_url');

-- Verificar quais colunas estão faltando (se houver)
SELECT 
    column_name
FROM (
    VALUES 
        ('id'), 
        ('name'), 
        ('icon'), 
        ('url'), 
        ('active'), 
        ('order_position'), 
        ('created_at'), 
        ('updated_at'), 
        ('icon_url')
) AS expected(column_name)
WHERE 
    column_name NOT IN (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'socials'
    );

-- Verificar chaves primárias
SELECT
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
    AND tc.table_name = 'socials';

-- Verificar índices
SELECT
    indexname,
    indexdef
FROM
    pg_indexes
WHERE
    schemaname = 'public'
    AND tablename = 'socials';

-- Contar registros na tabela
SELECT 
    COUNT(*) as total_records
FROM 
    public.socials;

-- Mostrar alguns registros de exemplo
SELECT 
    *
FROM 
    public.socials
LIMIT 5;
