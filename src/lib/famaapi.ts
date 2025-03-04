import { createClient } from '@/lib/supabase/server';

const BASE_URL = 'https://famanasredes.com.br/api/v2';

interface OrderResponse {
  status: string;
  data: {
    order_id: string;
    service_id: string;
    username: string;
    quantity: number;
    status: string;
  };
}

interface OrderStatus {
  status: string;
  data: {
    charge: string;
    start_count: string;
    status: string;
    remains: string;
    currency: string;
  };
}

interface MultipleOrdersStatus {
  [key: string]: OrderStatus | { error: string };
}

interface RefillResponse {
  refill: string;
}

interface RefillStatus {
  status: string;
}

class FamaRedesOrderService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.FAMA_REDES_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('FAMA_REDES_API_KEY não configurada');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Erro na API Fama:', {
          status: response.status,
          data,
          endpoint,
          requestBody: options.body
        });
        throw new Error(`Erro na API: ${response.status} - ${data.error || 'Erro desconhecido'}`);
      }

      return data;
    } catch (error) {
      console.error('Erro ao fazer requisição para API Fama:', error);
      throw error;
    }
  }

  async createOrder(serviceId: string, quantity: number, link: string): Promise<OrderResponse> {
    console.log('Criando pedido na Fama:', { serviceId, quantity, link });

    const requestBody = {
      key: this.apiKey,
      action: 'add',
      service: serviceId,
      quantity: quantity,
      link: link
    };

    return this.request<OrderResponse>('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody).toString()
    });
  }

  async getOrderStatus(orderId: string): Promise<OrderStatus> {
    const requestBody = {
      key: this.apiKey,
      action: 'status',
      order: orderId
    };

    return this.request<OrderStatus>('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody).toString()
    });
  }

  async getMultipleOrdersStatus(orderIds: string[]): Promise<MultipleOrdersStatus> {
    const requestBody = {
      key: this.apiKey,
      action: 'status',
      orders: orderIds.join(',')
    };

    return this.request<MultipleOrdersStatus>('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody).toString()
    });
  }

  async createRefill(orderId: string): Promise<RefillResponse> {
    const requestBody = {
      key: this.apiKey,
      action: 'refill',
      order: orderId
    };

    return this.request<RefillResponse>('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody).toString()
    });
  }

  async getRefillStatus(refillId: string): Promise<RefillStatus> {
    const requestBody = {
      key: this.apiKey,
      action: 'refill_status',
      refill: refillId
    };

    return this.request<RefillStatus>('', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(requestBody).toString()
    });
  }
}

const famaRedesOrderService = new FamaRedesOrderService();

export { famaRedesOrderService };

export const {
  createOrder,
  getOrderStatus,
  getMultipleOrdersStatus,
  createRefill,
  getRefillStatus
} = famaRedesOrderService;

export async function processTransaction(transactionId: string) {
  console.log('[ProcessTransaction] Iniciando processamento:', transactionId);
  const startTime = new Date();
  const supabase = createClient();

  try {
    console.log('[ProcessTransaction] Buscando dados da transação...');
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        service:service_id (
          id,
          external_id,
          name,
          quantidade,
          type,
          provider_id,
          metadata
        ),
        user:user_id (
          id,
          email
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
      throw new Error('Transação não encontrada');
    }

    console.log('[ProcessTransaction] Dados da transação:', JSON.stringify(transaction, null, 2));

    // Verificar se o usuário existe
    if (transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email) {
      console.log('[ProcessTransaction] Verificando cliente:', transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email);
      
      // Verificar se o cliente já existe
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email)
        .single();
      
      if (customerError && customerError.code !== 'PGSQL_ERROR_NO_DATA_FOUND') {
        console.error('[ProcessTransaction] Erro ao verificar cliente:', customerError);
      }
      
      let customerId = existingCustomer?.id;
      
      // Se o cliente não existe, criar novo
      if (!existingCustomer) {
        console.log('[ProcessTransaction] Criando cliente para usuário:', transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email);
        
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            email: transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email,
            name: transaction.customer_name || transaction.metadata?.profile?.full_name || transaction.metadata?.profile?.username || transaction.metadata?.target_username || (transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email).split('@')[0],
            phone: '',
            instagram_username: transaction.target_username || ''
          })
          .select()
          .single();
        
        if (createError) {
          console.error('[ProcessTransaction] Erro ao criar cliente:', createError);
        } else {
          console.log('[ProcessTransaction] Cliente criado com sucesso:', newCustomer);
          customerId = newCustomer.id;
          
          // Atualizar a transação com o ID do cliente
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ customer_id: customerId })
            .eq('id', transactionId);
          
          if (updateError) {
            console.error('[ProcessTransaction] Erro ao atualizar transação com customer_id:', updateError);
          }
        }
      } else {
        console.log('[ProcessTransaction] Cliente encontrado:', existingCustomer);
        
        // Garantir que a transação tenha o customer_id correto
        if (!transaction.customer_id || transaction.customer_id !== customerId) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ customer_id: customerId })
            .eq('id', transactionId);
          
          if (updateError) {
            console.error('[ProcessTransaction] Erro ao atualizar transação com customer_id:', updateError);
          }
        }
      }
    }

    console.log('[ProcessTransaction] Verificando pedidos existentes...');
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
          order_created: true,
          order_id: existingOrders[0].id
        })
        .eq('id', transactionId);
        
      if (updateError) {
        console.error('[ProcessTransaction] Erro ao atualizar flag order_created:', updateError);
      } else {
        console.log('[ProcessTransaction] Flag order_created atualizado com sucesso');
      }
      
      return existingOrders;
    }

    // Verificar se o serviço tem um provedor específico
    let provider = null;
    if (transaction.service && transaction.service.metadata && transaction.service.metadata.provider) {
      // Primeiro, tentar obter o provedor do metadata do serviço
      provider = transaction.service.metadata.provider;
      console.log('[ProcessTransaction] Provedor encontrado no metadata do serviço:', provider.name);
    } else if (transaction.service && transaction.service.provider_id) {
      // Se não encontrar no metadata, buscar no banco de dados
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('*')
        .eq('id', transaction.service.provider_id)
        .single();
      
      if (providerError) {
        console.error('[ProcessTransaction] Erro ao buscar provedor:', providerError);
        throw new Error(`Erro ao buscar provedor: ${providerError.message}`);
      } else {
        provider = providerData;
        console.log('[ProcessTransaction] Provedor encontrado no banco de dados:', provider.name);
      }
    }

    // Se não encontrou um provedor específico, lançar erro
    if (!provider) {
      console.error('[ProcessTransaction] Provedor não encontrado para o serviço:', transaction.service);
      throw new Error('Provedor não encontrado para o serviço. Verifique a configuração do serviço.');
    }

    console.log('[ProcessTransaction] Tipo de serviço:', transaction.service.type);
    if (transaction.service.type === 'likes') {
      console.log('[ProcessTransaction] Posts para processar:', transaction.metadata?.posts || []);
      const posts = transaction.metadata?.posts || [];
      if (!posts.length) {
        console.error('[ProcessTransaction] Nenhum post selecionado para curtidas');
        throw new Error('Nenhum post selecionado para curtidas');
      }

      const orders = [];
      const quantityPerPost = transaction.service.quantidade;
      const amountPerPost = transaction.amount / posts.length;

      for (const post of posts) {
        console.log('[ProcessTransaction] Processando post:', post);
        const postCode = post.code || post.id || post.shortcode;
        const postLink = `https://instagram.com/p/${postCode}`;
        
        try {
          let orderResponse;
          
          // Inicializar o serviço de mídia social com o provedor correto
          console.log('[ProcessTransaction] Criando pedido no provedor para o post:', postLink);
          console.log('[ProcessTransaction] Usando provedor:', provider.name);
          
          const socialMediaService = new SocialMediaService(provider);
          
          // Criar o pedido no provedor usando o external_id do serviço
          const serviceExternalId = transaction.service.external_id || 
                                   (transaction.service.metadata && transaction.service.metadata.service);
          
          if (!serviceExternalId) {
            throw new Error(`ID externo do serviço não encontrado para o serviço ${transaction.service.id}`);
          }
          
          console.log('[ProcessTransaction] ID externo do serviço:', serviceExternalId);
          
          // Criar o pedido no provedor
          orderResponse = await socialMediaService.createOrder({
            service: serviceExternalId,
            provider_id: provider.id,
            link: postLink,
            quantity: quantityPerPost,
            username: transaction.target_username,
            transaction_id: transaction.id
          });
          
          console.log('[ProcessTransaction] Resposta do provedor:', orderResponse);
          
          console.log('[ProcessTransaction] Criando pedido no banco...');
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              transaction_id: transactionId,
              user_id: transaction.user_id,
              service_id: transaction.service_id,
              provider_id: provider.id,
              external_order_id: orderResponse.orderId,
              status: orderResponse.status || 'processing',
              amount: amountPerPost,
              quantity: quantityPerPost,
              target_username: post.username || transaction.metadata?.username || transaction.target_username,
              payment_status: transaction.status || 'pending',
              payment_method: transaction.payment_method || 'pix',
              payment_id: transaction.payment_id || transaction.external_id,
              metadata: {
                post: post,
                link: postLink,
                provider: provider.slug,
                provider_name: provider.name,
                provider_service_id: serviceExternalId,
                provider_order_id: orderResponse.orderId,
                provider_response: orderResponse,
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
            console.error('[ProcessTransaction] Erro ao criar pedido no banco:', orderError);
            throw orderError;
          }
          
          console.log('[ProcessTransaction] Pedido criado:', order);
          orders.push(order);
        } catch (error) {
          console.error('[ProcessTransaction] Erro ao processar post:', post, error);
          throw error;
        }
      }

      console.log('[ProcessTransaction] Atualizando status da transação...');
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('[ProcessTransaction] Erro ao atualizar status da transação:', updateError);
        throw updateError;
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      console.log(`[ProcessTransaction] Finalizado em ${duration}ms. Pedidos criados:`, orders);

      return orders;
    } else {
      console.log('[ProcessTransaction] Processando pedido...');
      const username = transaction.metadata?.username;
      if (!username) {
        console.error('[ProcessTransaction] Username não encontrado');
        throw new Error('Username não encontrado');
      }

      const profileLink = `https://instagram.com/${username}`;
      
      try {
        let orderResponse;
        
        // Inicializar o serviço de mídia social com o provedor correto
        console.log('[ProcessTransaction] Criando pedido no provedor para o perfil:', profileLink);
        console.log('[ProcessTransaction] Usando provedor:', provider.name);
        
        const socialMediaService = new SocialMediaService(provider);
        
        // Criar o pedido no provedor usando o external_id do serviço
        const serviceExternalId = transaction.service.external_id || 
                                 (transaction.service.metadata && transaction.service.metadata.service);
        
        if (!serviceExternalId) {
          throw new Error(`ID externo do serviço não encontrado para o serviço ${transaction.service.id}`);
        }
        
        console.log('[ProcessTransaction] ID externo do serviço:', serviceExternalId);
        
        // Criar o pedido no provedor
        orderResponse = await socialMediaService.createOrder({
          service: serviceExternalId,
          provider_id: provider.id,
          link: profileLink,
          quantity: transaction.service.quantidade,
          username: transaction.target_username,
          transaction_id: transaction.id
        });
        
        console.log('[ProcessTransaction] Resposta do provedor:', orderResponse);
        
        console.log('[ProcessTransaction] Criando pedido no banco...');
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            transaction_id: transactionId,
            user_id: transaction.user_id,
            service_id: transaction.service_id,
            provider_id: provider.id,
            external_order_id: orderResponse.orderId,
            status: orderResponse.status || 'processing',
            amount: transaction.amount,
            quantity: transaction.service.quantidade,
            target_username: username,
            payment_status: transaction.status || 'pending',
            payment_method: transaction.payment_method || 'pix',
            payment_id: transaction.payment_id || transaction.external_id,
            metadata: {
              link: profileLink,
              provider: provider.slug,
              provider_name: provider.name,
              provider_service_id: serviceExternalId,
              provider_order_id: orderResponse.orderId,
              provider_response: orderResponse,
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
          console.error('[ProcessTransaction] Erro ao criar pedido no banco:', orderError);
          throw orderError;
        }

        console.log('[ProcessTransaction] Atualizando status da transação...');
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'processing',
            processed_at: new Date().toISOString()
          })
          .eq('id', transactionId);

        if (updateError) {
          console.error('[ProcessTransaction] Erro ao atualizar status da transação:', updateError);
          throw updateError;
        }

        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.log(`[ProcessTransaction] Finalizado em ${duration}ms. Pedido criado:`, order);

        return order;
      } catch (error) {
        console.error('[ProcessTransaction] Erro ao processar pedido:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('[ProcessTransaction] Erro geral:', error);
    
    await supabase
      .from('transactions')
      .update({
        status: 'failed',
        error: error.message
      })
      .eq('id', transactionId);

    throw error;
  }
}
