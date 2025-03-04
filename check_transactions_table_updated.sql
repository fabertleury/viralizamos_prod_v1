-- Script para verificar a estrutura atualizada da tabela transactions
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'transactions'
ORDER BY 
    ordinal_position;
