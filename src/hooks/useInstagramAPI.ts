import axios from 'axios';

export interface InstagramProfileInfo {
  username: string;
  full_name: string;
  biography: string;
  followers_count: number;
  following_count: number;
  media_count: number;
  profile_pic_url: string;
  is_private: boolean;
}

export interface InstagramPost {
  id: string;
  code: string;
  type: 'image' | 'video' | 'carousel';
  media_url: string;
  caption?: string;
  likes_count: number;
  comments_count: number;
  timestamp: number;
}

export interface InstagramReel {
  id: string;
  code: string;
  media_url: string;
  caption?: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  timestamp: number;
}

export interface InstagramLikes {
  likes_count: number;
  likes_list?: {
    username: string;
    full_name: string;
    profile_pic_url: string;
  }[];
}

export interface InstagramAPIStatus {
  status: 'online' | 'offline' | 'degraded';
  detail: string;
  last_checked: Date;
}

export interface ContentData {
  id: string;
  type: 'image' | 'video' | 'carousel';
  caption: string;
  likes: number;
  comments: number;
  mediaUrl: string;
  timestamp: number;
  views?: number;
}

export const useInstagramAPI = () => {
  const BASE_URL = 'https://instagram-scraper-api2.p.rapidapi.com';
  const HEADERS = {
    'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
    'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
  };

  const makeRequest = async (url: string, params: Record<string, string>) => {
    try {
      const response = await axios.request({
        method: 'GET',
        url,
        params,
        headers: HEADERS
      });
      return response.data;
    } catch (error) {
      console.error(`Erro na requisição para ${url}:`, error);
      console.error('Não foi possível buscar os dados');
      return null;
    }
  };

  const checkInstagramProfile = async (username: string): Promise<boolean> => {
    try {
      const profileInfo = await makeRequest(`${BASE_URL}/v1/info`, { 
        username_or_id_or_url: username 
      });
      
      return profileInfo ? !profileInfo.is_private : false;
    } catch (error) {
      console.error('Erro ao verificar perfil:', error);
      return false;
    }
  };

  const fetchInstagramProfileInfo = async (username: string) => {
    try {
      const options = {
        method: 'GET',
        url: `${BASE_URL}/v1/info`,
        params: { username_or_id_or_url: username },
        headers: HEADERS
      };

      const response = await axios.request(options);
      console.log('Resposta completa da API de perfil:', response.data);

      // Verificar se a resposta tem os dados esperados
      const profileData = response.data.data || response.data;
      
      if (!profileData) {
        console.error('Nenhum dado de perfil encontrado');
        return null;
      }

      // Mapear dados do perfil com fallback para valores padrão
      return {
        username: profileData.username || username,
        full_name: profileData.full_name || profileData.username,
        biography: profileData.biography || 'Sem biografia',
        followers: profileData.followers_count || 
                   profileData.followers || 
                   profileData.follower_count || 
                   0,
        following: profileData.following_count || 
                   profileData.following || 
                   profileData.friend_count || 
                   0,
        totalPosts: profileData.media_count || 
                    profileData.posts_count || 
                    profileData.post_count || 
                    0,
        profilePicture: profileData.profile_pic_url || 
                        profileData.profile_picture_url || 
                        profileData.profile_picture || 
                        '',
        isVerified: profileData.is_verified || 
                    profileData.verified || 
                    profileData.is_business || 
                    false,
        is_private: profileData.is_private || false
      };
    } catch (error: any) {
      console.error('Erro ao buscar informações do perfil:', error.response?.data || error.message);
      throw error;
    }
  };

  const fetchInstagramPosts = async (username: string) => {
    try {
      const options = {
        method: 'GET',
        url: `${BASE_URL}/v1/posts`,
        params: { username_or_id_or_url: username },
        headers: HEADERS
      };

      const response = await axios.request(options);
      console.log('Resposta completa de posts:', response.data);

      // Verificar diferentes possíveis estruturas de resposta
      const postsData = response.data.data || response.data;
      
      // Verificar se há uma lista de itens
      const postsList = postsData.items || postsData.posts || postsData;

      // Se ainda não for um array, retornar vazio
      if (!Array.isArray(postsList)) {
        console.warn('Nenhum post encontrado ou formato de resposta inesperado');
        return [];
      }

      return postsList.map((post: any) => {
        // Lidar com diferentes tipos de posts (imagem, carrossel, vídeo)
        const mediaType = post.media_type || post.type;
        const isCarousel = mediaType === 8 || post.carousel_media;
        const isVideo = mediaType === 2 || post.is_video;

        // Selecionar URL da imagem/mídia
        const getMediaUrl = () => {
          if (isCarousel && post.carousel_media && post.carousel_media.length > 0) {
            return post.carousel_media[0].image_versions?.items[0]?.url || 
                   post.carousel_media[0].display_url || 
                   '';
          }
          
          if (post.image_versions?.items && post.image_versions.items.length > 0) {
            return post.image_versions.items[0].url;
          }
          
          return post.display_url || post.media_url || '';
        };

        return {
          id: post.pk || post.id || post.code,
          type: isVideo ? 'video' : 
                isCarousel ? 'carousel' : 
                'image',
          caption: post.caption?.text || 
                   post.caption?.caption || 
                   post.caption || 
                   '',
          likes_count: post.like_count || 
                       post.likes_count || 
                       post.likes?.count || 
                       0,
          comments_count: post.comment_count || 
                          post.comments_count || 
                          post.comments?.count || 
                          0,
          media_url: getMediaUrl(),
          timestamp: post.taken_at || 
                     post.timestamp || 
                     post.created_at || 
                     Date.now()
        };
      });
    } catch (error: any) {
      console.error('Erro ao buscar posts:', error.response?.data || error.message);
      
      // Tratamento de erros específicos
      if (error.response?.status === 403) {
        throw new Error('Perfil privado. Por favor, torne o perfil público.');
      }
      
      if (error.response?.status === 404) {
        console.warn('Nenhum post encontrado');
        return [];
      }
      
      throw error;
    }
  };

  const fetchInstagramReels = async (username: string) => {
    try {
      const options = {
        method: 'GET',
        url: `${BASE_URL}/v1/reels`,
        params: { username_or_id_or_url: username },
        headers: HEADERS
      };

      const response = await axios.request(options);
      console.log('Resposta completa de reels:', response.data);

      // Verificar diferentes possíveis estruturas de resposta
      const reelsData = response.data.data || 
                        response.data.reels || 
                        response.data || 
                        [];

      // Verificar se reelsData é um array
      const reelsList = Array.isArray(reelsData) ? 
        reelsData : 
        (reelsData.results || reelsData.items || []);

      // Se ainda não for um array, retornar vazio
      if (!Array.isArray(reelsList)) {
        console.warn('Nenhum reel encontrado ou formato de resposta inesperado');
        return [];
      }

      return reelsList.map((reel: any) => ({
        id: reel.pk || reel.id || reel.code,
        type: 'video',
        caption: reel.caption?.text || reel.caption || '',
        likes_count: reel.like_count || reel.likes_count || 0,
        comments_count: reel.comment_count || reel.comments_count || 0,
        media_url: reel.image_versions2?.candidates[0]?.url || 
                   reel.display_url || 
                   reel.media_url || 
                   '',
        timestamp: reel.taken_at || reel.timestamp || Date.now(),
        views_count: reel.view_count || reel.views_count || 0
      }));
    } catch (error: any) {
      console.error('Erro ao buscar reels:', error.response?.data || error.message);
      
      // Tratamento de erros específicos
      if (error.response?.status === 403) {
        throw new Error('Perfil privado. Por favor, torne o perfil público.');
      }
      
      if (error.response?.status === 404) {
        console.warn('Nenhum reel encontrado');
        return [];
      }
      
      throw error;
    }
  };

  const fetchPostLikes = async (postCode: string): Promise<InstagramLikes | null> => {
    try {
      const likesData = await makeRequest(`${BASE_URL}/v1/likes`, { 
        code_or_id_or_url: postCode 
      });

      if (!likesData) {
        console.error('Não foi possível buscar os likes');
        return null;
      }

      return {
        likes_count: likesData.likes_count || 0,
        likes_list: likesData.likes_list?.map((like: any) => ({
          username: like.username,
          full_name: like.full_name,
          profile_pic_url: like.profile_pic_url
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar likes:', error);
      return null;
    }
  };

  const checkInstagramAPIStatus = async (): Promise<InstagramAPIStatus> => {
    try {
      const options = {
        method: 'GET',
        url: `${BASE_URL}/v1/status`,
        headers: HEADERS
      };

      const startTime = Date.now();
      const response = await axios.request(options);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      const status: InstagramAPIStatus = {
        status: response.data.detail === 'All is awesome' ? 'online' : 'degraded',
        detail: response.data.detail || 'Status indisponível',
        last_checked: new Date()
      };

      console.log('Status da API do Instagram:', status);
      return status;
    } catch (error) {
      console.error('Erro ao verificar status da API do Instagram:', error);
      
      return {
        status: 'offline',
        detail: error.message || 'Falha na conexão',
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
        ...postsData.map(post => ({
          id: post.id,
          type: post.type,
          caption: post.caption || '',
          likes: post.likes_count,
          comments: post.comments_count,
          mediaUrl: post.media_url,
          timestamp: post.timestamp,
          views: undefined
        })),
        ...reelsData.map(reel => ({
          id: reel.id,
          type: 'video',
          caption: reel.caption || '',
          likes: reel.likes_count,
          comments: reel.comments_count,
          mediaUrl: reel.media_url,
          timestamp: reel.timestamp,
          views: reel.views_count
        }))
      ];

      // Ordenar por timestamp mais recente
      return combinedContent.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Erro ao buscar conteúdo:', error);
      return [];
    }
  };

  return {
    checkInstagramProfile,
    fetchInstagramProfileInfo,
    fetchInstagramPosts,
    fetchInstagramReels,
    fetchPostLikes,
    checkInstagramAPIStatus,
    fetchContent
  };
};
