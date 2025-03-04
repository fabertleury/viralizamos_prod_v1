-- Script para verificar a consolidação de clientes

-- Verificar se ainda existem emails duplicados
SELECT 
    email, 
    COUNT(*) as count
FROM 
    public.customers
GROUP BY 
    email
HAVING 
    COUNT(*) > 1;

-- Verificar se o índice único foi criado
SELECT 
    indexname, 
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename = 'customers' 
    AND indexname = 'idx_customers_email_unique';

-- Listar todos os clientes ordenados por email
SELECT 
    id, 
    email, 
    name, 
    created_at, 
    updated_at
FROM 
    public.customers
ORDER BY 
    email, 
    created_at DESC;

-- Contar transações por cliente
SELECT 
    c.email, 
    c.name, 
    COUNT(t.id) as transaction_count
FROM 
    public.customers c
LEFT JOIN 
    public.transactions t ON c.id = t.customer_id
GROUP BY 
    c.id, c.email, c.name
ORDER BY 
    transaction_count DESC;
