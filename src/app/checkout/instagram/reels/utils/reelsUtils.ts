import axios from 'axios';
import { createClient } from '@/lib/supabase/client';

export interface ProfileData {
  username: string;
  full_name: string;
  profile_pic_url: string;
  follower_count: number;
  following_count: number;
  is_private: boolean;
}

export interface Service {
  id: string;
  name: string;
  preco: number;
  quantidade: number;
  provider_id: string;
  service_variations?: any[];
}

export interface Post {
  id: string;
  code: string;
  shortcode: string;
  image_url: string;
  caption?: string;
  like_count?: number;
  comment_count?: number;
  thumbnail_url?: string;
  display_url?: string;
  image_versions?: any;
  display_name?: string;
  display_icon?: string;
}

export interface InstagramPost {
  id: string;
  code: string;
  shortcode: string;
  image_url: string;
  caption?: string;
}

export interface PaymentData {
  qrCodeText: string;
  paymentId: string;
  amount: number;
  qrCodeBase64?: string;
}

export interface FormData {
  name: string;
  email: string;
  phone: string;
}

// Função para extrair o código correto de um reel do Instagram
export const extractPostCode = (post: any): string => {
  // Se o post já tem um código que não é numérico, usar esse código
  if (post.code && !/^\d+$/.test(post.code)) {
    console.log('✅ Usando código existente:', post.code);
    return post.code;
  }
  
  // Se tem shortcode, usar o shortcode
  if (post.shortcode) {
    console.log('✅ Usando shortcode:', post.shortcode);
    return post.shortcode;
  }
  
  // Se tem permalink ou link, extrair o código da URL
  if (post.permalink || post.link) {
    const url = post.permalink || post.link;
    const match = url.match(/instagram\.com\/reel\/([^\/]+)/);
    if (match && match[1]) {
      console.log('✅ Código extraído da URL:', match[1]);
      return match[1];
    }
  }
  
  // Se nada funcionar, usar o ID (não ideal, mas é o que temos)
  console.warn('⚠️ Não foi possível extrair um código curto válido, usando ID:', post.id);
  return post.id;
};

// Função para buscar reels do Instagram
export const fetchInstagramReels = async (
  username: string, 
  reelsLoaded: boolean, 
  instagramReels: Post[]
): Promise<Post[]> => {
  try {
    // Se já carregou os reels, não precisa buscar novamente
    if (reelsLoaded && instagramReels.length > 0) {
      console.log('Usando reels em cache:', instagramReels.length);
      return instagramReels;
    }

    const options = {
      method: 'GET',
      url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/reels',
      params: { username_or_id_or_url: username },
      headers: {
        'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
        'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
      }
    };
    const response = await axios.request(options);
    console.log('Resposta da API de reels:', response.data);

    // Verificar se a resposta tem a estrutura esperada
    const reels = response.data.data?.items || response.data.items || [];
    console.log('Reels encontrados:', reels.length);

    // Mapear os reels para o formato esperado
    const formattedReels: Post[] = reels.map((reel: any) => {
      // Tentar diferentes caminhos para a imagem do reel
      const imageUrl = 
        reel.image_versions?.items?.[0]?.url || 
        reel.thumbnail_url || 
        reel.cover_frame_url || 
        reel.display_url;

      // Extrair o código correto do reel para a URL
      const reelCode = extractPostCode(reel);
      
      return {
        id: reel.id || '',
        code: reelCode,
        shortcode: reelCode,
        image_url: imageUrl,
        caption: reel.caption 
            ? (typeof reel.caption === 'object' 
              ? reel.caption.text || 'Sem legenda'
              : String(reel.caption)) 
            : 'Sem legenda',
        like_count: reel.like_count || reel.likes_count || 0,
        comment_count: reel.comment_count || reel.comments_count || 0,
        // Alterar o nome de 'Curtidas' para 'Visualizações'
        display_name: 'Visualizações',
        display_icon: '👁️', // Emoji de visualização
        thumbnail_url: reel.thumbnail_url || '',
        display_url: reel.display_url || '',
        image_versions: reel.image_versions || null
      };
    }).filter(reel => reel.image_url || reel.thumbnail_url || reel.display_url); // Remover reels sem imagem

    console.log('Reels formatados:', formattedReels.length);
    return formattedReels;
  } catch (error) {
    console.error('Erro ao buscar reels do Instagram:', error);
    return [];
  }
};

// Função para buscar serviço
export const fetchService = async (externalId: string): Promise<Service | null> => {
  console.log('Buscando serviço com ID:', externalId);
  
  try {
    const supabase = createClient();
    
    // Verificar se temos uma quantidade específica no localStorage
    const checkoutData = localStorage.getItem('checkoutProfileData');
    let quantity = null;
    
    if (checkoutData) {
      const parsedData = JSON.parse(checkoutData);
      quantity = parsedData.quantity;
      console.log('Quantidade encontrada no localStorage:', quantity);
    }

    // Limpar o externalId para garantir que não tenha aspas extras
    const cleanExternalId = externalId ? externalId.replace(/"/g, '') : '';
    console.log('External ID limpo:', cleanExternalId);
    
    // Buscar primeiro pelo external_id
    let { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('external_id', cleanExternalId);
    
    // Se não encontrar pelo external_id, tentar pelo id
    if (!data || data.length === 0) {
      console.log('Serviço não encontrado pelo external_id, tentando pelo id');
      const result = await supabase
        .from('services')
        .select('*')
        .eq('id', cleanExternalId);
        
      data = result.data;
      error = result.error;
    }
    
    // Verificar se encontramos o serviço
    if (error) {
      console.error('Erro ao buscar serviço:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.error('Nenhum serviço encontrado');
      return null;
    }
    
    // Pegar o primeiro serviço encontrado
    const serviceData = data[0];
    console.log('Serviço encontrado:', serviceData);
    
    // Se temos uma quantidade específica, atualizar o serviço
    if (quantity) {
      console.log('Atualizando quantidade do serviço para:', quantity);
      serviceData.quantidade = parseInt(quantity);
      
      // Atualizar o preço se houver variações de preço
      if (serviceData.service_variations && serviceData.service_variations.length > 0) {
        const selectedVariation = serviceData.service_variations.find(
          (v: any) => v.quantidade === parseInt(quantity)
        );
        
        if (selectedVariation) {
          console.log('Variação de preço encontrada:', selectedVariation);
          serviceData.preco = selectedVariation.preco;
        }
      }
    }
    
    return serviceData;
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    return null;
  }
};

// Função para preparar os dados da transação
export const prepareTransactionData = (
  service: Service,
  profileData: ProfileData,
  formData: FormData,
  selectedReels: Post[],
  paymentData: PaymentData
) => {
  // Calcular quantidade de visualizações por reel
  const totalItems = selectedReels.length;
  const totalViews = service.quantidade;
  const viewsPerItem = Math.floor(totalViews / totalItems);
  const remainingViews = totalViews % totalItems;

  // Preparar metadados dos reels com os posts completos
  const reelsMetadata = selectedReels.map((reel, index) => {
    // Usar o campo code correto para a URL do reel
    const reelCode = reel.code || reel.shortcode || reel.id;
    return {
      postId: reel.id,
      postCode: reelCode,
      postLink: `https://instagram.com/reel/${reelCode}`,
      views: index === 0 ? viewsPerItem + remainingViews : viewsPerItem,
      type: 'reel',
      // Incluir o post completo para o provedor
      post: {
        id: reel.id,
        code: reelCode,
        shortcode: reelCode,
        image_url: reel.image_url,
        thumbnail_url: reel.thumbnail_url,
        display_url: reel.display_url,
        caption: typeof reel.caption === 'string' ? reel.caption : 'Sem legenda',
        like_count: reel.like_count || 0,
        comment_count: reel.comment_count || 0
      }
    };
  });

  // Determinar o link a ser enviado no campo target_profile_link
  // Se houver apenas um reel, enviar o link do reel
  // Se houver múltiplos reels, enviar o link do perfil
  let targetLink = `https://www.instagram.com/${profileData.username}/`;
  let specificReelLink = null;
  
  if (selectedReels.length === 1) {
    const reelCode = selectedReels[0].code || selectedReels[0].shortcode || selectedReels[0].id;
    specificReelLink = `https://instagram.com/reel/${reelCode}`;
    targetLink = specificReelLink;
    console.log('🔗 Enviando link específico do reel para o provedor:', targetLink);
  } else {
    console.log('🔗 Enviando link do perfil para o provedor (múltiplos reels):', targetLink);
  }

  // Adicionar os posts completos na raiz do objeto
  const posts = selectedReels.map(reel => {
    const reelCode = reel.code || reel.shortcode || reel.id;
    return {
      id: reel.id,
      code: reelCode,
      shortcode: reelCode,
      url: `https://instagram.com/reel/${reelCode}`,
      image_url: reel.image_url,
      thumbnail_url: reel.thumbnail_url,
      display_url: reel.display_url,
      caption: typeof reel.caption === 'string' ? reel.caption : 'Sem legenda',
      like_count: reel.like_count || 0,
      comment_count: reel.comment_count || 0,
      type: 'reel'
    };
  });

  console.log('📊 Enviando', posts.length, 'reels completos para o provedor');

  return {
    user_id: formData.name || null,
    order_id: paymentData.paymentId,
    type: 'reels',
    amount: service.preco,
    status: 'pending',
    payment_method: 'pix',
    payment_id: paymentData.paymentId,
    metadata: {
      reels: reelsMetadata,
      serviceDetails: service,
      posts: posts, // Incluir os posts completos na metadata
      specific_reel_link: specificReelLink // Adicionar link específico do reel nos metadados
    },
    customer_name: formData.name || null,
    customer_email: formData.email || null,
    customer_phone: formData.phone || null,
    target_username: profileData.username,
    target_full_name: profileData.full_name,
    payment_qr_code: paymentData.qrCodeText || null,
    payment_external_reference: paymentData.paymentId,
    service_id: service.id,
    provider_id: service.provider_id,
    target_profile_link: targetLink,
    specific_reel_link: specificReelLink, // Adicionar link específico do reel na raiz do objeto
    posts: posts // Incluir os posts completos também na raiz do objeto para compatibilidade
  };
};
