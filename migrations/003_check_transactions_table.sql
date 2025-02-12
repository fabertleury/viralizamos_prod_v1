-- Verificar estrutura da tabela transactions
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'transactions'
ORDER BY ordinal_position;

-- Verificar um registro recente com seus posts
SELECT t.*, sp.*
FROM transactions t
LEFT JOIN selected_posts sp ON sp.transaction_id = t.id
ORDER BY t.created_at DESC
LIMIT 1;
