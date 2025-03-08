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
    { id: 3, name: 'realtime_instagram_scraper', enabled: true, order: 3, max_requests: 50, current_requests: 0 }
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

          // Verificar a estrutura da resposta
          if (response.data && 
              response.data.status === 'ok' && 
              response.data.data) {
            
            const userData = response.data.data;
            
            // Verificar se temos as informações necessárias
            if (userData.username) {
              // Atualizar contador de requisições
              await updateRequestCount('realtime_instagram_scraper');
              
              // Registrar no histórico
              await updateVerificationHistory('realtime_instagram_scraper');
              
              return NextResponse.json({
                username: userData.username,
                full_name: userData.full_name || '',
                is_private: userData.is_private === true,
                follower_count: userData.follower_count || 0,
                following_count: userData.following_count || 0,
                profile_pic_url: userData.profile_pic_url || userData.hd_profile_pic_url_info?.url || '',
                source: 'realtime_instagram_scraper'
              });
            }
          }
        } catch (error) {
          console.error('Erro na API Real-Time Instagram Scraper:', error);
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
