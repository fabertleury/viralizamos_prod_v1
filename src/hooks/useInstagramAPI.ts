import axios from 'axios';

// Definir interfaces para tipagem
interface InstagramProfile {
  username: string;
  full_name: string;
  biography: string;
  followers_count: number;
  following_count: number;
  profile_pic_url: string;
  is_private: boolean;
  is_verified: boolean;
  media_count: number;
}

interface InstagramPost {
  id: string;
  code: string;
  type: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  media_url: string;
  thumbnail_url?: string;
  is_video: boolean;
  video_url?: string;
  views_count?: number;
  timestamp?: string;
}

interface InstagramReel {
  id: string;
  code: string;
  shortcode?: string;
  type: string;
  caption: string;
  likes_count: number;
  comments_count: number;
  media_url: string;
  thumbnail_url: string;
  video_url: string;
  views_count: number;
  timestamp?: string;
  is_video?: boolean;
  is_reel?: boolean;
  media_type?: number;
  link?: string;
  display_url?: string;
  owner?: {
    username: string;
    full_name: string;
    id: string;
  };
}

// Interface para os dados brutos recebidos da API
interface RawPostData {
  id: string;
  code?: string;
  shortcode?: string;
  is_video?: boolean;
  is_carousel?: boolean;
  is_reel?: boolean;
  caption?: string | { text: string };
  like_count?: number;
  comment_count?: number;
  display_url?: string;
  image_versions?: { items?: Array<{ url: string }> };
  thumbnail_src?: string;
  video_url?: string;
  views_count?: number;
  timestamp?: string;
  [key: string]: any; // Para outras propriedades que possam existir
}

// Interface para os dados brutos de reels recebidos da API
interface RawReelData {
  id: string;
  code?: string;
  shortcode?: string;
  caption?: string | { text: string };
  like_count?: number;
  comment_count?: number;
  display_url?: string;
  image_versions?: { items?: Array<{ url: string }> };
  thumbnail_url?: string;
  video_url?: string;
  views_count?: number;
  timestamp?: string;
  [key: string]: any; // Para outras propriedades que possam existir
}

interface InstagramLikes {
  likes_count: number;
  likes_list?: {
    username: string;
    full_name: string;
    profile_pic_url: string;
  }[];
}

interface InstagramAPIStatus {
  status: 'online' | 'offline' | 'degraded';
  detail: string;
  last_checked: Date;
}

interface ContentData {
  id: string;
  code: string;
  type: "video" | "image" | "carousel" | string;
  caption: string;
  likes: number;
  comments: number;
  mediaUrl: string;
  timestamp: string;
  views?: number;
}

export const useInstagramAPI = () => {
  const APIFY_API_URL = 'https://api.apify.com/v2';
  const APIFY_ACTOR_ID = 'shu8hvrXbJbY3Eb9W';
  const APIFY_API_KEY = process.env.NEXT_PUBLIC_APIFY_API_KEY || 'apify_api_LyHgc3Oha6R1gy42O04Gy96JOhN9Wi1mNQXC';

  // Função para obter a URL base da aplicação
  const getBaseUrl = () => {
    // No cliente, usamos a URL atual
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol;
      const host = window.location.host;
      return `${protocol}//${host}`;
    }
    // No servidor, usamos a variável de ambiente ou um valor padrão
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  };

  const makeRequest = async (url: string, params: Record<string, string>) => {
    try {
      // Se a URL não começar com http ou https, consideramos uma URL relativa
      // e adicionamos a URL base
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Remover a barra inicial se existir, pois getBaseUrl já termina com /
        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        fullUrl = `${getBaseUrl()}/${cleanUrl}`;
      }
      
      console.log('Fazendo requisição para:', fullUrl);
      const response = await axios.get(fullUrl, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  };

  const checkInstagramProfile = async (username: string): Promise<InstagramProfile | null> => {
    try {
      console.log('Verificando perfil do Instagram com API:', username);
      
      // Usar a API de verificação de perfil
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/instagram/profile/${username}`);
      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro ao verificar perfil');
      }
      
      // Extrair dados do perfil
      const profileData: InstagramProfile = {
        username: data.username || username,
        full_name: data.full_name || '',
        biography: data.biography || data.bio || '',
        followers_count: data.followers_count || data.followers || 0,
        following_count: data.following_count || data.following || 0,
        profile_pic_url: data.profile_pic_url || data.profilePicture || '',
        is_private: data.is_private || false,
        is_verified: data.is_verified || data.isVerified || false,
        media_count: data.media_count || data.totalPosts || 0
      };
      
      console.log('Perfil encontrado:', profileData);
      return profileData;
    } catch (error) {
      console.error('Erro ao verificar perfil do Instagram:', error);
      return null;
    }
  };

  const fetchInstagramPosts = async (username: string): Promise<InstagramPost[]> => {
    try {
      console.log('Buscando posts do Instagram com Apify API:', username);
      
      // Usar a API local que chama o Apify com URL absoluta
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/instagram/posts/${username}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao buscar posts: ${errorData.error || response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // Verificar a estrutura da resposta
      if (!responseData || !responseData.data || !responseData.data.items) {
        console.error('Estrutura de resposta inválida:', responseData);
        throw new Error('Formato de resposta inválido da API de posts');
      }
      
      const data = responseData.data.items;
      
      // Mapear para o formato esperado
      const formattedPosts: InstagramPost[] = data
        .filter((post: RawPostData) => !post.is_reel) // Filtrar apenas posts (não reels)
        .map((post: RawPostData): InstagramPost => ({
          id: post.id || '',
          code: post.code || post.shortcode || '',
          type: post.is_video ? 'video' : (post.is_carousel ? 'carousel' : 'image'),
          caption: typeof post.caption === 'object' ? post.caption.text || '' : (post.caption || ''),
          likes_count: post.like_count || 0,
          comments_count: post.comment_count || 0,
          media_url: post.display_url || (post.image_versions?.items?.[0]?.url) || '',
          thumbnail_url: post.thumbnail_src || post.display_url || '',
          is_video: post.is_video || false,
          video_url: post.video_url || '',
          views_count: post.views_count || 0,
          timestamp: post.timestamp || new Date().toISOString()
        }));
      
      console.log(`Encontrados ${formattedPosts.length} posts com Apify API`);
      return formattedPosts;
    } catch (error) {
      console.error('Erro ao buscar posts do Instagram:', error);
      throw error;
    }
  };

  const fetchInstagramReels = async (username: string): Promise<InstagramReel[]> => {
    try {
      console.log('Buscando reels do Instagram com API de visualização combinada:', username);
      
      // Usar a API de visualização combinada com URL absoluta
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/instagram/visualizacao/${username}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao buscar reels: ${errorData.error || response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Resposta da API de visualização combinada:', responseData);
      
      // Verificar se o usuário tem reels
      if (responseData && typeof responseData === 'object') {
        if (!responseData.hasReels) {
          console.log('Usuário não possui reels disponíveis:', responseData.message?.reels);
          return [];
        }
        
        // Se tem reels, processar a lista
        if (Array.isArray(responseData.reels)) {
          const reelsData = responseData.reels;
          console.log(`Encontrados ${reelsData.length} reels na API de visualização`);
          
          // Mapear para o formato esperado
          const formattedReels: InstagramReel[] = reelsData.map((reel: RawReelData): InstagramReel => {
            const ownerUsername = reel.owner?.username || reel.username || username;
            const ownerFullName = reel.owner?.full_name || reel.full_name || '';
            const ownerId = reel.owner?.id || reel.id || '';
            
            return {
              id: reel.id || '',
              code: reel.code || reel.shortcode || '',
              shortcode: reel.shortcode || reel.code || '',
              type: 'reel',
              media_type: reel.media_type || 2,
              caption: typeof reel.caption === 'string' ? reel.caption : (reel.caption?.text || ''),
              likes_count: reel.like_count || 0,
              comments_count: reel.comment_count || 0,
              media_url: reel.display_url || (reel.image_versions?.items?.[0]?.url) || '',
              thumbnail_url: reel.thumbnail_url || reel.display_url || '',
              video_url: reel.video_url || '',
              views_count: reel.views_count || 0,
              timestamp: reel.timestamp || new Date().toISOString(),
              is_video: true,
              is_reel: true,
              link: reel.link || `https://www.instagram.com/reel/${reel.code || reel.shortcode}/`,
              display_url: reel.display_url || '',
              owner: {
                username: ownerUsername,
                full_name: ownerFullName,
                id: ownerId
              }
            };
          });
          
          console.log(`Processados ${formattedReels.length} reels com a API de visualização`);
          return formattedReels;
        }
      }
      
      console.log('Formato de resposta inesperado da API de visualização');
      return [];
    } catch (error) {
      console.error('Erro ao buscar reels do Instagram:', error);
      throw error;
    }
  };

  const fetchPostLikes = async (postCode: string): Promise<InstagramLikes | null> => {
    try {
      const baseUrl = getBaseUrl();
      const likesData = await makeRequest(`${baseUrl}/api/instagram/likes/${postCode}`, {});

      return {
        likes_count: likesData?.likes_count || 0,
        likes_list: likesData?.likes_list?.map((like: any) => ({
          username: like.username,
          full_name: like.full_name,
          profile_pic_url: like.profile_pic_url
        })) || []
      };
    } catch (error) {
      console.error('Erro ao buscar likes:', error);
      return null;
    }
  };

  const checkInstagramAPIStatus = async (): Promise<InstagramAPIStatus> => {
    try {
      // Verificar o status da API do Apify
      const response = await axios.get(`${APIFY_API_URL}/acts/${APIFY_ACTOR_ID}?token=${APIFY_API_KEY}`);
      
      const isOnline = response.status === 200 && response.data && response.data.data;
      
      const status: InstagramAPIStatus = {
        status: isOnline ? 'online' : 'degraded',
        detail: isOnline ? 'API disponível' : 'API com funcionamento limitado',
        last_checked: new Date()
      };

      console.log('Status da API do Instagram:', status);
      return status;
    } catch (error: unknown) {
      console.error('Erro ao verificar status da API do Instagram:', error);
      
      return {
        status: 'offline',
        detail: error instanceof Error ? error.message : 'Falha na conexão',
        last_checked: new Date()
      };
    }
  };

  const fetchContent = async (username: string, context: string): Promise<ContentData[]> => {
    try {
      // Buscar posts e reels simultaneamente
      const [postsData, reelsData] = await Promise.all([
        fetchInstagramPosts(username),
        fetchInstagramReels(username)
      ]);

      // Combinar posts e reels em um único array
      const combinedContent: ContentData[] = [
        ...postsData.map((post: RawPostData) => ({
          id: post.id,
          code: post.code || post.shortcode || '',
          type: post.is_video ? 'video' : (post.is_carousel ? 'carousel' : 'image'),
          caption: typeof post.caption === 'object' ? post.caption.text || '' : (post.caption || ''),
          likes: post.like_count || 0,
          comments: post.comment_count || 0,
          mediaUrl: post.display_url || (post.image_versions?.items?.[0]?.url) || '',
          timestamp: post.timestamp || new Date().toISOString(),
          views: post.views_count
        })),
        ...reelsData.map((reel: RawReelData) => ({
          id: reel.id,
          code: reel.code || reel.shortcode || '',
          type: 'video',
          caption: typeof reel.caption === 'object' ? reel.caption.text || '' : (reel.caption || ''),
          likes: reel.like_count || 0,
          comments: reel.comment_count || 0,
          mediaUrl: reel.display_url || (reel.image_versions?.items?.[0]?.url) || '',
          timestamp: reel.timestamp || new Date().toISOString(),
          views: reel.views_count
        }))
      ];

      // Ordenar por timestamp mais recente
      return combinedContent.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    } catch (error) {
      console.error('Erro ao buscar conteúdo:', error);
      return [];
    }
  };

  const fetchInstagramProfileInfo = async (username: string): Promise<any> => {
    try {
      console.log(`[useInstagramAPI] Buscando informações do perfil: ${username}`);
      
      // Usar o sistema de cascata para verificação de perfil
      const baseUrl = getBaseUrl();
      const response = await fetch(`${baseUrl}/api/instagram/profile/${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao verificar perfil');
      }
      
      console.log('Resposta da API de perfil:', data);
      
      return {
        username: data.username || username,
        full_name: data.full_name || '',
        biography: data.bio || data.biography || '',
        followers: data.followers_count || data.followers || 0,
        following: data.following_count || data.following || 0,
        totalPosts: data.posts_count || data.media_count || 0,
        profilePicture: data.profile_pic_url || data.profilePicture || '',
        isVerified: data.is_verified || data.isVerified || false,
        is_private: data.is_private || false,
        // Incluir a fonte da API para debug
        source: data.source || 'API'
      };
    } catch (error: unknown) {
      console.error('Erro ao buscar informações do perfil:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Erro desconhecido ao buscar informações do perfil');
      }
    }
  };

  return {
    checkInstagramProfile,
    fetchInstagramPosts,
    fetchInstagramReels,
    fetchPostLikes,
    checkInstagramAPIStatus,
    fetchContent,
    fetchInstagramProfileInfo
  };
};
