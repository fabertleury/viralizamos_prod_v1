-- Criar tabela de clientes
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    phone TEXT,
    instagram_username TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índice para busca rápida por email
CREATE INDEX idx_customers_email ON public.customers(email);

-- Adicionar coluna customer_id na tabela orders (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id);
        CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
    END IF;
END $$;

-- Comentários na tabela
COMMENT ON TABLE public.customers IS 'Tabela que armazena informações dos clientes';
COMMENT ON COLUMN public.customers.id IS 'ID único do cliente';
COMMENT ON COLUMN public.customers.email IS 'Email do cliente (único)';
COMMENT ON COLUMN public.customers.name IS 'Nome do cliente';
COMMENT ON COLUMN public.customers.phone IS 'Telefone do cliente';
COMMENT ON COLUMN public.customers.instagram_username IS 'Nome de usuário do Instagram do cliente';
COMMENT ON COLUMN public.customers.metadata IS 'Metadados adicionais do cliente em formato JSON';
COMMENT ON COLUMN public.customers.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.customers.updated_at IS 'Data da última atualização do registro';

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Permissões RLS (Row Level Security)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso anônimo para leitura
CREATE POLICY "Allow anonymous read access" 
ON public.customers
FOR SELECT 
USING (true);

-- Política para permitir inserção por usuários autenticados
CREATE POLICY "Allow authenticated insert" 
ON public.customers
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Política para permitir atualização por usuários autenticados
CREATE POLICY "Allow authenticated update" 
ON public.customers
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);
