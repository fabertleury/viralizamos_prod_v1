import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const type = searchParams.get('type') || 'posts'; // posts ou reels

  if (!username) {
    return NextResponse.json({ 
      error: 'Username é obrigatório' 
    }, { status: 400 });
  }

  // Configurações da API do RapidAPI
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'instagram-scraper-20251.p.rapidapi.com'
    }
  };

  try {
    let contentResponse;
    let endpoint = '';

    // Seleciona o endpoint baseado no tipo de conteúdo
    if (type === 'posts') {
      endpoint = `/userposts/v2/?username_or_id_or_url=${username}`;
    } else if (type === 'reels') {
      endpoint = `/userreels/v2/?username_or_id_or_url=${username}`;
    } else {
      return NextResponse.json({ 
        error: 'Tipo de conteúdo inválido' 
      }, { status: 400 });
    }

    // Busca conteúdo do perfil
    contentResponse = await fetch(
      `https://instagram-scraper-20251.p.rapidapi.com${endpoint}`, 
      options
    );

    if (!contentResponse.ok) {
      return NextResponse.json({ 
        error: `Erro ao buscar ${type}` 
      }, { status: 500 });
    }

    const contentData = await contentResponse.json();
    
    // Verifica se encontrou conteúdo
    if (!contentData || !contentData.data) {
      return NextResponse.json({ 
        error: `Nenhum ${type} encontrado` 
      }, { status: 404 });
    }

    // Processa os dados de conteúdo
    const processedContent = contentData.data.map((item: any) => ({
      id: item.id,
      type: type,
      caption: item.caption || '',
      likes: item.likes_count || 0,
      comments: item.comments_count || 0,
      mediaUrl: item.display_url || item.video_url,
      timestamp: item.taken_at ? new Date(item.taken_at * 1000) : new Date()
    }));

    // Retorna dados processados
    return NextResponse.json({
      username: username,
      type: type,
      total: processedContent.length,
      content: processedContent
    });

  } catch (error) {
    console.error(`Erro na busca de ${type} do Instagram:`, error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}

// Configuração para permitir chamadas de qualquer origem
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
