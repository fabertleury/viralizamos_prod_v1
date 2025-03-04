import { createClient } from '@/lib/supabase/server';
import { SocialMediaService } from '@/lib/services/socialMediaService';

/**
 * Gerencia o status dos pedidos
 */
export class OrderStatusManager {
  private supabase = createClient();

  /**
   * Verifica o status de um pedido no provedor
   * @param orderId ID do pedido
   * @param providerId ID do provedor
   * @returns Status do pedido
   */
  async checkOrderStatus(orderId: string, providerId: string): Promise<any> {
    try {
      // Buscar o provedor
      const { data: provider, error: providerError } = await this.supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single();
      
      if (providerError || !provider) {
        throw new Error(`Provedor com ID ${providerId} não encontrado`);
      }
      
      // Inicializar o serviço de mídia social com o provedor
      const socialMediaService = new SocialMediaService(provider);
      
      // Verificar o status do pedido
      return await socialMediaService.checkOrderStatus(parseInt(orderId, 10), providerId);
    } catch (error) {
      console.error('[OrderStatusManager] Erro ao verificar status do pedido:', error);
      throw error;
    }
  }

  /**
   * Atualiza o status de um pedido no banco de dados
   * @param orderId ID do pedido
   * @param status Novo status
   * @returns Pedido atualizado
   */
  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('[OrderStatusManager] Erro ao atualizar status do pedido:', error);
      throw error;
    }
  }
}
