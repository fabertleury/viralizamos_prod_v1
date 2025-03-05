import { createClient } from '@/lib/supabase/server';
import { SocialMediaService } from '@/lib/services/socialMediaService';
import { Transaction, Provider, Post, ProviderRequestData, OrderResponse } from './types';
import { LinkFormatter } from './linkFormatter';

/**
 * Processa pedidos para provedores
 */
export class OrderProcessor {
  private supabase = createClient();
  private linkFormatter = new LinkFormatter();

  /**
   * Processa pedidos de curtidas com múltiplos posts
   * @param transaction Dados da transação
   * @param provider Provedor a ser utilizado
   * @param posts Lista de posts para processar
   * @param username Nome de usuário para o pedido
   * @returns Lista de pedidos criados
   */
  async processLikesOrder(transaction: Transaction, provider: Provider, posts: Post[], username: string): Promise<any[]> {
    console.log('[OrderProcessor] Processando pedido de curtidas');
    console.log('[OrderProcessor] Processando', posts.length, 'posts');
    console.log('[OrderProcessor] Checkout de curtidas para:', username);
    
    const orders: any[] = [];
    
    // Calcular a quantidade dividida entre os posts
    const originalQuantity = transaction.service?.quantity || transaction.metadata?.service?.quantity;
    const dividedQuantity = Math.floor(originalQuantity / posts.length);
    
    console.log(`[OrderProcessor] Quantidade original: ${originalQuantity}, Quantidade dividida por post: ${dividedQuantity}`);
    
    for (const post of posts) {
      try {
        console.log('[OrderProcessor] Processando post:', post);
        
        // Formatar o link para o Instagram (com https://)
        const formattedLink = this.linkFormatter.formatPostLink(post);
        console.log('[OrderProcessor] Link formatado para o Instagram (com https):', formattedLink);
        
        // Formatar o link para o provedor (agora também com https://)
        const postLinkForProvider = this.linkFormatter.formatInstagramLink(post.url, true);
        console.log('[OrderProcessor] Link formatado para o provedor (com https):', postLinkForProvider);
        
        // Extrair o external_id do serviço
        const serviceId = this.getServiceId(transaction);
        
        if (!serviceId) {
          console.error('[OrderProcessor] ID do serviço não encontrado na transação:', transaction);
          throw new Error('ID do serviço não encontrado na transação');
        }
        
        // Preparar os dados para a requisição ao provedor
        const providerRequestData: ProviderRequestData = {
          service: serviceId,
          link: postLinkForProvider,
          quantity: dividedQuantity, // Usar a quantidade dividida
          transaction_id: transaction.id,
          target_username: username,
          key: provider.api_key,
          action: 'add'
        };
        
        // Log detalhado para depuração
        this.logRequestDetails(providerRequestData);
        
        // Enviar para o endpoint do provedor
        const orderResponse = await this.sendOrderToProvider(provider, providerRequestData);
        console.log('[OrderProcessor] Resposta do provedor para o post:', orderResponse);
        
        // Criar pedido no banco de dados
        const order = await this.createOrderInDatabase(transaction, provider, orderResponse, postLinkForProvider, username, post, posts.length, providerRequestData);
        
        orders.push({
          success: true,
          data: {
            order: order,
            response: orderResponse
          },
          post: post
        });
        
      } catch (error) {
        console.error('[OrderProcessor] Erro ao processar post:', post, error);
        orders.push({
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          post: post
        });
        
        // Continuar processando os próximos posts
        continue;
      }
    }
    
    // Atualizar o status da transação
    await this.updateTransactionStatus(transaction.id);
    
    return orders;
  }

  /**
   * Processa pedidos para o provedor usando API direta ou SocialMediaService
   * @param transaction Dados da transação
   * @param provider Provedor a ser utilizado
   * @param targetLink Link alvo para o pedido
   * @param username Nome de usuário para o pedido
   * @returns Pedido criado
   */
  async processGenericOrder(transaction: Transaction, provider: Provider, targetLink: string, username: string): Promise<any> {
    try {
      // Extrair o external_id do serviço
      const serviceId = this.getServiceId(transaction);
      
      if (!serviceId) {
        console.error('[OrderProcessor] ID do serviço não encontrado na transação:', transaction);
        throw new Error('ID do serviço não encontrado na transação');
      }
      
      console.log('[OrderProcessor] Usando external_id do serviço:', serviceId);
      
      // Se for um link do Instagram, formatar corretamente
      let formattedTargetLink = targetLink;
      
      if (targetLink.includes('instagram.com')) {
        console.log('[OrderProcessor] Detectado link do Instagram, formatando:', targetLink);
        
        // Formatar o link para o Instagram - COM https:// para logs internos
        const formattedLinkWithHttps = this.linkFormatter.formatInstagramLink(targetLink, true);
        console.log('[OrderProcessor] Link formatado para o Instagram (com https):', formattedLinkWithHttps);
        
        // Formatar o link para o Instagram - AGORA TAMBÉM COM https:// para envio ao provedor
        const formattedLinkForProvider = this.linkFormatter.formatInstagramLink(targetLink, true);
        console.log('[OrderProcessor] Link formatado para o provedor (com https):', formattedLinkForProvider);
        
        if (formattedLinkForProvider) {
          formattedTargetLink = formattedLinkForProvider;
        } else {
          console.warn('[OrderProcessor] Não foi possível formatar o link do Instagram, usando o link original');
        }
      }
      
      // Verificar se o provedor tem API configurada
      if (provider && provider.api_url && provider.api_key) {
        console.log('[OrderProcessor] Provedor tem API configurada, usando endpoint dinâmico');
        
        // Verificar se há múltiplos posts na transação
        const hasMultiplePosts = transaction.metadata?.posts && transaction.metadata.posts.length > 1;
        const totalPosts = hasMultiplePosts ? transaction.metadata.posts.length : 1;
        
        // Calcular a quantidade dividida se houver múltiplos posts
        const originalQuantity = transaction.service?.quantity || transaction.metadata?.service?.quantity;
        const quantity = hasMultiplePosts ? Math.floor(originalQuantity / totalPosts) : originalQuantity;
        
        console.log(`[OrderProcessor] Quantidade original: ${originalQuantity}, Quantidade a enviar: ${quantity}, Total de posts: ${totalPosts}`);
        
        // Preparar os dados para a requisição ao provedor
        const providerRequestData: ProviderRequestData = {
          service: serviceId,
          link: formattedTargetLink,
          quantity: quantity, // Usar a quantidade dividida se necessário
          transaction_id: transaction.id,
          target_username: username,
          key: provider.api_key,
          action: 'add'
        };
        
        // Log detalhado para depuração
        this.logRequestDetails(providerRequestData);
        
        // Enviar para o endpoint do provedor
        const orderResponse = await this.sendOrderToProvider(provider, providerRequestData);
        console.log('[OrderProcessor] Resposta do provedor:', orderResponse);
        
        // Criar pedido no banco de dados
        return await this.createOrderInDatabase(transaction, provider, orderResponse, formattedTargetLink, username, totalPosts, providerRequestData);
      } else {
        // Criar o serviço social media diretamente
        console.log('[OrderProcessor] Provedor não tem API configurada, usando SocialMediaService diretamente');
        const socialMediaService = new SocialMediaService(provider);
        
        // Criar o pedido
        const orderResponse = await socialMediaService.createOrder({
          service: serviceId,
          link: formattedTargetLink,
          quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
          provider_id: provider.id
        });
        
        console.log('[OrderProcessor] Resposta do SocialMediaService:', orderResponse);
        
        // Criar pedido no banco de dados
        return await this.createOrderInDatabase(
          transaction, 
          provider, 
          orderResponse, 
          formattedTargetLink, 
          username, 
          1, // totalPosts
          {
            service: serviceId,
            link: formattedTargetLink,
            quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
            provider_id: provider.id
          } // providerRequestData
        );
      }
    } catch (error) {
      console.error('[OrderProcessor] Erro ao processar pedido:', error);
      throw error;
    }
  }

  /**
   * Obtém o nome de usuário para o pedido de várias fontes possíveis
   * @param transaction Dados da transação
   * @returns Nome de usuário para o pedido
   */
  private getUsernameForOrder(transaction: Transaction): string | null {
    return transaction.metadata?.profile?.username || 
           (transaction.metadata?.posts && transaction.metadata?.posts.length > 0 ? 
             transaction.metadata?.posts[0].username : transaction.target_username);
  }

  /**
   * Obtém o ID do serviço de várias fontes possíveis
   * @param transaction Dados da transação
   * @returns ID do serviço
   */
  private getServiceId(transaction: Transaction): string | null {
    if (transaction.service && transaction.service.external_id) {
      console.log('[OrderProcessor] Usando external_id do serviço:', transaction.service.external_id);
      return transaction.service.external_id;
    } else if (transaction.metadata?.service?.external_id) {
      console.log('[OrderProcessor] Usando external_id do metadata:', transaction.metadata.service.external_id);
      return transaction.metadata.service.external_id;
    } else if (transaction.service && transaction.service.id) {
      console.log('[OrderProcessor] Usando ID do serviço:', transaction.service.id);
      return transaction.service.id;
    } else if (transaction.metadata?.service?.id) {
      console.log('[OrderProcessor] Usando ID do serviço do metadata:', transaction.metadata.service.id);
      return transaction.metadata.service.id;
    }
    
    return null;
  }

  /**
   * Registra detalhes da requisição para depuração
   * @param requestData Dados da requisição
   */
  private logRequestDetails(requestData: ProviderRequestData): void {
    console.log('[OrderProcessor] Enviando para o provedor:');
    console.log(`service: ${requestData.service}`);
    console.log(`link: ${requestData.link}`);
    console.log(`quantity: ${requestData.quantity}`);
    console.log(`transaction_id: ${requestData.transaction_id}`);
    console.log(`target_username: ${requestData.target_username}`);
    console.log(`key: ${requestData.key}`);
    console.log(`action: ${requestData.action}`);
  }

  /**
   * Envia o pedido para o provedor
   * @param provider Provedor a ser utilizado
   * @param requestData Dados da requisição
   * @returns Resposta do provedor
   */
  private async sendOrderToProvider(provider: Provider, requestData: ProviderRequestData): Promise<OrderResponse> {
    // Usar a URL direta do provedor se disponível, caso contrário usar a URL do Supabase
    const apiUrl = provider.api_url || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/providers/${provider.slug}/add-order`;
    
    console.log('[OrderProcessor] Enviando pedido para o provedor:', provider.slug);
    console.log('[OrderProcessor] URL da API:', apiUrl);
    console.log('[OrderProcessor] Dados do pedido:', JSON.stringify(requestData, null, 2));
    
    // Verificar se o link está no formato correto (sem https://)
    if (requestData.link && requestData.link.startsWith('https://')) {
      console.warn('[OrderProcessor] ALERTA: Link contém https://, pode causar erro no provedor:', requestData.link);
      requestData.link = requestData.link.replace('https://', '');
      console.log('[OrderProcessor] Link corrigido para:', requestData.link);
    }
    
    // Converter para formato x-www-form-urlencoded manualmente
    const formData = new URLSearchParams();
    Object.entries(requestData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    const formDataString = formData.toString();
    console.log('[OrderProcessor] Dados formatados para envio:', formDataString);
    
    // Log detalhado para depuração
    console.log('[OrderProcessor] Enviando para o provedor:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: formDataString,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      console.error('[OrderProcessor] Erro na resposta do provedor:', errorData);
      throw new Error(`Erro ao enviar pedido para o provedor: ${JSON.stringify(errorData)}`);
    }
    
    const responseData = await response.json();
    console.log('[OrderProcessor] Resposta do provedor:', JSON.stringify(responseData, null, 2));
    
    return responseData;
  }

  /**
   * Cria o pedido no banco de dados
   * @param transaction Dados da transação
   * @param provider Provedor utilizado
   * @param orderResponse Resposta do provedor
   * @param targetLink Link alvo do pedido
   * @param username Nome de usuário para o pedido
   * @param post Post processado (opcional)
   * @param totalPosts Total de posts na transação (opcional)
   * @returns Pedido criado
   */
  private async createOrderInDatabase(
    transaction: Transaction, 
    provider: Provider, 
    orderResponse: OrderResponse, 
    targetLink: string, 
    username: string,
    post?: Post,
    totalPosts: number = 1,
    requestData?: ProviderRequestData
  ): Promise<any> {
    console.log('[OrderProcessor] Criando pedido no banco...');
    
    // Calcular a quantidade dividida entre os posts
    const originalQuantity = transaction.service?.quantity || transaction.metadata?.service?.quantity;
    const dividedQuantity = totalPosts > 1 ? Math.floor(originalQuantity / totalPosts) : originalQuantity;
    
    console.log(`[OrderProcessor] Quantidade original: ${originalQuantity}, Quantidade dividida: ${dividedQuantity}, Total de posts: ${totalPosts}`);
    
    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        transaction_id: transaction.id,
        customer_id: transaction.customer_id,
        service_id: transaction.service_id,
        external_order_id: orderResponse.orderId || orderResponse.order,
        status: orderResponse.status || 'processing',
        amount: totalPosts > 1 ? (transaction.amount / totalPosts) : transaction.amount,
        quantity: dividedQuantity, // Usar a quantidade dividida
        target_username: username,
        payment_status: transaction.status === 'processing' ? 'approved' : 
                        transaction.status === 'completed' ? 'approved' : 
                        transaction.status === 'failed' ? 'rejected' : 'pending',
        payment_method: transaction.payment_method || 'pix',
        payment_id: transaction.payment_id || transaction.external_id,
        metadata: {
          link: targetLink,
          provider: provider.slug,
          provider_name: provider.name,
          provider_service_id: this.getServiceId(transaction),
          provider_order_id: orderResponse.orderId || orderResponse.order,
          provider_response: orderResponse,
          providerRequestData: requestData, // Adicionando os dados enviados para o provedor
          post: post,
          customer: {
            name: transaction.customer_name || transaction.metadata?.customer?.name,
            email: transaction.customer_email || transaction.metadata?.customer?.email,
            phone: transaction.customer_phone || transaction.metadata?.customer?.phone
          }
        }
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('[OrderProcessor] Erro ao criar pedido no banco:', orderError);
      throw orderError;
    }
    
    console.log('[OrderProcessor] Atualizando transação com order_id:', order.id);
    const { error: updateTransactionError } = await this.supabase
      .from('transactions')
      .update({
        order_created: true,
        order_id: order.id
      })
      .eq('id', transaction.id);
    
    if (updateTransactionError) {
      console.error('[OrderProcessor] Erro ao atualizar transação com order_id:', updateTransactionError);
    } else {
      console.log('[OrderProcessor] Transação atualizada com order_id:', order.id);
    }
    
    return order;
  }

  /**
   * Atualiza o status da transação após criar o pedido
   * @param transactionId ID da transação
   */
  private async updateTransactionStatus(transactionId: string): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('transactions')
      .update({
        order_created: true
        // Removido o status: 'processing' que estava causando o erro
      })
      .eq('id', transactionId);
    
    if (updateError) {
      console.error('[OrderProcessor] Erro ao atualizar status da transação:', updateError);
      throw updateError;
    }
  }
}
