-- Verificar se não há mais dependências e remover a tabela users
do $$
declare
  dep_count integer;
begin
  -- Verificar foreign keys
  select count(*)
  into dep_count
  from information_schema.table_constraints
  where table_schema = 'public'
    and constraint_type = 'FOREIGN KEY'
    and (
      constraint_name like '%users%'
      or exists (
        select 1
        from information_schema.constraint_column_usage
        where constraint_name = table_constraints.constraint_name
          and table_name = 'users'
      )
    );

  if dep_count = 0 then
    -- Não há mais dependências, podemos remover a tabela users
    drop table if exists public.users cascade;
    raise notice 'Tabela users removida com sucesso!';
  else
    raise exception 'Ainda existem % dependências na tabela users!', dep_count;
  end if;
end $$;
