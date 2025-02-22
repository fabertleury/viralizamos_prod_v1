import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    if (configError) throw configError;

    const configMap = apiConfigs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {});

    const { params } = context;
    const username = params.username;

    const response = await fetch(
      `${configMap['instagram_api_endpoint']}?username_or_id_or_url=${username}`,
      {
        headers: {
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
          'x-rapidapi-key': configMap['instagram_api_key']
        }
      }
    );

    if (!response.ok) {
      const status = response.status;
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro ao carregar posts (${status})`);
    }

    const postsData = await response.json();
    
    // Processar posts
    const posts = postsData.data.items.map((post: any) => ({
      id: post.pk,
      code: post.code,
      image_versions: {
        items: [{ url: post.image_versions2.candidates[0].url }]
      },
      like_count: post.like_count,
      comment_count: post.comment_count,
      caption: { text: post.caption?.text || '' },
      link: `https://www.instagram.com/p/${post.code}/`
    }));

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return NextResponse.json(
      { message: 'Erro ao buscar posts', error: error.message },
      { status: 500 }
    );
  }
}
