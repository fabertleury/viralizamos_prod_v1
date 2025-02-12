import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);

    if (!body || !body.provider) {
      console.log('Invalid request body:', body);
      return NextResponse.json({ 
        error: 'Provider is required',
        receivedBody: body 
      }, { status: 400 });
    }

    const { provider } = body;
    console.log('Provider data:', provider);

    // Usar a chave da API do .env para o Fama nas Redes
    const apiKey = provider.name.toLowerCase().includes('fama') 
      ? process.env.FAMA_REDES_API_KEY 
      : provider.api_key;

    if (!apiKey) {
      console.error('API key not found');
      return NextResponse.json({ 
        error: 'API key not found',
        provider: provider.name
      }, { status: 400 });
    }

    console.log('Using API key:', apiKey);

    // Fazer a requisição à API do FamaRedes
    try {
      const requestBody = {
        key: apiKey,
        action: 'services'
      };
      
      console.log('Making request to FamaRedes API with body:', requestBody);
      
      const response = await fetch('https://famanasredes.com.br/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(requestBody).toString()
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Provider API error response:', errorText);
        throw new Error(`Provider API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const rawData = await response.text();
      console.log('Raw response data:', rawData);

      let data;
      try {
        data = JSON.parse(rawData);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error('Invalid JSON response from provider');
      }

      console.log('Parsed API response:', data);

      // Verificar se a resposta é um array ou um objeto com erro
      if (data.error) {
        throw new Error(`Provider API error: ${data.error}`);
      }

      if (!Array.isArray(data)) {
        console.error('Unexpected response format:', data);
        throw new Error('Invalid response format from provider - expected array');
      }

      return NextResponse.json({
        services: data
      });

    } catch (error) {
      console.error('Provider API error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch services from provider',
        message: error.message,
        details: error.stack
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in services route:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
