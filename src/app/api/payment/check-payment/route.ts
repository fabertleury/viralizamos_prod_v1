import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MercadoPagoConfig, Payment } from 'mercadopago';

// Verificar se as variáveis de ambiente existem
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_SERVICE_KEY não configurada');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const { payment_id } = await request.json();

    if (!payment_id) {
      return NextResponse.json(
        { message: 'ID do pagamento não informado' },
        { status: 400 }
      );
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
    });
    const payment = new Payment(client);

    // Buscar dados do pagamento
    const paymentData = await payment.get({ id: payment_id });
    console.log('Payment data:', paymentData);

    // O status vem dentro do response
    const paymentStatus = paymentData.response?.status || paymentData.status;
    if (!paymentStatus) {
      throw new Error('Status do pagamento não encontrado');
    }

    // Buscar transação pelo payment_id
    const { data: transactions, error: searchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('metadata->payment->id', payment_id);

    if (searchError) {
      console.error('Error searching transaction:', searchError);
      throw searchError;
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { message: 'Transação não encontrada' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];
    console.log('Transaction found:', transaction);

    // Atualizar a transação no banco
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: paymentStatus,
        metadata: {
          ...transaction.metadata,
          payment: {
            ...transaction.metadata?.payment,
            id: payment_id,
            status: paymentStatus,
            updated_at: new Date().toISOString()
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id)
      .select();

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      throw updateError;
    }

    // Se o pagamento foi aprovado e ainda não tem pedido, criar o pedido
    if (paymentStatus === 'approved' && !transaction.order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'pending',
          amount: transaction.amount,
          payment_method: transaction.payment_method,
          quantity: transaction.metadata?.service?.quantidade || 1,
          metadata: {
            customer: transaction.metadata.customer,
            service: transaction.metadata.service,
            profile: transaction.metadata.profile,
            posts: transaction.metadata.posts,
            payment: {
              id: paymentData.response?.id || paymentData.id,
              status: paymentStatus,
              created_at: new Date().toISOString()
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orderError) {
        console.error('Error creating order:', orderError);
        throw orderError;
      }

      // Atualizar a transação com o ID do pedido
      const { error: updateOrderError } = await supabase
        .from('transactions')
        .update({
          order_id: order.id,
          metadata: {
            ...transaction.metadata,
            order: {
              id: order.id,
              created_at: new Date().toISOString()
            }
          }
        })
        .eq('id', transaction.id);

      if (updateOrderError) {
        console.error('Error updating transaction with order:', updateOrderError);
        throw updateOrderError;
      }
    }

    return NextResponse.json({ 
      status: paymentStatus,
      message: 'Status do pagamento atualizado com sucesso'
    });
  } catch (error) {
    console.error('Error checking payment:', error);
    return NextResponse.json(
      { message: 'Erro ao verificar pagamento', error },
      { status: 500 }
    );
  }
}
