import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrderStatus } from '@/lib/famaapi';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    console.log('[CheckOrderStatus] Verificando status do pedido:', orderId);
    
    const supabase = createClient();

    // Buscar o pedido primeiro
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('external_order_id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[CheckOrderStatus] Erro ao buscar pedido:', orderError);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Se o pedido não tiver external_order_id, não podemos verificar o status
    if (!order.external_order_id) {
      return NextResponse.json({
        status: 'error',
        error: 'Este pedido não possui um ID externo para verificação',
        data: order
      }, { status: 400 });
    }

    // Verificar o status no provedor
    try {
      const statusResponse = await getOrderStatus(orderId);
      console.log('[CheckOrderStatus] Status do provedor:', JSON.stringify(statusResponse, null, 2));

      // Atualizar o status no banco de dados
      const providerStatus = {
        status: statusResponse.data.status,
        start_count: statusResponse.data.start_count,
        remains: statusResponse.data.remains,
        charge: statusResponse.data.charge,
        currency: statusResponse.data.currency,
        updated_at: new Date().toISOString()
      };

      const newMetadata = {
        ...order.metadata,
        provider_status: providerStatus
      };

      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          status: statusResponse.data.status === 'Completed' ? 'completed' : 
                 statusResponse.data.status === 'In progress' ? 'processing' :
                 statusResponse.data.status === 'Pending' ? 'pending' :
                 statusResponse.data.status === 'Canceled' ? 'canceled' :
                 statusResponse.data.status === 'Partial' ? 'partial' : order.status,
          metadata: newMetadata
        })
        .eq('id', order.id)
        .select()
        .single();

      if (updateError) {
        console.error('[CheckOrderStatus] Erro ao atualizar pedido:', updateError);
        return NextResponse.json(
          { error: 'Failed to update order status' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        status: 'success',
        data: updatedOrder,
        provider_response: statusResponse
      });
    } catch (error) {
      console.error('[CheckOrderStatus] Erro ao verificar status no provedor:', error);
      
      // Atualizar o metadata com o erro
      const newMetadata = {
        ...order.metadata,
        provider_status: {
          ...order.metadata.provider_status,
          error: error.message,
          updated_at: new Date().toISOString()
        }
      };

      // Atualizar o pedido com o erro
      const { data: updatedOrder, error: updateError } = await supabase
        .from('orders')
        .update({
          metadata: newMetadata
        })
        .eq('id', order.id)
        .select()
        .single();

      if (updateError) {
        console.error('[CheckOrderStatus] Erro ao atualizar pedido com erro:', updateError);
      }

      return NextResponse.json(
        { 
          error: 'Failed to check order status', 
          message: error.message,
          data: updatedOrder || order
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[CheckOrderStatus] Erro inesperado:', error);
    return NextResponse.json(
      { error: 'Unexpected error', message: error.message },
      { status: 500 }
    );
  }
}
