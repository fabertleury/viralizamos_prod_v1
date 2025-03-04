import { createClient } from '@/lib/supabase/server';

/**
 * Extrai o código do post do Instagram a partir de um link
 */
export function extractPostCode(link: string): string | null {
  if (!link) return null;
  
  // Tenta extrair o código do post do formato completo da URL
  const postMatch = link.match(/instagram\.com\/p\/([^\/\?]+)/i);
  if (postMatch && postMatch[1]) {
    return postMatch[1];
  }
  
  // Tenta extrair o código do post do formato de URL curta
  const shortMatch = link.match(/instagr\.am\/p\/([^\/\?]+)/i);
  if (shortMatch && shortMatch[1]) {
    return shortMatch[1];
  }
  
  // Se a URL não parece ser de um post, pode ser um perfil
  const profileMatch = link.match(/instagram\.com\/([^\/\?]+)/i);
  if (profileMatch && profileMatch[1]) {
    // É um perfil, não um post
    return null;
  }
  
  // Verifica se o próprio link já é um código de post
  if (/^[A-Za-z0-9_-]{11}$/.test(link)) {
    return link;
  }
  
  return null;
}

/**
 * Formata um link do Instagram para o formato padrão
 */
export function formatInstagramLink(link: string): string | null {
  if (!link) return null;
  
  console.log('Link original recebido:', link);
  
  // Verifica se já é um link completo de um post do Instagram
  if (link.includes('instagram.com/p/')) {
    const postCode = extractPostCode(link);
    if (postCode) {
      console.log('Código do post extraído:', postCode);
      const formattedLink = `https://instagram.com/p/${postCode}`;
      console.log('Link formatado para post:', formattedLink);
      return formattedLink;
    }
  }
  
  // Verifica se é um nome de usuário ou link de perfil
  const usernameMatch = link.match(/instagram\.com\/([^\/\?]+)/i);
  let username = null;
  
  if (usernameMatch && usernameMatch[1]) {
    username = usernameMatch[1];
  } else if (!link.includes('instagram.com')) {
    // Se não tem instagram.com, pode ser apenas o nome de usuário
    username = link.startsWith('@') ? link.substring(1) : link;
  }
  
  if (username) {
    console.log('Username do Instagram detectado:', username);
    const formattedLink = `https://instagram.com/${username}`;
    console.log('Link formatado para perfil:', formattedLink);
    return formattedLink;
  }
  
  // Se chegou aqui, não conseguiu formatar o link
  console.error('Não foi possível formatar o link do Instagram:', link);
  return null;
}

/**
 * Envia um pedido para o provedor e registra na tabela orders
 */
export async function sendOrderToProvider(params: {
  transaction: any;
  service: any;
  provider: any;
  post: any;
  customer: any;
  formattedLink: string;
  quantity: number | string;
}) {
  const { transaction, service, provider, post, customer, formattedLink, quantity } = params;
  const supabase = createClient();
  
  // Preparar os dados para enviar para o provedor
  const providerRequestData = {
    key: provider.api_key,
    action: "add",
    service: service.external_id.toString(),
    link: formattedLink,
    quantity: quantity.toString()
  };
  
  console.log('Dados para o provedor:', providerRequestData);
  console.log('Enviando requisição para:', provider.api_url);
  
  try {
    // Enviar requisição para o provedor usando URLSearchParams (conforme MEMORY)
    const formData = new URLSearchParams();
    Object.entries(providerRequestData).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    
    const orderRequest = await fetch(provider.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: formData,
    });
    
    console.log('Status da resposta:', orderRequest.status);
    
    if (!orderRequest.ok) {
      const errorText = await orderRequest.text();
      console.error(`Erro na resposta do provedor (${orderRequest.status}): ${errorText}`);
      
      let errorData;
      try {
        // Tentar analisar o erro como JSON
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        // Se não for JSON, usar o texto bruto
        errorData = { error: errorText };
      }
      
      throw new Error(`Erro ao enviar pedido para o provedor: ${JSON.stringify(errorData)}`);
    }
    
    const responseData = await orderRequest.json();
    console.log('Resposta do provedor:', responseData);
    
    // Verificar a resposta do provedor
    if (responseData.error) {
      // Mapear erros conhecidos para mensagens amigáveis
      const errorMessages = {
        'neworder.error.not_enough_funds': 'Saldo insuficiente na conta do provedor. Por favor, entre em contato com o suporte.',
        'neworder.error.invalid_link': 'Link do Instagram inválido. Verifique se o link está correto.',
        'neworder.error.invalid_quantity': 'Quantidade inválida. Verifique se a quantidade está dentro dos limites permitidos.',
        'neworder.error.invalid_service': 'Serviço inválido. Verifique se o serviço está ativo.'
      };
      
      const errorMessage = errorMessages[responseData.error] || `Erro do provedor: ${responseData.error}`;
      console.error(`Erro na resposta do provedor: ${errorMessage}`);
      
      // Calcular o valor do pedido (quantidade * preço unitário)
      const unitPrice = service.preco || (service.service_variations && service.service_variations.length > 0 ? 
                      service.service_variations[0].preco : 0);
      const amount = parseFloat(quantity) * unitPrice;
      
      // Cadastrar o pedido na tabela orders mesmo com erro
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          transaction_id: transaction.id,
          service_id: service.id,
          customer_id: customer.id,
          target_username: post.username || (post.caption ? post.caption.substring(0, 50) : 'Unknown'),
          quantity: quantity,
          amount: amount || 0, // Garantir que amount não seja null
          status: 'failed', // Alterado de 'error' para 'failed' para compatibilidade com o enum
          payment_status: 'approved',
          payment_method: transaction.payment_method || 'pix',
          payment_id: transaction.payment_external_reference,
          metadata: {
            post,
            providerResponse: responseData,
            providerRequestData,
            formattedLink,
            error: errorMessage // Adicionando a mensagem de erro nos metadados
          }
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('Erro ao cadastrar pedido com erro:', orderError);
      } else {
        console.log('Pedido com erro cadastrado com sucesso:', orderData);
      }
      
      return {
        success: false,
        error: errorMessage,
        post,
        providerResponse: responseData,
        orderData
      };
    } else {
      // Se não houver erro, considerar como sucesso
      console.log('Pedido enviado com sucesso para o provedor:', responseData);
      
      // Calcular o valor do pedido (quantidade * preço unitário)
      const unitPrice = service.preco || (service.service_variations && service.service_variations.length > 0 ? 
                      service.service_variations[0].preco : 0);
      const amount = parseFloat(quantity) * unitPrice;
      
      // Cadastrar o pedido bem-sucedido na tabela orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          transaction_id: transaction.id,
          service_id: service.id,
          customer_id: customer.id,
          target_username: post.username || (post.caption ? post.caption.substring(0, 50) : 'Unknown'),
          quantity: quantity,
          amount: amount || 0, // Garantir que amount não seja null
          status: 'pending',
          payment_status: 'approved',
          payment_method: transaction.payment_method || 'pix',
          payment_id: transaction.payment_external_reference,
          external_order_id: responseData.order || null,
          metadata: {
            post,
            providerResponse: responseData,
            providerRequestData,
            formattedLink
          }
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('Erro ao cadastrar pedido:', orderError);
      } else {
        console.log('Pedido cadastrado com sucesso:', orderData);
      }
      
      return {
        success: true,
        order: responseData,
        post,
        orderData
      };
    }
  } catch (orderError) {
    console.error('Erro ao processar pedido:', orderError);
    
    // Calcular o valor do pedido (quantidade * preço unitário)
    const unitPrice = service.preco || (service.service_variations && service.service_variations.length > 0 ? 
                    service.service_variations[0].preco : 0);
    const amount = parseFloat(quantity) * unitPrice;
    
    // Cadastrar o pedido com erro na tabela orders
    const errorMessage = String(orderError);
    const { data: orderData, error: orderError2 } = await supabase
      .from('orders')
      .insert({
        transaction_id: transaction.id,
        service_id: service.id,
        customer_id: customer.id,
        target_username: post.username || (post.caption ? post.caption.substring(0, 50) : 'Unknown'),
        quantity: quantity,
        amount: amount || 0, // Garantir que amount não seja null
        status: 'failed', // Alterado de 'error' para 'failed' para compatibilidade com o enum
        payment_status: 'approved',
        payment_method: transaction.payment_method || 'pix',
        payment_id: transaction.payment_external_reference,
        metadata: {
          post,
          error: errorMessage,
          providerRequestData,
          formattedLink
        }
      })
      .select()
      .single();
    
    if (orderError2) {
      console.error('Erro ao cadastrar pedido com erro de requisição:', orderError2);
    } else {
      console.log('Pedido com erro de requisição cadastrado com sucesso:', orderData);
    }
    
    return {
      success: false,
      error: errorMessage,
      post,
      orderData
    };
  }
}
