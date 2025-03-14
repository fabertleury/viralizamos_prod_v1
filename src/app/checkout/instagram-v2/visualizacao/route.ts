import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Interface para os posts do Instagram
interface InstagramPost {
  id: string;
  code: string;
  shortcode?: string;
  media_type: number;
  is_video: boolean;
  is_carousel?: boolean;
  is_reel?: boolean;
  like_count: number;
  comment_count: number;
  views_count?: number;
  view_count?: number;
  caption: string | { text: string };
  image_url?: string;
  display_url?: string;
  thumbnail_src?: string;
  carousel_media?: any[];
  carousel_media_count?: number;
  product_type?: string;
  link?: string;
}

// Interface para a resposta da API ScapeCreators
interface ScapeCreatorsResponse {
  num_results: number;
  more_available: boolean;
  auto_load_more_enabled: boolean;
  items: any[];
  status: string;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  const type = url.searchParams.get('type');
  const onlyReels = type === 'reels';

  if (!username) {
    return NextResponse.json(
      { error: 'Username não fornecido' },
      { status: 400 }
    );
  }

  try {
    console.log(`Buscando visualizações (posts e reels) para o usuário: ${username}`);
    
    // Buscar posts e reels com a API do ScapeCreators
    const [postsData, reelsData] = await Promise.all([
      fetchPostsWithScapeCreatorsAPI(username),
      fetchReelsWithScapeCreatorsAPI(username)
    ]);
    
    // Verificar se temos dados de posts ou reels
    const hasPosts = postsData && postsData.items && postsData.items.length > 0;
    const hasReels = reelsData && reelsData.items && reelsData.items.length > 0;
    
    // Se não temos nenhum dado, retornar mensagem de erro
    if (!hasPosts && !hasReels) {
      console.warn('Nenhum post ou reel encontrado para o usuário');
      return NextResponse.json({ 
        posts: [],
        hasPosts: false,
        hasReels: false,
        postsCount: 0,
        reelsCount: 0,
        message: 'Nenhum post ou reel encontrado para este perfil',
        status: 'success'
      }, { status: 200 });
    }
    
    // Preparar os dados para retornar
    const result = {
      posts: hasPosts ? postsData.items : [],
      reels: hasReels ? reelsData.items : [],
      hasPosts,
      hasReels,
      postsCount: hasPosts ? postsData.items.length : 0,
      reelsCount: hasReels ? reelsData.items.length : 0,
      status: 'success'
    };
    
    console.log(`Dados de visualização processados: { postsCount: ${result.postsCount}, reelsCount: ${result.reelsCount}, hasPosts: ${result.hasPosts}, hasReels: ${result.hasReels} }`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar posts e reels:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar posts e reels do Instagram' },
      { status: 500 }
    );
  }
}

// Cache para armazenar resultados de consultas recentes
const postsCache = new Map();
const reelsCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos em milissegundos

async function fetchPostsWithScapeCreatorsAPI(username: string) {
  try {
    // Verificar se temos dados em cache para este usuário
    const cachedData = postsCache.get(username);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Usando dados em cache para posts de ${username}`);
      return cachedData.data;
    }
    
    console.log(`Buscando posts para o usuário ${username} com ScapeCreators API`);
    
    // Configurar a API key do ScapeCreators
    const apiKey = process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_SCRAPECREATORS_API_KEY não está configurada nas variáveis de ambiente');
    }
    
    // Configurar a URL da API
    const apiUrl = 'https://api.scrapecreators.com/v2/instagram/user/posts';
    
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
    
    // Verificar se a resposta tem o formato esperado
    if (!response.data) {
      console.log('Nenhum post encontrado para o usuário ' + username + ' com ScapeCreators API');
      return { items: [] };
    }
    
    // Processar os posts para o formato esperado pela aplicação
    const processedData = processScapeCreatorsPostsResponse(response.data);
    
    // Armazenar em cache
    postsCache.set(username, {
      data: processedData,
      timestamp: Date.now()
    });
    
    return processedData;
  } catch (error) {
    console.error('Erro ao buscar posts com ScapeCreators API:', error);
    return { items: [] };
  }
}

async function fetchReelsWithScapeCreatorsAPI(username: string) {
  try {
    // Verificar se temos dados em cache para este usuário
    const cachedData = reelsCache.get(username);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Usando dados em cache para reels de ${username}`);
      return cachedData.data;
    }
    
    console.log(`Buscando reels para o usuário ${username} com ScapeCreators API`);
    
    // Configurar a API key do ScapeCreators
    const apiKey = process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_SCRAPECREATORS_API_KEY não está configurada nas variáveis de ambiente');
    }
    
    // Configurar a URL da API - Usando o endpoint correto para reels
    const apiUrl = 'https://api.scrapecreators.com/v1/instagram/user/reels';
    
    // Fazer a requisição para a API ScapeCreators
    const response = await axios.get(apiUrl, {
      params: {
        user_id: username
      },
      headers: {
        'x-api-key': apiKey
      },
      timeout: 30000 // 30 segundos de timeout
    });
    
    // Verificar se a resposta tem o formato esperado
    if (!response.data || !response.data.items || !Array.isArray(response.data.items)) {
      console.log('Nenhum reel encontrado para o usuário ' + username + ' com ScapeCreators API');
      return { items: [] };
    }
    
    // Processar os reels para o formato esperado pela aplicação
    const processedData = processScapeCreatorsReelsResponse(response.data);
    
    // Armazenar em cache
    reelsCache.set(username, {
      data: processedData,
      timestamp: Date.now()
    });
    
    return processedData;
  } catch (error) {
    console.error('Erro ao buscar reels com ScapeCreators API:', error);
    return { items: [] };
  }
}

function processScapeCreatorsPostsResponse(data: any): any {
  // Verificar se temos os itens na resposta
  if (!data.items || !Array.isArray(data.items)) {
    return { items: [] };
  }
  
  // Filtrar apenas posts (não reels)
  const postsOnly = data.items.filter((item: any) => {
    const isReel = item.media_type === 2 || item.product_type === 'clips' || 
                  (item.video_url && item.video_duration > 0) ||
                  (item.is_video === true);
    return !isReel;
  });
  
  // Processar cada item para o formato esperado pela aplicação
  const processedItems = postsOnly.map((item: any) => {
    return {
      id: item.id,
      code: item.shortcode || item.code,
      shortcode: item.shortcode || item.code,
      media_type: item.media_type || 1,
      is_video: false,
      is_carousel: item.carousel_media_count > 0 || item.carousel_media?.length > 0,
      is_reel: false,
      like_count: item.like_count || 0,
      comment_count: item.comment_count || 0,
      views_count: 0,
      caption: typeof item.caption === 'string' ? { text: item.caption } : item.caption,
      image_url: item.display_url || item.thumbnail_src,
      display_url: item.display_url || item.thumbnail_src,
      thumbnail_url: item.thumbnail_src || item.display_url,
      link: item.permalink || `https://www.instagram.com/p/${item.shortcode || item.code}/`,
      carousel_media: item.carousel_media,
      carousel_media_count: item.carousel_media_count
    };
  });
  
  return {
    items: processedItems,
    num_results: processedItems.length,
    more_available: data.more_available
  };
}

function processScapeCreatorsReelsResponse(data: any): any {
  // Verificar se temos os itens na resposta
  if (!data.items || !Array.isArray(data.items)) {
    return { items: [] };
  }
  
  // Processar cada item para o formato esperado pela aplicação
  const processedItems = data.items.map((item: any) => {
    return {
      id: item.id || item.pk,
      code: item.code,
      shortcode: item.code,
      media_type: 2, // Reels são sempre vídeos
      is_video: true,
      is_carousel: false,
      is_reel: true,
      like_count: item.like_count || 0,
      comment_count: item.comment_count || 0,
      views_count: item.play_count || item.view_count || 0,
      caption: item.caption,
      image_url: item.display_uri || item.image_versions2?.candidates?.[0]?.url,
      display_url: item.display_uri || item.image_versions2?.candidates?.[0]?.url,
      thumbnail_url: item.display_uri || item.image_versions2?.candidates?.[0]?.url,
      link: `https://www.instagram.com/reel/${item.code}/`,
      video_url: item.video_versions?.[0]?.url,
      product_type: 'clips'
    };
  });
  
  return {
    items: processedItems,
    num_results: processedItems.length,
    more_available: data.more_available
  };
}
