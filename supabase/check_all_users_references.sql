-- Verificar foreign keys que referenciam users
select 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name as foreign_table_name,
    ccu.column_name as foreign_column_name
from 
    information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and (ccu.table_name = 'users' or tc.table_name = 'users');

-- Verificar políticas que mencionam users
select 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
from pg_policies
where 
    qual::text like '%users%' 
    or with_check::text like '%users%';

-- Verificar triggers que mencionam users
SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE action_statement::text LIKE '%users%';

-- Verificar views que referenciam users
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%users%';
