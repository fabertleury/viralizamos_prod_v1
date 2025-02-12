-- Remover políticas existentes
drop policy if exists "Enable profiles select" on profiles;
drop policy if exists "Enable profiles insert" on profiles;
drop policy if exists "Enable profiles update delete" on profiles;

-- Habilitar RLS
alter table profiles enable row level security;

-- Política para SELECT (mais permissiva para leitura)
create policy "Enable profiles select"
on profiles
for select
using (true);  -- Permite leitura para todos os usuários autenticados

-- Política para INSERT (para signup)
create policy "Enable profiles insert"
on profiles
for insert
with check (true);

-- Política para UPDATE
create policy "Enable profiles update"
on profiles
for update
using (
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

-- Política para DELETE
create policy "Enable profiles delete"
on profiles
for delete
using (
  -- Apenas admins podem deletar
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
