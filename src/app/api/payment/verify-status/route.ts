import { NextRequest, NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';
import { createOrUpdateCustomer } from '@/services/customerService';
import { SocialMediaService } from '@/lib/services/socialMediaService';

// Configuração do Mercado Pago
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN || '');

// Cache temporário para reduzir consultas ao Mercado Pago
// Formato: { paymentId: { status, timestamp } }
const statusCache: Record<string, { status: string, timestamp: number }> = {};

// Tempo de validade do cache em milissegundos (5 segundos)
const CACHE_TTL = 5000;

export async function POST(request: NextRequest) {
  try {
    const { payment_id } = await request.json();
    console.log('VERIFICANDO STATUS DE PAGAMENTO:', { payment_id });

    if (!payment_id) {
      console.error('Erro: Payment ID não fornecido');
      return NextResponse.json({
        error: 'Payment ID is required',
        status: 'error'
      }, { status: 400 });
    }

    // Verificar se temos um cache válido para este pagamento
    const now = Date.now();
    const cachedData = statusCache[payment_id];
    
    if (cachedData && (now - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Usando cache para payment_id ${payment_id}, status: ${cachedData.status}`);
      return NextResponse.json({
        status: cachedData.status,
        source: 'cache'
      });
    }

    const supabase = createClient();

    // Buscar transação no Supabase
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_external_reference', payment_id)
      .single();

    if (transactionError) {
      console.log('Transação não encontrada no Supabase, buscando no Mercado Pago');

      // Tentar buscar diretamente no Mercado Pago
      try {
        const paymentResponse = await mercadopago.payment.findById(payment_id);
        const paymentData = paymentResponse.body;

        console.log(`Status do pagamento (Mercado Pago direto): ${paymentData.status}`);

        // Armazenar no cache
        statusCache[payment_id] = {
          status: paymentData.status,
          timestamp: now
        };

        return NextResponse.json({
          status: paymentData.status,
          statusDetail: paymentData.status_detail,
          payment: paymentData,
          source: 'mercadopago_direct'
        });
      } catch (mpError) {
        console.error('Erro ao buscar pagamento no Mercado Pago:', mpError);
        return NextResponse.json({
          error: 'Payment not found',
          status: 'not_found'
        }, { status: 404 });
      }
    }

    // Se encontrou a transação no Supabase
    console.log('Transação encontrada no Supabase:', {
      id: transaction.id,
      status: transaction.status,
      payment_id: transaction.payment_external_reference
    });

    // Verificar status atual no Mercado Pago
    try {
      const paymentResponse = await mercadopago.payment.findById(payment_id);
      const paymentData = paymentResponse.body;
      const currentStatus = paymentData.status;

      console.log(`Status atual do pagamento (Mercado Pago): ${currentStatus}`);

      // Armazenar no cache
      statusCache[payment_id] = {
        status: currentStatus,
        timestamp: now
      };

      // Se o status mudou, atualizar no Supabase
      if (transaction.status !== currentStatus) {
        console.log('Status mudou:', {
          old: transaction.status,
          new: currentStatus
        });

        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: currentStatus,
            metadata: {
              ...transaction.metadata,
              payment_details: paymentData
            }
          })
          .eq('id', transaction.id);

        if (updateError) {
          console.error('Erro ao atualizar status da transação:', updateError);
        } else {
          console.log('Status da transação atualizado com sucesso no Supabase');

          // Se o pagamento foi aprovado, enviar pedido para o provedor
          if (currentStatus === 'approved' && transaction.status !== 'approved') {
            try {
              console.log('Pagamento aprovado! Enviando pedido para o provedor...');

              // Extrair dados do serviço da transação
              const serviceMetadata = transaction.metadata?.service;
              const posts = transaction.metadata?.posts;
              const profile = transaction.metadata?.profile;
              const customer = transaction.metadata?.customer;
              const email = transaction.customer_email || 
                           transaction.metadata?.customer?.email || 
                           transaction.metadata?.email || 
                           transaction.metadata?.contact?.email || 
                           transaction.metadata?.profile?.email;
              const customerName = transaction.customer_name || 
                                  transaction.metadata?.customer?.name || 
                                  transaction.metadata?.name;
              const target_username = transaction.target_username || 
                                     transaction.metadata?.target_username || 
                                     profile?.username || 
                                     transaction.metadata?.username;
              const phone = transaction.metadata?.customer?.phone || 
                           transaction.metadata?.phone || 
                           transaction.metadata?.contact?.phone;
                           
              console.log('Dados para criação de pedidos:', {
                serviceMetadata,
                posts: posts?.length,
                profile,
                customer,
                email,
                customerName,
                target_username,
                phone
              });
              
              // Buscar o serviço diretamente do banco de dados usando o service_id da transação
              // Isso garante que usamos sempre o provider_id correto e atualizado
              console.log(`Buscando serviço com ID: ${transaction.service_id}`);
              const { data: serviceData, error: serviceError } = await supabase
                .from('services')
                .select('*')
                .eq('id', transaction.service_id)
                .single();
                
              if (serviceError) {
                console.error('Erro ao buscar serviço:', serviceError);
                throw new Error(`Erro ao buscar serviço: ${serviceError.message}`);
              }
              
              if (!serviceData) {
                console.error(`Serviço com ID ${transaction.service_id} não encontrado`);
                throw new Error(`Serviço não encontrado. Verifique o ID do serviço na transação.`);
              }
              
              const service = serviceData;
              console.log('Serviço encontrado no banco de dados:', {
                id: service.id,
                name: service.name,
                provider_id: service.provider_id
              });
              
              // Criar ou atualizar cliente
              let customerId = null;
              if (email) {
                try {
                  const customerData = await createOrUpdateCustomer({
                    email,
                    name: customerName,
                    phone,
                    instagram_username: target_username,
                    metadata: {
                      transaction_id: transaction.id,
                      last_purchase: new Date().toISOString()
                    }
                  });
                  
                  if (customerData) {
                    customerId = customerData.id;
                    console.log('Cliente criado/atualizado com sucesso:', customerData);
                  }
                } catch (customerError) {
                  console.error('Erro ao criar/atualizar cliente:', customerError);
                }
              }
              
              // Buscar o provedor associado ao serviço
              let provider = null;
                  
              if (service.provider_id) {
                console.log(`Buscando provedor com ID: ${service.provider_id}`);
                
                // Verificar se o provider_id é um UUID válido
                const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(service.provider_id);
                
                if (!isUUID) {
                  console.error(`Provider_id "${service.provider_id}" não é um UUID válido.`);
                  throw new Error(`Provider ID inválido: ${service.provider_id}. Verifique o cadastro do serviço.`);
                }
                
                // Se for um UUID válido, buscar diretamente pelo ID
                const { data: providerData, error: providerError } = await supabase
                  .from('providers')
                  .select('*')
                  .eq('id', service.provider_id)
                  .single();
                
                if (providerError) {
                  console.error('Erro ao buscar provedor:', providerError);
                  throw new Error(`Erro ao buscar provedor: ${providerError.message}`);
                }
                
                if (!providerData) {
                  console.error(`Provedor com ID ${service.provider_id} não encontrado`);
                  throw new Error(`Provedor não encontrado para o serviço. Verifique o cadastro do serviço.`);
                }
                
                provider = providerData;
                console.log('Provedor encontrado:', provider.name);
              } else {
                console.error('Serviço não tem provider_id configurado');
                throw new Error('Serviço não tem provider_id configurado. Verifique o cadastro do serviço.');
              }
              
              if (service && posts && posts.length > 0 && profile) {
                // Atualizar a transação com o email para rastreabilidade
                if (email && (!transaction.metadata?.email)) {
                  await supabase
                    .from('transactions')
                    .update({
                      metadata: {
                        ...transaction.metadata,
                        email
                      }
                    })
                    .eq('id', transaction.id);
                }
                
                // Verificar se o usuário já existe e criar se não existir
                if (email) {
                  // Remover tentativa de criar perfil na tabela profiles
                  // Vamos trabalhar apenas com a tabela customers
                  console.log('Usando apenas a tabela customers para gerenciar usuários');
                }
                
                // Para cada post, criar um pedido separado
                const orderResults = [];
                for (const post of posts) {
                  try {
                    // Verificar se o post tem um link válido
                    if (!post.link) {
                      // Construir o link do post a partir do código
                      const postCode = post.code || post.shortcode || post.id;
                      if (postCode) {
                        post.link = `https://instagram.com/p/${postCode}`;
                        console.log('Link do post construído:', post.link);
                      } else {
                        console.error('Post sem código para construir link:', post);
                        orderResults.push({ success: false, error: 'Post sem código para construir link', post });
                        continue; // Pular este post
                      }
                    }
                    
                    let orderResponse;
                    
                    if (provider) {
                      // Verificar se o provedor tem uma API configurada
                      if (provider && provider.api_url && provider.api_key) {
                        console.log('Usando endpoint dinâmico de provedores');
                        
                        const orderRequest = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/providers/${provider.slug}/add-order`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            service: service.external_id || service.id,
                            link: post.link,
                            quantity: service.quantity,
                            transaction_id: transaction.id,
                            target_username: target_username,
                            user_id: transaction.user_id,
                            customer_id: customerId
                          }),
                        });
                        
                        try {
                          if (!orderRequest.ok) {
                            const errorText = await orderRequest.text();
                            console.error(`Erro na resposta do provedor (${orderRequest.status}): ${errorText}`);
                            
                            let errorData;
                            try {
                              // Tentar analisar o erro como JSON
                              errorData = JSON.parse(errorText);
                              console.error('Detalhes do erro:', errorData);
                            } catch (parseError) {
                              // Se não for JSON, usar o texto bruto
                              errorData = { error: errorText };
                            }
                            
                            throw new Error(`Erro ao enviar pedido para o provedor: ${JSON.stringify(errorData)}`);
                          }
                          
                          orderResponse = await orderRequest.json();
                        } catch (responseError) {
                          console.error(`Erro ao processar resposta do provedor: ${responseError.message}`);
                          throw new Error(`Erro ao processar pedido para o post: ${post.link} ${responseError.message}`);
                        }
                      } else {
                        // Provedor não tem API configurada, usar o SocialMediaService diretamente
                        console.log('Provedor não tem API configurada, usando SocialMediaService diretamente');
                        
                        const socialMediaService = new SocialMediaService(provider);
                        const orderResult = await socialMediaService.createOrder({
                          service: service.external_id || service.id,
                          link: post.link,
                          quantity: service.quantity,
                          provider_id: provider.id
                        });
                        
                        // Processar a resposta manualmente
                        orderResponse = {
                          order: {
                            id: orderResult.orderId,
                            status: orderResult.status,
                            provider_id: provider.id,
                            service_id: service.id
                          },
                          status: 'success'
                        };
                      }
                    } else {
                      // Não encontrou um provedor, retornar erro
                      console.error('Provedor não encontrado');
                      throw new Error('Provedor não encontrado para o serviço. Verifique o cadastro do serviço.');
                    }
                    
                    console.log('Pedido enviado com sucesso para o provedor:', orderResponse);
                    orderResults.push({ success: true, data: orderResponse, post });
                  } catch (orderError) {
                    console.error('Erro ao processar pedido para o post:', post.link, orderError);
                    orderResults.push({ success: false, error: String(orderError), post });
                  }
                }
                
                // Atualizar a transação com os resultados dos pedidos
                await supabase
                  .from('transactions')
                  .update({
                    metadata: {
                      ...transaction.metadata,
                      order_results: orderResults
                    }
                  })
                  .eq('id', transaction.id);
              } else {
                console.error('Dados insuficientes para criar pedido:', {
                  service,
                  posts,
                  profile
                });
              }
            } catch (providerError) {
              console.error('Erro ao enviar pedido para o provedor:', providerError);
            }
          }
        }
      } else {
        console.log('Status não mudou, continua como:', currentStatus);
      }
      
      return NextResponse.json({
        status: currentStatus,
        statusDetail: paymentData.status_detail,
        transaction: {
          id: transaction.id,
          status: currentStatus,
          amount: transaction.amount,
          created_at: transaction.created_at
        }
      });
    } catch (mpError) {
      console.error('Erro ao verificar status no Mercado Pago:', mpError);
      
      // Retornar o status atual do Supabase se não conseguir verificar no MP
      return NextResponse.json({
        status: transaction.status,
        transaction: {
          id: transaction.id,
          status: transaction.status,
          amount: transaction.amount,
          created_at: transaction.created_at
        },
        source: 'supabase_only'
      });
    }
  } catch (error) {
    console.error('Erro interno na verificação de status:', error);
    return NextResponse.json({
      error: 'Internal Server Error',
      details: String(error),
      status: 'error'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
