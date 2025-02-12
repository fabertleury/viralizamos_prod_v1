-- Primeiro remover o enum antigo
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Recriar o enum com todos os valores necessários
CREATE TYPE public.user_role AS ENUM ('admin', 'support', 'cliente');

-- Alterar a tabela profiles para usar o novo enum
ALTER TABLE public.profiles 
  ALTER COLUMN role TYPE public.user_role 
  USING role::text::public.user_role;
