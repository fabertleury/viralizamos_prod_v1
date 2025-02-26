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

    // Processar posts com tratamento de erro mais robusto
    const posts = postsData.data.items?.map((post: any) => {
      if (!post) return null;

      // Lidar com posts em carrossel
      const imageUrl = post.carousel_media 
        ? post.carousel_media[0].image_versions.items[0].url 
        : (post.image_versions?.items?.[0]?.url || post.display_url);

      return {
        id: post.code || post.id || post.pk,
        code: post.code || post.id || post.pk,
        image_versions: {
          items: [{ 
            url: imageUrl || 'https://via.placeholder.com/150'
          }]
        },
        like_count: post.like_count || 0,
        comment_count: post.comment_count || 0,
        caption: { 
          text: typeof post.caption === 'object' 
            ? post.caption.text 
            : (post.caption || '') 
        },
        link: `https://www.instagram.com/p/${post.code || post.id}/`
      };
    }).filter(Boolean); // Remover entradas nulas

    if (!posts || posts.length === 0) {
      console.warn('Nenhum post encontrado para o usuário');
      return NextResponse.json([], { status: 204 }); // No Content
    }

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Erro completo ao buscar posts:', error);
    return NextResponse.json(
      { 
        message: 'Erro ao buscar posts', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
