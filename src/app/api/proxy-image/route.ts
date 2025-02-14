import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'URL de imagem não fornecida' }, { status: 400 });
  }

  try {
    const imageResponse = await fetch(imageUrl, {
      headers: {
        // Adicionar headers para evitar bloqueios
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com'
      }
    });

    if (!imageResponse.ok) {
      return NextResponse.json({ 
        error: 'Não foi possível buscar a imagem', 
        status: imageResponse.status 
      }, { status: 500 });
    }

    // Clonar os headers da resposta original
    const headers = new Headers(imageResponse.headers);
    headers.set('Content-Type', 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Retornar a imagem com os headers corretos
    return new NextResponse(imageResponse.body, {
      status: 200,
      headers: headers
    });

  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    return NextResponse.json({ 
      error: 'Erro interno ao processar imagem', 
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}
