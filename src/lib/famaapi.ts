import { createClient } from '@supabase/auth-helpers-nextjs';

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
          type
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

    console.log('[ProcessTransaction] Verificando pedidos existentes...');
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('transaction_id', transactionId);

    if (existingOrders && existingOrders.length > 0) {
      console.log('[ProcessTransaction] Pedidos já existem:', existingOrders);
      return existingOrders;
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
        const postLink = `https://instagram.com/p/${post.shortcode}`;
        
        try {
          console.log('[ProcessTransaction] Criando pedido na API Fama:', {
            serviceId: transaction.service.external_id,
            quantity: quantityPerPost,
            link: postLink
          });

          const orderResponse = await famaRedesOrderService.createOrder(
            transaction.service.external_id,
            quantityPerPost,
            postLink
          );

          console.log('[ProcessTransaction] Resposta da API Fama:', orderResponse);

          console.log('[ProcessTransaction] Criando pedido no banco...');
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              transaction_id: transactionId,
              user_id: transaction.user_id,
              service_id: transaction.service_id,
              external_order_id: orderResponse.data.order_id,
              status: orderResponse.data.status,
              amount: amountPerPost,
              quantity: quantityPerPost,
              target_username: post.username || transaction.metadata?.username,
              metadata: {
                post: post,
                link: postLink,
                provider: 'fama',
                provider_service_id: transaction.service.external_id,
                provider_order_id: orderResponse.data.order_id
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
        console.log('[ProcessTransaction] Criando pedido na API Fama:', {
          serviceId: transaction.service.external_id,
          quantity: transaction.service.quantidade,
          link: profileLink
        });

        const orderResponse = await famaRedesOrderService.createOrder(
          transaction.service.external_id,
          transaction.service.quantidade,
          profileLink
        );

        console.log('[ProcessTransaction] Resposta da API Fama:', orderResponse);

        console.log('[ProcessTransaction] Criando pedido no banco...');
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            transaction_id: transactionId,
            user_id: transaction.user_id,
            service_id: transaction.service_id,
            external_order_id: orderResponse.data.order_id,
            status: orderResponse.data.status,
            amount: transaction.amount,
            quantity: transaction.service.quantidade,
            target_username: username,
            metadata: {
              link: profileLink,
              provider: 'fama',
              provider_service_id: transaction.service.external_id,
              provider_order_id: orderResponse.data.order_id
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

export const {
  createOrder,
  getOrderStatus,
  getMultipleOrdersStatus,
  createRefill,
  getRefillStatus
} = famaRedesOrderService;
