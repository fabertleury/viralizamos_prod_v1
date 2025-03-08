import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Criar cliente do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Interface para a ordem das APIs
interface ApiOrder {
  id: number;
  name: string;
  enabled: boolean;
  order: number;
  max_requests: number;
  current_requests: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { message: 'Nome de usuário é obrigatório' },
      { status: 400 }
    );
  }

  // Obter a ordem das APIs do Supabase
  let apiOrder: ApiOrder[] = [
    { id: 1, name: 'rocketapi_get_info', enabled: true, order: 1, max_requests: 100, current_requests: 0 },
    { id: 2, name: 'instagram_scraper', enabled: true, order: 2, max_requests: 50, current_requests: 0 },
    { id: 3, name: 'instagram360', enabled: true, order: 3, max_requests: 50, current_requests: 0 },
    { id: 4, name: 'instagram_scraper_ai', enabled: true, order: 4, max_requests: 30, current_requests: 0 },
    { id: 5, name: 'realtime_instagram_scraper', enabled: true, order: 5, max_requests: 50, current_requests: 0 },
    { id: 6, name: 'instagram_public_api', enabled: true, order: 6, max_requests: 1000, current_requests: 0 },
    { id: 7, name: 'instagram_web_profile_api', enabled: true, order: 7, max_requests: 1000, current_requests: 0 },
    { id: 8, name: 'instagram_dimensions_api', enabled: true, order: 8, max_requests: 1000, current_requests: 0 },
    { id: 9, name: 'html_scraping', enabled: true, order: 9, max_requests: 1000, current_requests: 0 }
  ];

  try {
    // Tentar obter a ordem das APIs do banco de dados
    const { data, error } = await supabase
      .from('api_order')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Erro ao obter ordem das APIs:', error);
    } else if (data && data.length > 0) {
      apiOrder = data;
    }
  } catch (error) {
    console.error('Erro ao acessar o Supabase:', error);
  }

  // Filtrar apenas APIs habilitadas
  const enabledApis = apiOrder.filter(api => api.enabled);

  // Ordenar APIs pela ordem definida
  enabledApis.sort((a, b) => a.order - b.order);

  // Função para atualizar o contador de requisições
  const updateRequestCount = async (apiName: string) => {
    try {
      const apiToUpdate = apiOrder.find(api => api.name === apiName);
      if (apiToUpdate) {
        const { error } = await supabase
          .from('api_order')
          .update({ current_requests: apiToUpdate.current_requests + 1 })
          .eq('id', apiToUpdate.id);

        if (error) {
          console.error(`Erro ao atualizar contador para ${apiName}:`, error);
        }
      }
    } catch (error) {
      console.error(`Erro ao atualizar contador para ${apiName}:`, error);
    }
  };

  // Tentar cada API na ordem definida
  for (const api of enabledApis) {
    try {
      let result = null;

      // RocketAPI - Get Info (100 requisições/mês)
      if (api.name === 'rocketapi_get_info') {
        try {
          const response = await axios.request({
            method: 'POST',
            url: 'https://rocketapi-for-developers.p.rapidapi.com/instagram/user/get_info',
            headers: {
              'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
              'x-rapidapi-host': 'rocketapi-for-developers.p.rapidapi.com',
              'Content-Type': 'application/json'
            },
            data: {
              username: username
            }
          });

          if (response.data && response.data.data && response.data.data.user) {
            const userData = response.data.data.user;
            
            // Atualizar contador de requisições
            await updateRequestCount('rocketapi_get_info');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name,
              is_private: userData.is_private,
              follower_count: userData.follower_count,
              following_count: userData.following_count,
              profile_pic_url: userData.profile_pic_url,
              source: 'rocketapi_get_info'
            });
          }
        } catch (error) {
          console.error('Erro na API RocketAPI Get Info:', error);
        }
      }

      // Instagram Scraper (50 requisições/mês)
      else if (api.name === 'instagram_scraper') {
        try {
          const response = await axios.request({
            method: 'GET',
            url: 'https://instagram-scraper-20251.p.rapidapi.com/userinfo/',
            params: {
              username_or_id_or_url: username
            },
            headers: {
              'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
              'x-rapidapi-host': 'instagram-scraper-20251.p.rapidapi.com'
            }
          });

          if (response.data && response.data.user) {
            const userData = response.data.user;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram_scraper');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name || userData.fullname,
              is_private: userData.is_private,
              follower_count: userData.follower_count || userData.edge_followed_by?.count,
              following_count: userData.following_count || userData.edge_follow?.count,
              profile_pic_url: userData.profile_pic_url,
              source: 'instagram_scraper'
            });
          }
        } catch (error) {
          console.error('Erro na API Instagram Scraper:', error);
        }
      }

      // Instagram360 (50 requisições/mês)
      else if (api.name === 'instagram360') {
        try {
          const response = await axios.request({
            method: 'GET',
            url: 'https://instagram360.p.rapidapi.com/userinfo/',
            params: {
              username_or_id_or_url: username
            },
            headers: {
              'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
              'x-rapidapi-host': 'instagram360.p.rapidapi.com'
            }
          });

          if (response.data && response.data.user) {
            const userData = response.data.user;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram360');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name || userData.fullname,
              is_private: userData.is_private,
              follower_count: userData.follower_count || userData.edge_followed_by?.count,
              following_count: userData.following_count || userData.edge_follow?.count,
              profile_pic_url: userData.profile_pic_url,
              source: 'instagram360'
            });
          }
        } catch (error) {
          console.error('Erro na API Instagram360:', error);
        }
      }

      // Instagram Scraper AI (30 requisições/mês)
      else if (api.name === 'instagram_scraper_ai') {
        try {
          const response = await axios.request({
            method: 'GET',
            url: 'https://instagram-scraper-ai1.p.rapidapi.com/user/info_v2/',
            params: {
              username: username
            },
            headers: {
              'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
              'x-rapidapi-host': 'instagram-scraper-ai1.p.rapidapi.com'
            }
          });

          if (response.data && response.data.data) {
            const userData = response.data.data;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram_scraper_ai');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name || userData.fullname,
              is_private: userData.is_private,
              follower_count: userData.follower_count || userData.edge_followed_by?.count,
              following_count: userData.following_count || userData.edge_follow?.count,
              profile_pic_url: userData.profile_pic_url,
              source: 'instagram_scraper_ai'
            });
          }
        } catch (error) {
          console.error('Erro na API Instagram Scraper AI:', error);
        }
      }

      // Real-Time Instagram Scraper (50 requisições/mês)
      else if (api.name === 'realtime_instagram_scraper') {
        try {
          const response = await axios.request({
            method: 'GET',
            url: 'https://real-time-instagram-scraper-api1.p.rapidapi.com/v1/user_info',
            params: {
              username_or_id: username
            },
            headers: {
              'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
              'x-rapidapi-host': 'real-time-instagram-scraper-api1.p.rapidapi.com'
            }
          });

          if (response.data && response.data.data) {
            const userData = response.data.data;
            
            // Atualizar contador de requisições
            await updateRequestCount('realtime_instagram_scraper');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name || userData.fullname,
              is_private: userData.is_private,
              follower_count: userData.follower_count || userData.edge_followed_by?.count,
              following_count: userData.following_count || userData.edge_follow?.count,
              profile_pic_url: userData.profile_pic_url,
              source: 'realtime_instagram_scraper'
            });
          }
        } catch (error) {
          console.error('Erro na API Real-Time Instagram Scraper:', error);
        }
      }

      // API pública do Instagram
      else if (api.name === 'instagram_public_api') {
        try {
          const response = await axios.get(`https://www.instagram.com/${username}/?__a=1&__d=dis`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.5',
            }
          });

          if (response.data && response.data.graphql && response.data.graphql.user) {
            const userData = response.data.graphql.user;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram_public_api');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name,
              is_private: userData.is_private,
              follower_count: userData.edge_followed_by?.count,
              following_count: userData.edge_follow?.count,
              profile_pic_url: userData.profile_pic_url,
              source: 'instagram_public_api'
            });
          }
        } catch (error) {
          console.error('Erro na API pública do Instagram:', error);
        }
      }

      // API web_profile_info
      else if (api.name === 'instagram_web_profile_api') {
        try {
          const response = await axios.get(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'application/json',
              'X-IG-App-ID': '936619743392459'
            }
          });

          if (response.data && response.data.data && response.data.data.user) {
            const userData = response.data.data.user;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram_web_profile_api');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name,
              is_private: userData.is_private,
              follower_count: userData.edge_followed_by?.count,
              following_count: userData.edge_follow?.count,
              profile_pic_url: userData.profile_pic_url,
              source: 'instagram_web_profile_api'
            });
          }
        } catch (error) {
          console.error('Erro na API web_profile_info:', error);
        }
      }

      // API alternativa instagramdimensions
      else if (api.name === 'instagram_dimensions_api') {
        try {
          const response = await axios.get(`https://instagramdimensions.com/api/user-profile?username=${username}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
          });
          
          if (response.data && response.data.status === 'ok' && response.data.data) {
            const userData = response.data.data;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram_dimensions_api');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name,
              is_private: userData.is_private,
              follower_count: userData.edge_followed_by?.count,
              following_count: userData.edge_follow?.count,
              profile_pic_url: userData.profile_pic_url,
              source: 'instagram_dimensions_api'
            });
          }
        } catch (error) {
          console.error('Erro na API instagramdimensions:', error);
        }
      }

      // Web scraping direto
      else if (api.name === 'html_scraping') {
        try {
          const response = await axios.get(`https://www.instagram.com/${username}/`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            }
          });
          
          const htmlContent = response.data;
          
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
          
          // Tentativa de extrair o nome completo
          const fullNameMatch = htmlContent.match(/"full_name":"([^"]+)"/);
          if (fullNameMatch && fullNameMatch[1]) {
            fullName = fullNameMatch[1];
          }
          
          // Atualizar contador de requisições
          await updateRequestCount('html_scraping');
          
          return NextResponse.json({
            username,
            full_name: fullName,
            is_private: isPrivate,
            source: 'html_scraping'
          });
        } catch (error) {
          console.error('Erro no web scraping:', error);
        }
      }
    } catch (error) {
      console.error(`Erro ao usar a API ${api.name}:`, error);
    }
  }

  // Se todas as tentativas falharem
  return NextResponse.json(
    { message: 'Não foi possível verificar o status do perfil' },
    { status: 500 }
  );
}
