'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/hooks/useSupabase';
import { toast } from 'sonner';
import { PostSelector } from '@/components/instagram/curtidas/PostSelector';
import { Header } from '../../components/Header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getProxiedImageUrl } from '../../utils/proxy-image';
import { PaymentPixModal } from '@/components/payment/PaymentPixModal';

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
  const [service, setService] = useState<Service | null>(null);
  const [selectedPosts, setSelectedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    whatsapp: ''
  });
  const [paymentData, setPaymentData] = useState<{
    qrCode: string;
    qrCodeText: string;
    paymentId: string;
  } | null>(null);

  const supabase = useSupabase();

  useEffect(() => {
    // Carregar dados do localStorage
    const checkoutData = localStorage.getItem('checkoutProfileData');
    
    if (!checkoutData) {
      toast.error('Dados do perfil não encontrados');
      router.push('/');
      return;
    }

    try {
      const { profileData: savedProfile, serviceId, formData: savedFormData, timestamp } = JSON.parse(checkoutData);
      
      // Verificar se os dados não são muito antigos (30 minutos)
      const thirtyMinutes = 30 * 60 * 1000;
      if (new Date().getTime() - timestamp > thirtyMinutes) {
        toast.error('Sessão expirada. Por favor, comece novamente.');
        localStorage.removeItem('checkoutProfileData');
        router.push('/');
        return;
      }

      setProfileData(savedProfile);
      setFormData(savedFormData || formData);
      
      if (serviceId) {
        fetchService(serviceId);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      toast.error('Erro ao carregar dados do perfil');
      router.push('/');
    }
  }, []);

  const fetchService = async (serviceId: string) => {
    const { data: serviceData, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (error) {
      toast.error('Erro ao carregar serviço');
      return;
    }

    // Adicionar o ID da FAMA para curtidas
    serviceData.fama_id = '1';
    setService(serviceData);
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
        qrCode: paymentData.qr_code_base64,
        qrCodeText: paymentData.qr_code,
        paymentId: paymentData.id
      });

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
          qrCode={paymentData.qrCode}
          qrCodeText={paymentData.qrCodeText}
          paymentId={paymentData.paymentId}
        />
      )}
    </div>
  );
}
