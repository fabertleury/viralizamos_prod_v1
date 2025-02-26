'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PostSelector } from '@/components/instagram/curtidas/PostSelector';
import { Header } from '../../components/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProxiedImageUrl } from '../../utils/proxy-image';
import { PaymentPixModal } from '@/components/payment/PaymentPixModal';
import axios from 'axios';

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
}

interface Post {
  id: string;
  shortcode: string;
  image_url: string;
  caption?: string;
}

export default function Step2Page() {
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    whatsapp: '',
    phone: ''
  });
  const [service, setService] = useState<Service | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<Post[]>([]);
  const [paymentData, setPaymentData] = useState<{
    qrCodeText: string;
    paymentId: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const fetchInstagramPosts = async (username: string) => {
    try {
      const options = {
        method: 'GET',
        url: 'https://instagram-scraper-api2.p.rapidapi.com/v1/posts',
        params: { username_or_id_or_url: username },
        headers: {
          'x-rapidapi-key': process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
          'x-rapidapi-host': 'instagram-scraper-api2.p.rapidapi.com'
        }
      };
      const response = await axios.request(options);
      console.log('Resposta da API:', response.data);

      // Verificar se a resposta tem a estrutura esperada
      const posts = response.data.data?.items || response.data.items || [];
      console.log('Posts encontrados:', posts);

      // Mapear os posts para o formato esperado
      const formattedPosts: Post[] = posts.map((post: any) => {
        // Para posts de carrossel, usar a primeira imagem
        const imageUrl = 
          post.carousel_media?.[0]?.image_versions?.items?.[0]?.url || 
          post.image_versions?.items?.[0]?.url || 
          post.display_url;

        return {
          id: post.code || post.id || post.shortcode,
          shortcode: post.code || post.id || post.shortcode,
          image_url: imageUrl,
          caption: 
            typeof post.caption === 'object' 
              ? post.caption.text 
              : (post.caption || post.text || '')
        };
      }).filter(post => post.image_url); // Remover posts sem imagem

      console.log('Posts formatados:', formattedPosts);
      return formattedPosts;
    } catch (error) {
      console.error('Erro ao buscar posts do Instagram:', error);
      return [];
    }
  };

  const fetchService = async (externalId: string) => {
    try {
      console.log('Buscando serviço com external_id:', externalId);

      // Configurar headers de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session 
        ? { Authorization: `Bearer ${session.access_token}` } 
        : {};

      // Tentar várias formas de buscar o serviço
      const searchMethods = [
        () => supabase
          .from('services')
          .select('*')
          .eq('external_id', externalId)
          .single(),
        
        () => supabase
          .from('services')
          .select('*')
          .eq('external_id', externalId.replace(/"/g, ''))
          .single(),
        
        () => supabase
          .from('services')
          .select('*')
          .eq('id', externalId)
          .single(),
        
        () => supabase
          .from('services')
          .select('*')
          .eq('id', externalId.replace(/"/g, ''))
          .single()
      ];

      for (const searchMethod of searchMethods) {
        const { data, error } = await searchMethod();

        if (data) {
          console.log('Serviço encontrado:', data);
          data.fama_id = '1';
          setService(data);
          return data;
        }

        if (error) {
          console.warn('Erro na busca:', error);
        }
      }

      console.error('Não foi possível encontrar o serviço');
      toast.error('Serviço não encontrado');
      return null;
    } catch (error) {
      console.error('Erro inesperado ao buscar serviço:', error);
      toast.error('Erro ao carregar o serviço');
      return null;
    }
  };

  useEffect(() => {
    const checkoutData = localStorage.getItem('checkoutProfileData');
    console.log('Dados de checkout brutos:', checkoutData);

    try {
      if (checkoutData) {
        const parsedCheckoutData = JSON.parse(checkoutData);
        console.log('Dados de checkout parseados:', parsedCheckoutData);

        // Recuperar o external_id com mais flexibilidade
        const externalId = 
          parsedCheckoutData.serviceId || 
          parsedCheckoutData.external_id || 
          localStorage.getItem('serviceId') || 
          localStorage.getItem('external_id');

        console.log('External ID recuperado:', externalId);

        // Recuperar o perfil do usuário
        const profileData = 
          parsedCheckoutData.profileData || 
          parsedCheckoutData.profile || 
          parsedCheckoutData.user;

        console.log('Perfil recuperado:', profileData);

        if (profileData) {
          setProfileData(profileData);
          // Atualizar formData com dados do perfil, se disponíveis
          setFormData({
            userId: parsedCheckoutData.userId || '',
            name: parsedCheckoutData.name || '',
            email: parsedCheckoutData.email || '',
            whatsapp: parsedCheckoutData.whatsapp || '',
            phone: parsedCheckoutData.phone || ''
          });
        }

        if (externalId && profileData?.username) {
          console.log('Iniciando busca de serviço e posts para o usuário:', profileData.username);
          
          // Buscar serviço e posts em paralelo
          Promise.all([
            fetchService(externalId),
            fetchInstagramPosts(profileData.username)
          ]).then(([serviceData, postsData]) => {
            if (serviceData) {
              setService(serviceData);
            }
            if (postsData) {
              setInstagramPosts(postsData);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erro ao processar dados de checkout:', error);
    }
  }, []);

  const prepareTransactionData = () => {
    if (!service || !profileData || !formData || selectedPosts.length === 0 || !paymentData) {
      toast.error('Dados incompletos para processamento da transação');
      return null;
    }

    // Calcular quantidade de likes por post
    const totalPosts = selectedPosts.length;
    const totalLikes = service.quantidade;
    const likesPerPost = Math.floor(totalLikes / totalPosts);
    const remainingLikes = totalLikes % totalPosts;

    // Preparar metadados dos posts
    const postsMetadata = selectedPosts.map((post, index) => ({
      postId: post.id,
      postCode: post.shortcode,
      postLink: `https://www.instagram.com/p/${post.shortcode}/`,
      likes: index === 0 ? likesPerPost + remainingLikes : likesPerPost
    }));

    return {
      user_id: formData.userId || null,
      order_id: paymentData.paymentId,
      type: 'curtidas',
      amount: service.preco,
      status: 'pending',
      payment_method: 'pix',
      payment_id: paymentData.paymentId,
      metadata: {
        posts: postsMetadata,
        serviceDetails: service
      },
      customer_name: formData.name || null,
      customer_email: formData.email || null,
      customer_phone: formData.phone || null,
      target_username: profileData.username,
      target_full_name: profileData.full_name,
      payment_qr_code: paymentData.qrCodeText || null,
      payment_external_reference: paymentData.paymentId,
      service_id: service.id,
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
        router.push('/pedidos');
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
    if (!profileData || !service || selectedPosts.length === 0) {
      toast.error('Selecione pelo menos um post');
      return;
    }

    setLoading(true);

    try {
      // Criar pagamento via Pix
      const response = await fetch('/api/payment/pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: service.preco,
          description: `${service.quantidade} curtidas para ${selectedPosts.length} posts`,
          service: {
            id: service.id,
            name: service.name,
            quantity: service.quantidade,
            fama_id: service.fama_id
          },
          user_id: null,
          profile: {
            username: profileData.username,
            full_name: profileData.full_name,
            link: `https://instagram.com/${profileData.username}`
          },
          customer: {
            name: formData.name,
            email: formData.email,
            phone: formData.whatsapp
          },
          posts: selectedPosts.map(post => ({
            id: post.id,
            shortcode: post.shortcode,
            image_url: post.image_url,
            caption: post.caption || 'Sem legenda',
            link: `https://instagram.com/p/${post.shortcode}`
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar pagamento');
      }

      const paymentData = await response.json();
      
      setPaymentData({
        qrCodeText: paymentData.qr_code,
        paymentId: paymentData.id
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
    router.push('/dashboard');
  };

  return (
    <div>
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {profileData && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Seleção de Posts */}
            <Card className="p-6 order-1 md:order-none">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img 
                    src={getProxiedImageUrl(profileData.profile_pic_url)} 
                    alt={profileData.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold">{profileData.username}</h3>
                  <p className="text-sm text-gray-500">{profileData.follower_count.toLocaleString()} seguidores</p>
                </div>
              </div>
              
              <PostSelector 
                username={profileData.username}
                onSelectPosts={setSelectedPosts}
                maxPosts={5}
                service={service}
                posts={instagramPosts}
              />
            </Card>

            {/* Informações do Pedido */}
            <div className="space-y-6 order-2 md:order-none">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Informações do Pedido</h3>
                <div className="space-y-4">
                  <Input
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    placeholder="E-mail"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    placeholder="WhatsApp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                  
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quantidade de curtidas:</span>
                      <span>{service.quantidade.toLocaleString()}</span>
                    </div>
                    {selectedPosts.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Curtidas por post:</span>
                        <span>{Math.floor(service.quantidade / selectedPosts.length).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Posts selecionados:</span>
                      <span>{selectedPosts.length}/5</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold mt-2 pt-2 border-t">
                      <span>Valor total:</span>
                      <span>R$ {service.preco.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !service || selectedPosts.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Pagar com Pix'
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Após o pagamento, as curtidas serão adicionadas em até 24 horas.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {paymentData && (
        <PaymentPixModal
          isOpen={!!paymentData}
          onClose={handleClosePaymentModal}
          qrCode={paymentData.qrCodeText}
          qrCodeText={paymentData.qrCodeText}
          paymentId={paymentData.paymentId}
        />
      )}
    </div>
  );
}
