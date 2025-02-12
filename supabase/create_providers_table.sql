-- Criar enum para status da API
create type api_status as enum ('active', 'inactive', 'error');

-- Criar tabela de provedores
create table providers (
    id uuid not null primary key default uuid_generate_v4(),
    name text not null,
    url text not null,
    api_key text not null,
    status boolean not null default true,
    description text,
    balance decimal(10,2) default 0,
    api_status api_status default 'inactive',
    api_error text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar índices
create index providers_name_idx on providers(name);
create index providers_status_idx on providers(status);
create index providers_api_status_idx on providers(api_status);

-- Criar políticas RLS
alter table providers enable row level security;

-- Política para permitir admins gerenciarem provedores
create policy "Admins can manage providers"
on providers
for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
