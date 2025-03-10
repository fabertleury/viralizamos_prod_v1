import { Transaction } from '../types';

/**
 * Serviço para manipulação de dados de transações
 */
export class TransactionService {
  /**
   * Obtém o nome de usuário para o pedido de várias fontes possíveis
   * @param transaction Dados da transação
   * @returns Nome de usuário para o pedido
   */
  getUsernameForOrder(transaction: Transaction): string | null {
    return transaction.metadata?.profile?.username || 
           (transaction.metadata?.posts && transaction.metadata?.posts.length > 0 ? 
             transaction.metadata?.posts[0].username : transaction.target_username);
  }

  /**
   * Obtém o ID do serviço de várias fontes possíveis
   * @param transaction Dados da transação
   * @returns ID do serviço
   */
  getServiceId(transaction: Transaction): string | null {
    let serviceId = null;
    
    if (transaction.service && transaction.service.external_id) {
      console.log('[TransactionService] Usando external_id do serviço:', transaction.service.external_id);
      serviceId = transaction.service.external_id;
    } else if (transaction.metadata?.service?.external_id) {
      console.log('[TransactionService] Usando external_id do metadata:', transaction.metadata.service.external_id);
      serviceId = transaction.metadata.service.external_id;
    } else if (transaction.service && transaction.service.id) {
      console.log('[TransactionService] Usando ID do serviço:', transaction.service.id);
      serviceId = transaction.service.id;
    } else if (transaction.metadata?.service?.id) {
      console.log('[TransactionService] Usando ID do serviço do metadata:', transaction.metadata.service.id);
      serviceId = transaction.metadata.service.id;
    }
    
    // Garantir que o serviceId seja uma string e remover aspas extras
    if (serviceId !== null) {
      // Converter para string se não for
      serviceId = String(serviceId);
      
      // Remover aspas extras se houver
      serviceId = serviceId.replace(/^["'](.*)["']$/, '$1');
      
      console.log('[TransactionService] ServiceId formatado para envio:', serviceId);
    }
    
    return serviceId;
  }
}
