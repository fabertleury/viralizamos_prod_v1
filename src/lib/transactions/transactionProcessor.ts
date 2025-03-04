import { createClient } from '@/lib/supabase/server';
import { Transaction } from './modules/types';
import { CustomerManager } from './modules/customerManager';
import { ProviderManager } from './modules/providerManager';
import { OrderProcessor } from './modules/orderProcessor';
import { OrderStatusManager } from './modules/orderStatusManager';
import { ErrorHandler } from './modules/errorHandler';
import { LinkFormatter } from './modules/linkFormatter';

/**
 * Processa uma transação, criando pedidos nos provedores apropriados
 * @param transactionId ID da transação a ser processada
 * @returns Os pedidos criados
 */
async function processTransaction(transactionId: string) {
  console.log('[ProcessTransaction] Iniciando processamento:', transactionId);
  const startTime = new Date();
  const supabase = createClient();
  
  // Inicializar os gerenciadores
  const customerManager = new CustomerManager();
  const providerManager = new ProviderManager();
  const orderProcessor = new OrderProcessor();
  const errorHandler = new ErrorHandler();
  const linkFormatter = new LinkFormatter();

  try {
    console.log('[ProcessTransaction] Buscando dados da transação...');
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        service:service_id (
          id,
          name,
          external_id,
          provider_id,
          type,
          quantidade,
          metadata
        )
      `)
      .eq('id', transactionId)
      .single();

    if (transactionError) {
      console.error('[ProcessTransaction] Erro ao buscar transação:', transactionError);
      throw transactionError;
    }

    if (!transaction) {
      console.error('[ProcessTransaction] Transação não encontrada:', transactionId);
      throw new Error(`Transação com ID ${transactionId} não encontrada`);
    }

    console.log('[ProcessTransaction] Transação encontrada:', transaction.id);

    // Verificar se a transação já foi processada
    if (transaction.order_created) {
      console.log('[ProcessTransaction] Transação já foi processada, verificando pedidos existentes');
      
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('transaction_id', transactionId);
      
      if (existingOrders && existingOrders.length > 0) {
        console.log('[ProcessTransaction] Pedidos já existem:', existingOrders);
        
        // Garantir que a transação esteja marcada como tendo pedidos criados
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            order_created: true
          })
          .eq('id', transactionId);
        
        if (updateError) {
          console.error('[ProcessTransaction] Erro ao atualizar status da transação:', updateError);
        }
        
        return existingOrders;
      }
    }

    // Verificar e garantir que o cliente exista
    await customerManager.ensureCustomerExists(transaction, transactionId);

    // Buscar o provedor
    const provider = await providerManager.getProviderForTransaction(transaction);
    
    if (!provider) {
      console.error('[ProcessTransaction] Provedor não encontrado para a transação');
      throw new Error('Provedor não encontrado para a transação');
    }

    // Processar a transação com base no tipo de serviço
    if (transaction.service?.type === 'likes') {
      console.log('[ProcessTransaction] Processando serviço de curtidas');
      return await orderProcessor.processLikesOrder(transaction, provider);
    } else {
      console.log('[ProcessTransaction] Processando serviço genérico');
      
      // Determinar o username e o link alvo
      let username = transaction.target_username || 
                     transaction.metadata?.username || 
                     transaction.metadata?.profile?.username;
      
      let targetLink = '';
      
      // Para seguidores, verificamos se temos username no profile
      if (transaction.service?.type === 'followers') {
        console.log('[ProcessTransaction] Checkout de seguidores');
        
        if (!username) {
          console.error('[ProcessTransaction] Username não encontrado no profile');
          throw new Error('Username não encontrado no profile');
        }
        
        console.log(`[ProcessTransaction] Checkout de seguidores para: ${username}`);
        targetLink = transaction.target_profile_link || `https://instagram.com/${username}`;
      } else {
        // Para outros tipos, verificamos se temos username nos posts ou no profile
        username = transaction.metadata?.profile?.username || 
                  (transaction.metadata?.posts && transaction.metadata?.posts.length > 0 ? 
                    transaction.metadata?.posts[0].username : transaction.target_username);
        
        if (!username) {
          console.error('[ProcessTransaction] Username não encontrado nos posts ou no profile');
          throw new Error('Username não encontrado nos posts ou no profile');
        }
        
        console.log(`[ProcessTransaction] Checkout para: ${username}`);
        
        // Verificar se é um serviço de curtidas baseado no nome ou tipo do serviço
        const isLikesService = 
          transaction.service?.type === 'likes' || 
          (transaction.service?.name && transaction.service.name.toLowerCase().includes('curtida')) ||
          (transaction.metadata?.service?.name && transaction.metadata.service.name.toLowerCase().includes('curtida'));
        
        // Se for serviço de curtidas e tiver múltiplos posts, usar processLikesOrder
        if (isLikesService && transaction.metadata?.posts && transaction.metadata.posts.length > 0) {
          console.log('[ProcessTransaction] Processando serviço de curtidas com múltiplos posts');
          return await orderProcessor.processLikesOrder(transaction, provider, transaction.metadata.posts, username);
        } else {
          // Se temos posts, usamos o link do primeiro post
          if (transaction.metadata?.posts && transaction.metadata?.posts.length > 0) {
            const post = transaction.metadata.posts[0];
            console.log('[ProcessTransaction] Formatando link do post:', post);
            targetLink = linkFormatter.formatPostLink(post, true);
          } else {
            // Caso não tenha posts, usamos o perfil como fallback
            targetLink = transaction.target_profile_link || `https://instagram.com/${username}`;
          }
        }
      }
      
      console.log(`[ProcessTransaction] Link do alvo: ${targetLink}`);
      return await orderProcessor.processGenericOrder(transaction, provider, targetLink, username);
    }
  } catch (error) {
    console.error('[ProcessTransaction] Erro geral:', error);
    await errorHandler.handleTransactionError(transactionId, error);
    throw error;
  }
}

/**
 * Verifica o status de um pedido no provedor
 * @param orderId ID do pedido
 * @param providerId ID do provedor
 * @returns Status do pedido
 */
async function checkOrderStatus(orderId: string, providerId: string) {
  const orderStatusManager = new OrderStatusManager();
  return await orderStatusManager.checkOrderStatus(orderId, providerId);
}

/**
 * Atualiza o status de um pedido no banco de dados
 * @param orderId ID do pedido
 * @param status Novo status
 * @returns Pedido atualizado
 */
async function updateOrderStatus(orderId: string, status: string) {
  const orderStatusManager = new OrderStatusManager();
  return await orderStatusManager.updateOrderStatus(orderId, status);
}

export { processTransaction, checkOrderStatus, updateOrderStatus };
