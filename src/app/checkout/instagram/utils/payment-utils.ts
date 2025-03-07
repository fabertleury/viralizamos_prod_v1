import axios from 'axios';
import { toast } from 'sonner';
import { Post, ProfileData, Service, PaymentData } from '../types';
import { extractPostCode } from './instagram-utils';

interface PaymentRequestData {
  service_id: string;
  amount: number;
  original_amount: number;
  discount_amount: number;
  coupon_code: string | null;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  metadata: {
    profile: ProfileData;
    posts: Post[];
    reels: Post[];
    post_ids: string[];
    reel_ids: string[];
    post_codes: string[];
    reel_codes: string[];
    service_name: string;
    service_quantity: number;
  };
}

export const createPaymentRequest = async (
  paymentRequestData: PaymentRequestData
): Promise<PaymentData> => {
  const response = await fetch('/api/payment/pix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentRequestData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar pagamento');
  }

  const paymentResponse = await response.json();
  
  // Garantir que temos todos os dados necessários
  if (!paymentResponse.id || !paymentResponse.qr_code) {
    throw new Error('Dados de pagamento incompletos');
  }

  return {
    qrCodeText: paymentResponse.qr_code,
    paymentId: paymentResponse.id,
    amount: paymentRequestData.amount,
    qrCodeBase64: paymentResponse.qr_code_base64
  };
};

export const prepareTransactionData = (
  service: Service,
  profileData: ProfileData,
  selectedPosts: Post[],
  selectedReels: Post[],
  formData: { name: string; email: string; phone: string },
  pixData: PaymentData
) => {
  // Calcular quantidade de likes por post
  const totalItems = selectedPosts.length + selectedReels.length;
  const totalLikes = service.quantidade;
  const likesPerItem = Math.floor(totalLikes / totalItems);
  const remainingLikes = totalLikes % totalItems;

  // Preparar metadados dos posts
  const postsMetadata = selectedPosts.map((post, index) => {
    // Usar o campo code correto para a URL do post
    const postCode = post.code || post.shortcode || post.id;
    return {
      postId: post.id,
      postCode: postCode,
      postLink: `https://instagram.com/p/${postCode}`,
      likes: index === 0 ? likesPerItem + remainingLikes : likesPerItem
    };
  });

  const reelsMetadata = selectedReels.map((reel) => {
    // Usar o campo code correto para a URL do reel
    const reelCode = reel.code || reel.shortcode || reel.id;
    return {
      postId: reel.id,
      postCode: reelCode,
      postLink: `https://instagram.com/p/${reelCode}`,
      likes: likesPerItem
    };
  });

  return {
    user_id: formData.name || null,
    order_id: pixData.paymentId,
    type: 'curtidas',
    amount: pixData.amount,
    status: 'pending',
    payment_method: 'pix',
    payment_id: pixData.paymentId,
    metadata: {
      posts: [...postsMetadata, ...reelsMetadata],
      serviceDetails: service
    },
    customer_name: formData.name || null,
    customer_email: formData.email || null,
    customer_phone: formData.phone || null,
    target_username: profileData.username,
    target_full_name: profileData.full_name,
    payment_qr_code: pixData.qrCodeText || null,
    payment_external_reference: pixData.paymentId,
    service_id: service.id,
    target_profile_link: `https://www.instagram.com/${profileData.username}/`
  };
};

export const sendTransactionToAdmin = async (
  transactionData: any
): Promise<boolean> => {
  try {
    const response = await axios.post('/admin/transacoes', transactionData);
    
    if (response.status === 200 || response.status === 201) {
      toast.success('Transação registrada com sucesso');
      return true;
    } else {
      toast.error('Erro ao registrar transação');
      return false;
    }
  } catch (error) {
    console.error('Erro ao enviar transação:', error);
    toast.error('Falha ao processar transação');
    return false;
  }
};
