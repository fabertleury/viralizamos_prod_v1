import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

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
    // Busca reels do usuário
    const reelsResponse = await fetch(
      `https://instagram-scraper-20251.p.rapidapi.com/userreels/?username_or_id_or_url=${username}`, 
      options
    );

    if (!reelsResponse.ok) {
      const errorText = await reelsResponse.text();
      console.error('Erro na resposta de reels:', errorText);
      return NextResponse.json({ 
        error: 'Erro ao buscar reels',
        details: errorText
      }, { status: 500 });
    }

    const reelsData = await reelsResponse.json();
    
    // Processar e filtrar dados relevantes
    const processedReels = reelsData.map((reel: any) => ({
      id: reel.code || reel.id,
      type: 'reel',
      caption: reel.caption || '',
      likes: reel.likes_count || 0,
      comments: reel.comments_count || 0,
      mediaUrl: reel.display_url || reel.video_url,
      timestamp: reel.taken_at || Date.now()
    }));

    return NextResponse.json({
      username: username,
      total: processedReels.length,
      reels: processedReels
    });

  } catch (error) {
    console.error('Erro na busca de reels do Instagram:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
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
