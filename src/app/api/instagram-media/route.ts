import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Função para validar username do Instagram
function validateInstagramUsername(username: string): boolean {
  const instagramUsernameRegex = /^[a-zA-Z0-9](?!.*\.\.|.*\.$)(?!.*\.{2,})[a-zA-Z0-9._]+_?$/;
  return instagramUsernameRegex.test(username);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const count = searchParams.get('count') || '12';

  console.log('Recebendo requisição de mídia para username:', username); // Log de depuração

  if (!username) {
    console.log('Username não fornecido'); // Log de depuração
    return NextResponse.json({ error: 'Username é obrigatório' }, { status: 400 });
  }

  // Validar username
  if (!validateInstagramUsername(username)) {
    console.log('Username inválido:', username); // Log de depuração
    return NextResponse.json({ 
      error: 'Username inválido. Use apenas letras, números, pontos e underscores.' 
    }, { status: 400 });
  }

  try {
    // Primeiro, busca o ID do usuário
    const userInfoResponse = await axios.post(
      'https://rocketapi-for-instagram.p.rapidapi.com/instagram/user/get_info',
      { username },
      {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'rocketapi-for-instagram.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    const userId = userInfoResponse.data.response.body.data.user.pk;

    console.log('ID do usuário:', userId); // Log de depuração

    // Agora busca as mídias do usuário
    const mediaResponse = await axios.post(
      'https://rocketapi-for-instagram.p.rapidapi.com/instagram/user/get_media',
      { 
        id: userId, 
        count: parseInt(count), 
        max_id: null 
      },
      {
        headers: {
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': 'rocketapi-for-instagram.p.rapidapi.com',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    console.log('Resposta da API de mídia:', mediaResponse.data); // Log de depuração

    const mediaData = mediaResponse.data.response.body.data.media;

    // Formata os dados das mídias
    const formattedMedia = mediaData.map((media: any) => ({
      id: media.pk,
      type: media.media_type, // 1: foto, 2: vídeo, 8: carrossel
      url: media.image_versions2?.candidates[0]?.url || media.video_versions[0]?.url,
      caption: media.caption?.text || '',
      likes: media.like_count,
      comments: media.comment_count,
      timestamp: media.taken_at
    }));

    console.log('Mídias formatadas:', formattedMedia); // Log de depuração

    return NextResponse.json({
      username: username,
      userId: userId,
      media: formattedMedia
    });

  } catch (error) {
    console.error('Erro completo na API de mídia:', error); // Log de depuração detalhada
    
    if (error.response) {
      console.log('Erro com resposta:', error.response.data); // Log de depuração
      return NextResponse.json({ 
        error: 'Erro ao buscar mídias do perfil', 
        details: error.response.data 
      }, { status: error.response.status });
    } else if (error.request) {
      console.log('Sem resposta do servidor'); // Log de depuração
      return NextResponse.json({ 
        error: 'Sem resposta do servidor de busca' 
      }, { status: 503 });
    } else {
      console.log('Erro na configuração da requisição'); // Log de depuração
      return NextResponse.json({ 
        error: 'Erro na configuração da busca' 
      }, { status: 500 });
    }
  }
}
