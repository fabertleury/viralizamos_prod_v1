import { NextResponse } from 'next/server';
import https from 'https';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'instagram-scraper-api2.p.rapidapi.com';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return new NextResponse('Username is required', { status: 400 });
    }

    if (!RAPIDAPI_KEY) {
      return new NextResponse('RapidAPI key is not configured', { status: 500 });
    }

    console.log('Buscando posts para:', username);

    const options = {
      method: 'GET',
      hostname: RAPIDAPI_HOST,
      port: null,
      path: `/v1/posts?username_or_id_or_url=${encodeURIComponent(username)}`,
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };

    const data = await new Promise((resolve, reject) => {
      const req = https.request(options, function (res) {
        const chunks: any[] = [];

        res.on('data', function (chunk) {
          chunks.push(chunk);
        });

        res.on('end', function () {
          const body = Buffer.concat(chunks);
          try {
            const data = JSON.parse(body.toString());
            console.log('Resposta da API:', data);
            
            if (!data?.data?.items) {
              console.error('Resposta inválida da API:', data);
              reject(new Error('Formato de resposta inválido'));
              return;
            }

            const posts = data.data.items.map((post: any) => ({
              id: post.id,
              media_type: post.media_type,
              is_video: post.media_type === 2,
              likes_count: post.like_count || 0,
              comments_count: post.comment_count || 0,
              caption: post.caption?.text || '',
              view_count: post.view_count || 0,
              timestamp: post.taken_at || Date.now(),
              hashtags: (post.caption?.text?.match(/#[\w\u0590-\u05ff]+/g) || []),
              carousel_media: post.carousel_media,
              image_versions: post.image_versions
            }));

            console.log('Posts processados:', posts.length);

            resolve({
              data: {
                items: posts,
                count: posts.length
              }
            });
          } catch (e) {
            console.error('Erro ao processar resposta:', e);
            reject(e);
          }
        });
      });

      req.on('error', function (e) {
        console.error('Erro na requisição:', e);
        reject(e);
      });

      req.end();
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao buscar posts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
