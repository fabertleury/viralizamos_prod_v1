import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);

    if (!body || !body.provider || !body.service || !body.quantity) {
      return NextResponse.json({ 
        error: 'Missing required fields: provider, service, quantity',
        receivedBody: body 
      }, { status: 400 });
    }

    const { provider, service, quantity, link } = body;
    
    // Usar a chave da API do provedor
    const apiKey = provider.api_key;

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API key not found',
        provider: provider.name
      }, { status: 400 });
    }

    // Configurar a requisição com base no provedor
    const apiUrl = provider.api_url;
    if (!apiUrl) {
      return NextResponse.json({ 
        error: 'API URL not defined for provider',
        provider: provider.name
      }, { status: 400 });
    }

    // Todas as APIs usam o mesmo padrão
    const requestMethod = 'POST';
    const requestHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    
    // Corpo da requisição padrão para todas as APIs
    const requestBody = {
      key: apiKey,
      action: 'add',
      service: service.service || service.id || service,
      link: link,
      quantity: quantity
    };
    
    console.log(`Making order request to ${provider.name} API:`, {
      url: apiUrl,
      method: requestMethod,
      headers: requestHeaders,
      body: requestBody
    });

    // Preparar o corpo da requisição
    const formBody = Object.keys(requestBody)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(requestBody[key]))
      .join('&');

    // Fazer a requisição para a API do provedor
    const response = await fetch(apiUrl, {
      method: requestMethod,
      headers: requestHeaders,
      body: formBody
    });

    if (!response.ok) {
      throw new Error(`Provider API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Provider API response:', data);

    // Verificar se há erro na resposta
    if (data.error) {
      return NextResponse.json({ 
        error: `Provider API error: ${data.error}`,
        providerResponse: data
      }, { status: 400 });
    }

    // Salvar o pedido no banco de dados
    const supabase = createClient();
    
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        provider_id: provider.id,
        service_id: service.id,
        external_order_id: data.order,
        link: link,
        quantity: quantity,
        status: 'pending',
        metadata: {
          provider_slug: provider.slug,
          provider_response: data
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
        external_id: data.order,
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
