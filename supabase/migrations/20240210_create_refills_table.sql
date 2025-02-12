-- Enable required extensions
create extension if not exists "moddatetime" schema extensions;

-- Create refills table
create table "public"."refills" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "order_id" uuid not null references orders(id) on delete cascade,
    "user_id" uuid not null references auth.users(id) on delete cascade,
    "external_refill_id" text not null,
    "status" text not null default 'pending',
    "metadata" jsonb,
    constraint refills_pkey primary key (id)
);

-- Add RLS policies
alter table "public"."refills" enable row level security;

-- Allow users to view their own refills
create policy "Users can view their own refills"
    on "public"."refills"
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Allow users to create refills for their orders
create policy "Users can create refills for their orders"
    on "public"."refills"
    for insert
    to authenticated
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from orders
            where orders.id = order_id
            and orders.user_id = auth.uid()
        )
    );

-- Add indexes
create index refills_order_id_idx on refills(order_id);
create index refills_user_id_idx on refills(user_id);
create index refills_external_refill_id_idx on refills(external_refill_id);
create index refills_status_idx on refills(status);

-- Add trigger to update updated_at
create trigger handle_updated_at before update on refills
    for each row execute procedure moddatetime (updated_at);
