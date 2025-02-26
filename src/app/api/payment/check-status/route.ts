import { NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    // Configurar Mercado Pago com log adicional
    console.log('Mercado Pago Configuration:', {
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ? 'Present' : 'Missing',
      sandbox: process.env.MERCADOPAGO_SANDBOX
    });

    mercadopago.configure({
      access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
      sandbox: process.env.MERCADOPAGO_SANDBOX === 'true'
    });

    const { payment_id } = await request.json();

    console.log('Checking payment status for:', payment_id);
    console.log('Payment ID Details:', {
      type: typeof payment_id,
      length: payment_id?.length,
      isNull: payment_id === null,
      isUndefined: payment_id === undefined
    });

    if (!payment_id) {
      return NextResponse.json({ 
        error: 'Payment ID is required' 
      }, { status: 400 });
    }

    try {
      // Tentar múltiplos métodos de busca
      let paymentResponse;
      try {
        // Método 1: findById
        paymentResponse = await mercadopago.payment.findById(payment_id);
      } catch (findByIdError) {
        console.error('findById Error:', findByIdError);
        
        try {
          // Método 2: get
          paymentResponse = await mercadopago.payment.get(payment_id);
        } catch (getError) {
          console.error('get Error:', getError);
          
          // Método 3: Busca direta pela API
          const apiResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });

          if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('Direct API Error:', {
              status: apiResponse.status,
              body: errorBody
            });

            return NextResponse.json({ 
              error: 'Payment not found',
              details: errorBody,
              status: 'error'
            }, { status: 404 });
          }

          const apiPaymentData = await apiResponse.json();
          paymentResponse = { body: apiPaymentData };
        }
      }
      
      console.log('Raw Payment Response:', JSON.stringify(paymentResponse, null, 2));

      // Verificar se o pagamento existe
      if (!paymentResponse || !paymentResponse.body) {
        console.error('Payment not found:', payment_id);
        return NextResponse.json({ 
          error: 'Payment not found',
          status: 'not_found'
        }, { status: 404 });
      }

      const paymentData = paymentResponse.body;
      const paymentStatus = paymentData.status;

      // Buscar transação no Supabase
      const supabase = createClient();
      const { data: transaction, error: searchError } = await supabase
        .from('transactions')
        .select('*')
        .filter('metadata->payment->id', 'eq', payment_id)
        .single();

      if (searchError) {
        console.error('Supabase Transaction Search Error:', searchError);
      }

      // Atualizar status da transação se encontrada
      if (transaction && transaction.status !== paymentStatus) {
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
        }
      }

      // Extrair dados do QR Code
      const qrCodeText = paymentData.point_of_interaction?.transaction_data?.qr_code || '';
      const qrCodeBase64 = paymentData.point_of_interaction?.transaction_data?.qr_code_base64 || '';

      return NextResponse.json({
        id: paymentData.id,
        status: paymentStatus,
        status_detail: paymentData.status_detail,
        updated_at: paymentData.date_last_updated,
        transaction_id: transaction?.id,
        qrCodeText,
        qr_code_base64: qrCodeBase64
      });

    } catch (mercadoPagoError: any) {
      console.error('Mercado Pago API Error:', mercadoPagoError);

      // Log detalhado do erro
      console.error('Error Details:', {
        message: mercadoPagoError.message,
        name: mercadoPagoError.name,
        stack: mercadoPagoError.stack,
        response: mercadoPagoError.response ? JSON.stringify(mercadoPagoError.response) : 'No response',
        rawError: mercadoPagoError
      });

      // Tratamento específico para erros do Mercado Pago
      return NextResponse.json({ 
        error: 'Error fetching payment status',
        details: mercadoPagoError.message || 'Unknown error',
        status: 'error'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Unexpected error checking payment status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
}
