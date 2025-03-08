import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { message: 'Nome de usuário é obrigatório' },
      { status: 400 }
    );
  }

  try {
    // Usando a API RapidAPI para Instagram Scraper (mesma que usamos em outros endpoints)
    const response = await axios.get(`https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${username}`, {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '9d0a5d7a0amsh4e7e7e3d0a5d7a0p1a5e1bjsn9d0a5d7a0a',
        'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com'
      }
    });

    // Verificando se a resposta contém os dados necessários
    if (!response.data || !response.data.user) {
      throw new Error('Não foi possível obter informações do perfil');
    }

    const userData = response.data.user;
    
    // Extraindo os dados do usuário da resposta
    return NextResponse.json({
      username: userData.username,
      full_name: userData.full_name,
      is_private: userData.is_private,
      follower_count: userData.follower_count || userData.edge_followed_by?.count,
      following_count: userData.following_count || userData.edge_follow?.count,
      profile_pic_url: userData.profile_pic_url,
      raw_data: userData,
      source: 'rapidapi'
    });
  } catch (error: any) {
    console.error('Erro ao verificar perfil do Instagram com RapidAPI:', error);
    
    // Tentando uma abordagem alternativa com scraping simples
    try {
      // Usando uma API pública alternativa que é mais simples e menos propensa a bloqueios
      const scrapingResponse = await axios.get(`https://instagramdimensions.com/api/user-profile?username=${username}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
      });
      
      if (scrapingResponse.data && scrapingResponse.data.status === 'ok') {
        const profileData = scrapingResponse.data.data;
        
        return NextResponse.json({
          username: profileData.username,
          full_name: profileData.full_name,
          is_private: profileData.is_private,
          follower_count: profileData.edge_followed_by?.count,
          following_count: profileData.edge_follow?.count,
          profile_pic_url: profileData.profile_pic_url,
          source: 'alternative_api'
        });
      } else {
        throw new Error('Falha na API alternativa');
      }
    } catch (scrapingError) {
      console.error('Erro ao usar API alternativa:', scrapingError);
      
      // Última tentativa - usando uma API pública simples
      try {
        const lastResortResponse = await axios.get(`https://www.instagram.com/${username}/channel/?__a=1`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
          }
        });
        
        if (lastResortResponse.data && lastResortResponse.data.graphql) {
          const userData = lastResortResponse.data.graphql.user;
          
          return NextResponse.json({
            username: userData.username,
            full_name: userData.full_name,
            is_private: userData.is_private,
            follower_count: userData.edge_followed_by?.count,
            following_count: userData.edge_follow?.count,
            profile_pic_url: userData.profile_pic_url,
            source: 'last_resort_api'
          });
        }
      } catch (lastError) {
        console.error('Todas as tentativas falharam:', lastError);
      }
      
      // Se todas as tentativas falharem, retorne um erro genérico
      return NextResponse.json(
        { 
          message: 'Erro ao verificar o perfil do Instagram', 
          error: error.message,
          details: error.response?.data || 'Sem detalhes adicionais'
        },
        { status: 500 }
      );
    }
  }
}
