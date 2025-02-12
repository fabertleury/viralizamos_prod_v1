import { NextRequest, NextResponse } from 'next/server';
import mercadopago from 'mercadopago';

// Configurar Mercado Pago
const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!accessToken) {
  console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
}

console.log('Inicializando Mercado Pago com token:', accessToken ? 'Token configurado' : 'Token não encontrado');

mercadopago.configure({
  access_token: accessToken!,
  sandbox: process.env.MERCADOPAGO_SANDBOX === 'true'
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Recebido request:', body);

    const { 
      amount, 
      email = 'test@test.com', 
      description = 'Pagamento Viralizai',
      payer_document = '19119119100'
    } = body;

    // Validações
    if (!amount) {
      console.log('Erro: Valor não informado');
      return NextResponse.json({
        message: 'Valor do pagamento é obrigatório',
        details: 'O valor do pagamento não foi informado'
      }, { status: 400 });
    }

    if (amount < 5) {
      console.log('Erro: Valor menor que R$ 5,00:', amount);
      return NextResponse.json({
        message: 'Valor mínimo de R$ 5,00',
        details: 'O valor do pagamento deve ser maior ou igual a R$ 5,00'
      }, { status: 400 });
    }

    if (!accessToken) {
      console.error('Erro: Token do Mercado Pago não configurado');
      return NextResponse.json({
        message: 'Erro de configuração',
        details: 'Token do Mercado Pago não configurado. Entre em contato com o suporte.'
      }, { status: 500 });
    }

    console.log('Criando pagamento PIX:', { amount, email, description });

    const payment = await mercadopago.payment.create({
      transaction_amount: Number(amount),
      description: description,
      payment_method_id: 'pix',
      payer: {
        email: email,
        identification: payer_document ? {
          type: 'CPF',
          number: payer_document
        } : undefined
      }
    });

    console.log('Resposta do Mercado Pago:', JSON.stringify(payment, null, 2));

    // Verificar status do pagamento
    if (payment.status === 'rejected') {
      let message = 'Pagamento rejeitado pelo Mercado Pago';
      let details = payment.status_detail;

      switch (payment.status_detail) {
        case 'rejected_high_risk':
          message = 'Pagamento rejeitado por risco elevado';
          details = 'Por favor, tente novamente mais tarde ou entre em contato com o suporte';
          break;
        case 'cc_rejected_insufficient_amount':
          message = 'Saldo insuficiente';
          details = 'Verifique o saldo da sua conta';
          break;
        default:
          message = 'Erro no processamento do pagamento';
          details = 'Por favor, tente novamente';
      }

      console.log('Pagamento rejeitado:', { message, details, status: payment.status, status_detail: payment.status_detail });

      return NextResponse.json({
        message,
        details,
        status: payment.status,
        status_detail: payment.status_detail
      }, { status: 400 });
    }

    // Extrair dados do QR Code
    const qrCodeData = payment.point_of_interaction?.transaction_data;
    
    if (!qrCodeData?.qr_code || !qrCodeData?.qr_code_base64) {
      console.log('Erro: QR Code não gerado:', payment);
      return NextResponse.json({
        message: 'Erro ao gerar QR Code',
        details: 'Os dados do QR Code não foram gerados corretamente',
        data: payment
      }, { status: 400 });
    }

    const response = {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      point_of_interaction: {
        transaction_data: {
          qr_code: qrCodeData.qr_code,
          qr_code_base64: qrCodeData.qr_code_base64,
          ticket_url: qrCodeData.ticket_url
        }
      }
    };

    console.log('Resposta final:', response);
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Erro ao criar pagamento:', error);
    
    // Tentar extrair mais detalhes do erro
    let errorDetails = error.message;
    if (error.response) {
      console.error('Detalhes da resposta de erro:', {
        status: error.response.status,
        data: error.response.data
      });
      errorDetails = error.response.data?.message || error.message;
    }
    
    return NextResponse.json({
      message: 'Erro ao processar pagamento',
      details: errorDetails,
      error: error
    }, { status: 500 });
  }
}
