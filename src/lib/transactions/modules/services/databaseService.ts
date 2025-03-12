import { createClient } from '@/lib/supabase/server';
import { Transaction, Provider, OrderResponse, ProviderRequestData } from '../types';

/**
 * Serviço para operações de banco de dados relacionadas a pedidos
 */
export class DatabaseService {
  private supabase = createClient();

  /**
   * Cria um pedido no banco de dados
   * @param transaction Transação relacionada
   * @param provider Provedor utilizado
   * @param orderResponse Resposta do provedor
   * @param link Link do pedido
   * @param username Nome de usuário
   * @param currentPost Post atual (se aplicável)
   * @param totalPosts Total de posts (se aplicável)
   * @param requestData Dados enviados ao provedor
   * @returns Pedido criado
   */
  async createOrderInDatabase(
    transaction: Transaction,
    provider: Provider,
    orderResponse: OrderResponse,
    link: string,
    username: string,
    currentPost?: any,
    totalPosts: number = 1,
    requestData?: ProviderRequestData
  ): Promise<any> {
    try {
      console.log('[DatabaseService] Criando pedido no banco de dados');
      
      // Calcular a quantidade do pedido
      const originalQuantity = transaction.service?.quantity || transaction.metadata?.service?.quantity;
      const quantity = totalPosts > 1 ? Math.floor(originalQuantity / totalPosts) : originalQuantity;
      
      // Log detalhado dos valores disponíveis para amount
      console.log('[DatabaseService] Valores disponíveis para amount:');
      console.log('- transaction.amount:', transaction.amount);
      console.log('- transaction.metadata?.amount:', transaction.metadata ? (transaction.metadata as any).amount : undefined);
      console.log('- transaction.metadata?.service?.preco:', transaction.metadata?.service ? (transaction.metadata.service as any).preco : undefined);
      console.log('- transaction.service?.preco:', transaction.service ? (transaction.service as any).preco : undefined);
      console.log('- transaction.metadata?.original_amount:', transaction.metadata ? (transaction.metadata as any).original_amount : undefined);
      console.log('- transaction.metadata?.service?.quantidade_preco:', transaction.metadata?.service ? (transaction.metadata.service as any).quantidade_preco : undefined);
      
      // Determinar o valor de amount com verificações detalhadas
      let calculatedAmount = null;
      
      if (transaction.amount) {
        calculatedAmount = transaction.amount / totalPosts;
        console.log('[DatabaseService] Usando transaction.amount:', calculatedAmount);
      } else if (transaction.metadata && (transaction.metadata as any).amount) {
        calculatedAmount = (transaction.metadata as any).amount;
        console.log('[DatabaseService] Usando transaction.metadata.amount:', calculatedAmount);
      } else if (transaction.metadata?.service && (transaction.metadata.service as any).preco) {
        calculatedAmount = (transaction.metadata.service as any).preco;
        console.log('[DatabaseService] Usando transaction.metadata.service.preco:', calculatedAmount);
      } else if (transaction.service && (transaction.service as any).preco) {
        calculatedAmount = (transaction.service as any).preco;
        console.log('[DatabaseService] Usando transaction.service.preco:', calculatedAmount);
      } else if (transaction.metadata?.service && 
                (transaction.metadata.service as any).quantidade_preco && 
                (transaction.metadata.service as any).quantidade_preco.length > 0) {
        calculatedAmount = (transaction.metadata.service as any).quantidade_preco[0].preco;
        console.log('[DatabaseService] Usando transaction.metadata.service.quantidade_preco[0].preco:', calculatedAmount);
      } else if (transaction.metadata && (transaction.metadata as any).original_amount) {
        calculatedAmount = (transaction.metadata as any).original_amount;
        console.log('[DatabaseService] Usando transaction.metadata.original_amount:', calculatedAmount);
      } else {
        // Valor padrão de 1 centavo em vez de 10 reais para evitar cobranças incorretas
        calculatedAmount = 1; // 1 centavo
        console.log('[DatabaseService] Usando valor padrão:', calculatedAmount);
      }
      
      // Garantir que amount nunca seja nulo e nunca seja zero
      // Se for zero ou nulo, usar 1 centavo como valor mínimo
      // Converter o valor para número para garantir que não seja NaN
      let finalAmount = 1; // Valor padrão de 1 centavo
      
      if (calculatedAmount !== undefined && calculatedAmount !== null) {
        // Tentar converter para número se for string
        const numAmount = typeof calculatedAmount === 'string' ? parseFloat(calculatedAmount) : calculatedAmount;
        // Verificar se é um número válido e maior que zero
        if (!isNaN(numAmount) && numAmount > 0) {
          finalAmount = numAmount;
        }
      }
      
      // Se o valor for a transação original, verificar se é 0.01 (1 centavo)
      if (calculatedAmount === transaction.amount && transaction.amount === 0.01) {
        finalAmount = 0.01; // Garantir que seja 1 centavo
      }
      
      console.log('[DatabaseService] Valor final de amount:', finalAmount);
      
      // Verificar se é um pedido que precisa ser reprocessado devido a erro de conexão
      const needsRetry = orderResponse.needs_retry === true;
      const isConnectionError = orderResponse.connection_error === true;
      
      // Se não houver external_order_id na resposta, verificar se é um caso especial
      if (!orderResponse.order && !orderResponse.orderId) {
        // Verificar se a resposta contém um erro sobre pedido já existente
        if (orderResponse.error && orderResponse.error.includes('active order with this link')) {
          console.log('[DatabaseService] Provedor indicou que já existe um pedido ativo para este link. Buscando pedido existente...');
          
          // Buscar pedidos existentes para esta transação
          const { data: existingOrders } = await this.supabase
            .from('orders')
            .select('*')
            .eq('transaction_id', transaction.id)
            .order('created_at', { ascending: false });
            
          // Se já existe um pedido com external_order_id, retornar este pedido
          if (existingOrders && existingOrders.length > 0) {
            const validOrder = existingOrders.find(o => o.external_order_id);
            if (validOrder) {
              console.log('[DatabaseService] Retornando pedido existente com ID externo:', validOrder);
              return validOrder;
            }
          }
        }
        
        // Se for um erro de conexão, criar o pedido mesmo sem ID externo
        if (needsRetry && isConnectionError) {
          console.log('[DatabaseService] Erro de conexão com o provedor. Criando pedido para reprocessamento posterior.');
          // Continuar com a criação do pedido, mas com status especial
        } else {
          console.error('[DatabaseService] Resposta do provedor não contém ID do pedido:', orderResponse);
          throw new Error('Resposta do provedor não contém ID do pedido');
        }
      }
      
      // Determinar o status do pedido
      let orderStatus = orderResponse.status || 'pending';
      if (needsRetry && isConnectionError) {
        orderStatus = 'needs_retry'; // Status especial para pedidos que precisam ser reprocessados
      }
      
      // Preparar os dados do pedido - removendo campos que não existem na tabela
      const orderData = {
        transaction_id: transaction.id,
        user_id: transaction.user_id,
        customer_id: transaction.customer_id,
        service_id: transaction.service_id,
        // Remover provider_id que não existe na tabela
        // provider_id: provider.id,
        // Remover external_id que não existe na tabela
        // external_id: transaction.service?.external_id || transaction.metadata?.service?.external_id,
        external_order_id: orderResponse.order || orderResponse.orderId || null, // Pode ser null para pedidos que precisam ser reprocessados
        status: orderStatus,
        amount: finalAmount, // Alterado para usar o valor calculado
        quantity: quantity,
        // Remover link pois a coluna não existe mais
        // link: link,
        target_username: username,
        // Não atualizar payment_status diretamente
        // payment_status: transaction.status,
        payment_method: transaction.payment_method,
        payment_id: transaction.payment_id,
        metadata: {
          provider_response: orderResponse,
          provider_request: requestData,
          post: currentPost,
          // Armazenar o link no metadata já que não temos a coluna
          link: link,
          // Armazenar o provider_id no metadata já que não temos a coluna
          provider_id: provider.id,
          provider_name: provider.name,
          // Armazenar o external_id no metadata já que não temos a coluna
          external_id: transaction.service?.external_id || transaction.metadata?.service?.external_id,
          // Adicionar informações sobre o erro de conexão, se houver
          connection_error: isConnectionError ? true : undefined,
          needs_retry: needsRetry ? true : undefined,
          error_message: orderResponse.error || undefined,
          retry_count: 0, // Contador de tentativas de reprocessamento
          last_retry_at: null // Data da última tentativa de reprocessamento
        },
        created_at: new Date().toISOString()
      };
      
      // Inserir o pedido no banco de dados
      const { data: order, error } = await this.supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (error) {
        console.error('[DatabaseService] Erro ao criar pedido no banco de dados:', error);
        throw error;
      }
      
      console.log('[DatabaseService] Pedido criado com sucesso:', order);
      
      return order;
    } catch (error) {
      console.error('[DatabaseService] Erro ao criar pedido no banco de dados:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de uma transação
   * @param transactionId ID da transação
   */
  async updateTransactionStatus(transactionId: string): Promise<void> {
    try {
      console.log('[DatabaseService] Atualizando status da transação:', transactionId);
      
      // Atualizar o status da transação para 'approved' em vez de 'paid'
      // 'paid' não é um valor válido para o enum payment_status
      const { error } = await this.supabase
        .from('transactions')
        .update({ status: 'approved' })
        .eq('id', transactionId);
      
      if (error) {
        console.error('[DatabaseService] Erro ao atualizar status da transação:', error);
        throw error;
      }
      
      console.log('[DatabaseService] Status da transação atualizado com sucesso');
    } catch (error) {
      console.error('[DatabaseService] Erro ao atualizar status da transação:', error);
      throw error;
    }
  }
}
