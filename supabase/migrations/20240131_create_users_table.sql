-- Create users table
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  email text,
  role text default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.users enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own data" on users;
drop policy if exists "Users can update own data" on users;

-- Create policies
create policy "Users can view their own data" on users
  for select using (auth.uid() = id);

create policy "Users can update own data" on users
  for update using (auth.uid() = id);

create policy "Admin users can view all data" on users
  for select using (
    exists (
      select 1 from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin users can insert data" on users
  for insert with check (
    exists (
      select 1 from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin users can update data" on users
  for update using (
    exists (
      select 1 from users where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admin users can delete data" on users
  for delete using (
    exists (
      select 1 from users where id = auth.uid() and role = 'admin'
    )
  );

-- Create trigger to update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create trigger handle_users_updated_at
  before update on users
  for each row
  execute function handle_updated_at();

-- Insert admin user if not exists
insert into public.users (id, name, email, role)
select 
  id,
  raw_user_meta_data->>'name',
  email,
  'admin'
from auth.users
where id = 'ba85990a-9a92-4a7b-a2d2-31da5856e2b7'
on conflict (id) do update
set role = 'admin';
