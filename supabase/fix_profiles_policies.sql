-- Habilitar RLS na tabela profiles
alter table profiles enable row level security;

-- Remover políticas existentes
drop policy if exists "Admins can manage profiles" on profiles;
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Public profiles are viewable by everyone" on profiles;

-- Política para permitir que usuários vejam seu próprio perfil
create policy "Users can view own profile"
on profiles
for select
using (
  auth.uid() = id
);

-- Política para permitir que usuários editem seu próprio perfil
create policy "Users can update own profile"
on profiles
for update
using (
  auth.uid() = id
);

-- Política para permitir que admins gerenciem todos os perfis
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

-- Política para permitir inserção de novos perfis (necessário para o signup)
create policy "Enable insert for authenticated users only"
on profiles
for insert
with check (auth.uid() = id);
