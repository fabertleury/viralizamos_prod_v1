'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Header } from '@/components/layout/header';
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

export default function Step2Page() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [service, setService] = useState<Service | null>(null);
  const [paymentData, setPaymentData] = useState<{
    qrCodeText: string;
    paymentId: string;
    amount: number;
    qrCodeBase64?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    // Obter parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const username = params.get('username');
    const whatsapp = params.get('whatsapp');
    const email = params.get('email');
    const serviceId = params.get('service_id');

    if (!username || !serviceId) {
      toast.error('Informações incompletas. Por favor, volte e tente novamente.');
      router.push('/instagram/seguidores');
      return;
    }

    // Atualizar o estado com os dados do formulário
    setFormData({
      name: username,
      email: email || '',
      phone: whatsapp || ''
    });

    // Buscar dados do perfil do Instagram
    const fetchProfileData = async () => {
      try {
        const response = await fetch(`/api/instagram/info/${username}`);
        const data = await response.json();

        if (data.error) {
          toast.error(data.error);
          return;
        }

        setProfileData(data.data);
      } catch (error) {
        console.error('Erro ao buscar dados do perfil:', error);
        toast.error('Erro ao buscar dados do perfil');
      }
    };

    // Buscar dados do serviço
    const fetchServiceData = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Serviço não encontrado');

        setService(data);
      } catch (error) {
        console.error('Erro ao carregar serviço:', error);
        toast.error('Erro ao carregar serviço');
      }
    };

    fetchProfileData();
    fetchServiceData();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!service || !profileData) {
      toast.error('Informações incompletas');
      return;
    }

    setLoading(true);

    try {
      // Preparar os dados para o checkout
      const checkoutData = {
        service_id: service.id,
        profile_username: profileData.username,
        profile_url: `https://instagram.com/${profileData.username}`,
        quantity: service.quantidade,
        amount: service.preco,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
        checkout_type: 'followers'
      };

      // Enviar para a API de pagamento
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(checkoutData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      // Configurar dados do pagamento
      setPaymentData({
        qrCodeText: data.qrCodeText,
        qrCodeBase64: data.qrCodeBase64,
        paymentId: data.paymentId,
        amount: data.amount
      });

      setIsModalOpen(true);
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    router.push('/checkout/instagram/seguidores/success');
  };

  if (!profileData || !service) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  // Calcular o número estimado de seguidores após a compra
  const estimatedFollowers = profileData.follower_count + service.quantidade;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Passos do checkout */}
          <div className="mb-8 bg-white shadow-md rounded-xl p-6">
            <h3 className="text-xl font-bold text-center mb-6 text-gray-800">Como Comprar Seguidores</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  1
                </div>
                <h4 className="font-semibold text-gray-500 text-center">Verificar Perfil</h4>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  2
                </div>
                <h4 className="font-semibold text-gray-800 text-center">Confirmar Dados</h4>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xl font-bold mb-3">
                  3
                </div>
                <h4 className="font-semibold text-gray-500 text-center">Finalizar Compra</h4>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Informações do perfil */}
            <Card className="p-6 bg-white shadow-md rounded-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Seu Perfil do Instagram</h3>
              
              <div className="flex items-center mb-6">
                <div className="mr-4">
                  <img 
                    src={getProxiedImageUrl(profileData.profile_pic_url)} 
                    alt={profileData.username} 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{profileData.full_name}</h4>
                  <p className="text-gray-600">@{profileData.username}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">Seguidores Atuais</p>
                  <p className="text-lg font-semibold text-gray-800">{profileData.follower_count.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">Seguidores Após</p>
                  <p className="text-lg font-semibold text-purple-600">{estimatedFollowers.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Informações Importantes</h4>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li>• Seu perfil deve permanecer público durante o processo</li>
                  <li>• A entrega será feita gradualmente para maior naturalidade</li>
                  <li>• Não altere seu nome de usuário durante o processo</li>
                </ul>
              </div>
            </Card>
            
            {/* Detalhes do serviço e formulário */}
            <div className="space-y-6">
              <Card className="p-6 bg-white shadow-md rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Detalhes do Serviço</h3>
                
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
                  <div>
                    <h4 className="font-medium text-gray-800">{service.name}</h4>
                    <p className="text-sm text-gray-500">{service.quantidade} seguidores</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">R$ {service.preco.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-600">Entrega Gradual</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-600">Seguidores de Qualidade</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-600">Suporte 24/7</span>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6 bg-white shadow-md rounded-xl">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Seus Dados</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome
                    </label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                      className="w-full"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      'Finalizar Compra'
                    )}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de pagamento */}
      {paymentData && (
        <PaymentPixModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          qrCodeText={paymentData.qrCodeText}
          qrCodeBase64={paymentData.qrCodeBase64}
          amount={paymentData.amount}
          paymentId={paymentData.paymentId}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
