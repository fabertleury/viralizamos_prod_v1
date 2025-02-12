-- Drop tipos enum existentes
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.user_status CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.ticket_status CASCADE;
DROP TYPE IF EXISTS public.ticket_priority CASCADE;

-- Drop todas as tabelas existentes
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.providers CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.configurations CASCADE;
DROP TABLE IF EXISTS public.failed_jobs CASCADE;
DROP TABLE IF EXISTS public.faqs CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.socials CASCADE;
DROP TABLE IF EXISTS public.ticket_messages CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Limpa a tabela de migrações
TRUNCATE TABLE supabase_migrations.schema_migrations;

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'user');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'pending');
CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'completed', 'cancelled', 'refunded');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected', 'refunded');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high');

-- Create profiles table (users)
CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text,
    role public.user_role DEFAULT 'user'::public.user_role,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create providers table
CREATE TABLE public.providers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE,
    description text,
    api_key text,
    api_url text,
    status boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create socials table
CREATE TABLE public.socials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    icon text,
    url text,
    active boolean DEFAULT true,
    order_position integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE,
    description text,
    icon text,
    active boolean DEFAULT true,
    order_position integer DEFAULT 0,
    social_id uuid REFERENCES public.socials(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    type text,
    quantidade integer NOT NULL,
    preco decimal(10,2) NOT NULL,
    descricao text,
    categoria text,
    status boolean DEFAULT true,
    delivery_time text,
    min_order integer,
    max_order integer,
    provider_id uuid REFERENCES public.providers(id),
    success_rate decimal(5,2),
    external_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    category_id uuid REFERENCES public.categories(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    service_id uuid REFERENCES public.services(id),
    status public.order_status DEFAULT 'pending',
    quantity integer NOT NULL,
    amount decimal(10,2) NOT NULL,
    target_username text,
    payment_status public.payment_status DEFAULT 'pending',
    payment_method text,
    payment_id text,
    external_order_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id),
    order_id uuid REFERENCES public.orders(id),
    type text,
    amount decimal(10,2) NOT NULL,
    status public.payment_status DEFAULT 'pending',
    payment_method text,
    payment_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create tickets table
CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    status public.ticket_status DEFAULT 'open',
    priority public.ticket_priority DEFAULT 'medium',
    user_id uuid REFERENCES public.profiles(id),
    assigned_to uuid REFERENCES public.profiles(id),
    order_id uuid REFERENCES public.orders(id),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create ticket_messages table
CREATE TABLE public.ticket_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid REFERENCES public.tickets(id),
    user_id uuid REFERENCES public.profiles(id),
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Create faqs table
CREATE TABLE public.faqs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    question text NOT NULL,
    answer text NOT NULL,
    category text,
    order_position integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create configurations table
CREATE TABLE public.configurations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value text,
    type text DEFAULT 'string',
    description text,
    group_name text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create failed_jobs table
CREATE TABLE public.failed_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    connection text,
    queue text,
    payload jsonb,
    exception text,
    failed_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.socials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "Profiles são visíveis para usuários autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;

CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Políticas para socials
CREATE POLICY "Socials são visíveis para todos" ON public.socials
    FOR SELECT USING (true);

CREATE POLICY "Apenas admin pode modificar socials" ON public.socials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Políticas para categories
CREATE POLICY "Categories são visíveis para todos" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "Apenas admin pode modificar categories" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Políticas para providers
CREATE POLICY "Providers são visíveis para usuários autenticados" ON public.providers
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Apenas admin pode modificar providers" ON public.providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Políticas para configurations
CREATE POLICY "Configurations públicas são visíveis para todos" ON public.configurations
    FOR SELECT USING (is_public = true);

CREATE POLICY "Configurations privadas são visíveis para admin" ON public.configurations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Apenas admin pode modificar configurations" ON public.configurations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create policies for orders table
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create policies for transactions table
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Create policies for tickets table
CREATE POLICY "Users can view their own tickets" ON public.tickets
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create policies for ticket_messages table
CREATE POLICY "Users can view their own ticket messages" ON public.ticket_messages
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create ticket messages" ON public.ticket_messages
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Create admin policies
CREATE POLICY "Admin users can do all" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.providers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.socials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin users can do all" ON public.configurations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id::text = auth.uid()::text
            AND profiles.role = 'admin'
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS socials_user_id_idx ON public.socials(user_id);
CREATE INDEX IF NOT EXISTS categories_name_idx ON public.categories(name);
CREATE INDEX IF NOT EXISTS providers_user_id_idx ON public.providers(user_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_service_id_idx ON public.orders(service_id);
CREATE INDEX IF NOT EXISTS services_provider_id_idx ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS services_category_id_idx ON public.services(category_id);
CREATE INDEX IF NOT EXISTS transactions_order_id_idx ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS tickets_user_id_idx ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS ticket_messages_user_id_idx ON public.ticket_messages(user_id);
CREATE INDEX IF NOT EXISTS configurations_key_idx ON public.configurations(key);
CREATE INDEX IF NOT EXISTS configurations_group_name_idx ON public.configurations(group_name);
