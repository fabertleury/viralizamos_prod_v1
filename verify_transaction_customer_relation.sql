-- Script para verificar a relação entre transactions e customers

-- Verificar quantas transações têm customer_id preenchido
SELECT 
    COUNT(*) as total_transactions,
    COUNT(customer_id) as transactions_with_customer_id,
    COUNT(*) - COUNT(customer_id) as transactions_without_customer_id
FROM 
    public.transactions;

-- Verificar transações com customer_email mas sem customer_id
SELECT 
    id,
    customer_email,
    customer_name,
    created_at
FROM 
    public.transactions
WHERE 
    customer_email IS NOT NULL 
    AND customer_id IS NULL
LIMIT 10;

-- Verificar clientes e suas transações
SELECT 
    c.id as customer_id,
    c.email,
    c.name,
    COUNT(t.id) as transaction_count,
    SUM(t.amount) as total_amount,
    MAX(t.created_at) as last_transaction_date
FROM 
    public.customers c
LEFT JOIN 
    public.transactions t ON c.id = t.customer_id
GROUP BY 
    c.id, c.email, c.name
ORDER BY 
    transaction_count DESC
LIMIT 20;
