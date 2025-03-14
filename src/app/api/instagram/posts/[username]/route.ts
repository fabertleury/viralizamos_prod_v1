import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';

// Definir interfaces para melhorar a tipagem
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
  image_versions?: {
    items: Array<{ url: string }>
  };
  image_url?: string;
  display_url?: string;
  thumbnail_src?: string;
  carousel_media?: any[];
  carousel_media_count?: number;
  product_type?: string;
  link?: string;
}

interface ProcessedPost {
  id: string;
  code: string;
  media_type: number;
  is_video: boolean;
  is_carousel: boolean;
  is_reel: boolean;
  like_count: number;
  comment_count: number;
  views_count: number;
  caption: { text: string };
  link: string;
  image_versions?: {
    items: Array<{ url: string }>
  };
  carousel_items?: Array<{
    id: string;
    media_type: number;
    is_video: boolean;
    image_versions?: {
      items: Array<{ url: string }>
    };
  }>;
  carousel_media_count?: number;
}

export async function GET(
  request: NextRequest,
  context: { params: { username: string } }
) {
  const supabase = createClient();

  try {
    // Extrair o username diretamente dos parâmetros
    const params = await context.params;
    const username = params.username;
    
    // Verificar se queremos apenas reels
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const onlyReels = type === 'reels';
    
    console.log(`Buscando ${onlyReels ? 'reels' : 'posts'} para o usuário: ${username}`);
    
    // Buscar posts com a API do Apify
    const postsData = await fetchWithApifyAPI(username, onlyReels);
    
    if (!postsData || !postsData.data || !postsData.data.items || postsData.data.items.length === 0) {
      console.warn(`Nenhum ${onlyReels ? 'reel' : 'post'} encontrado para o usuário`);
      return NextResponse.json({ 
        posts: [],
        hasPosts: false,
        message: `Nenhum ${onlyReels ? 'reel' : 'post'} encontrado para este perfil`,
        status: 'success'
      }, { status: 200 });
    }
    
    return NextResponse.json({
      posts: postsData.data.items,
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

async function fetchWithApifyAPI(username: string, onlyReels: boolean = false) {
  try {
    // Verificar se temos dados em cache para este usuário
    const cacheKey = `${username}_${onlyReels ? 'reels' : 'posts'}`;
    const cachedData = postsCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
      console.log(`Usando dados em cache para ${username} (${onlyReels ? 'reels' : 'posts'})`);
      return cachedData.data;
    }
    
    console.log(`Buscando ${onlyReels ? 'reels' : 'posts'} para o usuário ${username} com Apify API`);
    
    // Configurar a API key do Apify
    const apiKey = process.env.APIFY_API_KEY;
    if (!apiKey) {
      throw new Error('APIFY_API_KEY não está configurada nas variáveis de ambiente');
    }
    
    // Configurar o input para o ator do Apify
    const input = {
      username: username,
      resultsLimit: 12, // Limitar o número de resultados para melhorar o desempenho
      resultsType: onlyReels ? 'reels' : 'posts',
      proxy: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL']
      },
      maxRequestRetries: 3, // Reduzir o número de tentativas para evitar longos tempos de espera
      maxConcurrency: 5 // Aumentar a concorrência para acelerar o processamento
    };
    
    // Iniciar a execução do ator
    const response = await axios.post(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?token=${apiKey}`,
      { 
        ...input,
        // Configurações adicionais para melhorar o desempenho
        memoryMbytes: 2048, // Aumentar a memória disponível
        timeoutSecs: 60 // Definir um timeout mais curto (60 segundos)
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Resposta inicial da Apify API recebida:', response.data);
    
    // Obter o ID da execução
    const runId = response.data.data.id;
    
    // Aguardar a conclusão da execução (polling)
    let runFinished = false;
    let maxAttempts = 15; // Reduzir o número máximo de tentativas (30 segundos no total)
    let attempts = 0;
    
    while (!runFinished && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguardar 2 segundos
      
      // Verificar o status da execução
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`
      );
      
      const status = statusResponse.data.data.status;
      console.log(`Status da execução do Apify: ${status} (tentativa ${attempts + 1})`);
      
      if (status === 'SUCCEEDED') {
        runFinished = true;
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Execução do Apify falhou com status: ${status}`);
      }
      
      attempts++;
    }
    
    // Se não terminou, mas não houve erro, tentar obter os resultados parciais
    if (!runFinished) {
      console.log('Tempo limite excedido, tentando obter resultados parciais...');
    }
    
    // Obter os resultados da execução (mesmo que parciais)
    const datasetResponse = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );
    
    const apifyPosts = datasetResponse.data;
    console.log(`Recebidos ${apifyPosts.length} posts do Apify`);
    
    // Se não temos dados e não terminou, aí sim lançamos erro
    if (apifyPosts.length === 0 && !runFinished) {
      throw new Error('Tempo limite excedido ao aguardar a conclusão da execução do Apify');
    }
    
    // Processar os posts recebidos do Apify
    const formattedPosts = apifyPosts.map((post: any) => {
      // Verificar se este é um reel (para filtrar se necessário)
      const isReel = post.product_type === 'clips' || post.is_reel || 
                    (post.media_type === 2 && post.product_type === 'feed');
      
      // Se estamos buscando apenas reels e este não é um reel, pular
      if (onlyReels && !isReel) {
        return null;
      }
      
      // Se estamos buscando apenas posts e este é um reel, pular
      if (!onlyReels && isReel) {
        return null;
      }
      
      // Processar o post
      return processPost(post, isReel);
    }).filter(Boolean); // Remover itens nulos
    
    // Armazenar no cache
    postsCache.set(cacheKey, {
      data: formattedPosts,
      timestamp: Date.now()
    });
    
    return {
      status: 'success',
      data: {
        user: {
          username: username,
          full_name: '',
          biography: '',
          followers_count: 0,
          following_count: 0,
          profile_pic_url: '',
          is_private: false,
          is_verified: false,
          media_count: formattedPosts.length
        },
        items: formattedPosts
      }
    };
  } catch (error) {
    console.error(`Erro na Apify API para ${onlyReels ? 'reels' : 'posts'}:`, error);
    throw error;
  }
}

function processPost(post: any, isReel: boolean) {
  // Determinar o tipo de mídia
  const isVideo = post.type === 'Video' || post.videoUrl;
  const isCarousel = post.type === 'Carousel' || (post.childPosts && post.childPosts.length > 0);
  
  // Extrair shortcode
  const shortCode = post.shortCode || '';
  
  // Processar itens do carrossel, se existirem
  const carouselItems = post.childPosts ? post.childPosts.map((child: any) => {
    const childIsVideo = child.type === 'Video' || child.videoUrl;
    return {
      id: child.id || '',
      media_type: childIsVideo ? 2 : 1,
      is_video: childIsVideo,
      image_versions: {
        items: [{ url: child.displayUrl || '' }]
      },
      video_url: child.videoUrl || ''
    };
  }) : [];
  
  // Criar uma URL proxy para as imagens para evitar problemas de CORS
  const proxyImageUrl = (url: string) => {
    // Se a URL já for do seu domínio ou estiver vazia, retorne como está
    if (!url || url.startsWith('/')) return url;
    
    // Usar uma URL de proxy para contornar as restrições de CORS
    try {
      // Retornar uma URL que será processada pelo servidor
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    } catch (error) {
      console.error('Erro ao processar URL de imagem:', error);
      return url;
    }
  };
  
  const displayUrl = proxyImageUrl(post.displayUrl || '');
  
  return {
    id: post.id?.toString() || '',
    code: shortCode,
    shortcode: shortCode,
    media_type: isVideo ? 2 : isCarousel ? 8 : 1,
    is_video: isVideo,
    is_carousel: isCarousel,
    is_reel: isReel,
    like_count: post.likesCount || 0,
    comment_count: post.commentsCount || 0,
    views_count: post.videoViewCount || 0,
    caption: { text: post.caption || '' },
    link: post.url || `https://www.instagram.com/p/${shortCode}/`,
    image_versions: {
      items: [{ url: displayUrl }]
    },
    display_url: displayUrl,
    thumbnail_src: displayUrl,
    video_url: post.videoUrl || '',
    carousel_items: carouselItems,
    carousel_media_count: carouselItems.length,
    type: isVideo ? 'video' : (isCarousel ? 'carousel' : 'image'),
    product_type: isReel ? 'clips' : undefined,
    timestamp: post.timestamp || new Date().toISOString(),
    owner: {
      username: post.ownerUsername || '',
      full_name: post.ownerFullName || '',
      id: post.ownerId || ''
    }
  };
}
