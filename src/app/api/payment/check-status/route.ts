import { NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { payment_id } = await request.json();
    console.log('Checking payment status for:', payment_id);

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    // Configurar cliente do Mercado Pago
    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
      sandbox: process.env.MERCADOPAGO_SANDBOX === 'true'
    });

    // Buscar dados do pagamento
    const payment = await mercadopago.payment.get(payment_id);
    console.log('Payment data:', JSON.stringify(payment.body, null, 2));

    const paymentStatus = payment.body.status;

    // Buscar e atualizar transação no Supabase
    const supabase = createClient();
    const { data: transaction, error: searchError } = await supabase
      .from('transactions')
      .select('*')
      .filter('metadata->payment->id', 'eq', payment_id)
      .single();

    if (searchError) {
      console.error('Error searching transaction:', searchError);
      throw searchError;
    }

    if (!transaction) {
      console.error('Transaction not found for payment:', payment_id);
      return NextResponse.json(
        { message: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Se o status mudou, atualizar a transação
    if (transaction.status !== paymentStatus) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: paymentStatus,
          metadata: {
            ...transaction.metadata,
            payment: {
              ...transaction.metadata.payment,
              status: paymentStatus,
              updated_at: new Date().toISOString()
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
        throw updateError;
      }

      console.log('Transaction updated successfully');
    }

    return NextResponse.json({
      status: paymentStatus,
      status_detail: payment.body.status_detail,
      updated_at: payment.body.date_last_updated,
      transaction_id: transaction.id
    });
  } catch (error: any) {
    console.error('Error checking payment status:', error);
    return NextResponse.json(
      { 
        message: error.message || 'Error checking payment status',
        details: error.response?.data || error
      },
      { status: 500 }
    );
  }
}
