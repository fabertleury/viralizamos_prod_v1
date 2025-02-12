'use server';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { processTransaction } from '@/lib/famaapi';

export async function POST(request: Request) {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Webhook iniciado`);

  try {
    const body = await request.json();
    console.log('[Webhook] Payload recebido:', JSON.stringify(body, null, 2));

    if (body.type !== 'payment') {
      console.log('[Webhook] Não é um webhook de pagamento, ignorando');
      return NextResponse.json({ message: 'Not a payment webhook' });
    }

    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('[Webhook] Token do Mercado Pago não configurado');
      throw new Error('Token do Mercado Pago não configurado');
    }

    const client = new MercadoPagoConfig({ 
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN 
    });
    const payment = new Payment(client);

    // Buscar dados do pagamento
    console.log('[Webhook] Buscando dados do pagamento:', body.data.id);
    const paymentData = await payment.get({ id: body.data.id });
    console.log('[Webhook] Dados do pagamento:', JSON.stringify(paymentData, null, 2));

    // O status vem dentro do response
    const paymentStatus = paymentData.response?.status || paymentData.status;
    if (!paymentStatus) {
      console.error('[Webhook] Status do pagamento não encontrado');
      throw new Error('Status do pagamento não encontrado');
    }

    console.log('[Webhook] Status do pagamento:', paymentStatus);

    const supabase = createClient();

    // Buscar transação pelo payment_id
    console.log('[Webhook] Buscando transação para payment_id:', body.data.id);
    const { data: transactions, error: searchError } = await supabase
      .from('transactions')
      .select('*')
      .filter('metadata->payment->id', 'eq', body.data.id)
      .single();

    if (searchError) {
      console.error('[Webhook] Erro ao buscar transação:', searchError);
      throw searchError;
    }

    if (!transactions) {
      console.error('[Webhook] Transação não encontrada para payment_id:', body.data.id);
      return NextResponse.json(
        { message: 'Transaction not found' },
        { status: 404 }
      );
    }

    console.log('[Webhook] Transação encontrada:', JSON.stringify(transactions, null, 2));

    // Atualizar a transação no banco
    console.log('[Webhook] Atualizando status da transação para:', paymentStatus);
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: paymentStatus,
        metadata: {
          ...transactions.metadata,
          payment: {
            ...transactions.metadata.payment,
            status: paymentStatus,
            updated_at: new Date().toISOString()
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', transactions.id);

    if (updateError) {
      console.error('[Webhook] Erro ao atualizar transação:', updateError);
      throw updateError;
    }

    console.log('[Webhook] Transação atualizada com sucesso');

    // Se o pagamento foi aprovado, criar o pedido e processar na API do FAMA
    if (paymentStatus === 'approved') {
      console.log('[Webhook] Pagamento aprovado, processando pedido...');
      try {
        // Processar o pedido na API do FAMA
        const orderResult = await processTransaction(transactions.id);
        console.log('[Webhook] Pedido criado na API do FAMA:', orderResult);

        // Criar o pedido no banco
        const { error: orderError } = await supabase
          .from('orders')
          .insert({
            status: 'pending',
            amount: transactions.amount,
            payment_method: transactions.payment_method,
            payment_status: paymentStatus,
            transaction_id: transactions.id,
            service_id: transactions.service_id,
            user_id: transactions.user_id,
            metadata: {
              fama_order: orderResult
            }
          });

        if (orderError) {
          console.error('[Webhook] Erro ao criar pedido:', orderError);
          throw orderError;
        }

        console.log('[Webhook] Pedido criado com sucesso');
      } catch (error) {
        console.error('[Webhook] Erro ao processar pedido FAMA:', error);
        // Não vamos lançar o erro aqui para não impedir a atualização do status
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`[${endTime.toISOString()}] Webhook finalizado em ${duration}ms`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Webhook] Erro:', error);
    return NextResponse.json(
      { 
        message: error.message || 'Internal server error',
        details: error.response?.data || error
      },
      { status: 500 }
    );
  }
}
