'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { InstagramPostsReelsStep2 } from '@/components/checkout/InstagramPostsReelsStep2';

interface ProfileData {
  username: string;
  full_name: string;
  profile_pic_url: string;
  follower_count: number;
  following_count: number;
  is_private: boolean;
}

interface Service {
  id: string;
  name: string;
  preco: number;
  quantidade: number;
  provider_id: string;
}

interface Post {
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
}

interface InstagramPost {
  id: string;
  code: string;
  shortcode: string;
  image_url: string;
  caption?: string;
}

export default function Step2Page() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [instagramData, setInstagramData] = useState({ posts: [], reels: [] });
  const [selectedPosts, setSelectedPosts] = useState<InstagramPost[]>([]);
  const [selectedReels, setSelectedReels] = useState<Post[]>([]);
  const [paymentData, setPaymentData] = useState<{
    qrCodeText: string;
    paymentId: string;
    amount: number;
    qrCodeBase64?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const fetchInstagramData = async (username: string) => {
    console.log('Fetching Instagram data for username:', username); // Log para verificar o username
    try {
      const options = {
        method: 'GET',
        url: 'https://api.scrapecreators.com/v2/instagram/user/posts',
        params: { handle: username, next_max_id: 12 },
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_SCRAPECREATORS_API_KEY
        }
      };
      const response = await axios.request(options);
      console.log('API Response:', response.data); // Log para verificar a resposta da API
      const data = response.data.data || {};
      setInstagramData({ posts: data.posts || [], reels: data.reels || [] });
    } catch (error) {
      console.error('Erro ao buscar dados do Instagram:', error);
      toast.error('Erro ao buscar dados do Instagram.');
    }
  };

  useEffect(() => {
    const username = new URLSearchParams(window.location.search).get('username');
    console.log('Username from URL:', username); // Log para verificar o username
    if (username) {
      fetchInstagramData(username);
    }
  }, []);

  const handlePostSelect = (posts: InstagramPost[]) => {
    setSelectedPosts(posts);
  };

  const handleReelSelect = (reels: Post[]) => {
    setSelectedReels(reels);
  };

  const prepareTransactionData = () => {
    if (!service || !profileData || !selectedPosts.length && !selectedReels.length || !paymentData) {
      toast.error('Dados incompletos para processamento da transação');
      return null;
    }

    const postsMetadata = selectedPosts.map((post) => {
      const postCode = post.code || post.shortcode || post.id;
      return {
        postId: post.id,
        postCode: postCode,
        postLink: `https://instagram.com/p/${postCode}`,
        comments: service.quantidade,
        type: 'post'
      };
    });

    const reelsMetadata = selectedReels.map((reel) => {
      const reelCode = reel.code || reel.shortcode || reel.id;
      return {
        postId: reel.id,
        postCode: reelCode,
        postLink: `https://instagram.com/reel/${reelCode}`,
        comments: service.quantidade,
        type: 'reel'
      };
    });

    return {
      user_id: profileData.username,
      order_id: paymentData.paymentId,
      type: 'curtidas',
      amount: service.preco,
      status: 'pending',
      payment_method: 'pix',
      payment_id: paymentData.paymentId,
      metadata: {
        posts: [...postsMetadata, ...reelsMetadata],
        serviceDetails: service
      },
      customer_name: profileData.username,
      customer_email: profileData.username,
      customer_phone: profileData.username,
      target_username: profileData.username,
      target_full_name: profileData.full_name,
      payment_qr_code: paymentData.qrCodeText || null,
      payment_external_reference: paymentData.paymentId,
      service_id: service.id,
      provider_id: service.provider_id,
      target_profile_link: `https://www.instagram.com/${profileData.username}/`
    };
  };

  const sendTransactionToAdmin = async () => {
    try {
      setLoading(true);
      const transactionData = prepareTransactionData();

      if (!transactionData) {
        toast.error('Não foi possível preparar os dados da transação');
        return;
      }

      const response = await axios.post('/admin/transacoes', transactionData);
      
      if (response.status === 200 || response.status === 201) {
        toast.success('Transação registrada com sucesso');
      } else {
        toast.error('Erro ao registrar transação');
      }
    } catch (error) {
      console.error('Erro ao enviar transação:', error);
      toast.error('Falha ao processar transação');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!profileData || !service || (selectedPosts.length + selectedReels.length) === 0) {
      toast.error('Selecione pelo menos um post ou reel');
      return;
    }

    setLoading(true);

    try {
      const postIds = selectedPosts.map((post) => post.id);
      const reelIds = selectedReels.map((reel) => reel.id);
      const postCodes = selectedPosts.map((post) => post.code || post.shortcode || post.id);
      const reelCodes = selectedReels.map((reel) => reel.code || reel.shortcode || reel.id);

      const paymentData = {
        service: {
          id: service.id,
          name: service.name,
          price: finalAmount || service.preco,
          preco: finalAmount || service.preco,
          quantity: service.quantidade,
          quantidade: service.quantidade,
          provider_id: service.provider_id
        },
        profile: profileData,
        customer: {
          name: profileData.username,
          email: profileData.username,
          phone: profileData.username
        },
        posts: [...selectedPosts, ...selectedReels],
        amount: finalAmount || service.preco
      };

      const response = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar pagamento');
      }

      const paymentResponse = await response.json();
      
      setPaymentData({
        qrCodeText: paymentResponse.qr_code,
        paymentId: paymentResponse.id,
        amount: service.preco,
        qrCodeBase64: paymentResponse.qr_code_base64
      });

      await sendTransactionToAdmin();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Erro ao criar pagamento. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClosePaymentModal = () => {
    setPaymentData(null);
  };

  return (
    <InstagramPostsReelsStep2
      serviceType="curtidas"
      title="Comprar Visualizações para Curtidas"
      posts={instagramData.posts}
      reels={instagramData.reels}
      selectedPosts={selectedPosts}
      selectedReels={selectedReels}
      onPostSelect={handlePostSelect}
      onSelectReels={handleReelSelect}
      service={service}
      profileData={profileData}
      paymentData={paymentData}
      loading={loading}
      handleSubmit={handleSubmit}
      handleClosePaymentModal={handleClosePaymentModal}
      appliedCoupon={appliedCoupon}
      finalAmount={finalAmount}
      discountAmount={discountAmount}
    />
  );
}