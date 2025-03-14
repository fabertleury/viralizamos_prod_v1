import { NextResponse } from 'next/server';

// Função para verificar se um perfil é privado usando a RocketAPI
async function checkProfileWithRocketAPI(username: string) {
  try {
    console.log('Verificando perfil com RocketAPI:', username);
    
    const response = await fetch('https://rocketapi-for-developers.p.rapidapi.com/instagram/user/get_info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
        'X-RapidAPI-Host': 'rocketapi-for-developers.p.rapidapi.com'
      },
      body: JSON.stringify({
        username: username
      })
    });

    if (!response.ok) {
      throw new Error(`RocketAPI respondeu com status ${response.status}`);
    }

    const data = await response.json();
    
    // Verificar se a resposta é válida
    if (data?.response?.body?.data?.user) {
      const user = data.response.body.data.user;
      
      return {
        username: user.username,
        full_name: user.full_name,
        biography: user.biography || '',
        followers_count: user.edge_followed_by?.count || 0,
        following_count: user.edge_follow?.count || 0,
        profile_pic_url: user.profile_pic_url_hd || user.profile_pic_url,
        is_private: user.is_private === true,
        is_verified: user.is_verified === true,
        media_count: user.edge_owner_to_timeline_media?.count || 0
      };
    }
    
    throw new Error('Formato de resposta inválido da RocketAPI');
  } catch (error) {
    console.error('Erro na RocketAPI:', error);
    throw error;
  }
}

export async function GET(
  request: Request,
  context: { params: { username: string } }
) {
  try {
    // Extrair o username diretamente dos parâmetros
    const params = await context.params;
    const username = params.username;

    if (!username) {
      return NextResponse.json(
        { error: 'Nome de usuário é obrigatório' },
        { status: 400 }
      );
    }

    // Tentar com RocketAPI (nossa API principal após as mudanças)
    try {
      const profileData = await checkProfileWithRocketAPI(username);
      return NextResponse.json(profileData);
    } catch (error) {
      console.error('Falha ao verificar com RocketAPI:', error);
      
      // Se falhar, tentar com a API de perfil genérica usando URL absoluta
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const fallbackResponse = await fetch(`${baseUrl}/api/instagram/profile?username=${username}`);
      
      if (!fallbackResponse.ok) {
        throw new Error(`API de fallback respondeu com status ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      
      if (fallbackData.error) {
        throw new Error(fallbackData.error);
      }
      
      // Formatar a resposta para o formato padrão
      const formattedData = {
        username: fallbackData.data.username,
        full_name: fallbackData.data.full_name,
        biography: fallbackData.data.biography || '',
        followers_count: fallbackData.data.follower_count || 0,
        following_count: fallbackData.data.following_count || 0,
        profile_pic_url: fallbackData.data.profile_pic_url,
        is_private: fallbackData.data.is_private === true,
        is_verified: fallbackData.data.is_verified === true,
        media_count: fallbackData.data.media_count || 0
      };
      
      return NextResponse.json(formattedData);
    }
  } catch (error: any) {
    console.error('Erro ao verificar perfil do Instagram:', error);
    return NextResponse.json(
      { 
        error: 'Falha ao verificar perfil', 
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
