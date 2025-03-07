'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processTransaction } from '@/lib/transactions/transactionProcessor';

export async function POST(request: NextRequest) {
  console.log('[MercadoPagoWebhook] Recebendo notificação');
  
  try {
    const body = await request.json();
    console.log('[MercadoPagoWebhook] Corpo da requisição:', JSON.stringify(body, null, 2));

    // Verificar se é uma notificação de pagamento
    if (body.type !== 'payment') {
      console.log('[MercadoPagoWebhook] Ignorando notificação não relacionada a pagamento:', body.type);
      return NextResponse.json({ message: 'Notificação recebida, mas não é de pagamento' });
    }

    // Obter o ID do pagamento
    const paymentId = body.data?.id;
    if (!paymentId) {
      console.error('[MercadoPagoWebhook] ID de pagamento não encontrado na notificação');
      return NextResponse.json({ error: 'ID de pagamento não encontrado' }, { status: 400 });
    }

    console.log('[MercadoPagoWebhook] Consultando detalhes do pagamento:', paymentId);
    
    // Obter token de acesso do Mercado Pago
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('[MercadoPagoWebhook] Token de acesso do Mercado Pago não configurado');
      return NextResponse.json({ error: 'Configuração incompleta' }, { status: 500 });
    }

    // Consultar detalhes do pagamento na API do Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!paymentResponse.ok) {
      console.error('[MercadoPagoWebhook] Erro ao consultar pagamento:', await paymentResponse.text());
      return NextResponse.json({ error: 'Erro ao consultar pagamento' }, { status: 500 });
    }

    const paymentData = await paymentResponse.json();
    console.log('[MercadoPagoWebhook] Detalhes do pagamento:', JSON.stringify(paymentData, null, 2));

    // Verificar status do pagamento
    const status = paymentData.status;
    console.log('[MercadoPagoWebhook] Status do pagamento:', status);

    // Buscar a transação correspondente no banco de dados
    const supabase = createClient();
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_id', paymentId.toString());

    if (transactionError) {
      console.error('[MercadoPagoWebhook] Erro ao buscar transação:', transactionError);
      return NextResponse.json({ error: 'Erro ao buscar transação' }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      console.error('[MercadoPagoWebhook] Transação não encontrada para o pagamento:', paymentId);
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const transaction = transactions[0];
    console.log('[MercadoPagoWebhook] Transação encontrada:', transaction.id);

    // Mapear status do Mercado Pago para status da transação
    let transactionStatus;
    switch (status) {
      case 'approved':
        transactionStatus = 'completed';
        break;
      case 'pending':
        transactionStatus = 'pending';
        break;
      case 'in_process':
        transactionStatus = 'processing';
        break;
      case 'rejected':
        transactionStatus = 'failed';
        break;
      case 'cancelled':
        transactionStatus = 'cancelled';
        break;
      case 'refunded':
        transactionStatus = 'refunded';
        break;
      default:
        transactionStatus = 'unknown';
    }

    // Atualizar a transação com o novo status
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: transactionStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          payment_data: paymentData,
          email: paymentData.payer?.email || transaction.metadata?.email,
          customer_name: paymentData.payer?.first_name 
            ? `${paymentData.payer.first_name} ${paymentData.payer.last_name || ''}`
            : transaction.customer_name
        }
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('[MercadoPagoWebhook] Erro ao atualizar transação:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar transação' }, { status: 500 });
    }

    console.log('[MercadoPagoWebhook] Transação atualizada com status:', transactionStatus);

    // Se o pagamento foi aprovado, processar a transação
    if (status === 'approved' && transaction.status !== 'completed') {
      console.log('[MercadoPagoWebhook] Pagamento aprovado, processando transação...');
      
      // Atualizar os dados do cliente na transação
      if (paymentData.payer?.email) {
        const { error: customerUpdateError } = await supabase
          .from('transactions')
          .update({
            customer_email: paymentData.payer.email,
            customer_name: paymentData.payer.first_name 
              ? `${paymentData.payer.first_name} ${paymentData.payer.last_name || ''}`
              : transaction.customer_name
          })
          .eq('id', transaction.id);
        
        if (customerUpdateError) {
          console.error('[MercadoPagoWebhook] Erro ao atualizar dados do cliente:', customerUpdateError);
        } else {
          console.log('[MercadoPagoWebhook] Dados do cliente atualizados com sucesso');
        }
      }
      
      try {
        const result = await processTransaction(transaction.id);
        console.log('[MercadoPagoWebhook] Transação processada com sucesso:', result);
        return NextResponse.json({ message: 'Pagamento processado com sucesso', orderId: result.id });
      } catch (error) {
        console.error('[MercadoPagoWebhook] Erro ao processar transação:', error);
        return NextResponse.json({ error: 'Erro ao processar transação' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Notificação processada com sucesso' });
  } catch (error) {
    console.error('[MercadoPagoWebhook] Erro ao processar webhook:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook' }, { status: 500 });
  }
}
