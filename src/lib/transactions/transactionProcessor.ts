import { createClient } from '@/lib/supabase/server';
import { SocialMediaService } from '@/lib/services/socialMediaService';

/**
 * Processa uma transação, criando pedidos nos provedores apropriados
 * @param transactionId ID da transação a ser processada
 * @returns Os pedidos criados
 */
async function processTransaction(transactionId: string) {
  console.log('[ProcessTransaction] Iniciando processamento:', transactionId);
  const startTime = new Date();
  const supabase = createClient();

  try {
    console.log('[ProcessTransaction] Buscando dados da transação...');
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        service:service_id (
          id,
          external_id,
          name,
          quantidade,
          type,
          provider_id,
          metadata
        ),
        user:user_id (
          id,
          email
        )
      `)
      .eq('id', transactionId)
      .single();

    if (transactionError) {
      console.error('[ProcessTransaction] Erro ao buscar transação:', transactionError);
      throw transactionError;
    }
    if (!transaction) {
      console.error('[ProcessTransaction] Transação não encontrada:', transactionId);
      throw new Error('Transação não encontrada');
    }

    console.log('[ProcessTransaction] Dados da transação:', JSON.stringify(transaction, null, 2));

    // Verificar se o usuário existe
    if (transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email) {
      console.log('[ProcessTransaction] Verificando cliente:', transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email);
      
      // Verificar se o cliente já existe
      const { data: existingCustomer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('email', transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email)
        .single();
      
      if (customerError && customerError.code !== 'PGSQL_ERROR_NO_DATA_FOUND') {
        console.error('[ProcessTransaction] Erro ao verificar cliente:', customerError);
      }
      
      let customerId = existingCustomer?.id;
      
      // Se o cliente não existe, criar novo
      if (!existingCustomer) {
        console.log('[ProcessTransaction] Criando cliente para usuário:', transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email);
        
        // Obter o nome de usuário do Instagram do perfil alvo
        const instagramUsername = transaction.target_username || 
                                  transaction.metadata?.profile?.username || 
                                  transaction.metadata?.target_username || 
                                  (transaction.metadata?.posts && transaction.metadata?.posts.length > 0 ? 
                                    transaction.metadata?.posts[0].username : '');
        
        console.log('[ProcessTransaction] Instagram username detectado:', instagramUsername);
        
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            email: transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email,
            name: transaction.customer_name || transaction.metadata?.profile?.full_name || transaction.metadata?.profile?.username || transaction.metadata?.target_username || (transaction.customer_email || transaction.metadata?.email || transaction.metadata?.contact?.email || transaction.metadata?.profile?.email || transaction.user?.email).split('@')[0],
            phone: transaction.customer_phone || transaction.metadata?.phone || transaction.metadata?.contact?.phone || '',
            instagram_username: instagramUsername
          })
          .select()
          .single();
        
        if (createError) {
          console.error('[ProcessTransaction] Erro ao criar cliente:', createError);
        } else {
          console.log('[ProcessTransaction] Cliente criado com sucesso:', newCustomer);
          customerId = newCustomer.id;
          
          // Atualizar a transação com o ID do cliente
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ customer_id: customerId })
            .eq('id', transactionId);
          
          if (updateError) {
            console.error('[ProcessTransaction] Erro ao atualizar transação com customer_id:', updateError);
          }
        }
      } else {
        console.log('[ProcessTransaction] Cliente encontrado:', existingCustomer);
        
        // Garantir que a transação tenha o customer_id correto
        if (!transaction.customer_id || transaction.customer_id !== customerId) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ customer_id: customerId })
            .eq('id', transactionId);
          
          if (updateError) {
            console.error('[ProcessTransaction] Erro ao atualizar transação com customer_id:', updateError);
          }
        }
      }
    }

    console.log('[ProcessTransaction] Verificando pedidos existentes...');
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('transaction_id', transactionId);

    if (existingOrders && existingOrders.length > 0) {
      console.log('[ProcessTransaction] Pedidos já existem:', existingOrders);
      
      // Garantir que a transação esteja marcada como tendo pedidos criados
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          order_created: true,
          order_id: existingOrders[0].id,
          user_id: existingOrders[0].user_id
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('[ProcessTransaction] Erro ao atualizar flag order_created:', updateError);
      } else {
        console.log('[ProcessTransaction] Flag order_created atualizado com sucesso');
      }
      
      return existingOrders;
    }

    // Obter o provedor correto para a transação
    async function getProviderForTransaction(transaction: any, supabase: any) {
      // Primeiro, verificar se temos um service_id na transação
      // Se sim, buscar o serviço diretamente do banco de dados para garantir que temos o provider_id correto
      if (transaction.service_id) {
        console.log('[GetProvider] Buscando serviço diretamente do banco de dados com ID:', transaction.service_id);
        
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', transaction.service_id)
          .single();
          
        if (serviceError) {
          console.error('[GetProvider] Erro ao buscar serviço:', serviceError);
        } else if (serviceData && serviceData.provider_id) {
          console.log('[GetProvider] Serviço encontrado no banco de dados com provider_id:', serviceData.provider_id);
          
          // Verificar se o provider_id é um UUID válido
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceData.provider_id);
          
          if (!isUUID) {
            console.error(`[GetProvider] Provider_id "${serviceData.provider_id}" do banco de dados não é um UUID válido.`);
          } else {
            // Buscar o provedor pelo ID
            const { data: provider, error } = await supabase
              .from('providers')
              .select('*')
              .eq('id', serviceData.provider_id)
              .single();
            
            if (error) {
              console.error('[GetProvider] Erro ao buscar provedor pelo ID do banco de dados:', error);
            } else if (provider) {
              console.log('[GetProvider] Provedor encontrado pelo ID do banco de dados:', provider.name);
              return provider;
            } else {
              console.error(`[GetProvider] Provedor com ID ${serviceData.provider_id} do banco de dados não encontrado`);
            }
          }
        } else {
          console.log('[GetProvider] Serviço encontrado no banco de dados, mas sem provider_id');
        }
      }
      
      // Se não conseguimos obter o provedor pelo service_id, tentar os métodos alternativos
      // Verificar se temos um provider_id na transação
      let providerId = null;
      
      // Buscar o provider_id de várias fontes possíveis
      if (transaction.service && transaction.service.provider_id) {
        providerId = transaction.service.provider_id;
        console.log('[GetProvider] Usando provider_id do serviço:', providerId);
      } else if (transaction.metadata?.service?.provider_id) {
        providerId = transaction.metadata.service.provider_id;
        console.log('[GetProvider] Usando provider_id do metadata do serviço:', providerId);
      } else if (transaction.metadata?.provider_id) {
        providerId = transaction.metadata.provider_id;
        console.log('[GetProvider] Usando provider_id do metadata da transação:', providerId);
      }
      
      // Se não temos um provider_id, retornar null
      if (!providerId) {
        console.log('[GetProvider] Nenhum provider_id encontrado na transação');
        return null;
      }
      
      // Verificar se o provider_id é um UUID válido
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providerId);
      
      if (!isUUID) {
        console.error(`[GetProvider] Provider_id "${providerId}" não é um UUID válido.`);
        return null;
      }
      
      // Buscar o provedor pelo ID
      const { data: provider, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', providerId)
        .single();
      
      if (error) {
        console.error('[GetProvider] Erro ao buscar provedor pelo ID:', error);
        return null;
      }
      
      if (!provider) {
        console.error(`[GetProvider] Provedor com ID ${providerId} não encontrado`);
        return null;
      }
      
      console.log('[GetProvider] Provedor encontrado:', provider.name);
      return provider;
    }

    // Buscar o provedor
    const provider = await getProviderForTransaction(transaction, supabase);
    
    if (!provider) {
      throw new Error('Provedor não encontrado para a transação');
    }
    
    console.log('[ProcessTransaction] Usando provedor:', provider.name);

    console.log('[ProcessTransaction] Tipo de serviço:', transaction.service.type);
    if (transaction.service.type === 'likes') {
      console.log('[ProcessTransaction] Posts para processar:', transaction.metadata?.posts || []);
      const posts = transaction.metadata?.posts || [];
      if (!posts.length) {
        console.error('[ProcessTransaction] Nenhum post selecionado para curtidas');
        throw new Error('Nenhum post selecionado para curtidas');
      }

      const orders = [];
      const quantityPerPost = transaction.service.quantidade;
      const amountPerPost = transaction.amount / posts.length;

      for (const post of posts) {
        try {
          console.log('[ProcessTransaction] Criando pedido para o post:', post);
          
          // Extrair o external_id do serviço se disponível
          let serviceId = null;
          if (transaction.service && transaction.service.external_id) {
            serviceId = transaction.service.external_id;
            console.log('[ProcessTransaction] Usando external_id do serviço:', serviceId);
          } else if (transaction.metadata?.service?.external_id) {
            serviceId = transaction.metadata.service.external_id;
            console.log('[ProcessTransaction] Usando external_id do metadata:', serviceId);
          } else if (transaction.service && transaction.service.id) {
            serviceId = transaction.service.id;
            console.log('[ProcessTransaction] Usando ID do serviço:', serviceId);
          } else if (transaction.metadata?.service?.id) {
            serviceId = transaction.metadata.service.id;
            console.log('[ProcessTransaction] Usando ID do serviço do metadata:', serviceId);
          }
          
          if (!serviceId) {
            console.error('[ProcessTransaction] ID do serviço não encontrado na transação:', transaction);
            throw new Error('ID do serviço não encontrado na transação');
          }
          
          // Verificar se o provedor tem API configurada
          if (provider && provider.api_url && provider.api_key) {
            console.log('[ProcessTransaction] Provedor tem API configurada, usando endpoint dinâmico');
            
            // Usar o endpoint dinâmico do provedor
            const params = new URLSearchParams({
              service: serviceId,
              link: post.url || post.link,
              quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
              transaction_id: transaction.id,
              target_username: transaction.metadata?.username || transaction.metadata?.profile?.username
            });
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/providers/${provider.slug}/add-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: params.toString(),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Erro ao enviar pedido para o provedor: ${JSON.stringify(errorData)}`);
            }
            
            const orderResponse = await response.json();
            console.log('[ProcessTransaction] Resposta do provedor:', orderResponse);
            
            // Adicionar o pedido à lista
            orders.push({
              success: true,
              data: orderResponse,
              post
            });
          } else {
            // Criar o serviço social media diretamente
            console.log('[ProcessTransaction] Provedor não tem API configurada, usando SocialMediaService diretamente');
            const socialMediaService = new SocialMediaService(provider);
            
            // Criar o pedido
            const orderResponse = await socialMediaService.createOrder({
              service: serviceId,
              link: post.url || post.link,
              quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
              provider_id: provider.id
            });
            
            console.log('[ProcessTransaction] Resposta do SocialMediaService:', orderResponse);
            
            // Adicionar o pedido à lista
            orders.push({
              success: true,
              data: {
                order: {
                  id: orderResponse.orderId,
                  status: orderResponse.status,
                  provider_id: provider.id,
                  service_id: serviceId
                },
                status: 'success'
              },
              post
            });
          }
        } catch (error) {
          console.error('[ProcessTransaction] Erro ao processar post:', post, error);
          throw error;
        }
      }

      console.log('[ProcessTransaction] Atualizando status da transação...');
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'processing',
          processed_at: new Date().toISOString(),
          user_id: orders[0].data.order.user_id,
          order_id: orders[0].data.order.id
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('[ProcessTransaction] Erro ao atualizar status da transação:', updateError);
        throw updateError;
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      console.log(`[ProcessTransaction] Finalizado em ${duration}ms. Pedidos criados:`, orders);

      return orders;
    } else {
      console.log('[ProcessTransaction] Processando pedido...');
      
      // Verificar se é um checkout de seguidores ou curtidas
      const checkoutType = transaction.metadata?.checkout_type || 'likes';
      console.log(`[ProcessTransaction] Tipo de checkout: ${checkoutType}`);
      
      // Para checkout de seguidores, usamos o perfil diretamente
      // Para curtidas, usamos os posts
      let targetLink = '';
      let username = '';
      
      if (checkoutType === 'followers') {
        username = transaction.target_username || transaction.metadata?.profile?.username;
        targetLink = transaction.target_profile_link || `https://instagram.com/${username}`;
        console.log(`[ProcessTransaction] Checkout de seguidores para: ${username}, link: ${targetLink}`);
      } else {
        // Para curtidas, verificamos se temos username nos posts ou no profile
        username = transaction.metadata?.profile?.username || 
                  (transaction.metadata?.posts && transaction.metadata?.posts.length > 0 ? 
                    transaction.metadata?.posts[0].username : transaction.target_username);
        
        if (!username) {
          console.error('[ProcessTransaction] Username não encontrado nos posts ou no profile');
          throw new Error('Username não encontrado nos posts ou no profile');
        }
        
        console.log(`[ProcessTransaction] Checkout de curtidas para: ${username}`);
        
        // Se temos posts, usamos o link do primeiro post
        if (transaction.metadata?.posts && transaction.metadata?.posts.length > 0) {
          const post = transaction.metadata.posts[0];
          targetLink = post.url || post.link || `https://instagram.com/p/${post.code}`;
        } else {
          // Caso não tenha posts, usamos o perfil como fallback
          targetLink = transaction.target_profile_link || `https://instagram.com/${username}`;
        }
        
        console.log(`[ProcessTransaction] Link do alvo: ${targetLink}`);
      }
      
      try {
        // Extrair o external_id do serviço se disponível
        let serviceId = null;
        if (transaction.service && transaction.service.external_id) {
          serviceId = transaction.service.external_id;
          console.log('[ProcessTransaction] Usando external_id do serviço:', serviceId);
        } else if (transaction.metadata?.service?.external_id) {
          serviceId = transaction.metadata.service.external_id;
          console.log('[ProcessTransaction] Usando external_id do metadata:', serviceId);
        } else if (transaction.service && transaction.service.id) {
          serviceId = transaction.service.id;
          console.log('[ProcessTransaction] Usando ID do serviço:', serviceId);
        } else if (transaction.metadata?.service?.id) {
          serviceId = transaction.metadata.service.id;
          console.log('[ProcessTransaction] Usando ID do serviço do metadata:', serviceId);
        }
        
        if (!serviceId) {
          console.error('[ProcessTransaction] ID do serviço não encontrado na transação:', transaction);
          throw new Error('ID do serviço não encontrado na transação');
        }
        
        // Verificar se o provedor tem API configurada
        if (provider && provider.api_url && provider.api_key) {
          console.log('[ProcessTransaction] Provedor tem API configurada, usando endpoint dinâmico');
          
          // Formatar o link do Instagram se for um link para o Instagram
          let formattedTargetLink = targetLink;
          if (targetLink.includes('instagram.com')) {
            // Extrair o código do post
            const postCode = targetLink.split('/p/')[1]?.split('/')[0]?.split('?')[0];
            if (postCode) {
              formattedTargetLink = `https://instagram.com/p/${postCode}`;
              console.log('[ProcessTransaction] Link formatado para o Instagram:', formattedTargetLink);
            }
          }
          
          // Preparar os dados para a requisição ao provedor
          const providerRequestData = {
            service: serviceId,
            link: formattedTargetLink,
            quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
            transaction_id: transaction.id,
            target_username: transaction.metadata?.username || transaction.metadata?.profile?.username
          };
          
          // Log detalhado para depuração
          console.log('[ProcessTransaction] Enviando para o provedor:');
          console.log(`service: ${serviceId}`);
          console.log(`link: ${formattedTargetLink}`);
          console.log(`quantity: ${transaction.service?.quantity || transaction.metadata?.service?.quantity}`);
          console.log(`transaction_id: ${transaction.id}`);
          console.log(`target_username: ${transaction.metadata?.username || transaction.metadata?.profile?.username}`);
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/api/providers/${provider.slug}/add-order`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(providerRequestData),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao enviar pedido para o provedor: ${JSON.stringify(errorData)}`);
          }

          const orderResponse = await response.json();
          console.log('[ProcessTransaction] Resposta do provedor:', orderResponse);
          
          console.log('[ProcessTransaction] Criando pedido no banco...');
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              transaction_id: transactionId,
              user_id: transaction.user_id,
              customer_id: transaction.customer_id,
              service_id: transaction.service_id,
              provider_id: provider.id,
              external_order_id: orderResponse.orderId,
              status: orderResponse.status || 'processing',
              amount: transaction.amount,
              quantity: transaction.service.quantidade,
              target_username: username,
              payment_status: transaction.status || 'pending',
              payment_method: transaction.payment_method || 'pix',
              payment_id: transaction.payment_id || transaction.external_id,
              metadata: {
                link: formattedTargetLink,
                provider: provider.slug,
                provider_name: provider.name,
                provider_service_id: serviceId,
                provider_order_id: orderResponse.orderId,
                provider_response: orderResponse,
                customer: {
                  name: transaction.customer_name || transaction.metadata?.customer?.name,
                  email: transaction.customer_email || transaction.metadata?.customer?.email,
                  phone: transaction.customer_phone || transaction.metadata?.customer?.phone
                }
              }
            })
            .select()
            .single();

          if (orderError) {
            console.error('[ProcessTransaction] Erro ao criar pedido no banco:', orderError);
            throw orderError;
          }

          console.log('[ProcessTransaction] Atualizando transação com order_id:', order.id);
          const { error: updateTransactionError } = await supabase
            .from('transactions')
            .update({
              order_created: true,
              order_id: order.id,
              status: 'processing',
              processed_at: new Date().toISOString()
            })
            .eq('id', transactionId);
          
          if (updateTransactionError) {
            console.error('[ProcessTransaction] Erro ao atualizar transação com order_id:', updateTransactionError);
          } else {
            console.log('[ProcessTransaction] Transação atualizada com order_id:', order.id);
          }

          const endTime = new Date();
          const duration = endTime.getTime() - startTime.getTime();
          console.log(`[ProcessTransaction] Finalizado em ${duration}ms. Pedido criado:`, order);

          return order;
        } else {
          // Criar o serviço social media diretamente
          console.log('[ProcessTransaction] Provedor não tem API configurada, usando SocialMediaService diretamente');
          const socialMediaService = new SocialMediaService(provider);
          
          // Criar o pedido
          const orderResponse = await socialMediaService.createOrder({
            service: serviceId,
            link: targetLink,
            quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
            provider_id: provider.id
          });
          
          console.log('[ProcessTransaction] Resposta do SocialMediaService:', orderResponse);
          
          console.log('[ProcessTransaction] Criando pedido no banco...');
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              transaction_id: transactionId,
              user_id: transaction.user_id,
              customer_id: transaction.customer_id,
              service_id: transaction.service_id,
              provider_id: provider.id,
              external_order_id: orderResponse.orderId,
              status: orderResponse.status || 'processing',
              amount: transaction.amount,
              quantity: transaction.service.quantidade,
              target_username: username,
              payment_status: transaction.status || 'pending',
              payment_method: transaction.payment_method || 'pix',
              payment_id: transaction.payment_id || transaction.external_id,
              metadata: {
                link: targetLink,
                provider: provider.slug,
                provider_name: provider.name,
                provider_service_id: serviceId,
                provider_order_id: orderResponse.orderId,
                provider_response: orderResponse,
                customer: {
                  name: transaction.customer_name || transaction.metadata?.customer?.name,
                  email: transaction.customer_email || transaction.metadata?.customer?.email,
                  phone: transaction.customer_phone || transaction.metadata?.customer?.phone
                }
              }
            })
            .select()
            .single();

          if (orderError) {
            console.error('[ProcessTransaction] Erro ao criar pedido no banco:', orderError);
            throw orderError;
          }

          console.log('[ProcessTransaction] Atualizando transação com order_id:', order.id);
          const { error: updateTransactionError } = await supabase
            .from('transactions')
            .update({
              order_created: true,
              order_id: order.id,
              status: 'processing',
              processed_at: new Date().toISOString()
            })
            .eq('id', transactionId);
          
          if (updateTransactionError) {
            console.error('[ProcessTransaction] Erro ao atualizar transação com order_id:', updateTransactionError);
          } else {
            console.log('[ProcessTransaction] Transação atualizada com order_id:', order.id);
          }

          const endTime = new Date();
          const duration = endTime.getTime() - startTime.getTime();
          console.log(`[ProcessTransaction] Finalizado em ${duration}ms. Pedido criado:`, order);

          return order;
        }
      } catch (error) {
        console.error('[ProcessTransaction] Erro ao processar pedido:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('[ProcessTransaction] Erro geral:', error);
    
    await supabase
      .from('transactions')
      .update({
        status: 'failed',
        metadata: {
          ...((await supabase.from('transactions').select('metadata').eq('id', transactionId).single()).data?.metadata || {}),
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      })
      .eq('id', transactionId);
    
    throw error;
  }
}

/**
 * Verifica o status de um pedido no provedor
 * @param orderId ID do pedido
 * @param providerId ID do provedor
 * @returns Status do pedido
 */
async function checkOrderStatus(orderId: string, providerId: string) {
  const supabase = createClient();
  
  try {
    // Buscar o provedor
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();
    
    if (providerError || !provider) {
      throw new Error(`Provedor com ID ${providerId} não encontrado`);
    }
    
    // Inicializar o serviço de mídia social com o provedor
    const socialMediaService = new SocialMediaService(provider);
    
    // Verificar o status do pedido
    return await socialMediaService.checkOrderStatus(parseInt(orderId, 10), providerId);
  } catch (error) {
    console.error('Erro ao verificar status do pedido:', error);
    throw error;
  }
}

/**
 * Atualiza o status de um pedido no banco de dados
 * @param orderId ID do pedido
 * @param status Novo status
 * @returns Pedido atualizado
 */
async function updateOrderStatus(orderId: string, status: string) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    throw error;
  }
}

export { processTransaction, checkOrderStatus, updateOrderStatus };
