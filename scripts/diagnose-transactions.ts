import { createClient } from '@/lib/supabase/server';

async function diagnoseTransactions() {
  const supabase = createClient();

  console.log('🔍 Diagnóstico de Transações e Ordens');

  // Buscar todas as transações aprovadas
  const { data: approvedTransactions, error: transactionError } = await supabase
    .from('transactions')
    .select('*, services(*)')
    .eq('status', 'approved')
    .is('order_created', null);

  if (transactionError) {
    console.error('❌ Erro ao buscar transações:', transactionError);
    return;
  }

  console.log(`📊 Transações aprovadas encontradas: ${approvedTransactions.length}`);

  // Imprimir detalhes de cada transação
  for (const transaction of approvedTransactions) {
    console.log('\n🔎 Detalhes da Transação:');
    console.log('ID:', transaction.id);
    console.log('Status:', transaction.status);
    console.log('Serviço ID:', transaction.service_id);
    console.log('Serviço Externo:', transaction.services?.external_service_id);
    console.log('Quantidade:', transaction.quantity);
    console.log('Link do Perfil:', transaction.target_profile_link);
    console.log('Usuário Alvo:', transaction.target_username);
  }

  // Buscar ordens existentes
  const { data: existingOrders, error: orderError } = await supabase
    .from('orders')
    .select('*');

  if (orderError) {
    console.error('❌ Erro ao buscar ordens:', orderError);
    return;
  }

  console.log(`\n📦 Ordens existentes: ${existingOrders.length}`);
  
  // Imprimir detalhes das ordens
  for (const order of existingOrders) {
    console.log('\n🔎 Detalhes da Ordem:');
    console.log('ID:', order.id);
    console.log('Status:', order.status);
    console.log('Serviço ID:', order.service_id);
    console.log('ID Externo:', order.external_order_id);
    console.log('Quantidade:', order.quantity);
  }
}

// Executar diagnóstico
diagnoseTransactions().catch(console.error);
