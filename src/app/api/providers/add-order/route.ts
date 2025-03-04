import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Função padronizada para extrair o código do post do Instagram
function extractPostCode(link: string | undefined): string | null {
  if (!link) return null;
  
  // Se já for um código direto (não uma URL)
  if (link && !link.includes('http') && !link.includes('/')) {
    return link;
  }
  
  try {
    // Extrair o código da URL do post
    if (link.includes('instagram.com/p/')) {
      const postCode = link.split('/p/')[1]?.split('/')[0]?.split('?')[0];
      if (postCode) return postCode;
    }
    
    // Extrair o código da URL do reel
    if (link.includes('instagram.com/reel/')) {
      const postCode = link.split('/reel/')[1]?.split('/')[0]?.split('?')[0];
      if (postCode) return postCode;
    }
    
    // Extrair o código de URLs curtas do Instagram
    if (link.includes('instagr.am/p/')) {
      const postCode = link.split('/p/')[1]?.split('/')[0]?.split('?')[0];
      if (postCode) return postCode;
    }
    
    // Extrair o código de URLs com www
    if (link.includes('www.instagram.com/')) {
      if (link.includes('/p/')) {
        const postCode = link.split('/p/')[1]?.split('/')[0]?.split('?')[0];
        if (postCode) return postCode;
      }
      if (link.includes('/reel/')) {
        const postCode = link.split('/reel/')[1]?.split('/')[0]?.split('?')[0];
        if (postCode) return postCode;
      }
    }
    
    // Tentar extrair o código de qualquer formato de URL que tenha um padrão /CÓDIGO/
    const matches = link.match(/\/([A-Za-z0-9_-]{11})(?:\/|\?|$)/);
    if (matches && matches[1]) {
      return matches[1];
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao extrair código do post:', error);
    return null;
  }
}

// Formatar o link do Instagram corretamente
function formatInstagramLink(link: string | undefined): string | null {
  if (!link) return null;
  
  // Se o link já for um código direto (não uma URL), retornar como está
  if (link && !link.includes('http') && !link.includes('/')) {
    return link;
  }
  
  try {
    // Limpar o link de qualquer parâmetro ou fragmento
    let cleanLink = link.split('?')[0].split('#')[0];
    
    // Remover a barra final se existir
    if (cleanLink.endsWith('/')) {
      cleanLink = cleanLink.slice(0, -1);
    }
    
    // Para links do Instagram, manter o formato original mas garantir que seja válido
    if (cleanLink.includes('instagram.com')) {
      // Extrair o código do post
      const code = extractPostCode(cleanLink);
      if (code) {
        // Retornar o link no formato padrão esperado pelos provedores
        return `https://instagram.com/p/${code.trim()}`;
      }
    }
    
    // Se não for um link do Instagram ou não conseguimos extrair o código, retornar o link original
    return cleanLink;
  } catch (error) {
    console.error('Erro ao formatar link:', error);
    return link; // Retornar o link original em caso de erro
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const data = await request.json();
    
    // Validar dados necessários
    if (!data.service || !data.link) {
      return NextResponse.json({ error: 'Dados incompletos. Serviço e link são obrigatórios.' }, { status: 400 });
    }
    
    const service = data.service;
    const quantity = data.quantity || 1;
    const link = data.link;
    const transaction_id = data.transaction_id;
    const target_username = data.target_username;
    const user_id = data.user_id;
    const customer_id = data.customer_id;
    
    // Buscar o serviço para obter o provider_id
    let provider = data.provider;
    
    // Se o provider não foi fornecido, buscar do serviço
    if (!provider) {
      console.log('Buscando informações do serviço para obter o provider_id:', service.id);
      
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*, provider:providers(*)')
        .eq('id', service.id)
        .single();
      
      if (serviceError) {
        console.error('Erro ao buscar serviço:', serviceError);
        return NextResponse.json({ error: `Erro ao buscar serviço: ${serviceError.message}` }, { status: 500 });
      }
      
      // Verificar se o serviço tem um provedor no metadata
      if (serviceData.metadata && serviceData.metadata.provider) {
        provider = serviceData.metadata.provider;
        console.log('Provedor encontrado no metadata do serviço:', provider.name);
      } 
      // Se não tem no metadata, usar o provider do serviço
      else if (serviceData.provider) {
        provider = serviceData.provider;
        console.log('Provedor encontrado no relacionamento do serviço:', provider.name);
      }
      // Se não tem provider, buscar pelo provider_id
      else if (serviceData.provider_id) {
        const { data: providerData, error: providerError } = await supabase
          .from('providers')
          .select('*')
          .eq('id', serviceData.provider_id)
          .single();
        
        if (providerError) {
          console.error('Erro ao buscar provedor:', providerError);
          return NextResponse.json({ error: `Erro ao buscar provedor: ${providerError.message}` }, { status: 500 });
        }
        
        provider = providerData;
        console.log('Provedor encontrado pelo provider_id:', provider.name);
      }
    }
    
    if (!provider) {
      return NextResponse.json({ error: 'Provedor não encontrado para o serviço.' }, { status: 400 });
    }
    
    console.log('Processando pedido para provedor:', provider.name);
    console.log('Dados do pedido:', { service, quantity, link, transaction_id, target_username });
    
    // Determinar qual API do provedor usar
    const apiUrl = provider.api_url;
    const apiKey = provider.api_key;
    
    if (!apiUrl || !apiKey) {
      return NextResponse.json({ error: 'Configuração de provedor incompleta.' }, { status: 400 });
    }
    
    // Preparar os dados para o provedor
    const providerRequestData = {
      key: apiKey,
      action: 'add',
      service: service.external_id || service,
      link: link,
      quantity: quantity
    };
    
    console.log('Enviando pedido para o provedor:', apiUrl);
    
    // Verificar se o link é para um post do Instagram e garantir que esteja no formato correto
    const originalLink = link;
    const formattedLink = formatInstagramLink(link);
    if (formattedLink) {
      console.log(`Link formatado: ${originalLink} -> ${formattedLink}`);
      providerRequestData.link = formattedLink;
    } else {
      console.error(`Não foi possível formatar o link: ${originalLink}`);
    }
    
    // Mostrar os dados exatos que serão enviados para o provedor
    console.log('Dados para o provedor:', providerRequestData);
    
    // Criar os parâmetros no mesmo formato que o exemplo PHP
    const params = new URLSearchParams();
    Object.entries(providerRequestData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    
    console.log('Dados codificados para o provedor:', params.toString());
    
    // Enviar pedido para o provedor usando URLSearchParams para application/x-www-form-urlencoded
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)'
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro na resposta do provedor (${response.status}): ${errorText}`);
      
      let errorMessage = `Erro ao enviar pedido para o provedor (${response.status})`;
      
      try {
        // Tentar analisar o erro como JSON
        const errorData = JSON.parse(errorText);
        errorMessage = `Erro ao enviar pedido para o provedor: ${JSON.stringify(errorData)}`;
        console.error('Detalhes do erro:', errorData);
      } catch (parseError) {
        // Se não for JSON, usar o texto bruto
        errorMessage = `Erro ao enviar pedido para o provedor: ${errorText}`;
      }
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
    
    let responseData;
    try {
      responseData = await response.json();
      console.log('Resposta do provedor:', JSON.stringify(responseData, null, 2));
    } catch (jsonError) {
      const textResponse = await response.text();
      console.error('Erro ao analisar resposta JSON do provedor:', jsonError);
      console.log('Resposta em texto:', textResponse);
      return NextResponse.json({ error: `Resposta inválida do provedor: ${textResponse}` }, { status: 500 });
    }
    
    if (!responseData.order) {
      throw new Error(`Resposta do provedor não contém ID do pedido: ${JSON.stringify(responseData)}`);
    }
    
    console.log('Resposta do provedor:', responseData);
    
    // Salvar o pedido no banco de dados
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        external_order_id: responseData.order,
        service_id: service.id,
        provider_id: provider.id,
        user_id: user_id,
        customer_id: customer_id,
        transaction_id: transaction_id,
        quantity: quantity,
        status: 'pending',
        metadata: {
          provider: provider.name,
          link: link,
          target_username: target_username,
          request: providerRequestData,
          response: responseData
        }
      })
      .select()
      .single();
      
    if (orderError) {
      console.error('Error saving order to database:', orderError);
      throw new Error(`Error saving order to database: ${orderError.message}`);
    }

    // Retornar a resposta da API do provedor
    return NextResponse.json({
      success: true,
      order: {
        id: orderData.id,
        external_id: responseData.order,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
