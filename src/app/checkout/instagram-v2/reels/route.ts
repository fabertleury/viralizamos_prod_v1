import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Interface para os reels do Instagram
interface InstagramReel {
  id: string;
  code: string;
  shortcode?: string;
  media_type: number;
  is_video: boolean;
  like_count: number;
  comment_count: number;
  views_count?: number;
  play_count?: number;
  view_count?: number;
  caption: string | { text: string };
  image_url?: string;
  display_url?: string;
  thumbnail_src?: string;
  video_url?: string;
  product_type?: string;
  link?: string;
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
    console.log(`Buscando reels para o usuário: ${username}`);
    
    // Buscar reels com a API do ScapeCreators
    const reelsData = await fetchReelsWithScapeCreatorsAPI(username);
    
    if (!reelsData || !reelsData.items || reelsData.items.length === 0) {
      console.warn(`Nenhum reel encontrado para o usuário ${username}`);
      return NextResponse.json({ 
        reels: [],
        hasReels: false,
        message: 'Nenhum reel encontrado para este perfil',
        status: 'success'
      }, { status: 200 });
    }
    
    return NextResponse.json({
      reels: reelsData.items,
      hasReels: true,
      reelsCount: reelsData.items.length,
      status: 'success'
    });
  } catch (error) {
    console.error('Erro ao buscar reels:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar reels do Instagram' },
      { status: 500 }
    );
  }
}

// Cache para armazenar resultados de consultas recentes
const reelsCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos em milissegundos

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
    const processedData = processReelsResponse(response.data);
    
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

function processReelsResponse(data: any): any {
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
