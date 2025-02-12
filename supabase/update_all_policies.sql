-- Remover políticas antigas
drop policy if exists "Admins can view all users" on users;
drop policy if exists "Admins can manage categories" on categories;
drop policy if exists "Admins can manage providers" on providers;
drop policy if exists "Admins can manage FAQs" on faqs;
drop policy if exists "Admins can view failed jobs" on failed_jobs;
drop policy if exists "Admins can manage socials" on socials;
drop policy if exists "Support can view all transactions" on transactions;
drop policy if exists "Admins can manage transactions" on transactions;
drop policy if exists "Admins can manage configurations" on configurations;

-- Recriar políticas usando profiles
create policy "Admins can manage categories"
  on categories
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Admins can manage providers"
  on providers
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Admins can manage FAQs"
  on faqs
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Admins can view failed jobs"
  on failed_jobs
  for select
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Admins can manage socials"
  on socials
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Support can view all transactions"
  on transactions
  for select
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role in ('admin', 'support')
  ));

create policy "Admins can manage transactions"
  on transactions
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Admins can manage configurations"
  on configurations
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));
