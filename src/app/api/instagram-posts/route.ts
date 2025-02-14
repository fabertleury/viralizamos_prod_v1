import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  console.log('[INSTAGRAM CONTENT] Username recebido:', username);

  if (!username) {
    console.error('[INSTAGRAM CONTENT] Username não fornecido');
    return NextResponse.json({ 
      error: 'Username é obrigatório' 
    }, { status: 400 });
  }

  // Configurações da API do RapidAPI
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': process.env.RAPIDAPI_KEY || '',
      'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
    }
  };

  try {
    const url = `https://instagram-scraper-api2.p.rapidapi.com/v1/posts?username_or_id_or_url=${username}`;
    console.log('[INSTAGRAM CONTENT] URL da requisição:', url);
    console.log('[INSTAGRAM CONTENT] Opções da requisição:', JSON.stringify(options, null, 2));

    // Busca conteúdo do Instagram
    const contentResponse = await fetch(url, options);

    console.log('[INSTAGRAM CONTENT] Status da resposta:', contentResponse.status);

    // Capturar texto completo da resposta antes de tentar parsear
    const responseText = await contentResponse.text();
    console.log('[INSTAGRAM CONTENT] Resposta completa:', responseText);

    if (!contentResponse.ok) {
      console.error('[INSTAGRAM CONTENT] Erro na resposta:', responseText);
      return NextResponse.json({ 
        error: 'Erro ao buscar conteúdo',
        details: responseText
      }, { status: 500 });
    }

    // Tentar parsear o JSON
    let contentData;
    try {
      contentData = JSON.parse(responseText);
      console.log('[INSTAGRAM CONTENT] Dados brutos recebidos:', JSON.stringify(contentData, null, 2));
    } catch (parseError) {
      console.error('[INSTAGRAM CONTENT] Erro ao parsear JSON:', parseError);
      return NextResponse.json({ 
        error: 'Erro ao processar dados do conteúdo',
        details: 'Formato de resposta inválido',
        rawResponse: responseText
      }, { status: 500 });
    }

    // Verificar se há dados de conteúdo
    if (!contentData || !contentData.data || !contentData.data.items) {
      console.error('[INSTAGRAM CONTENT] Nenhum conteúdo encontrado');
      return NextResponse.json({ 
        error: 'Nenhum conteúdo encontrado',
        details: 'A API não retornou conteúdo para este usuário'
      }, { status: 404 });
    }

    // Separar posts e reels
    const processedPosts = contentData.data.items
      .filter((item: any) => item.media_type !== 2) // Excluir vídeos (reels)
      .map((post: any) => ({
        id: post.id,
        caption: post.caption?.text || '',
        likeCount: post.like_count || 0,
        commentCount: post.comment_count || 0,
        mediaType: post.media_type,
        imageUrl: post.image_versions2?.candidates?.[0]?.url || '',
        isCarousel: post.media_type === 8,
        carouselMediaCount: post.carousel_media_count || 0,
        takenAt: post.taken_at ? new Date(post.taken_at * 1000) : null
      }));

    const processedReels = contentData.data.items
      .filter((item: any) => item.media_type === 2) // Apenas vídeos (reels)
      .map((reel: any) => ({
        id: reel.id,
        caption: reel.caption?.text || '',
        likeCount: reel.like_count || 0,
        commentCount: reel.comment_count || 0,
        videoUrl: reel.video_versions?.[0]?.url || '',
        thumbnailUrl: reel.image_versions2?.candidates?.[0]?.url || '',
        videoDuration: reel.video_duration || 0,
        takenAt: reel.taken_at ? new Date(reel.taken_at * 1000) : null
      }));

    return NextResponse.json({
      username: username,
      totalPosts: processedPosts.length,
      totalReels: processedReels.length,
      posts: processedPosts,
      reels: processedReels
    });

  } catch (error) {
    console.error('[INSTAGRAM CONTENT] Erro fatal:', error);
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
