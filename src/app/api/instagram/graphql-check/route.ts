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
    { id: 4, name: 'instagram230', enabled: true, order: 3, max_requests: 100, current_requests: 0 },
    { id: 5, name: 'instagram_statistics', enabled: true, order: 4, max_requests: 50, current_requests: 0 }
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

  // Obter a última API usada para este usuário
  let lastUsedApi = null;
  try {
    const { data, error } = await supabase
      .from('instagram_verification_history')
      .select('api_name')
      .eq('username', username)
      .order('verified_at', { ascending: false })
      .limit(1);

    if (!error && data && data.length > 0) {
      lastUsedApi = data[0].api_name;
      console.log(`Última API usada para ${username}: ${lastUsedApi}`);
    }
  } catch (error) {
    console.error('Erro ao verificar histórico de APIs:', error);
  }

  // Filtrar apenas APIs habilitadas
  let enabledApis = apiOrder.filter(api => api.enabled);

  // Se houver uma última API usada, reordene para evitar usá-la primeiro
  if (lastUsedApi) {
    // Remover a última API usada da lista
    const lastApiIndex = enabledApis.findIndex(api => api.name === lastUsedApi);
    if (lastApiIndex !== -1) {
      const lastApi = enabledApis.splice(lastApiIndex, 1)[0];
      // Adicionar a última API usada ao final da lista
      enabledApis.push(lastApi);
    }
  } else {
    // Ordenar APIs pela ordem definida se não houver histórico
    enabledApis.sort((a, b) => a.order - b.order);
  }

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

  // Função para registrar a API usada no histórico
  const updateVerificationHistory = async (apiName: string) => {
    try {
      // Primeiro, excluir qualquer registro existente para este usuário e API
      await supabase
        .from('instagram_verification_history')
        .delete()
        .match({ username, api_name: apiName });

      // Inserir o novo registro
      const { error } = await supabase
        .from('instagram_verification_history')
        .insert({
          username,
          api_name: apiName,
          verified_at: new Date().toISOString()
        });

      if (error) {
        console.error(`Erro ao atualizar histórico para ${apiName}:`, error);
      }
    } catch (error) {
      console.error(`Erro ao atualizar histórico para ${apiName}:`, error);
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

          // Verificar o caminho correto da resposta
          if (response.data && 
              response.data.status === 'done' && 
              response.data.response && 
              response.data.response.body && 
              response.data.response.body.data && 
              response.data.response.body.data.user) {
            
            const userData = response.data.response.body.data.user;
            
            // Atualizar contador de requisições
            await updateRequestCount('rocketapi_get_info');
            
            // Registrar no histórico
            await updateVerificationHistory('rocketapi_get_info');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.full_name,
              is_private: userData.is_private,
              follower_count: userData.edge_followed_by?.count,
              following_count: userData.edge_follow?.count,
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

          // Verificar a estrutura da resposta e extrair os dados do usuário
          if (response.data) {
            // A API pode retornar os dados do usuário diretamente ou dentro de um objeto 'user'
            const userData = response.data.user || response.data;
            
            // Verificar se temos as informações necessárias
            if (userData && (userData.username || userData.is_private !== undefined)) {
              // Atualizar contador de requisições
              await updateRequestCount('instagram_scraper');
              
              // Registrar no histórico
              await updateVerificationHistory('instagram_scraper');
              
              // Verificar se o perfil é privado
              const isPrivate = userData.is_private === true || 
                               userData.private === true || 
                               userData.is_private === 'true' || 
                               userData.private === 'true';
              
              return NextResponse.json({
                username: userData.username || username,
                full_name: userData.full_name || userData.fullname || '',
                is_private: isPrivate,
                follower_count: userData.follower_count || userData.edge_followed_by?.count || 0,
                following_count: userData.following_count || userData.edge_follow?.count || 0,
                profile_pic_url: userData.profile_pic_url || userData.profile_pic_url_hd || '',
                source: 'instagram_scraper'
              });
            }
          }
        } catch (error) {
          console.error('Erro na API Instagram Scraper:', error);
        }
      }

      // Instagram230 API (100 requisições/mês)
      else if (api.name === 'instagram230') {
        try {
          const response = await axios.request({
            method: 'GET',
            url: 'https://instagram230.p.rapidapi.com/user/details',
            params: {
              username: username
            },
            headers: {
              'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
              'x-rapidapi-host': 'instagram230.p.rapidapi.com'
            }
          });

          // Verificar a estrutura da resposta
          if (response.data && response.data.username) {
            const userData = response.data;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram230');
            
            // Registrar no histórico
            await updateVerificationHistory('instagram230');
            
            return NextResponse.json({
              username: userData.username,
              full_name: userData.user_full_name || '',
              is_private: userData.is_private === true,
              follower_count: userData.number_of_followers || 0,
              following_count: userData.number_of_following || 0,
              profile_pic_url: userData.profile_pic_url || '',
              source: 'instagram230'
            });
          }
        } catch (error) {
          console.error('Erro na API Instagram230:', error);
        }
      }

      // Instagram Statistics API (50 requisições/mês)
      else if (api.name === 'instagram_statistics') {
        try {
          const response = await axios.request({
            method: 'GET',
            url: 'https://instagram-statistics-api.p.rapidapi.com/community',
            params: {
              url: `https://www.instagram.com/${username}/`
            },
            headers: {
              'x-rapidapi-key': 'cbfd294384msh525c1f1508b114ap1863a2jsn6c295cc5d3c8',
              'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com'
            }
          });

          // Verificar a estrutura da resposta
          if (response.data && response.data.data && response.data.data.screenName) {
            const userData = response.data.data;
            
            // Atualizar contador de requisições
            await updateRequestCount('instagram_statistics');
            
            // Registrar no histórico
            await updateVerificationHistory('instagram_statistics');
            
            return NextResponse.json({
              username: userData.screenName,
              full_name: userData.name || '',
              is_private: false, // Esta API não fornece informação sobre perfil privado
              follower_count: userData.usersCount || 0,
              following_count: 0, // Esta API não fornece contagem de seguindo
              profile_pic_url: userData.image || '',
              source: 'instagram_statistics'
            });
          }
        } catch (error) {
          console.error('Erro na API Instagram Statistics:', error);
        }
      }
    } catch (error) {
      console.error(`Erro ao processar API ${api.name}:`, error);
    }
  }

  // Se nenhuma API funcionou, retornar erro
  return NextResponse.json(
    { message: 'Não foi possível verificar o perfil do Instagram' },
    { status: 500 }
  );
}
