-- Ver a estrutura atual da tabela
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles';
