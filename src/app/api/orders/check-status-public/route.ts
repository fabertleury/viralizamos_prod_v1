import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrderStatus } from '@/lib/famaapi';

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

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.error('[CheckOrderStatusPublic] Usuário não encontrado:', userError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Buscar o pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('external_order_id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      console.error('[CheckOrderStatusPublic] Pedido não encontrado:', orderError);
      return NextResponse.json(
        { error: 'Order not found or does not belong to this user' },
        { status: 404 }
      );
    }

    // Verificar o status no provedor
    try {
      const statusResponse = await getOrderStatus(orderId);
      console.log('[CheckOrderStatusPublic] Status do provedor:', statusResponse);

      // Atualizar o status no banco de dados
      const providerStatus = {
        status: statusResponse.data.status,
        start_count: statusResponse.data.start_count,
        remains: statusResponse.data.remains,
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
