import { createClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createRefill } from '@/lib/famaapi';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const cookieStore = cookies();

    // Verificar sessão
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Extrair dados do request
    const { orderId } = await request.json();
    if (!orderId) {
      return Response.json({ error: 'ID do pedido é obrigatório' }, { status: 400 });
    }

    // Buscar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', session.user.id)
      .single();

    if (orderError) throw orderError;
    if (!order) {
      return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Criar reposição na API do Fama
    const refillResponse = await createRefill(order.external_order_id);

    // Registrar reposição no banco
    const { data: refill, error: refillError } = await supabase
      .from('refills')
      .insert({
        order_id: orderId,
        user_id: session.user.id,
        external_refill_id: refillResponse.refill,
        status: 'pending',
        metadata: {
          provider: 'fama',
          provider_order_id: order.external_order_id,
          provider_refill_id: refillResponse.refill
        }
      })
      .select()
      .single();

    if (refillError) throw refillError;

    return Response.json(refill);
  } catch (error) {
    console.error('Erro ao criar reposição:', error);
    return Response.json(
      { error: 'Erro ao processar reposição' },
      { status: 500 }
    );
  }
}
