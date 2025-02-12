-- Primeiro, vamos ver todas as políticas existentes
select schemaname, tablename, policyname
from pg_policies 
where tablename = 'profiles';

-- Agora vamos remover TODAS as políticas existentes
drop policy if exists "Admins can manage profiles" on profiles;
drop policy if exists "Public profiles are viewable by everyone" on profiles;
drop policy if exists "Users can update own profile" on profiles;
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Admins can manage all profiles" on profiles;
drop policy if exists "Enable insert for authenticated users only" on profiles;
drop policy if exists "Enable insert for auth trigger" on profiles;

-- Verificar se todas foram removidas
select schemaname, tablename, policyname
from pg_policies 
where tablename = 'profiles';

-- Agora vamos criar apenas as políticas necessárias
create policy "Enable profiles management"
on profiles
for all
using (
  -- Usuários podem ver/editar seu próprio perfil
  auth.uid() = id
  OR
  -- Admins podem gerenciar todos os perfis
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
)
with check (
  -- Usuários podem editar seu próprio perfil
  auth.uid() = id
  OR
  -- Admins podem editar todos os perfis
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Política para permitir inserção via trigger
create policy "Enable insert for signup"
on profiles
for insert
with check (true);

-- Verificar as novas políticas
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
