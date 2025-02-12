-- Remover políticas existentes
drop policy if exists "Enable profiles management" on profiles;
drop policy if exists "Enable insert for signup" on profiles;

-- Habilitar RLS
alter table profiles enable row level security;

-- Política para SELECT (mais permissiva para leitura)
create policy "Enable profiles select"
on profiles
for select
using (
  -- Usuários autenticados podem ver seu próprio perfil
  auth.uid() = id
  OR
  -- Admins podem ver todos os perfis
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
  OR
  -- Permitir leitura durante o processo de autenticação
  auth.uid() is not null
);

-- Política para INSERT (para signup)
create policy "Enable profiles insert"
on profiles
for insert
with check (true);

-- Política para UPDATE/DELETE (mais restritiva)
create policy "Enable profiles update delete"
on profiles
for update using (
  -- Usuários podem editar seu próprio perfil
  auth.uid() = id
  OR
  -- Admins podem editar todos os perfis
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
) with check (
  -- Mesmas condições do using
  auth.uid() = id
  OR
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- Verificar as políticas
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
