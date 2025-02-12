import { NextRequest, NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

// Configurar Mercado Pago
mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  sandbox: process.env.MERCADOPAGO_SANDBOX === 'true'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, payer_email, service_id, user_id } = body;

    console.log('Criando pagamento PIX:', { amount, description, payer_email });

    const payment = await mercadopago.payment.create({
      transaction_amount: Number(amount),
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: payer_email,
      }
    });

    console.log('Resposta do Mercado Pago:', payment);

    // Criar transação no Supabase
    const supabase = createClient();
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        amount: Number(amount),
        payment_method: 'pix',
        status: payment.status,
        service_id: service_id,
        user_id: user_id,
        metadata: {
          payment: {
            id: payment.id,
            status: payment.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          pix: {
            qr_code: payment.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: payment.point_of_interaction.transaction_data.qr_code_base64
          }
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Erro ao criar transação:', transactionError);
      throw new Error('Erro ao criar transação no banco de dados');
    }

    const responseData = {
      id: payment.id,
      status: payment.status,
      transaction_id: transaction.id,
      qr_code: payment.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: payment.point_of_interaction.transaction_data.qr_code_base64
    };

    console.log('Dados retornados:', responseData);

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Erro ao criar pagamento PIX:', error);
    return new NextResponse(JSON.stringify({
      message: error.message || 'Erro ao criar pagamento PIX',
      details: error.response?.data || error
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
