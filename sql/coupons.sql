-- Tabela de cupons de desconto
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2),
    max_discount_amount DECIMAL(10, 2),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON public.coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates ON public.coupons(start_date, end_date);

-- Tabela de restrições de cupons para serviços específicos
CREATE TABLE IF NOT EXISTS public.coupon_service_restrictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id, service_id)
);

-- Tabela para vincular cupons a clientes específicos
CREATE TABLE IF NOT EXISTS public.coupon_customer_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coupon_id, customer_id)
);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp de updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Função para criar um cupom e atribuí-lo a clientes que compraram um serviço específico
CREATE OR REPLACE FUNCTION create_and_assign_coupon_to_service_customers(
    p_code VARCHAR(50),
    p_description TEXT,
    p_discount_type VARCHAR(20),
    p_discount_value DECIMAL(10, 2),
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE,
    p_service_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_coupon_id UUID;
    v_customer_id UUID;
BEGIN
    -- Criar o cupom
    INSERT INTO public.coupons (
        code, 
        description, 
        discount_type, 
        discount_value, 
        start_date, 
        end_date
    ) VALUES (
        p_code,
        p_description,
        p_discount_type,
        p_discount_value,
        p_start_date,
        p_end_date
    ) RETURNING id INTO v_coupon_id;
    
    -- Adicionar restrição para o serviço específico, se fornecido
    IF p_service_id IS NOT NULL THEN
        INSERT INTO public.coupon_service_restrictions (
            coupon_id,
            service_id
        ) VALUES (
            v_coupon_id,
            p_service_id
        );
    END IF;
    
    -- Atribuir o cupom a todos os clientes que compraram o serviço
    IF p_service_id IS NOT NULL THEN
        FOR v_customer_id IN 
            SELECT DISTINCT customer_id 
            FROM public.orders 
            WHERE service_id = p_service_id AND customer_id IS NOT NULL
        LOOP
            INSERT INTO public.coupon_customer_assignments (
                coupon_id,
                customer_id
            ) VALUES (
                v_coupon_id,
                v_customer_id
            ) ON CONFLICT (coupon_id, customer_id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN v_coupon_id;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se um cupom é válido para um cliente e serviço específicos
CREATE OR REPLACE FUNCTION is_coupon_valid(
    p_coupon_code VARCHAR(50),
    p_customer_id UUID,
    p_service_id UUID,
    p_purchase_amount DECIMAL(10, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_coupon_id UUID;
    v_is_valid BOOLEAN := FALSE;
    v_has_service_restriction BOOLEAN;
    v_has_customer_assignment BOOLEAN;
    v_is_used BOOLEAN;
BEGIN
    -- Verificar se o cupom existe e está ativo
    SELECT id INTO v_coupon_id
    FROM public.coupons
    WHERE 
        code = p_coupon_code
        AND is_active = TRUE
        AND NOW() BETWEEN start_date AND end_date
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (min_purchase_amount IS NULL OR p_purchase_amount >= min_purchase_amount);
    
    IF v_coupon_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se há restrições de serviço
    SELECT EXISTS (
        SELECT 1 FROM public.coupon_service_restrictions WHERE coupon_id = v_coupon_id
    ) INTO v_has_service_restriction;
    
    -- Se houver restrições, verificar se o serviço está incluído
    IF v_has_service_restriction THEN
        SELECT EXISTS (
            SELECT 1 
            FROM public.coupon_service_restrictions 
            WHERE coupon_id = v_coupon_id AND service_id = p_service_id
        ) INTO v_is_valid;
        
        IF NOT v_is_valid THEN
            RETURN FALSE;
        END IF;
    ELSE
        v_is_valid := TRUE;
    END IF;
    
    -- Verificar se o cupom está atribuído a clientes específicos
    SELECT EXISTS (
        SELECT 1 FROM public.coupon_customer_assignments WHERE coupon_id = v_coupon_id
    ) INTO v_has_customer_assignment;
    
    -- Se estiver atribuído a clientes, verificar se este cliente está incluído
    IF v_has_customer_assignment THEN
        SELECT EXISTS (
            SELECT 1 
            FROM public.coupon_customer_assignments 
            WHERE coupon_id = v_coupon_id AND customer_id = p_customer_id
        ) INTO v_is_valid;
        
        IF NOT v_is_valid THEN
            RETURN FALSE;
        END IF;
        
        -- Verificar se o cupom já foi usado por este cliente
        SELECT is_used INTO v_is_used
        FROM public.coupon_customer_assignments
        WHERE coupon_id = v_coupon_id AND customer_id = p_customer_id;
        
        IF v_is_used THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql;

-- Função para aplicar um cupom e atualizar seu uso
CREATE OR REPLACE FUNCTION apply_coupon(
    p_coupon_code VARCHAR(50),
    p_customer_id UUID,
    p_service_id UUID,
    p_purchase_amount DECIMAL(10, 2)
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_coupon_id UUID;
    v_discount_type VARCHAR(20);
    v_discount_value DECIMAL(10, 2);
    v_max_discount_amount DECIMAL(10, 2);
    v_final_discount DECIMAL(10, 2);
    v_has_customer_assignment BOOLEAN;
BEGIN
    -- Verificar se o cupom é válido
    IF NOT is_coupon_valid(p_coupon_code, p_customer_id, p_service_id, p_purchase_amount) THEN
        RETURN 0;
    END IF;
    
    -- Obter informações do cupom
    SELECT 
        id, 
        discount_type, 
        discount_value, 
        max_discount_amount
    INTO 
        v_coupon_id, 
        v_discount_type, 
        v_discount_value, 
        v_max_discount_amount
    FROM public.coupons
    WHERE code = p_coupon_code;
    
    -- Calcular o desconto
    IF v_discount_type = 'percentage' THEN
        v_final_discount := p_purchase_amount * (v_discount_value / 100);
    ELSE
        v_final_discount := v_discount_value;
    END IF;
    
    -- Aplicar limite máximo de desconto, se existir
    IF v_max_discount_amount IS NOT NULL AND v_final_discount > v_max_discount_amount THEN
        v_final_discount := v_max_discount_amount;
    END IF;
    
    -- Incrementar o contador de uso
    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE id = v_coupon_id;
    
    -- Verificar se o cupom está atribuído a clientes específicos
    SELECT EXISTS (
        SELECT 1 FROM public.coupon_customer_assignments WHERE coupon_id = v_coupon_id
    ) INTO v_has_customer_assignment;
    
    -- Se estiver atribuído a clientes, marcar como usado para este cliente
    IF v_has_customer_assignment THEN
        UPDATE public.coupon_customer_assignments
        SET is_used = TRUE, used_at = NOW()
        WHERE coupon_id = v_coupon_id AND customer_id = p_customer_id;
    END IF;
    
    RETURN v_final_discount;
END;
$$ LANGUAGE plpgsql;
