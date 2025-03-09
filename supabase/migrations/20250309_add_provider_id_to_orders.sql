-- A coluna provider_id já existe, então vamos pular a criação
-- ALTER TABLE public.orders ADD COLUMN provider_id UUID REFERENCES public.providers(id);

-- Update existing orders with provider_id from services
UPDATE public.orders o
SET provider_id = s.provider_id
FROM public.services s
WHERE o.service_id = s.id AND s.provider_id IS NOT NULL AND o.provider_id IS NULL;

-- Create an index on provider_id for better performance (se ainda não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_orders_provider_id'
    ) THEN
        CREATE INDEX idx_orders_provider_id ON public.orders(provider_id);
    END IF;
END $$;

-- Add a trigger to automatically set provider_id when service_id is set
CREATE OR REPLACE FUNCTION public.set_provider_id_from_service()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.service_id IS NOT NULL THEN
        NEW.provider_id := (SELECT provider_id FROM public.services WHERE id = NEW.service_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar os triggers apenas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_set_provider_id_before_insert'
    ) THEN
        CREATE TRIGGER trg_set_provider_id_before_insert
        BEFORE INSERT ON public.orders
        FOR EACH ROW
        EXECUTE FUNCTION public.set_provider_id_from_service();
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trg_set_provider_id_before_update'
    ) THEN
        CREATE TRIGGER trg_set_provider_id_before_update
        BEFORE UPDATE ON public.orders
        FOR EACH ROW
        WHEN (OLD.service_id IS DISTINCT FROM NEW.service_id)
        EXECUTE FUNCTION public.set_provider_id_from_service();
    END IF;
END $$;
