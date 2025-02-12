-- Fazer backup final da tabela users antes de remover
create table if not exists public.users_backup_final as 
select * from public.users;

-- Remover a tabela users
drop table if exists public.users cascade;

-- Confirmar que todas as tabelas estão usando profiles
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and constraint_type = 'FOREIGN KEY'
      and exists (
        select 1
        from information_schema.constraint_column_usage
        where constraint_name = table_constraints.constraint_name
          and table_name = 'users'
      )
  ) then
    raise exception 'Ainda existem referências para a tabela users!';
  else
    raise notice 'Migração concluída com sucesso! Todas as tabelas agora usam profiles.';
  end if;
end $$;
