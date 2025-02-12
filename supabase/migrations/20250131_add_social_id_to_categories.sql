-- Add social_id column to categories table
alter table categories 
add column if not exists social_id uuid references socials(id) on delete set null;
