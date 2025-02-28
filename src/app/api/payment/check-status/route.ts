import { NextRequest, NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';
import { SocialMediaService } from '@/lib/services/socialMediaService';

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

        console.log('📦 Conteúdo completo da transação:', supabaseTransaction);

        // Buscar detalhes do serviço
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', supabaseTransaction.service_id)
          .single();

        if (serviceError || !serviceData) {
          console.error('❌ Serviço não encontrado:', {
            serviceId: supabaseTransaction.service_id,
            error: serviceError
          });
          throw new Error('Serviço não encontrado');
        }

        // Parse dos metadados do serviço
        const serviceMetadata = JSON.parse(serviceData.metadata || '{}');
        const services = serviceMetadata.services || [];

        // Extrair links de posts do metadata da transação
        const transactionMetadata = JSON.parse(supabaseTransaction.metadata || '{}');
        const postLinks = transactionMetadata.post_links || [];

        // Criar ordem mestra no Supabase
        const { data: masterOrderData, error: masterOrderError } = await supabase
          .from('orders')
          .insert({
            user_id: supabaseTransaction.user_id,
            service_id: supabaseTransaction.service_id,
            status: 'pending',
            quantity: services.reduce((total, service) => total + service.quantity, 0),
            amount: supabaseTransaction.amount,
            target_username: supabaseTransaction.target_username,
            payment_status: paymentStatus,
            payment_method: 'pix',
            payment_id: payment_id,
            transaction_id: supabaseTransaction.id,
            metadata: {
              service_details: serviceData,
              transaction_details: supabaseTransaction,
              services: services,
              post_links: postLinks
            }
          })
          .select()
          .single();

        if (masterOrderError) {
          console.error('❌ Erro ao criar ordem mestra:', masterOrderError);
          throw new Error('Erro ao criar ordem mestra');
        }

        // Criar sub-ordens para cada serviço e post
        const subOrders = [];
        for (const service of services) {
          // Calcular quantidade por post (distribuição uniforme)
          const postsCount = Math.min(postLinks.length, 5);
          const quantityPerPost = Math.floor(service.quantity / postsCount);
          const remainderQuantity = service.quantity % postsCount;

          for (let i = 0; i < postsCount; i++) {
            try {
              const postQuantity = quantityPerPost + (i < remainderQuantity ? 1 : 0);
              
              const orderResponse = await socialMediaService.createOrder({
                service: service.id,
                link: postLinks[i],
                quantity: postQuantity,
                username: supabaseTransaction.target_username
              });

              const { data: subOrderData, error: subOrderError } = await supabase
                .from('orders')
                .insert({
                  user_id: supabaseTransaction.user_id,
                  service_id: service.id,
                  status: 'processing',
                  quantity: postQuantity,
                  amount: (service.amount || 0) * (postQuantity / service.quantity),
                  target_username: supabaseTransaction.target_username,
                  payment_status: paymentStatus,
                  payment_method: 'pix',
                  payment_id: payment_id,
                  transaction_id: supabaseTransaction.id,
                  external_order_id: orderResponse.order,
                  parent_order_id: masterOrderData.id,
                  metadata: {
                    service_details: service,
                    post_link: postLinks[i],
                    external_order_response: orderResponse
                  }
                })
                .select()
                .single();

              if (subOrderError) {
                console.error('❌ Erro ao criar sub-ordem:', subOrderError);
                throw new Error('Erro ao criar sub-ordem');
              }

              subOrders.push(subOrderData);
            } catch (apiError) {
              console.error('❌ Erro na API de Serviços:', apiError);
              throw apiError;
            }
          }
        }

        // Atualizar ordem mestra com status final
        const { error: updateMasterOrderError } = await supabase
          .from('orders')
          .update({ 
            status: 'processing',
            external_order_id: subOrders.map(order => order.external_order_id).join(','),
            metadata: {
              ...masterOrderData.metadata,
              sub_orders: subOrders
            }
          })
          .eq('id', masterOrderData.id);

        if (updateMasterOrderError) {
          console.error('❌ Erro ao atualizar ordem mestra:', updateMasterOrderError);
        }

        // Marcar transação como processada
        const { error: transactionUpdateError } = await supabase
          .from('transactions')
          .update({ order_created: true })
          .eq('id', supabaseTransaction.id);

        if (transactionUpdateError) {
          console.error('❌ Erro ao atualizar transação:', transactionUpdateError);
        }

        console.log('🎉 Processamento concluído com sucesso', {
          masterOrderId: masterOrderData.id,
          subOrders: subOrders.map(order => order.id)
        });
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
