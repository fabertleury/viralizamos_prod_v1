-- Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'selected_posts'
);

-- Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    column_default,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'selected_posts'
ORDER BY ordinal_position;

-- Verificar se existem registros
SELECT * FROM selected_posts LIMIT 5;