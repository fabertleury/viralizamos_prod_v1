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
    // Usando a API GraphQL pública do Instagram
    // Esta abordagem faz uma requisição direta para a API do Instagram sem usar um token de autenticação
    const response = await axios.get(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      }
    });

    // Verificando a estrutura da resposta
    if (!response.data || !response.data.graphql) {
      // Tentando uma abordagem alternativa se a primeira falhar
      const alternativeResponse = await axios.get(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.5',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (alternativeResponse.data && alternativeResponse.data.data && alternativeResponse.data.data.user) {
        const userData = alternativeResponse.data.data.user;
        return NextResponse.json({
          username: userData.username,
          full_name: userData.full_name,
          is_private: userData.is_private,
          follower_count: userData.edge_followed_by?.count,
          following_count: userData.edge_follow?.count,
          profile_pic_url: userData.profile_pic_url,
          raw_data: userData,
          source: 'alternative_api'
        });
      } else {
        throw new Error('Não foi possível obter informações do perfil');
      }
    }

    // Extraindo os dados do usuário da resposta GraphQL
    const userData = response.data.graphql.user;
    
    return NextResponse.json({
      username: userData.username,
      full_name: userData.full_name,
      is_private: userData.is_private,
      follower_count: userData.edge_followed_by?.count,
      following_count: userData.edge_follow?.count,
      profile_pic_url: userData.profile_pic_url,
      raw_data: userData,
      source: 'graphql_api'
    });
  } catch (error: any) {
    console.error('Erro ao verificar perfil do Instagram:', error);
    
    // Tentando uma abordagem alternativa se as anteriores falharem
    try {
      const scrapingResponse = await axios.get(`https://www.instagram.com/${username}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        }
      });
      
      // Procurando por padrões no HTML para determinar se o perfil é privado
      const htmlContent = scrapingResponse.data;
      
      // Verificando se o perfil existe
      if (htmlContent.includes('Page Not Found') || htmlContent.includes('página não está disponível')) {
        return NextResponse.json(
          { message: 'Perfil não encontrado' },
          { status: 404 }
        );
      }
      
      // Verificando se o perfil é privado
      const isPrivate = htmlContent.includes('This Account is Private') || 
                        htmlContent.includes('Esta conta é privada') ||
                        htmlContent.includes('"is_private":true');
      
      // Tentando extrair dados básicos do perfil
      let fullName = '';
      let followerCount = null;
      let followingCount = null;
      
      // Tentativa de extrair o nome completo
      const fullNameMatch = htmlContent.match(/"full_name":"([^"]+)"/);
      if (fullNameMatch && fullNameMatch[1]) {
        fullName = fullNameMatch[1];
      }
      
      return NextResponse.json({
        username,
        full_name: fullName,
        is_private: isPrivate,
        follower_count: followerCount,
        following_count: followingCount,
        source: 'html_scraping'
      });
    } catch (scrapingError) {
      console.error('Erro ao fazer scraping do perfil:', scrapingError);
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
