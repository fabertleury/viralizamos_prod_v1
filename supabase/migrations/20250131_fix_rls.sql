-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authentication service" ON public.profiles;
DROP POLICY IF EXISTS "Admin users can do all" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários vejam seus próprios perfis
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

-- Permitir que usuários atualizem seus próprios perfis
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id);

-- Permitir que o serviço de autenticação crie perfis
CREATE POLICY "Enable insert for authentication service" ON public.profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Permitir que admins façam tudo
CREATE POLICY "Admin users can do all" ON public.profiles
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
