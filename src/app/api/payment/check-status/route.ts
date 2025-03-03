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

        // Verificar se a ordem já foi criada para esta transação
        if (supabaseTransaction.order_created) {
          console.log('⚠️ Ordem já foi criada para esta transação. Pulando criação de ordem.');
          
          // Verificar se existem ordens para esta transação
          const { data: existingOrders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('transaction_id', supabaseTransaction.id);
            
          if (ordersError) {
            console.error('❌ Erro ao verificar ordens existentes:', ordersError);
          } else {
            console.log(`ℹ️ Encontradas ${existingOrders?.length || 0} ordens para esta transação.`);
          }
          
          return NextResponse.json({
            payment: paymentData,
            status: paymentStatus,
            statusDetail: paymentStatusDetail,
            supabaseTransaction,
            ordersAlreadyCreated: true,
            existingOrders: existingOrders || []
          });
        }

        console.log('📦 Conteúdo completo da transação:', supabaseTransaction);

        // Buscar detalhes do serviço
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*, provider:providers(*)')
          .eq('id', supabaseTransaction.service_id)
          .single();

        if (serviceError || !serviceData) {
          console.error('❌ Serviço não encontrado:', {
            serviceId: supabaseTransaction.service_id,
            error: serviceError
          });
          throw new Error('Serviço não encontrado');
        }

        // Verificar se o serviço tem um provedor associado
        if (!serviceData.provider_id) {
          console.error('❌ Serviço não tem provedor associado:', serviceData);
          throw new Error('Serviço não tem provedor associado');
        }

        console.log('📦 Detalhes do serviço:', {
          id: serviceData.id,
          name: serviceData.name,
          provider_id: serviceData.provider_id,
          provider: serviceData.provider?.name || 'N/A'
        });
        
        // Parse dos metadados do serviço para obter os serviços
        let serviceMetadata = {};
        try {
          if (typeof serviceData.metadata === 'string') {
            serviceMetadata = JSON.parse(serviceData.metadata);
          } else if (serviceData.metadata && typeof serviceData.metadata === 'object') {
            serviceMetadata = serviceData.metadata;
          }
        } catch (parseError) {
          console.error('Erro ao fazer parse dos metadados do serviço:', parseError);
        }
        
        // Obter serviços do metadata ou usar o próprio serviço
        const services = serviceMetadata.services && serviceMetadata.services.length > 0 
          ? serviceMetadata.services 
          : [{ 
              id: serviceData.id, 
              external_id: serviceData.external_id,
              provider_id: serviceData.provider_id,
              quantity: supabaseTransaction.metadata?.service?.quantity || 1,
              amount: serviceData.price || 0
            }];
            
        console.log('📦 Serviços a processar:', services);
        
        // Extrair links de posts do metadata da transação
        let transactionMetadata = {};
        try {
          if (typeof supabaseTransaction.metadata === 'string') {
            transactionMetadata = JSON.parse(supabaseTransaction.metadata);
          } else if (supabaseTransaction.metadata && typeof supabaseTransaction.metadata === 'object') {
            transactionMetadata = supabaseTransaction.metadata;
          }
        } catch (parseError) {
          console.error('Erro ao fazer parse dos metadados da transação:', parseError);
        }
        
        // Obter posts do metadata e garantir que os links estejam no formato correto
        let postLinks = [];
        let originalPosts = [];
        
        // Verificar se temos posts no metadata
        if (transactionMetadata.posts && Array.isArray(transactionMetadata.posts)) {
          console.log('Posts encontrados no metadata:', transactionMetadata.posts);
          originalPosts = transactionMetadata.posts;
          
          postLinks = transactionMetadata.posts.map((post: any) => {
            // Garantir que estamos usando o código correto para o link
            // Priorizar o campo 'code' conforme as boas práticas
            const postCode = post.code || post.shortcode || post.id;
            console.log(`Processando post ${post.id}: código=${postCode}`);
            
            // Garantir que o link esteja no formato correto: https://instagram.com/p/{code}
            return `https://instagram.com/p/${postCode}`;
          });
        } else if (transactionMetadata.post_links && Array.isArray(transactionMetadata.post_links)) {
          // Compatibilidade com formato antigo
          console.log('Links de posts encontrados no formato antigo:', transactionMetadata.post_links);
          postLinks = transactionMetadata.post_links;
        } else {
          console.warn('Nenhum post encontrado no metadata da transação:', transactionMetadata);
        }
        
        if (postLinks.length === 0) {
          console.error('❌ Nenhum link de post encontrado para processar');
          throw new Error('Nenhum link de post encontrado para processar');
        }
        
        console.log('Links de posts extraídos:', postLinks);

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
              post_links: postLinks,
              original_posts: originalPosts,
              payment_data: {
                id: paymentData.id,
                status: paymentStatus,
                status_detail: paymentStatusDetail,
                date: new Date().toISOString()
              },
              processing_info: {
                created_at: new Date().toISOString(),
                processor: 'payment-check-status-api'
              }
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
              
              // Garantir que o link do Instagram esteja no formato correto
              const postLink = postLinks[i];
              console.log(`Criando ordem para post ${i+1}/${postsCount}: ${postLink} com ${postQuantity} unidades`);
              
              // Verificar se o link está no formato correto
              if (!postLink || !postLink.includes('instagram.com/p/')) {
                console.error(`❌ Link inválido para o post ${i+1}: ${postLink}`);
                throw new Error(`Link inválido para o post ${i+1}: ${postLink}`);
              }
              
              // Logs detalhados dos dados do serviço
              console.log(`🔄 Detalhes do serviço para ordem ${i+1}:`, {
                serviceId: service.id,
                providerId: service.provider_id,
                providerName: serviceData.provider?.name || 'N/A',
                serviceExternalId: service.external_id,
                quantity: postQuantity,
                link: postLink
              });
              
              const orderResponse = await socialMediaService.createOrder({
                service: service.external_id || service.id,
                provider_id: service.provider_id || serviceData.provider_id,
                link: postLink,
                quantity: postQuantity,
                username: supabaseTransaction.target_username,
                transaction_id: supabaseTransaction.id
              });
              
              console.log(`✅ Resposta da API para ordem ${i+1}:`, orderResponse);

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
                    post_link: postLink,
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
          .update({ 
            order_created: true,
            order_id: masterOrderData.id // Definir order_id para a ordem mestra
          })
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
