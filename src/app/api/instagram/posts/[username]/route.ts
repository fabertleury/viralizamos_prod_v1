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

    // Log de configurações para depuração
    console.log('Configurações da API:', apiConfigs);

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

    console.log(`Buscando posts para o usuário: ${username}`);
    console.log(`Endpoint da API: ${configMap['instagram_api_endpoint']}`);

    const response = await axios.get(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/posts?username_or_id_or_url=${username}`,
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
      throw new Error(errorData || `Erro ao carregar posts (${response.status})`);
    }

    const postsData = response.data;
    
    console.log('Dados dos posts recebidos:', JSON.stringify(postsData, null, 2));

    // Processar posts considerando posts com múltiplas imagens
    const processedPosts = postsData.data.items.flatMap(post => {
      // Log para depuração do tipo de post
      console.log('Processando post:', {
        id: post.id,
        media_type: post.media_type,
        is_video: post.is_video,
        product_type: post.product_type || 'unknown'
      });
      
      // Se for um post com múltiplas imagens (carousel)
      if (post.media_type === 8 && post.carousel_media) {
        return post.carousel_media.map(carouselItem => ({
          id: carouselItem.id,
          code: carouselItem.id,
          image_versions: carouselItem.image_versions,
          like_count: post.like_count || 0,
          comment_count: post.comment_count || 0,
          views_count: post.view_count || 
                      post.views_count || 
                      post.view_count_formatted || 
                      post.video_view_count || 
                      (post.video_versions && post.video_versions.view_count) || 
                      0,
          caption: { 
            text: (() => {
              if (!post.caption) return 'Sem legenda';
              
              if (typeof post.caption === 'string') {
                return post.caption;
              }
              
              if (typeof post.caption === 'object') {
                if ('text' in post.caption) {
                  return (post.caption as { text: string }).text;
                }
                
                // Se for um objeto sem 'text', tenta converter para string
                return JSON.stringify(post.caption);
              }
              
              return 'Legenda inválida';
            })()
          },
          link: `https://www.instagram.com/p/${post.code}/`,
          media_type: carouselItem.media_type,
          is_video: carouselItem.is_video,
          is_reel: post.product_type === 'clips' || post.product_type === 'reels'
        }));
      }
      
      // Posts normais
      return [{
        id: post.id,
        code: post.code,
        image_versions: post.image_versions,
        like_count: post.like_count || 0,
        comment_count: post.comment_count || 0,
        views_count: post.view_count || 
                    post.views_count || 
                    post.view_count_formatted || 
                    post.video_view_count || 
                    (post.video_versions && post.video_versions.view_count) || 
                    0,
        caption: { 
          text: (() => {
            if (!post.caption) return 'Sem legenda';
            
            if (typeof post.caption === 'string') {
              return post.caption;
            }
            
            if (typeof post.caption === 'object') {
              if ('text' in post.caption) {
                return (post.caption as { text: string }).text;
              }
              
              // Se for um objeto sem 'text', tenta converter para string
              return JSON.stringify(post.caption);
            }
            
            return 'Legenda inválida';
          })()
        },
        link: `https://www.instagram.com/p/${post.code}/`,
        media_type: post.media_type,
        is_video: post.is_video,
        is_reel: post.product_type === 'clips' || post.product_type === 'reels'
      }];
    });

    console.log('Posts processados:', processedPosts.map(post => ({
      id: post.id,
      is_video: post.is_video,
      views_count: post.views_count,
      like_count: post.like_count,
      comment_count: post.comment_count
    })));

    // Adicionar log para caption
    processedPosts.forEach(post => {
      console.log('Post original completo:', JSON.stringify(post, null, 2));
      console.log('Estrutura da caption:', {
        caption: post.caption,
        type: typeof post.caption,
        keys: post.caption ? Object.keys(post.caption) : 'N/A'
      });
    });

    if (!processedPosts || processedPosts.length === 0) {
      console.warn('Nenhum post encontrado para o usuário');
      return NextResponse.json([], { status: 204 }); // No Content
    }

    return NextResponse.json(processedPosts);
  } catch (error) {
    console.error('Erro completo ao buscar posts:', error);
    
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
        message: 'Erro ao buscar posts', 
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}
