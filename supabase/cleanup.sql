-- Verificar se todos os usuários foram migrados
do $$
declare
  users_count integer;
  profiles_count integer;
begin
  select count(*) into users_count from public.users;
  select count(*) into profiles_count from public.profiles;
  
  if users_count = profiles_count then
    -- Todos os usuários foram migrados, podemos remover a tabela users
    drop table if exists public.users;
    raise notice 'Tabela users removida com sucesso!';
  else
    raise exception 'Nem todos os usuários foram migrados! Users: %, Profiles: %', users_count, profiles_count;
  end if;
end $$;
