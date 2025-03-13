import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';

// Interface para o reel retornado pela API do Apify
interface ApifyReel {
  id?: number;
  type?: string;
  shortCode?: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  url?: string;
  commentsCount?: number;
  dimensionsHeight?: number;
  dimensionsWidth?: number;
  images?: string[];
  displayUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  videoViewCount?: number;
  timestamp?: string;
  ownerFullName?: string;
  ownerUsername?: string;
  ownerId?: number;
  productType?: string;
  isSponsored?: boolean;
  videoDuration?: number;
}

// Interface para o reel processado que será retornado pela API
interface ProcessedReel {
  id: string;
  code: string;
  shortcode: string;
  media_type: number;
  is_video: boolean;
  is_carousel: boolean;
  is_reel: boolean;
  like_count: number;
  comment_count: number;
  views_count: number;
  caption: { text: string };
  link: string;
  image_versions: { items: Array<{ url: string }> };
  display_url: string;
  thumbnail_url: string;
  video_url: string;
  video_duration: number;
  type: string;
  product_type: string;
  timestamp: string;
  owner: {
    username: string;
    full_name: string;
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  context: { params: { username: string } }
) {
  try {
    // Obter o nome de usuário da URL
    const username = context.params.username;
    
    if (!username) {
      return NextResponse.json(
        { 
          error: 'Nome de usuário não fornecido' 
        },
        { status: 400 }
      );
    }

    console.log('Buscando reels para o usuário:', username);
    
    // Buscar reels usando a API do Apify
    const reels = await fetchWithApifyAPI(username);
    
    // Verificar se foram encontrados reels
    if (!reels || reels.length === 0) {
      return NextResponse.json(
        { 
          hasReels: false,
          message: `Nenhum reel encontrado para o usuário ${username}`,
          reels: []
        },
        { status: 200 }
      );
    }
    
    // Extrair informações do perfil (se disponível)
    let profileData = {};
    if (reels.length > 0) {
      const firstReel = reels[0];
      profileData = {
        username: firstReel.owner.username || username,
        full_name: firstReel.owner.full_name || '',
        biography: '',
        followers_count: 0,
        following_count: 0,
        profile_pic_url: '',
        is_private: false,
        is_verified: false,
        media_count: reels.length
      };
    }
    
    // Retornar os reels encontrados no mesmo formato que a API de posts
    return NextResponse.json(
      { 
        hasReels: true,
        message: `${reels.length} reels encontrados para o usuário ${username}`,
        reels: reels,
        data: {
          user: profileData,
          items: reels
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao buscar reels:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar reels',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

async function fetchWithApifyAPI(username: string): Promise<ProcessedReel[]> {
  try {
    const apiKey = process.env.APIFY_API_KEY || process.env.NEXT_PUBLIC_APIFY_API_KEY;
    if (!apiKey) {
      throw new Error('Apify API key não encontrada');
    }

    console.log('Buscando reels com Apify API para:', username);
    
    // Preparar o input para o Apify Actor específico para reels
    const input = {
      addParentData: false,
      directUrls: [
        `https://www.instagram.com/${username}`
      ],
      enhanceUserSearchWithFacebookPage: false,
      isUserReelFeedURL: false,
      isUserTaggedFeedURL: false,
      resultsLimit: 12,
      resultsType: "stories",
      searchLimit: 1,
      searchType: "hashtag",
      username: username
    };
    
    // Chamar o Apify Actor para buscar reels
    const response = await axios.post(
      `https://api.apify.com/v2/acts/xMc5Ga1oCONPmWJIa/runs?token=${apiKey}`,
      input,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Resposta inicial da Apify API para reels recebida:', response.data);
    
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
      console.log(`Status da execução do Apify para reels: ${status} (tentativa ${attempts + 1})`);
      
      if (status === 'SUCCEEDED') {
        runFinished = true;
      } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
        throw new Error(`Execução do Apify para reels falhou com status: ${status}`);
      }
      
      attempts++;
    }
    
    if (!runFinished) {
      throw new Error('Tempo limite excedido ao aguardar a conclusão da execução do Apify para reels');
    }
    
    // Obter os resultados da execução
    const datasetResponse = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
    );
    
    const responseData = datasetResponse.data;
    console.log('Resposta completa da Apify API para reels:', JSON.stringify(responseData).substring(0, 500) + '...');
    
    // Verificar se a resposta contém a propriedade hasReels
    if (responseData && typeof responseData === 'object' && 'hasReels' in responseData) {
      if (!responseData.hasReels) {
        console.log('Usuário não possui reels disponíveis');
        return [];
      }
      // Se tiver a propriedade hasReels e for true, continuar com o processamento dos reels
      if (Array.isArray(responseData.reels)) {
        console.log(`Recebidos ${responseData.reels.length} reels do Apify`);
        const apifyReels = responseData.reels as ApifyReel[];
        
        if (apifyReels.length === 0) {
          console.log('Nenhum reel encontrado para o usuário');
          return [];
        }
        
        // Processar os reels
        const processedReels = apifyReels.map((reel: ApifyReel) => {
          // Obter a URL da thumbnail do reel
          let thumbnailUrl = '';
          
          if (reel.images && reel.images.length > 0) {
            thumbnailUrl = reel.images[0];
          } else if (reel.displayUrl) {
            thumbnailUrl = reel.displayUrl;
          }
          
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
          
          const processedThumbnailUrl = proxyImageUrl(thumbnailUrl);
          
          // Formatar o reel no formato esperado pela aplicação
          return {
            id: reel.id?.toString() || '',
            code: reel.shortCode || '',
            shortcode: reel.shortCode || '',
            media_type: 2, // Vídeo
            is_video: true,
            is_carousel: false,
            is_reel: true,
            like_count: reel.likesCount || 0,
            comment_count: reel.commentsCount || 0,
            views_count: reel.videoViewCount || 0,
            caption: { 
              text: reel.caption || 'Sem legenda'
            },
            link: reel.url || `https://www.instagram.com/reel/${reel.shortCode}/`,
            image_versions: {
              items: [{ url: processedThumbnailUrl }]
            },
            display_url: processedThumbnailUrl,
            thumbnail_url: processedThumbnailUrl,
            video_url: reel.videoUrl || '',
            video_duration: reel.videoDuration || 0,
            type: 'video',
            product_type: 'clips',
            timestamp: reel.timestamp || new Date().toISOString(),
            owner: {
              username: reel.ownerUsername || username,
              full_name: reel.ownerFullName || '',
              id: reel.ownerId?.toString() || ''
            }
          };
        });

        console.log('Reels processados:', processedReels.map(reel => ({
          id: reel.id,
          views_count: reel.views_count,
          like_count: reel.like_count,
          comment_count: reel.comment_count
        })));

        return processedReels;
      }
    }
    
    // Caso a resposta não tenha a estrutura esperada com hasReels, tentar processar como array direto
    const apifyReels = Array.isArray(responseData) ? responseData : [];
    console.log(`Recebidos ${apifyReels.length} reels do Apify (formato alternativo)`);
    
    if (!apifyReels || apifyReels.length === 0) {
      console.log('Nenhum reel encontrado para o usuário');
      return [];
    }
    
    // Processar os reels recebidos do Apify
    const processedReels = apifyReels.map((reel: ApifyReel) => {
      // Obter a URL da thumbnail do reel
      let thumbnailUrl = '';
      
      if (reel.images && reel.images.length > 0) {
        thumbnailUrl = reel.images[0];
      } else if (reel.displayUrl) {
        thumbnailUrl = reel.displayUrl;
      }
      
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
      
      const processedThumbnailUrl = proxyImageUrl(thumbnailUrl);
      
      // Formatar o reel no formato esperado pela aplicação
      return {
        id: reel.id?.toString() || '',
        code: reel.shortCode || '',
        shortcode: reel.shortCode || '',
        media_type: 2, // Vídeo
        is_video: true,
        is_carousel: false,
        is_reel: true,
        like_count: reel.likesCount || 0,
        comment_count: reel.commentsCount || 0,
        views_count: reel.videoViewCount || 0,
        caption: { 
          text: reel.caption || 'Sem legenda'
        },
        link: reel.url || `https://www.instagram.com/reel/${reel.shortCode}/`,
        image_versions: {
          items: [{ url: processedThumbnailUrl }]
        },
        display_url: processedThumbnailUrl,
        thumbnail_url: processedThumbnailUrl,
        video_url: reel.videoUrl || '',
        video_duration: reel.videoDuration || 0,
        type: 'video',
        product_type: 'clips',
        timestamp: reel.timestamp || new Date().toISOString(),
        owner: {
          username: reel.ownerUsername || username,
          full_name: reel.ownerFullName || '',
          id: reel.ownerId?.toString() || ''
        }
      };
    });

    console.log('Reels processados:', processedReels.map(reel => ({
      id: reel.id,
      views_count: reel.views_count,
      like_count: reel.like_count,
      comment_count: reel.comment_count
    })));

    return processedReels;
  } catch (error) {
    console.error('Erro na Apify API para reels:', error);
    throw error;
  }
}
