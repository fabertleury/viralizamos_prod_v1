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
        calculatedAmount = 1000; // Valor padrão de 10 reais (em centavos)
        console.log('[DatabaseService] Usando valor padrão:', calculatedAmount);
      }
      
      // Garantir que amount nunca seja nulo
      const finalAmount = calculatedAmount || 1000; // Garantia final contra nulos
      console.log('[DatabaseService] Valor final de amount:', finalAmount);
      
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
        external_order_id: orderResponse.order || orderResponse.orderId,
        status: orderResponse.status || 'pending',
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
          external_id: transaction.service?.external_id || transaction.metadata?.service?.external_id
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
