-- Criação da tabela para armazenar os custos dos serviços
CREATE TABLE IF NOT EXISTS public.service_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    cost_per_1000 DECIMAL(10, 4) NOT NULL, -- Custo por 1000 unidades (ex: 2.88 por 1000 curtidas)
    fixed_cost DECIMAL(10, 4) DEFAULT 0, -- Custo fixo adicional, se houver
    currency VARCHAR(10) DEFAULT 'BRL',
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- Data de início da vigência deste custo
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- Data de fim da vigência (NULL = atual)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_service_costs_service_id ON public.service_costs(service_id);
CREATE INDEX IF NOT EXISTS idx_service_costs_dates ON public.service_costs(start_date, end_date);

-- Trigger para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION update_service_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_service_costs_updated_at
BEFORE UPDATE ON public.service_costs
FOR EACH ROW
EXECUTE FUNCTION update_service_costs_updated_at();

-- Função para obter o custo atual de um serviço
CREATE OR REPLACE FUNCTION get_current_service_cost(service_id UUID)
RETURNS DECIMAL(10, 4) AS $$
DECLARE
    cost_value DECIMAL(10, 4);
BEGIN
    SELECT cost_per_1000 INTO cost_value
    FROM public.service_costs
    WHERE service_id = get_current_service_cost.service_id
      AND (end_date IS NULL OR end_date > NOW())
      AND start_date <= NOW()
    ORDER BY start_date DESC
    LIMIT 1;
    
    RETURN COALESCE(cost_value, 0);
END;
$$ LANGUAGE plpgsql;

-- View para relatório financeiro por período
CREATE OR REPLACE VIEW public.financial_report AS
WITH order_costs AS (
    SELECT 
        o.id AS order_id,
        o.transaction_id,
        o.service_id,
        s.name AS service_name,
        s.type AS service_type,
        o.quantity,
        o.amount AS revenue,
        CASE 
            WHEN sc.cost_per_1000 IS NOT NULL THEN 
                (o.quantity / 1000.0) * sc.cost_per_1000 + COALESCE(sc.fixed_cost, 0)
            ELSE
                0
        END AS cost,
        o.created_at,
        DATE_TRUNC('day', o.created_at) AS order_date,
        DATE_TRUNC('week', o.created_at) AS order_week,
        DATE_TRUNC('month', o.created_at) AS order_month
    FROM 
        public.orders o
    LEFT JOIN 
        public.services s ON o.service_id = s.id
    LEFT JOIN 
        public.service_costs sc ON s.id = sc.service_id
        AND o.created_at >= sc.start_date
        AND (sc.end_date IS NULL OR o.created_at < sc.end_date)
    WHERE 
        o.status NOT IN ('cancelled', 'refunded')
)
SELECT 
    order_date,
    order_week,
    order_month,
    service_id,
    service_name,
    service_type,
    SUM(quantity) AS total_quantity,
    SUM(revenue) AS total_revenue,
    SUM(cost) AS total_cost,
    SUM(revenue) - SUM(cost) AS gross_profit,
    CASE 
        WHEN SUM(revenue) > 0 THEN 
            ROUND(((SUM(revenue) - SUM(cost)) / SUM(revenue)) * 100, 2)
        ELSE 
            0
    END AS gross_margin_percentage
FROM 
    order_costs
GROUP BY 
    order_date, order_week, order_month, service_id, service_name, service_type;

-- View para relatório financeiro consolidado por período
CREATE OR REPLACE VIEW public.financial_summary AS
SELECT 
    order_date,
    order_week,
    order_month,
    SUM(total_revenue) AS total_revenue,
    SUM(total_cost) AS total_cost,
    SUM(gross_profit) AS gross_profit,
    CASE 
        WHEN SUM(total_revenue) > 0 THEN 
            ROUND(((SUM(gross_profit)) / SUM(total_revenue)) * 100, 2)
        ELSE 
            0
    END AS gross_margin_percentage
FROM 
    public.financial_report
GROUP BY 
    order_date, order_week, order_month;

-- Tabela para registrar despesas adicionais (anúncios, funcionários, impostos, etc.)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorias pré-definidas para despesas
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir categorias padrão
INSERT INTO public.expense_categories (name, description)
VALUES 
    ('Anúncios', 'Gastos com publicidade e marketing'),
    ('Funcionários', 'Salários e benefícios'),
    ('Impostos', 'Impostos e taxas'),
    ('Infraestrutura', 'Servidores, hospedagem e outros custos de TI'),
    ('Outros', 'Despesas diversas')
ON CONFLICT (name) DO NOTHING;

-- View para relatório financeiro completo (receitas - custos - despesas)
CREATE OR REPLACE VIEW public.profit_loss_report AS
WITH period_summary AS (
    SELECT 
        DATE_TRUNC('day', order_date) AS report_date,
        DATE_TRUNC('week', order_week) AS report_week,
        DATE_TRUNC('month', order_month) AS report_month,
        SUM(total_revenue) AS revenue,
        SUM(total_cost) AS service_costs,
        SUM(gross_profit) AS gross_profit
    FROM 
        public.financial_report
    GROUP BY 
        DATE_TRUNC('day', order_date), 
        DATE_TRUNC('week', order_week), 
        DATE_TRUNC('month', order_month)
),
period_expenses AS (
    SELECT 
        DATE_TRUNC('day', expense_date) AS expense_day,
        DATE_TRUNC('week', expense_date) AS expense_week,
        DATE_TRUNC('month', expense_date) AS expense_month,
        category,
        SUM(amount) AS expense_amount
    FROM 
        public.expenses
    GROUP BY 
        DATE_TRUNC('day', expense_date),
        DATE_TRUNC('week', expense_date),
        DATE_TRUNC('month', expense_date),
        category
)
SELECT 
    ps.report_date,
    ps.report_week,
    ps.report_month,
    ps.revenue,
    ps.service_costs,
    ps.gross_profit,
    COALESCE(SUM(pe.expense_amount) FILTER (WHERE pe.category = 'Anúncios'), 0) AS ads_expenses,
    COALESCE(SUM(pe.expense_amount) FILTER (WHERE pe.category = 'Funcionários'), 0) AS employee_expenses,
    COALESCE(SUM(pe.expense_amount) FILTER (WHERE pe.category = 'Impostos'), 0) AS tax_expenses,
    COALESCE(SUM(pe.expense_amount) FILTER (WHERE pe.category = 'Infraestrutura'), 0) AS infrastructure_expenses,
    COALESCE(SUM(pe.expense_amount) FILTER (WHERE pe.category = 'Outros'), 0) AS other_expenses,
    COALESCE(SUM(pe.expense_amount), 0) AS total_expenses,
    ps.gross_profit - COALESCE(SUM(pe.expense_amount), 0) AS net_profit,
    CASE 
        WHEN ps.revenue > 0 THEN 
            ROUND(((ps.gross_profit - COALESCE(SUM(pe.expense_amount), 0)) / ps.revenue) * 100, 2)
        ELSE 
            0
    END AS net_margin_percentage
FROM 
    period_summary ps
LEFT JOIN 
    period_expenses pe ON 
    (ps.report_date = pe.expense_day) OR
    (ps.report_week = pe.expense_week) OR
    (ps.report_month = pe.expense_month)
GROUP BY 
    ps.report_date, ps.report_week, ps.report_month, ps.revenue, ps.service_costs, ps.gross_profit;

-- Permissões RLS para as novas tabelas
ALTER TABLE public.service_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Políticas para service_costs (administradores podem gerenciar)
CREATE POLICY "Administradores podem gerenciar custos de serviços" ON public.service_costs
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Políticas para expenses (administradores podem gerenciar)
CREATE POLICY "Administradores podem gerenciar despesas" ON public.expenses
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Políticas para expense_categories (administradores podem gerenciar)
CREATE POLICY "Administradores podem gerenciar categorias de despesas" ON public.expense_categories
    USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
