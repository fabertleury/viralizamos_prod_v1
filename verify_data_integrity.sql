-- Script para verificar a integridade dos dados após as alterações

-- 1. Verificar se todas as transações com customer_email têm customer_id
SELECT 
    COUNT(*) as total_transactions_with_email,
    COUNT(customer_id) as transactions_with_customer_id,
    COUNT(*) - COUNT(customer_id) as transactions_missing_customer_id
FROM 
    public.transactions
WHERE 
    customer_email IS NOT NULL;

-- 2. Verificar se todos os customer_id em transactions apontam para registros válidos em customers
SELECT 
    COUNT(*) as transactions_with_invalid_customer_id
FROM 
    public.transactions t
LEFT JOIN 
    public.customers c ON t.customer_id = c.id
WHERE 
    t.customer_id IS NOT NULL 
    AND c.id IS NULL;

-- 3. Verificar se há clientes sem transações associadas
SELECT 
    c.id,
    c.email,
    c.name,
    c.created_at
FROM 
    public.customers c
LEFT JOIN 
    public.transactions t ON c.id = t.customer_id
WHERE 
    t.id IS NULL;

-- 4. Verificar se há emails de clientes em transactions que não existem em customers
SELECT 
    DISTINCT t.customer_email
FROM 
    public.transactions t
LEFT JOIN 
    public.customers c ON t.customer_email = c.email
WHERE 
    t.customer_email IS NOT NULL 
    AND c.id IS NULL;

-- 5. Verificar consistência entre customer_email em transactions e email em customers
SELECT 
    t.id as transaction_id,
    t.customer_id,
    t.customer_email as transaction_email,
    c.email as customer_email
FROM 
    public.transactions t
JOIN 
    public.customers c ON t.customer_id = c.id
WHERE 
    t.customer_email != c.email;
