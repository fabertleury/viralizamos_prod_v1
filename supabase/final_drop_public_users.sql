-- Fazer backup final da tabela public.users
create table if not exists public.users_backup_final as 
select * from public.users;

-- Remover a tabela public.users
drop table if exists public.users cascade;

-- Verificar se a tabela foi removida
do $$
begin
  if exists (
    select 1 
    from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'users'
  ) then
    raise exception 'A tabela public.users ainda existe!';
  else
    raise notice 'A tabela public.users foi removida com sucesso!';
  end if;
end $$;
