-- Script para atualizar as consultas no frontend após a correção das relações
-- Este arquivo contém exemplos de consultas SQL que devem ser usadas no frontend

-- 1. Consulta para a página de pedidos (admin/pedidos/page.tsx)
/*
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    service:service_id (*),
    user:user_id (*),
    provider:provider_id (*),
    customer:customer_id (*),
    transaction:transaction_id (*)
  `)
  .order('created_at', { ascending: false });
*/

-- 2. Consulta para verificar o status de um pedido
/*
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    service:service_id (*),
    provider:provider_id (*),
    customer:customer_id (*)
  `)
  .eq('external_order_id', orderId)
  .single();
*/

-- 3. Consulta para buscar pedidos de um cliente específico
/*
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    service:service_id (*),
    provider:provider_id (*)
  `)
  .eq('customer_id', customerId)
  .order('created_at', { ascending: false });
*/

-- 4. Consulta para buscar pedidos usando a view completa
/*
const { data, error } = await supabase
  .from('orders_full_view')
  .select('*')
  .eq('customer_email', email)
  .order('created_at', { ascending: false });
*/

-- 5. Consulta para estatísticas de pedidos por provedor
/*
const { data, error } = await supabase
  .from('orders')
  .select(`
    provider:provider_id (
      id,
      name
    ),
    count
  `)
  .eq('status', 'completed')
  .group('provider_id');
*/
