import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Função para validar username do Instagram
function validateInstagramUsername(username: string): boolean {
  // Regex para validar username do Instagram:
  // - Começa com letra ou número
  // - Pode conter letras, números, pontos e underscores
  // - 1 a 30 caracteres
  const instagramUsernameRegex = /^[a-zA-Z0-9](?!.*\.\.|.*\.$)(?!.*\.{2,})[a-zA-Z0-9._]{0,28}[a-zA-Z0-9]$/;
  return instagramUsernameRegex.test(username);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username é obrigatório' }, { status: 400 });
  }

  // Validar username
  if (!validateInstagramUsername(username)) {
    return NextResponse.json({ 
      error: 'Username inválido. Use apenas letras, números, pontos e underscores.' 
    }, { status: 400 });
  }

  try {
    const response = await axios.get(`https://instagram-scraper-20251.p.rapidapi.com/userinfo/?username_or_id_or_url=${username}`, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-scraper-20251.p.rapidapi.com'
      },
      timeout: 5000 // Timeout de 5 segundos
    });

    const userData = response.data.data;

    if (!userData) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      username: userData.username,
      isPrivate: userData.is_private,
      fullName: userData.full_name,
      biography: userData.biography,
      followerCount: userData.follower_count,
      followingCount: userData.following_count,
      profilePicUrl: userData.profile_pic_url,
      isVerified: userData.is_verified
    });
  } catch (error) {
    console.error('Instagram API Error:', error);
    
    if (error.response) {
      // A solicitação foi feita e o servidor respondeu com um código de status
      // que cai fora do intervalo de 2xx
      return NextResponse.json({ 
        error: 'Erro ao buscar perfil', 
        details: error.response.data 
      }, { status: error.response.status });
    } else if (error.request) {
      // A solicitação foi feita, mas nenhuma resposta foi recebida
      return NextResponse.json({ 
        error: 'Sem resposta do servidor de busca' 
      }, { status: 503 });
    } else {
      // Algo aconteceu na configuração da solicitação que disparou um erro
      return NextResponse.json({ 
        error: 'Erro na configuração da busca' 
      }, { status: 500 });
    }
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username } = body;

  if (!username) {
    return NextResponse.json({ error: 'Username é obrigatório' }, { status: 400 });
  }

  // Validar username
  if (!validateInstagramUsername(username)) {
    return NextResponse.json({ 
      error: 'Username inválido. Use apenas letras, números, pontos e underscores.' 
    }, { status: 400 });
  }

  try {
    const response = await axios.get(`https://instagram-scraper-20251.p.rapidapi.com/userinfo/?username_or_id_or_url=${username}`, {
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-scraper-20251.p.rapidapi.com'
      },
      timeout: 5000 // Timeout de 5 segundos
    });

    const userData = response.data.data;

    if (!userData) {
      return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      username: userData.username,
      isPrivate: userData.is_private,
      fullName: userData.full_name,
      biography: userData.biography,
      followerCount: userData.follower_count,
      followingCount: userData.following_count,
      profilePicUrl: userData.profile_pic_url,
      isVerified: userData.is_verified
    });
  } catch (error) {
    console.error('Instagram API Error:', error);
    
    if (error.response) {
      // A solicitação foi feita e o servidor respondeu com um código de status
      // que cai fora do intervalo de 2xx
      return NextResponse.json({ 
        error: 'Erro ao buscar perfil', 
        details: error.response.data 
      }, { status: error.response.status });
    } else if (error.request) {
      // A solicitação foi feita, mas nenhuma resposta foi recebida
      return NextResponse.json({ 
        error: 'Sem resposta do servidor de busca' 
      }, { status: 503 });
    } else {
      // Algo aconteceu na configuração da solicitação que disparou um erro
      return NextResponse.json({ 
        error: 'Erro na configuração da busca' 
      }, { status: 500 });
    }
  }
}
