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
    console.log(`Buscando ${onlyReels ? 'reels' : 'posts'} para o usuário: ${username}`);
    
    // Buscar posts com a API do ScapeCreators
    const postsData = await fetchWithScapeCreatorsAPI(username, onlyReels);
    
    if (!postsData || !postsData.items || postsData.items.length === 0) {
      console.warn(`Nenhum ${onlyReels ? 'reel' : 'post'} encontrado para o usuário`);
      return NextResponse.json({ 
        posts: [],
        hasPosts: false,
        message: `Nenhum ${onlyReels ? 'reel' : 'post'} encontrado para este perfil`,
        status: 'success'
      }, { status: 200 });
    }
    
    return NextResponse.json({
      posts: postsData.items,
      hasPosts: true,
      status: 'success'
    });
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar posts do Instagram' },
      { status: 500 }
    );
  }
}

// Cache para armazenar resultados de consultas recentes
const postsCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos em milissegundos

async function fetchWithScapeCreatorsAPI(username: string, onlyReels: boolean = false) {
  try {
    // Verificar se temos dados em cache para este usuário
    const cacheKey = `${username}_${onlyReels ? 'reels' : 'posts'}`;
    const cachedData = postsCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Usando dados em cache para ${username} (${onlyReels ? 'reels' : 'posts'})`);
      return cachedData.data;
    }
    
    console.log(`Buscando ${onlyReels ? 'reels' : 'posts'} para o usuário ${username} com ScapeCreators API`);
    
    // Configurar a API key do ScapeCreators
    const apiKey = process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_SCRAPECREATORS_API_KEY não está configurada nas variáveis de ambiente');
    }
    
    // Configurar a URL da API
    const apiUrl = `https://api.scrapecreators.com/v2/instagram/user/${onlyReels ? 'reels' : 'posts'}`;
    
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
    if (!response.data) {
      throw new Error('Resposta vazia da API ScapeCreators');
    }
    
    // Processar os posts para o formato esperado pela aplicação
    const processedData = processScapeCreatorsResponse(response.data, onlyReels);
    
    // Armazenar em cache
    postsCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    });
    
    return processedData;
  } catch (error) {
    console.error('Erro ao buscar dados com ScapeCreators API:', error);
    throw error;
  }
}

function processScapeCreatorsResponse(data: ScapeCreatorsResponse, onlyReels: boolean): any {
  // Verificar se temos os itens na resposta
  if (!data.items || !Array.isArray(data.items)) {
    return { items: [] };
  }
  
  // Processar cada item para o formato esperado pela aplicação
  const processedItems = data.items.map(item => {
    // Determinar se é um reel
    const isReel = item.media_type === 2 || item.product_type === 'clips' || 
                  (item.video_url && item.video_duration > 0);
    
    // Se estamos buscando apenas reels e este item não é um reel, pular
    if (onlyReels && !isReel) {
      return null;
    }
    
    // Se estamos buscando apenas posts e este item é um reel, pular
    if (!onlyReels && isReel) {
      return null;
    }
    
    return {
      id: item.id,
      code: item.shortcode || item.code,
      shortcode: item.shortcode || item.code,
      media_type: item.media_type || (isReel ? 2 : 1),
      is_video: item.is_video || isReel,
      is_carousel: item.carousel_media_count > 0 || item.carousel_media?.length > 0,
      is_reel: isReel,
      like_count: item.like_count || 0,
      comment_count: item.comment_count || 0,
      views_count: item.view_count || item.video_view_count || 0,
      caption: typeof item.caption === 'string' ? { text: item.caption } : item.caption,
      image_url: item.display_url || item.thumbnail_src,
      display_url: item.display_url || item.thumbnail_src,
      thumbnail_url: item.thumbnail_src || item.display_url,
      link: item.permalink || `https://www.instagram.com/p/${item.shortcode || item.code}/`,
      carousel_media: item.carousel_media,
      carousel_media_count: item.carousel_media_count
    };
  }).filter(Boolean); // Remover itens nulos
  
  return {
    items: processedItems,
    num_results: processedItems.length,
    more_available: data.more_available
  };
}
