import { NextRequest, NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

// Configuração do Mercado Pago
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN || '');

export async function POST(request: NextRequest) {
  try {
    const { payment_id } = await request.json();
    console.log('Iniciando verificação de status de pagamento:', { payment_id });

    const supabase = createClient();

    // Estratégias de busca no Supabase
    const searchStrategies = [
      () => supabase
        .from('transactions')
        .select('*')
        .or(
          `payment_external_reference.eq.${payment_id},` +
          `external_reference.eq.${payment_id},` +
          `metadata->payment->id.eq.${payment_id}`
        )
        .single(),
      
      // Fallback para busca mais flexível
      () => supabase
        .from('transactions')
        .select('*')
        .or(
          `payment_external_reference.ilike.%${payment_id}%,` +
          `external_reference.ilike.%${payment_id}%`
        )
        .single()
    ];

    let supabaseTransaction = null;
    let supabaseError = null;

    // Tentar estratégias de busca
    for (const strategy of searchStrategies) {
      const result = await strategy();
      
      if (result.data) {
        supabaseTransaction = result.data;
        break;
      }
      
      supabaseError = result.error;
    }

    console.log('Resultado da busca no Supabase:', { 
      transaction: supabaseTransaction, 
      error: supabaseError 
    });

    // Estratégias de busca no Mercado Pago
    let paymentResponse;
    const searchMethods = [
      () => mercadopago.payment.findById(payment_id),
      () => mercadopago.payment.search({ qs: { external_reference: payment_id } }),
      () => mercadopago.payment.get(payment_id)
    ];

    for (const method of searchMethods) {
      try {
        paymentResponse = await method();
        
        if (paymentResponse) {
          console.log('Método de busca bem-sucedido:', method.name);
          break;
        }
      } catch (error) {
        console.warn(`Erro no método ${method.name}:`, error);
      }
    }

    // Se nenhuma estratégia funcionar
    if (!paymentResponse) {
      console.error('Nenhum pagamento encontrado por nenhuma estratégia');
      return NextResponse.json({
        error: 'Payment not found',
        details: 'Could not locate payment through any search method',
        supabaseTransaction,
        supabaseError,
        status: 'not_found'
      }, { status: 404 });
    }

    // Processamento do status do pagamento
    const paymentData = paymentResponse.body || paymentResponse;
    const paymentStatus = paymentData.status || 'unknown';
    const paymentStatusDetail = paymentData.status_detail || 'No additional details';

    console.log('Status final do pagamento:', { 
      status: paymentStatus, 
      statusDetail: paymentStatusDetail 
    });

    // Atualizar status da transação no Supabase, se encontrada
    if (supabaseTransaction && supabaseTransaction.status !== paymentStatus) {
      try {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status: paymentStatus })
          .eq('id', supabaseTransaction.id);

        if (updateError) {
          console.error('Erro ao atualizar status da transação:', updateError);
        }
      } catch (updateError) {
        console.error('Erro ao tentar atualizar transação:', updateError);
      }
    }

    return NextResponse.json({
      payment: paymentData,
      status: paymentStatus,
      statusDetail: paymentStatusDetail,
      supabaseTransaction
    });

  } catch (error) {
    console.error('Erro interno na verificação de status:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: String(error),
      status: 'error'
    }, { status: 500 });
  }
}
