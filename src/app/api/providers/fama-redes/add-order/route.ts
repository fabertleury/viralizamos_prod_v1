import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    console.log('=== ENDPOINT ADD-ORDER CHAMADO ===');
    const { service, link, quantity, transaction_id, target_username, provider_id } = await request.json();
    
    console.log('Enviando pedido para o provedor:', {
      service,
      link,
      quantity,
      transaction_id,
      target_username,
      provider_id
    });

    if (!service || !link || !quantity) {
      return NextResponse.json({
        error: 'Missing required fields',
        status: 'error'
      }, { status: 400 });
    }

    const supabase = createClient();
    
    // Buscar o provedor no Supabase
    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', provider_id)
      .single();
      
    if (providerError || !provider) {
      console.error('Erro ao buscar provedor:', providerError);
      
      // Tentar usar as variáveis de ambiente como fallback (compatibilidade)
      const apiKey = process.env.FAMA_REDES_API_KEY;
      const apiUrl = process.env.FAMA_REDES_API_URL || 'https://famanasredes.com.br/api/v2';
      
      if (!apiKey) {
        return NextResponse.json({
          error: 'Provider not found and no fallback API key configured',
          status: 'error'
        }, { status: 500 });
      }
      
      console.warn('Usando API key e URL de fallback das variáveis de ambiente');
      
      // Verificar se o link é para um post do Instagram e garantir que esteja no formato correto
      let finalLink = link;
      if (link.includes('instagram.com/p/')) {
        // Extrair o código do post da URL
        let postCode = link.split('/p/')[1]?.split('/')[0];
        if (postCode) {
          // Garantir que estamos usando o código correto do post
          console.log('Código do post extraído:', postCode);
          finalLink = `https://instagram.com/p/${postCode}`;
        }
      }

      // Enviar pedido para o provedor usando as variáveis de ambiente
      const response = await axios.post(apiUrl, {
        key: apiKey,
        action: 'add',
        service,
        link: finalLink,
        quantity
      });
      
      console.log('Resposta do provedor (fallback):', response.data);
      
      if (!response.data || !response.data.order) {
        return NextResponse.json({
          error: 'Invalid response from provider',
          response: response.data,
          status: 'error'
        }, { status: 500 });
      }
      
      // Resto do código para salvar o pedido...
      return processOrderResponse(response.data, supabase, transaction_id, service, finalLink, quantity, target_username);
    }
    
    // Verificar se o provedor tem API key e URL configuradas
    if (!provider.api_key || !provider.api_url) {
      console.error('Provedor não tem API key ou URL configurada:', provider.name);
      return NextResponse.json({
        error: 'Provider API configuration missing',
        status: 'error'
      }, { status: 500 });
    }
    
    console.log(`Usando provedor: ${provider.name} (${provider.api_url})`);
    
    // Verificar se o link é para um post do Instagram e garantir que esteja no formato correto
    let finalLink = link;
    if (link.includes('instagram.com/p/')) {
      // Extrair o código do post da URL
      let postCode = link.split('/p/')[1]?.split('/')[0];
      if (postCode) {
        // Garantir que estamos usando o código correto do post
        console.log('Código do post extraído:', postCode);
        finalLink = `https://instagram.com/p/${postCode}`;
      }
    }

    // Enviar pedido para o provedor
    const response = await axios.post(provider.api_url, {
      key: provider.api_key,
      action: 'add',
      service,
      link: finalLink,
      quantity
    });

    console.log(`Resposta do provedor ${provider.name}:`, response.data);

    if (!response.data || !response.data.order) {
      return NextResponse.json({
        error: 'Invalid response from provider',
        response: response.data,
        status: 'error'
      }, { status: 500 });
    }

    return processOrderResponse(response.data, supabase, transaction_id, service, finalLink, quantity, target_username);
    
  } catch (error: any) {
    console.error('Erro ao processar pedido:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
}

// Função auxiliar para processar a resposta da ordem e salvar no banco de dados
async function processOrderResponse(responseData: any, supabase: any, transaction_id: string, service: string, finalLink: string, quantity: number, target_username: string) {
  // Buscar a transação para obter detalhes adicionais
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transaction_id)
    .single();

  if (transactionError) {
    console.error('Erro ao buscar transação:', transactionError);
    return NextResponse.json({
      error: 'Transaction not found',
      status: 'error'
    }, { status: 404 });
  }

  // Salvar o pedido no banco de dados usando a estrutura existente
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      service_id: service,
      quantity,
      target_username,
      status: 'processing', // Alterado de 'pending' para 'processing' para indicar que foi enviado
      payment_status: 'approved',
      payment_method: 'pix',
      payment_id: transaction.payment_external_reference,
      external_order_id: responseData.order.toString(),
      transaction_id,
      user_id: transaction.user_id, // Adicionado user_id para rastreabilidade
      metadata: {
        provider: 'external_provider',
        provider_id: service, // Usar provider_id em vez de fama_id
        link: finalLink,
        order_details: responseData,
        email: transaction.metadata?.email || transaction.metadata?.profile?.email // Armazenar email para consulta futura
      }
    })
    .select();

  if (error) {
    console.error('Erro ao salvar pedido:', error);
    return NextResponse.json({
      error: 'Failed to save order',
      details: error,
      status: 'error'
    }, { status: 500 });
  }

  return NextResponse.json({
    order: order[0],
    provider_response: responseData,
    status: 'success'
  });
}
