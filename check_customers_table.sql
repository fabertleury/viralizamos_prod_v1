-- Script para verificar a estrutura da tabela customers
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'customers'
ORDER BY 
    ordinal_position;
