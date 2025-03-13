import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import axios from 'axios';

// Interface para o conteúdo de visualização (posts e reels)
interface VisualizacaoContent {
  posts: any[];
  reels: any[];
  hasPosts: boolean;
  hasReels: boolean;
  message: {
    posts: string | null;
    reels: string | null;
  };
}

export async function GET(
  request: NextRequest,
  context: { params: { username: string } }
) {
  const supabase = createClient();

  try {
    // Extrair o username diretamente dos parâmetros
    const username = await context.params.username;
    
    console.log(`Buscando visualizações (posts e reels) para o usuário: ${username}`);
    
    // Buscar posts e reels simultaneamente
    const [postsData, reelsData] = await Promise.all([
      fetchPostsWithApifyAPI(username),
      fetchReelsWithApifyAPI(username)
    ]);
    
    // Verificar se os dados foram obtidos com sucesso
    if (!postsData && !reelsData) {
      throw new Error('Falha ao obter posts e reels com Apify API');
    }
    
    // Preparar a resposta
    const response: VisualizacaoContent = {
      posts: postsData || [],
      reels: reelsData || [],
      hasPosts: Array.isArray(postsData) && postsData.length > 0,
      hasReels: Array.isArray(reelsData) && reelsData.length > 0,
      message: {
        posts: (!postsData || postsData.length === 0) ? "Este usuário não possui posts" : null,
        reels: (!reelsData || reelsData.length === 0) ? "Este usuário não possui reels" : null
      }
    };
    
    console.log('Dados de visualização processados:', {
      postsCount: response.posts.length,
      reelsCount: response.reels.length,
      hasPosts: response.hasPosts,
      hasReels: response.hasReels
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar visualizações:', error);
    
    // Log detalhado de erros para diagnóstico
    if (axios.isAxiosError(error)) {
      console.error('Detalhes do erro Axios:', {
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Erro ao buscar visualizações do Instagram',
        message: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}

// Função para buscar posts usando a API do Apify
async function fetchPostsWithApifyAPI(username: string) {
  try {
    // Usar a API de posts existente com URL relativa
    const response = await fetch(`/api/instagram/posts/${username}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao buscar posts: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar posts:', error);
    return null;
  }
}

// Função para buscar reels usando a API do Apify
async function fetchReelsWithApifyAPI(username: string) {
  try {
    // Usar a API de reels existente com URL relativa
    const response = await fetch(`/api/instagram/reels/${username}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao buscar reels: ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Verificar se a resposta tem a nova estrutura (com hasReels e message)
    if (data && typeof data === 'object' && 'hasReels' in data) {
      if (!data.hasReels) {
        console.log('Nenhum reel encontrado para o usuário:', data.message);
        return [];
      }
      
      // Se tem a propriedade reels, retornar ela
      if (Array.isArray(data.reels)) {
        return data.reels;
      }
    }
    
    // Caso contrário, assumir que a resposta é um array direto de reels (formato antigo)
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Erro ao buscar reels:', error);
    return [];
  }
}
