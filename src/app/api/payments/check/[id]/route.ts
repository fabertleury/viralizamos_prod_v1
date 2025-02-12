import { NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

// Configurar Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  sandbox: process.env.MERCADOPAGO_SANDBOX === 'true'
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('Verificando status do pagamento:', id);

    // Buscar pagamento no Mercado Pago
    const payment = await mercadopago.payment.get(Number(id));
    console.log('Payment data:', JSON.stringify(payment, null, 2));

    if (!payment) {
      throw new Error('Pagamento não encontrado');
    }

    const paymentStatus = payment.response.status;
    console.log('Payment status:', paymentStatus);

    // Buscar e atualizar transação no Supabase
    const supabase = createClient();
    const { data: transaction, error: searchError } = await supabase
      .from('transactions')
      .select('*')
      .filter('metadata->payment->id', 'eq', id)
      .single();

    if (searchError) {
      console.error('Error searching transaction:', searchError);
      throw searchError;
    }

    if (!transaction) {
      console.error('Transaction not found for payment:', id);
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
