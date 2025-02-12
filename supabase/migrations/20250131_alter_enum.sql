-- Alterar o enum existente
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'support';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'cliente';
