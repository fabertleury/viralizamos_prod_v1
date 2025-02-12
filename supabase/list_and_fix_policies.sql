-- Primeiro, vamos listar todas as políticas existentes
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'profiles';

-- Agora vamos remover todas as políticas existentes
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;
END $$;

-- Habilitar RLS na tabela profiles
alter table profiles enable row level security;

-- Criar novas políticas
-- Política para permitir que usuários vejam seu próprio perfil
create policy "Users can view own profile"
on profiles
for select
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
