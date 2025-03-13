import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { message: 'Nome de usuário é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`Verificando perfil com RocketAPI: ${username}`);

    // Usar a RocketAPI para verificar o perfil
    const response = await axios.request({
      method: 'POST',
      url: 'https://rocketapi-for-developers.p.rapidapi.com/instagram/user/get_info',
      headers: {
        'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
        'x-rapidapi-host': 'rocketapi-for-developers.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: { username }
    });

    const data = response.data;
    
    if (data.error) {
      throw new Error(data.error.message || 'Erro ao verificar perfil com RocketAPI');
    }

    // Formatar os dados do perfil
    const profileInfo = {
      username: data.username,
      full_name: data.full_name || '',
      profile_pic_url: data.profile_pic_url || '',
      follower_count: data.follower_count || 0,
      following_count: data.following_count || 0,
      totalPosts: data.media_count || 0,
      is_private: data.is_private || false,
      is_verified: data.is_verified || false,
      biography: data.biography || '',
      followers: data.follower_count || 0,
      following: data.following_count || 0,
    };

    return NextResponse.json(profileInfo);
  } catch (error: any) {
    console.error('Erro ao verificar perfil com RocketAPI:', error);
    
    return NextResponse.json(
      { 
        message: 'Erro ao verificar perfil com RocketAPI', 
        error: error.message || 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}
