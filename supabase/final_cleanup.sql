-- Verificar se não há mais dependências
do $$
declare
  dep_count integer;
begin
  select count(*)
  into dep_count
  from information_schema.table_constraints
  where table_schema = 'public'
    and constraint_type = 'FOREIGN KEY'
    and constraint_name like '%users%';

  if dep_count = 0 then
    -- Não há mais dependências, podemos remover a tabela users
    drop table if exists public.users;
    raise notice 'Tabela users removida com sucesso!';
  else
    raise exception 'Ainda existem % dependências na tabela users!', dep_count;
  end if;
end $$;
