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
    const username = context.params.username;
    
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

async function fetchWithApifyAPI(username: string, onlyReels: boolean) {
  try {
    const apiKey = process.env.APIFY_API_KEY || process.env.NEXT_PUBLIC_APIFY_API_KEY;
    if (!apiKey) {
      throw new Error('Apify API key não encontrada');
    }

    console.log('Buscando posts com Apify API para:', username);
    
    // Preparar o input para o Apify Actor
    const input = {
      addParentData: false,
      directUrls: [
        `https://www.instagram.com/${username}`
      ],
      enhanceUserSearchWithFacebookPage: false,
      isUserReelFeedURL: onlyReels,
      isUserTaggedFeedURL: false,
      resultsLimit: 30,
      resultsType: onlyReels ? "stories" : "posts",
      searchLimit: 1,
      searchType: "user",
      username: username
    };
    
    // Chamar o Apify Actor para buscar posts
    const response = await axios.post(
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/runs?token=${apiKey}`,
      input,
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
    let maxAttempts = 30; // Limite de tentativas para evitar loop infinito
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
    
    if (!runFinished) {
      throw new Error('Tempo limite excedido ao aguardar a conclusão da execução do Apify');
    }
    
    // Obter os resultados da execução
    const datasetResponse = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );
    
    const apifyPosts = datasetResponse.data;
    console.log(`Recebidos ${apifyPosts.length} posts do Apify`);
    
    // Processar os posts recebidos do Apify
    const formattedPosts = apifyPosts.map((post: any) => {
      // Determinar o tipo de mídia
      const isVideo = post.type === 'Video' || post.videoUrl;
      const isCarousel = post.type === 'Carousel' || (post.childPosts && post.childPosts.length > 0);
      const isReel = post.type === 'ReelVideo' || post.productType === 'clips' || 
                    (isVideo && post.url && post.url.includes('/reel/'));
      
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
          username: post.ownerUsername || username,
          full_name: post.ownerFullName || '',
          id: post.ownerId || ''
        }
      };
    });
    
    // Filtrar apenas reels se necessário
    const filteredPosts = onlyReels 
      ? formattedPosts.filter((post: ProcessedPost) => post.is_reel)
      : formattedPosts;
    
    // Limitar a apenas 12 posts
    const limitedPosts = filteredPosts.slice(0, 12);
    
    // Extrair informações do perfil (se disponível)
    let profileData = {};
    if (limitedPosts.length > 0) {
      const firstPost = limitedPosts[0];
      profileData = {
        username: firstPost.owner.username || username,
        full_name: firstPost.owner.full_name || '',
        biography: '',  // Apify não retorna biografia no endpoint de posts
        followers_count: 0,  // Apify não retorna contagem de seguidores no endpoint de posts
        following_count: 0,  // Apify não retorna contagem de seguidos no endpoint de posts
        profile_pic_url: '',  // Apify não retorna foto de perfil no endpoint de posts
        is_private: false,  // Apify não retorna status privado no endpoint de posts
        is_verified: false,  // Apify não retorna status verificado no endpoint de posts
        media_count: limitedPosts.length
      };
    } else {
      profileData = {
        username: username,
        full_name: '',
        biography: '',
        followers_count: 0,
        following_count: 0,
        profile_pic_url: '',
        is_private: false,
        is_verified: false,
        media_count: 0
      };
    }
    
    console.log(`Total de posts processados: ${limitedPosts.length}`);
    
    // Retornar no formato esperado pela aplicação
    return {
      status: 'success',
      data: {
        user: profileData,
        items: limitedPosts
      }
    };
  } catch (error) {
    console.error('Erro na Apify API para posts:', error);
    throw error;
  }
}
