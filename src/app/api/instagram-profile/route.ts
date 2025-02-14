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
    // Busca informações do perfil
    const profileResponse = await fetch(
      `https://instagram-scraper-20251.p.rapidapi.com/userinfo/v2/?username_or_id_or_url=${username}`, 
      options
    );

    if (!profileResponse.ok) {
      return NextResponse.json({ 
        error: 'Erro ao buscar perfil' 
      }, { status: 500 });
    }

    const profileData = await profileResponse.json();
    
    // Verifica se encontrou o perfil
    if (!profileData || profileData.error) {
      return NextResponse.json({ 
        error: 'Perfil não encontrado' 
      }, { status: 404 });
    }

    // Retorna dados processados
    return NextResponse.json({
      username: profileData.username,
      fullName: profileData.full_name,
      biography: profileData.biography,
      followerCount: profileData.followers_count,
      followingCount: profileData.following_count,
      profilePicUrl: profileData.profile_pic_url,
      isVerified: profileData.is_verified,
      externalUrl: profileData.external_url,
      isPrivate: profileData.is_private
    });

  } catch (error) {
    console.error('Erro na busca do perfil do Instagram:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
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
