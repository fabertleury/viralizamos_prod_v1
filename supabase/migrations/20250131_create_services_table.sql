-- Create services table
create table if not exists services (
    id uuid default uuid_generate_v4() primary key,
    provider_id uuid references providers(id) on delete cascade,
    category_id uuid references categories(id) on delete cascade,
    service_id varchar not null,
    name varchar not null,
    type varchar,
    rate decimal(10,2) not null,
    min integer not null,
    max integer not null,
    refill boolean default false,
    active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table services enable row level security;

create policy "Enable read access for authenticated users" on services
    for select
    to authenticated
    using (true);

create policy "Enable insert access for authenticated users" on services
    for insert
    to authenticated
    with check (true);

create policy "Enable update access for authenticated users" on services
    for update
    to authenticated
    using (true);

create policy "Enable delete access for authenticated users" on services
    for delete
    to authenticated
    using (true);
