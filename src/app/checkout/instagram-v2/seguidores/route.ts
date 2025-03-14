import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Interface para o perfil do Instagram
interface InstagramProfile {
  username: string;
  full_name: string;
  biography?: string;
  followers_count: number;
  following_count: number;
  profile_pic_url: string;
  is_private: boolean;
  is_verified: boolean;
  media_count?: number;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username não fornecido' },
      { status: 400 }
    );
  }

  try {
    console.log(`Buscando informações do perfil para o usuário: ${username}`);
    
    // Buscar informações do perfil com a API do ScapeCreators
    const profileData = await fetchWithScapeCreatorsAPI(username);
    
    if (!profileData) {
      console.warn(`Nenhuma informação de perfil encontrada para o usuário`);
      return NextResponse.json({ 
        profile: null,
        hasProfile: false,
        message: `Nenhuma informação de perfil encontrada para este usuário`,
        status: 'success'
      }, { status: 200 });
    }
    
    return NextResponse.json({
      profile: profileData,
      hasProfile: true,
      status: 'success'
    });
  } catch (error) {
    console.error('Erro ao buscar informações do perfil:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar informações do perfil do Instagram' },
      { status: 500 }
    );
  }
}

// Cache para armazenar resultados de consultas recentes
const profileCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos em milissegundos

async function fetchWithScapeCreatorsAPI(username: string) {
  try {
    // Verificar se temos dados em cache para este usuário
    const cacheKey = `${username}_profile`;
    const cachedData = profileCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Usando dados em cache para o perfil de ${username}`);
      return cachedData.data;
    }
    
    console.log(`Buscando informações do perfil para o usuário ${username} com ScapeCreators API`);
    
    // Configurar a API key do ScapeCreators
    const apiKey = process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_SCRAPECREATORS_API_KEY não está configurada nas variáveis de ambiente');
    }
    
    // Configurar a URL da API - usamos o endpoint de informações do usuário
    const apiUrl = `https://api.scrapecreators.com/v2/instagram/user/info`;
    
    // Fazer a requisição para a API ScapeCreators
    const response = await axios.get(apiUrl, {
      params: {
        handle: username
      },
      headers: {
        'x-api-key': apiKey
      },
      timeout: 30000 // 30 segundos de timeout
    });
    
    console.log('Resposta da ScapeCreators API recebida');
    
    // Verificar se a resposta tem o formato esperado
    if (!response.data || !response.data.user) {
      throw new Error('Resposta vazia ou inválida da API ScapeCreators');
    }
    
    // Processar os dados do perfil para o formato esperado pela aplicação
    const user = response.data.user;
    const profileData = {
      username: user.username,
      full_name: user.full_name,
      biography: user.biography || '',
      followers_count: user.follower_count || user.followers_count || 0,
      following_count: user.following_count || 0,
      profile_pic_url: user.profile_pic_url,
      is_private: user.is_private || false,
      is_verified: user.is_verified || false,
      media_count: user.media_count || 0
    };
    
    // Armazenar em cache
    profileCache.set(cacheKey, {
      data: profileData,
      timestamp: Date.now()
    });
    
    return profileData;
  } catch (error) {
    console.error('Erro ao buscar dados com ScapeCreators API:', error);
    throw error;
  }
}
