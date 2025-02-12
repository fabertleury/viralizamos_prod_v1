-- Create the junction table for categories and socials
create table if not exists categories_socials (
    category_id uuid references categories(id) on delete cascade,
    social_id uuid references socials(id) on delete cascade,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (category_id, social_id)
);

-- Add RLS policies
alter table categories_socials enable row level security;

create policy "Enable read access for authenticated users" on categories_socials
    for select
    to authenticated
    using (true);

create policy "Enable insert access for authenticated users" on categories_socials
    for insert
    to authenticated
    with check (true);

create policy "Enable update access for authenticated users" on categories_socials
    for update
    to authenticated
    using (true);

create policy "Enable delete access for authenticated users" on categories_socials
    for delete
    to authenticated
    using (true);
