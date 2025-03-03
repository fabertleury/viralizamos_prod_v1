import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SocialMediaService } from '@/lib/services/socialMediaService';

export async function POST(request: NextRequest) {
  try {
    const { order_id } = await request.json();

    if (!order_id) {
      return NextResponse.json({
        error: 'Missing order_id',
        status: 'error'
      }, { status: 400 });
    }

    const supabase = createClient();
    const socialMediaService = new SocialMediaService();

    // Buscar o pedido no banco de dados
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, service:services(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Erro ao buscar pedido:', orderError);
      return NextResponse.json({
        error: 'Order not found',
        status: 'error'
      }, { status: 404 });
    }

    // Verificar se o pedido tem um external_order_id
    if (!order.external_order_id) {
      console.error('Pedido não tem external_order_id:', order);
      return NextResponse.json({
        error: 'Order has no external_order_id',
        status: 'error'
      }, { status: 400 });
    }

    // Obter o provider_id do serviço
    const providerId = order.service?.provider_id;
    
    if (!providerId) {
      console.error('Serviço não tem provider_id:', order.service);
      return NextResponse.json({
        error: 'Service has no provider_id',
        status: 'error'
      }, { status: 400 });
    }

    // Verificar o status do pedido no provedor
    const statusResponse = await socialMediaService.checkOrderStatus(
      parseInt(order.external_order_id),
      providerId
    );

    console.log('Resposta de status do provedor:', statusResponse);

    if (!statusResponse || !statusResponse.status) {
      return NextResponse.json({
        error: 'Invalid response from provider',
        provider_response: statusResponse,
        status: 'error'
      }, { status: 500 });
    }

    // Mapear o status do provedor para o status interno
    let orderStatus = 'processing';
    let remainingQuantity = 0;

    if (statusResponse.status === 'Completed' || statusResponse.status === 'Complete') {
      orderStatus = 'completed';
    } else if (statusResponse.status === 'Canceled' || statusResponse.status === 'Cancelled') {
      orderStatus = 'canceled';
    } else if (statusResponse.status === 'Pending' || statusResponse.status === 'Processing' || statusResponse.status === 'In progress') {
      orderStatus = 'processing';
      // Verificar se há quantidade restante
      if (statusResponse.remains !== undefined) {
        remainingQuantity = parseInt(statusResponse.remains);
      }
    } else if (statusResponse.status === 'Partial') {
      orderStatus = 'partial';
      // Verificar se há quantidade restante
      if (statusResponse.remains !== undefined) {
        remainingQuantity = parseInt(statusResponse.remains);
      }
    }

    // Atualizar o status do pedido no banco de dados
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        metadata: {
          ...order.metadata,
          provider_status: statusResponse.status,
          remaining_quantity: remainingQuantity,
          last_check: new Date().toISOString()
        }
      })
      .eq('id', order_id)
      .select();

    if (updateError) {
      console.error('Erro ao atualizar status do pedido:', updateError);
      return NextResponse.json({
        error: 'Failed to update order status',
        status: 'error'
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'success',
      order: updatedOrder[0],
      provider_status: statusResponse.status
    });
  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error);
    return NextResponse.json({
      error: 'Failed to check order status',
      details: error instanceof Error ? error.message : String(error),
      status: 'error'
    }, { status: 500 });
  }
}
