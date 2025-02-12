-- Remover políticas antigas da tabela profiles
drop policy if exists "Admins can manage profiles" on profiles;

-- Criar nova política que permite admins gerenciarem todos os perfis
create policy "Admins can manage profiles"
on profiles
for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
