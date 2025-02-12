-- Verificar foreign keys restantes
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

-- Verificar políticas restantes
select 
    schemaname,
    tablename,
    policyname
from pg_policies
where 
    qual::text like '%users%' 
    or with_check::text like '%users%';

-- Verificar triggers restantes
SELECT 
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name
FROM information_schema.triggers
WHERE action_statement::text LIKE '%users%';

-- Verificar views restantes
SELECT 
    schemaname,
    viewname
FROM pg_views
WHERE definition LIKE '%users%';
