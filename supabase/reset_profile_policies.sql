-- Remover políticas existentes específicas
drop policy if exists "Admins can manage profiles" on profiles;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- Habilitar RLS na tabela profiles
alter table profiles enable row level security;

-- Política básica para permitir que usuários vejam seu próprio perfil (necessário para login)
create policy "Users can view own profile"
on profiles
for select
using (auth.uid() = id);

-- Política para permitir que admins vejam e gerenciem todos os perfis
create policy "Admins can manage all profiles"
on profiles
for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Política para permitir que o trigger do auth.users crie perfis
create policy "Enable insert for auth trigger"
on profiles
for insert
with check (true);

-- Verificar políticas após a criação
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
where tablename = 'profiles';
