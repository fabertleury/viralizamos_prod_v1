import { NextRequest, NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';
import { SocialMediaService } from '@/lib/services/socialMediaService';
import { processTransaction } from '@/lib/transactions/transactionProcessor';

// Configuração do Mercado Pago
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN || '');

export async function POST(request: NextRequest) {
  try {
    const { payment_id } = await request.json();
    console.log('Iniciando verificação de status de pagamento:', { payment_id });

    const supabase = createClient();
    const socialMediaService = new SocialMediaService();

    // Estratégias de busca no Supabase
    const searchStrategies = [
      () => supabase
        .from('transactions')
        .select('*')
        .eq('payment_external_reference', payment_id)
        .single(),
      
      () => supabase
        .from('transactions')
        .select('*')
        .eq('payment_id', payment_id)
        .single(),
      
      () => supabase
        .from('transactions')
        .select('*')
        .eq('id', payment_id)
        .single()
    ];

    let supabaseTransaction = null;
    let supabaseError = null;

    // Tentar estratégias de busca
    for (const strategy of searchStrategies) {
      const { data, error } = await strategy();
      
      if (data) {
        supabaseTransaction = data;
        break;
      }
      
      supabaseError = error;
    }

    console.log('Resultado da busca no Supabase:', { 
      transaction: supabaseTransaction, 
      error: supabaseError 
    });

    // Usar payment_external_reference se disponível
    const searchReference = supabaseTransaction?.payment_external_reference || payment_id;

    // Estratégias de busca no Mercado Pago
    let paymentResponse = null;
    const searchMethods = [
      async () => {
        try {
          const searchResponse = await mercadopago.payment.search({
            qs: { external_reference: searchReference }
          });
          return searchResponse.body.results?.[0] || null;
        } catch (error) {
          console.warn('Erro na busca por external reference:', error);
          return null;
        }
      },
      async () => {
        try {
          return await mercadopago.payment.findById(searchReference);
        } catch (error) {
          console.warn('Erro no findById:', error);
          return null;
        }
      },
      async () => {
        try {
          return await mercadopago.payment.get(searchReference);
        } catch (error) {
          console.warn('Erro no get:', error);
          return null;
        }
      }
    ];

    // Tentar métodos de busca do Mercado Pago
    for (const method of searchMethods) {
      paymentResponse = await method();
      
      if (paymentResponse) {
        console.log('Método de busca bem-sucedido');
        break;
      }
    }

    // Se nenhuma estratégia funcionar
    if (!paymentResponse) {
      console.error('Nenhum pagamento encontrado');
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
          .update({ 
            status: paymentStatus,
            status_payment: paymentStatus, // Adicionar status_payment para compatibilidade
            metadata: {
              ...supabaseTransaction.metadata,
              payment_details: paymentData
            }
          })
          .eq('id', supabaseTransaction.id);

        if (updateError) {
          console.error('Erro ao atualizar status da transação:', updateError);
        }
      } catch (updateError) {
        console.error('Erro ao tentar atualizar transação:', updateError);
      }
    }

    // Se o pagamento for aprovado, criar ordem
    if (paymentStatus === 'approved') {
      try {
        console.log('🔍 Processando transação aprovada:', {
          transactionId: supabaseTransaction.id,
          serviceId: supabaseTransaction.service_id,
          orderCreated: supabaseTransaction.order_created
        });

        // Processar a transação (criar pedidos)
        try {
          await processTransaction(supabaseTransaction.id);
          
          // Atualizar a transação para indicar que os pedidos foram criados
          const { error: updateOrderCreatedError } = await supabase
            .from('transactions')
            .update({
              order_created: true
            })
            .eq('id', supabaseTransaction.id);
          
          if (updateOrderCreatedError) {
            console.error('Erro ao atualizar flag order_created:', updateOrderCreatedError);
          }
        } catch (error) {
          console.error('Erro ao processar transação:', error);
          
          // Mesmo com erro, continuamos para retornar o status do pagamento
          // O erro será registrado no log e na transação
        }
      } catch (error) {
        console.error('🚨 Erro no processamento da ordem:', error);
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
