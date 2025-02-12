-- Drop existing tables if they exist
drop table if exists public.profiles;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('admin', 'suporte', 'cliente')) default 'cliente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Create function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create function to update timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger for updating timestamps
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure update_updated_at_column();

-- Insert existing users into profiles
insert into public.profiles (id, role)
select id, 'cliente' as role
from auth.users
where id not in (select id from public.profiles);

-- Update admin user
update public.profiles
set role = 'admin'
where id = 'ba85990a-9a92-4a7b-a2d2-31da5856e2b7';
