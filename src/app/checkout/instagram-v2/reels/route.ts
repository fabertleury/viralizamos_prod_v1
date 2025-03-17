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

// Interface para o perfil do Instagram
interface InstagramProfile {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  follower_count: number;
  following_count: number;
  is_private: boolean;
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

    if (!reelsData || !reelsData.reels || reelsData.reels.length === 0) {
      console.warn(`Nenhum reel encontrado para o usuário ${username}`);
      return NextResponse.json({
        reels: [],
        hasReels: false,
        message: 'Nenhum reel encontrado para este perfil',
        status: 'success'
      }, { status: 200 });
    }

    return NextResponse.json({
      reels: reelsData.reels,
      hasReels: reelsData.hasReels,
      reelsCount: reelsData.reelsCount,
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
const profileCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos em milissegundos

// Atualizando a função fetchInstagramUserId para imprimir a resposta de forma clara
async function fetchInstagramUserId(username: string) {
  console.log('Buscando ID do Instagram para o usuário:', username);
  try {
    const response = await axios.get('https://api.scrapecreators.com/v1/instagram/profile', {
      params: { handle: username },
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY,
      },
    });
    console.log('Resposta da API ao buscar ID do usuário:', JSON.stringify(response.data, null, 2)); // Imprimindo a resposta de forma clara
    if (response.data && response.data.id) {
      console.log('ID do usuário encontrado:', response.data.id);
      return response.data.id;
    } else {
      console.error('ID do usuário não encontrado na resposta:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Erro ao buscar ID do Instagram:', error);
    return null;
  }
}

// Atualizando a função fetchReelsWithScapeCreatorsAPI para incluir timeout e logs adicionais
async function fetchReelsWithScapeCreatorsAPI(username: string): Promise<{ reels: any[]; hasReels: boolean; reelsCount: number; status: string }> {
  console.log('Buscando posts para o usuário:', username);
  try {
    const response = await axios.get(`https://api.scrapecreators.com/v2/instagram/user/posts?handle=${username}`, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY,
      },
      timeout: 10000 // Timeout de 10 segundos
    });
    console.log('Resposta da API ao buscar posts:', JSON.stringify(response.data, null, 2));

    const reels = response.data.items.filter(item => item.media_type === 2);
    const hasReels = reels.length > 0;
    const reelsCount = reels.length;
    return { reels, hasReels, reelsCount, status: 'success' };
  } catch (error) {
    console.error('Erro ao buscar reels:', error);
    return { reels: [], hasReels: false, reelsCount: 0, status: 'error' };
  }
}
