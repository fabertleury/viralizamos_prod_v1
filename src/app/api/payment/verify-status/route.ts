import { NextRequest, NextResponse } from 'next/server';
import mercadopago from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

// Configuração do Mercado Pago
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN || '');

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
              const service = transaction.metadata?.service;
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
              console.log('Dados para criação de pedidos:', {
                service,
                posts: posts?.length,
                profile,
                customer,
                email,
                customerName,
                target_username
              });
              
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
                  const { data: existingUser, error: userError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('email', email)
                    .single();
                  
                  if (userError) {
                    console.log('Usuário não encontrado, criando perfil...');
                    
                    // Criar perfil do usuário
                    const { error: createError } = await supabase
                      .from('profiles')
                      .insert({
                        email,
                        name: customerName || '',
                        role: 'customer',
                        active: true,
                        user_id: transaction.user_id
                      });
                    
                    if (createError) {
                      console.error('Erro ao criar perfil do usuário:', createError);
                    } else {
                      console.log('Perfil do usuário criado com sucesso com role "customer"');
                    }
                  } else {
                    console.log('Usuário já existe no sistema:', existingUser);
                    
                    // Se o usuário existe mas não tem role, atualizar para 'customer'
                    if (!existingUser.role) {
                      const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ role: 'customer' })
                        .eq('id', existingUser.id);
                        
                      if (updateError) {
                        console.error('Erro ao atualizar role do usuário:', updateError);
                      } else {
                        console.log('Role do usuário atualizada para "customer"');
                      }
                    }
                  }
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
                    
                    console.log('Tentando enviar pedido para:', `${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/providers/fama-redes/add-order`);     
                    console.log('Dados do pedido:', {
                      service: service.fama_id,
                      link: post.link,
                      quantity: service.quantity,
                      transaction_id: transaction.id,
                      target_username
                    });
                    
                    const orderResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/providers/fama-redes/add-order`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        service: service.fama_id,
                        link: post.link,
                        quantity: service.quantity,
                        transaction_id: transaction.id,
                        target_username: target_username
                      }),
                    });
                    
                    if (!orderResponse.ok) {
                      const errorData = await orderResponse.json();
                      console.error('Erro ao enviar pedido para o provedor:', errorData);
                      orderResults.push({ success: false, error: errorData, post });
                    } else {
                      const orderData = await orderResponse.json();
                      console.log('Pedido enviado com sucesso para o provedor:', orderData);
                      orderResults.push({ success: true, data: orderData, post });
                    }
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
