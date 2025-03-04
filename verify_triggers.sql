-- Script para verificar os triggers existentes nas tabelas

-- Verificar triggers na tabela customers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'customers'
    AND trigger_schema = 'public';

-- Verificar triggers na tabela transactions
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM 
    information_schema.triggers
WHERE 
    event_object_table = 'transactions'
    AND trigger_schema = 'public';
