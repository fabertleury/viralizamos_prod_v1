import https from 'https';

interface ProfileResult {
  username?: string;
  isPrivate?: boolean;
  fullName?: string;
  biography?: string;
  followerCount?: number;
  followingCount?: number;
  profilePicUrl?: string;
  isVerified?: boolean;
  externalUrl?: string | null;
  error?: string;
}

export async function fetchInstagramProfile(username: string): Promise<ProfileResult> {
  console.log(`[INSTAGRAM PROFILE] Buscando perfil para: ${username}`);

  // Remover @ se estiver presente
  const cleanUsername = username.replace(/^@/, '');

  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'instagram-scraper-20252.p.rapidapi.com',
      port: null,
      path: `/v1/info?username_or_id_or_url=${cleanUsername}`,
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-scraper-20252.p.rapidapi.com'
      }
    };

    const req = https.request(options, function (res) {
      const chunks: Buffer[] = [];

      res.on('data', function (chunk) {
        chunks.push(chunk);
      });

      res.on('end', function () {
        try {
          const body = Buffer.concat(chunks);
          const responseText = body.toString();
          
          console.log('[INSTAGRAM PROFILE] Resposta RAW da API:', responseText);

          const responseData = JSON.parse(responseText);
          
          console.log('[INSTAGRAM PROFILE] Resposta PARSEADA da API:', JSON.stringify(responseData, null, 2));

          // Tratamento específico para erro de assinatura
          if (responseData.message === "You are not subscribed to this API.") {
            resolve({ 
              error: 'Erro de assinatura da API', 
              details: 'Não foi possível acessar o perfil devido a problemas na assinatura da API' 
            });
            return;
          }

          // Log de todos os campos disponíveis
          if (responseData.data) {
            console.log('[INSTAGRAM PROFILE] Campos disponíveis:', Object.keys(responseData.data));
          }

          if (responseData.status === 'ok' && responseData.data) {
            const userData = responseData.data;

            // Log de todos os valores dos campos
            console.log('[INSTAGRAM PROFILE] Valores dos campos:', JSON.stringify(userData, null, 2));

            resolve({
              username: userData.username,
              isPrivate: userData.is_private,
              fullName: userData.full_name,
              biography: userData.biography,
              followerCount: userData.edge_followed_by?.count,
              followingCount: userData.edge_follow?.count,
              profilePicUrl: userData.profile_pic_url,
              isVerified: userData.is_verified,
              externalUrl: userData.external_url
            });
          } else {
            resolve({ 
              error: 'Perfil não encontrado', 
              details: responseData 
            });
          }
        } catch (error) {
          console.error('[INSTAGRAM PROFILE] Erro ao processar resposta:', error);
          resolve({ 
            error: 'Erro ao processar resposta da API',
            details: error 
          });
        }
      });
    });

    req.on('error', (error) => {
      console.error('[INSTAGRAM PROFILE] Erro na requisição:', error);
      resolve({ 
        error: 'Erro na requisição',
        details: error 
      });
    });

    req.end();
  });
}
