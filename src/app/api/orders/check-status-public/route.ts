import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkOrderStatus, normalizeProviderStatus } from '@/services/providerRouter';
import { getCustomerByEmail } from '@/services/customerService';

export async function POST(request: NextRequest) {
  try {
    const { orderId, email } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('[CheckOrderStatusPublic] Verificando status do pedido:', orderId, 'para email:', email);
    
    const supabase = createClient();

    // Verificar se o cliente existe usando o serviço de clientes
    let customer = null;
    try {
      customer = await getCustomerByEmail(email);
    } catch (error) {
      // Se a tabela customers ainda não existe, ignorar o erro
      console.log('[CheckOrderStatusPublic] Erro ao buscar cliente, possivelmente a tabela não existe:', error);
    }
    
    if (!customer) {
      // Verificar se o usuário existe em profiles como fallback
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !user) {
        console.log('[CheckOrderStatusPublic] Cliente/Usuário não encontrado, continuando apenas com verificação por email');
      }
    }

    // Buscar o pedido
    let orderQuery = supabase
      .from('orders')
      .select(`
        *,
        service:service_id (*),
        provider:provider_id (*)
      `)
      .eq('external_order_id', orderId);
      
    // Filtrar por customer_id se tivermos um cliente
    if (customer) {
      orderQuery = orderQuery.eq('customer_id', customer.id);
    }
    
    const { data: order, error: orderError } = await orderQuery.single();

    if (orderError || !order) {
      // Se não encontrou pelo customer_id, tenta buscar pelo email nos metadados
      const { data: orderByEmail, error: orderByEmailError } = await supabase
        .from('orders')
        .select(`
          *,
          service:service_id (*),
          provider:provider_id (*)
        `)
        .eq('external_order_id', orderId)
        .filter('metadata->email', 'eq', email)
        .single();
        
      if (orderByEmailError || !orderByEmail) {
        console.error('[CheckOrderStatusPublic] Pedido não encontrado:', orderError);
        return NextResponse.json(
          { error: 'Order not found or does not belong to this user' },
          { status: 404 }
        );
      }
      
      // Se encontrou pelo email nos metadados, usa esse pedido
      return await processOrderStatus(supabase, orderByEmail);
    }

    // Processar o status do pedido
    return await processOrderStatus(supabase, order);
  } catch (error: any) {
    console.error('[CheckOrderStatusPublic] Erro geral:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

// Função auxiliar para processar o status do pedido
async function processOrderStatus(supabase: any, order: any) {
  try {
    // Verificar o status no provedor usando o providerRouter
    let providerResponse;
    
    if (order.provider) {
      // Usar o provedor associado ao pedido
      providerResponse = await checkOrderStatus(
        order.provider.id,
        order.external_order_id,
        order.provider.api_url,
        order.provider.api_key
      );
    } else {
      // Fallback para o provedor Fama nas Redes
      const { data: famaProvider, error: famaError } = await supabase
        .from('providers')
        .select('*')
        .eq('name', 'Fama nas Redes')
        .single();
        
      if (famaError) {
        throw new Error('Provedor padrão não encontrado');
      }
      
      providerResponse = await checkOrderStatus(
        famaProvider.id,
        order.external_order_id,
        famaProvider.api_url,
        famaProvider.api_key
      );
    }
    
    console.log('[CheckOrderStatusPublic] Status do provedor:', providerResponse);

    // Normalizar o status do provedor
    const normalizedStatus = providerResponse.normalized_status || normalizeProviderStatus(providerResponse);

    // Atualizar o status no banco de dados
    const providerStatus = {
      status: providerResponse.status,
      start_count: providerResponse.start_count,
      remains: providerResponse.remains,
      updated_at: new Date().toISOString()
    };

    const newMetadata = {
      ...order.metadata,
      provider_status: providerStatus
    };

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: normalizedStatus,
        metadata: newMetadata
      })
      .eq('id', order.id)
      .select(`
        *,
        service:service_id (*),
        provider:provider_id (*)
      `)
      .single();

    if (updateError) {
      console.error('[CheckOrderStatusPublic] Erro ao atualizar pedido:', updateError);
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: updatedOrder
    });
  } catch (error) {
    console.error('[CheckOrderStatusPublic] Erro ao verificar status no provedor:', error);
    
    // Atualizar o metadata com o erro
    const newMetadata = {
      ...order.metadata,
      provider_status: {
        ...order.metadata.provider_status,
        error: error.message,
        updated_at: new Date().toISOString()
      }
    };

    await supabase
      .from('orders')
      .update({
        metadata: newMetadata
      })
      .eq('id', order.id);

    return NextResponse.json(
      { 
        error: 'Failed to check order status with provider',
        details: error.message
      },
      { status: 500 }
    );
  }
}
