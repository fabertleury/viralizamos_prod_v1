import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

interface ProfileResult {
  profileData?: {
    username: string;
    full_name: string;
    profile_pic_url: string;
    follower_count: number;
    following_count: number;
    media_count: number;
    is_private: boolean;
  };
  error?: string;
  details?: any;
}

export async function fetchInstagramProfile(username: string): Promise<ProfileResult> {
  console.log(`[INSTAGRAM PROFILE] Buscando perfil para: ${username}`);

  // Remover @ se estiver presente
  const cleanUsername = username.replace(/^@/, '');

  try {
    const options = {
      method: 'POST',
      url: 'https://rocketapi-for-instagram.p.rapidapi.com/instagram/user/get_info',
      headers: {
        'x-rapidapi-key': 'ac2bed47cfmsh79e4935fdffe586p1a8283jsn727e6ff4a6a0',
        'x-rapidapi-host': 'rocketapi-for-instagram.p.rapidapi.com',
        'Content-Type': 'application/json'
      },
      data: {
        username: cleanUsername
      }
    };

    const response = await axios.request(options);

    console.log('[INSTAGRAM PROFILE] Resposta da API:', JSON.stringify(response.data, null, 2));

    if (response.data.status === 'done' && response.data.response.body.data) {
      const userData = response.data.response.body.data.user;

      return {
        profileData: {
          username: userData.username,
          full_name: userData.full_name,
          profile_pic_url: userData.profile_pic_url_hd || userData.profile_pic_url,
          follower_count: userData.edge_followed_by?.count || 0,
          following_count: userData.edge_follow?.count || 0,
          media_count: userData.edge_owner_to_timeline_media?.count || 0,
          is_private: userData.is_private
        }
      };
    } else {
      console.error('[INSTAGRAM PROFILE] Erro ao processar dados:', response.data);
      return { 
        error: 'Perfil não encontrado', 
        details: response.data 
      };
    }
  } catch (error) {
    console.error('[INSTAGRAM PROFILE] Erro na requisição:', error);
    return { 
      error: 'Erro na requisição',
      details: error 
    };
  }
}
