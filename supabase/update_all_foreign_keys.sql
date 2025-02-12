-- Primeiro, remover as políticas existentes
drop policy if exists "Admins can manage all services" on services;
drop policy if exists "Support can view all orders" on orders;
drop policy if exists "Admins can manage all orders" on orders;
drop policy if exists "Support can view assigned tickets" on tickets;
drop policy if exists "Admins can manage all tickets" on tickets;
drop policy if exists "Admins can view all messages" on ticket_messages;

-- Remover as foreign keys existentes
alter table orders drop constraint if exists orders_user_id_fkey;
alter table tickets drop constraint if exists tickets_user_id_fkey;
alter table tickets drop constraint if exists tickets_assigned_to_fkey;
alter table ticket_messages drop constraint if exists ticket_messages_user_id_fkey;
alter table transactions drop constraint if exists transactions_user_id_fkey;

-- Adicionar as novas foreign keys apontando para profiles
alter table orders
  add constraint orders_user_id_fkey
  foreign key (user_id)
  references profiles(id);

alter table tickets
  add constraint tickets_user_id_fkey
  foreign key (user_id)
  references profiles(id);

alter table tickets
  add constraint tickets_assigned_to_fkey
  foreign key (assigned_to)
  references profiles(id);

alter table ticket_messages
  add constraint ticket_messages_user_id_fkey
  foreign key (user_id)
  references profiles(id);

alter table transactions
  add constraint transactions_user_id_fkey
  foreign key (user_id)
  references profiles(id);

-- Recriar as políticas usando a tabela profiles
create policy "Admins can manage all services"
  on services
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Support can view all orders"
  on orders
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'support'
  ));

create policy "Admins can manage all orders"
  on orders
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Support can view assigned tickets"
  on tickets
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'support'
  ));

create policy "Admins can manage all tickets"
  on tickets
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));

create policy "Admins can view all messages"
  on ticket_messages
  using (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  ));
