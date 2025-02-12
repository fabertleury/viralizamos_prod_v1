-- Create providers table if not exists
create table if not exists providers (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    slug text not null,
    description text,
    api_key text,
    api_url text,
    status boolean default true,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create unique index for slug
create unique index if not exists providers_slug_unique on providers (slug);

-- Add RLS policies
alter table providers enable row level security;

create policy "Providers are viewable by authenticated users"
    on providers for select
    to authenticated
    using (true);

create policy "Providers are insertable by admins"
    on providers for insert
    to authenticated
    with check (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

create policy "Providers are updatable by admins"
    on providers for update
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

create policy "Providers are deletable by admins"
    on providers for delete
    to authenticated
    using (
        exists (
            select 1 from profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

-- Insert default provider if not exists
insert into providers (name, slug, description, api_url, status, metadata)
values (
    'FamaRedes', 
    'fama-redes', 
    'Provedor de serviços para redes sociais', 
    'https://famanasredes.com.br/api/v2', 
    true,
    '{
        "api_version": "v2",
        "supported_networks": ["instagram", "facebook", "tiktok", "youtube"]
    }'::jsonb
)
on conflict (slug) do nothing;
