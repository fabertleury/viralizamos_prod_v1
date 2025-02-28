import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  context: { params: { username: string } }
) {
  const supabase = createClient();

  try {
    // Buscar configurações dinâmicas
    const { data: apiConfigs, error: configError } = await supabase
      .from('configurations')
      .select('key, value')
      .in('key', ['instagram_api_endpoint', 'instagram_api_key'])
      .throwOnError();

    if (configError) {
      console.error('Configuração de erro:', configError);
      throw configError;
    }

    const configMap = apiConfigs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    // Verificar se as configurações necessárias existem
    if (!configMap['instagram_api_endpoint']) {
      throw new Error('Endpoint da API do Instagram não configurado');
    }
    if (!configMap['instagram_api_key']) {
      throw new Error('Chave da API do Instagram não configurada');
    }

    const { params } = context;
    const username = params.username;

    console.log(`Buscando reels para o usuário: ${username}`);
    console.log(`Endpoint da API: ${configMap['instagram_api_endpoint']}`);

    const response = await axios.get(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/reels?username_or_id_or_url=${username}`,
      {
        headers: {
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
          'x-rapidapi-key': configMap['instagram_api_key']
        }
      }
    );

    console.log('Status da resposta:', response.status);

    if (!response.data) {
      const errorData = response.statusText;
      console.error(`Erro na resposta da API: ${errorData}`);
      throw new Error(errorData || `Erro ao carregar reels (${response.status})`);
    }

    const reelsData = response.data;
    
    console.log('Dados dos reels recebidos:', JSON.stringify(reelsData, null, 2));

    // Processar reels
    const processedReels = reelsData.data.items.map(reel => ({
      id: reel.id,
      code: reel.code,
      image_versions: reel.image_versions?.items || [],
      like_count: reel.like_count || 0,
      comment_count: reel.comment_count || 0,
      views_count: reel.play_count || 
                   reel.view_count || 
                   reel.views_count || 
                   reel.video_view_count || 
                   reel.ig_play_count || 
                   0,
      caption: { 
        text: reel.caption 
          ? (typeof reel.caption === 'object' 
            ? reel.caption.text || 'Sem legenda'
            : String(reel.caption)) 
          : 'Sem legenda'
      },
      link: `https://www.instagram.com/reel/${reel.code}/`,
      media_type: reel.media_type,
      is_video: reel.is_video,
      video_url: reel.video_url,
      video_duration: reel.video_duration
    }));

    console.log('Reels processados:', processedReels.map(reel => ({
      id: reel.id,
      views_count: reel.views_count,
      like_count: reel.like_count,
      comment_count: reel.comment_count
    })));

    if (!processedReels || processedReels.length === 0) {
      console.warn('Nenhum reel encontrado para o usuário');
      return NextResponse.json([], { status: 204 }); // No Content
    }

    return NextResponse.json(processedReels);
  } catch (error) {
    console.error('Erro completo ao buscar reels:', error);
    
    // Log detalhado de erros para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error('Detalhes do erro Axios:', {
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
    }

    return NextResponse.json(
      { 
        message: 'Erro ao buscar reels', 
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}
