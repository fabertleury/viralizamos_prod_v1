import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const username = params.username;

    const response = await fetch(
      `https://instagram-scraper-api2.p.rapidapi.com/v1/posts?username_or_id_or_url=${username}`,
      {
        headers: {
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY || ''
        }
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Erro ao buscar posts no Instagram' },
        { status: response.status }
      );
    }

    const responseData = await response.json();

    console.log('Resposta bruta da API:', JSON.stringify(responseData, null, 2));

    if (!responseData?.data?.items || !Array.isArray(responseData.data.items)) {
      console.error('Dados inválidos da API:', responseData);
      return NextResponse.json({ error: 'Formato de dados inválido' }, { status: 400 });
    }

    // Mapear os dados incluindo o link do post
    const posts = responseData.data.items.map((post: any) => {
      console.log('Post original:', JSON.stringify(post, null, 2));
      
      if (!post.code) {
        console.error('Post sem código:', post);
        throw new Error('Post sem código detectado na API do Instagram');
      }

      const formattedPost = {
        id: post.id,
        code: post.code,
        image_versions: post.image_versions,
        like_count: post.like_count,
        comment_count: post.comment_count,
        caption: post.caption,
        taken_at: post.taken_at,
        link: `https://www.instagram.com/p/${post.code}/`
      };

      console.log('Post formatado:', JSON.stringify(formattedPost, null, 2));
      return formattedPost;
    });

    console.log('Total de posts processados:', posts.length);

    console.log('Posts processados:', JSON.stringify(posts[0], null, 2));

    return NextResponse.json(posts);
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return NextResponse.json(
      { message: 'Erro ao buscar posts' },
      { status: 500 }
    );
  }
}
