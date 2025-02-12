-- Backup dos dados atuais
CREATE TEMP TABLE profiles_backup AS SELECT * FROM profiles;

-- Dropar a tabela atual
DROP TABLE IF EXISTS profiles;

-- Dropar o enum antigo
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Criar novo enum
CREATE TYPE public.user_role AS ENUM ('admin', 'support', 'cliente');

-- Recriar a tabela profiles
CREATE TABLE public.profiles (
    id uuid DEFAULT auth.uid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text,
    role public.user_role DEFAULT 'cliente'::public.user_role,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Restaurar os dados
INSERT INTO profiles (id, email, name, active, created_at, updated_at)
SELECT id, email, name, active, created_at, updated_at
FROM profiles_backup;

-- Atualizar o admin para role='admin'
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@viralizai.com';

-- Dropar a tabela temporária
DROP TABLE profiles_backup;
