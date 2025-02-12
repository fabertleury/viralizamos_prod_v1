-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários vejam seus próprios perfis
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid()::text = id::text);

-- Permitir que usuários atualizem seus próprios perfis
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Permitir que o serviço de autenticação crie perfis
CREATE POLICY "Enable insert for authentication service" ON public.profiles
    FOR INSERT WITH CHECK (true);
