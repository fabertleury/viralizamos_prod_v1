-- Backup da tabela users atual
create table if not exists public.users_backup as 
select * from public.users;

-- Criar a nova tabela profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'suporte', 'cliente')) default 'cliente',
  -- Manteremos outros campos da tabela users aqui
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migrar dados da tabela users para profiles
insert into public.profiles (id, role)
select 
  id,
  case 
    when role = 'admin' then 'admin'
    when role = 'suporte' then 'suporte'
    else 'cliente'
  end as role
from public.users
on conflict (id) do update
set role = EXCLUDED.role;

-- Enable RLS na nova tabela
alter table public.profiles enable row level security;

-- Criar políticas de segurança
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Criar função para novos usuários
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Criar trigger para novos usuários
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Criar função para atualizar timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Criar trigger para atualizar timestamps
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure update_updated_at_column();

-- Garantir que o usuário atual seja admin
update public.profiles
set role = 'admin'
where id = 'ba85990a-9a92-4a7b-a2d2-31da5856e2b7';

-- Remover a tabela users antiga
-- IMPORTANTE: Só remover após confirmar que a migração foi bem sucedida
-- drop table public.users;
