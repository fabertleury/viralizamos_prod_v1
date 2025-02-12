-- Desabilitar RLS temporariamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Permitir acesso público temporariamente
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;
