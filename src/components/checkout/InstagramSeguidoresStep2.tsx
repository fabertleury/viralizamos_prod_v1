'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { InstagramStep2Base } from '@/components/checkout/InstagramStep2Base';
import { Card } from '@/components/ui/card';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

interface InstagramSeguidoresStep2Props {
  title: string;
}

export function InstagramSeguidoresStep2({ title }: InstagramSeguidoresStep2Props) {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  
  useEffect(() => {
    // Carregar dados do perfil do localStorage
    const loadProfileData = () => {
      try {
        const savedData = localStorage.getItem('checkoutProfileData');
        if (!savedData) {
          toast.error('Dados de perfil não encontrados');
          router.push('/checkout/instagram-v2/seguidores/step1');
          return;
        }
  
        const parsedData = JSON.parse(savedData);
        if (!parsedData.profileData) {
          toast.error('Dados de perfil incompletos');
          router.push('/checkout/instagram-v2/seguidores/step1');
          return;
        }
        
        setProfileData(parsedData.profileData);
      } catch (error) {
        console.error('Erro ao carregar dados do perfil:', error);
        toast.error('Erro ao carregar dados do perfil');
        router.push('/checkout/instagram-v2/seguidores/step1');
      }
    };
  
    loadProfileData();
  }, [router]);

  const handleSubmit = async (formData: any) => {
    try {
      setLoading(true);
      
      // Obter dados do localStorage
      const savedData = localStorage.getItem('checkoutProfileData');
      if (!savedData) {
        throw new Error('Dados de checkout não encontrados');
      }
      
      const parsedData = JSON.parse(savedData);
      const profileData = parsedData.profileData;
      const serviceId = parsedData.serviceId || parsedData.external_id;
      const quantity = parsedData.quantity;
      
      if (!profileData || !serviceId) {
        throw new Error('Dados de checkout incompletos');
      }
      
      // Preparar dados para o pedido
      const orderData = {
        profileData,
        serviceId,
        quantity,
        customerData: formData,
        serviceType: 'seguidores'
      };
      
      // Enviar pedido para a API
      const response = await axios.post('/api/orders/instagram', orderData);
      
      if (response.data && response.data.paymentData) {
        setPaymentData(response.data.paymentData);
        
        // Salvar ID do pedido no localStorage para acompanhamento
        localStorage.setItem('lastOrderId', response.data.orderId);
        
        toast.success('Pedido criado com sucesso!');
        return response.data.paymentData;
      } else {
        throw new Error('Erro ao processar pagamento');
      }
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error(`Erro ao finalizar pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Criar um item fictício para o InstagramStep2Base
  const dummyItem = profileData ? {
    id: profileData.username,
    code: profileData.username,
    shortcode: profileData.username,
    image_url: profileData.profile_pic_url,
    caption: `Perfil de ${profileData.username}`,
  } : null;

  const selectedItems = dummyItem ? [dummyItem] : [];

  return (
    <InstagramStep2Base
      serviceType="seguidores"
      title={title}
      selectedItems={selectedItems}
      onSubmit={handleSubmit}
      formData={formData}
      setFormData={setFormData}
    >
      {profileData && (
        <Card className="p-6 mb-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 relative">
              <img 
                src={profileData.profile_pic_url} 
                alt={profileData.username} 
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
                onError={(e) => {
                  const imgElement = e.target as HTMLImageElement;
                  imgElement.src = '/default-profile.png';
                }}
              />
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                <FontAwesomeIcon icon={faCheckCircle} className="text-white h-5 w-5" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-1">{profileData.full_name || profileData.username}</h3>
            <p className="text-gray-600 mb-4">@{profileData.username}</p>
            
            <div className="flex items-center justify-center space-x-2 mb-6">
              <FontAwesomeIcon icon={faUsers} className="text-purple-600 h-5 w-5" />
              <span className="font-semibold">{profileData.follower_count.toLocaleString()} seguidores</span>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg w-full max-w-md">
              <h4 className="font-semibold text-purple-700 mb-2">Informações do Serviço</h4>
              <p className="text-gray-700">
                Você está adquirindo seguidores para o perfil <strong>@{profileData.username}</strong>. 
                Os seguidores serão entregues gradualmente para garantir a segurança da sua conta.
              </p>
            </div>
          </div>
        </Card>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-700 mb-2">Importante</h3>
        <ul className="list-disc list-inside text-blue-700 text-sm space-y-1">
          <li>Certifique-se de que o perfil está público durante o processo de entrega</li>
          <li>Não altere o nome de usuário durante o processo</li>
          <li>A entrega pode levar até 24 horas para ser concluída</li>
          <li>Os seguidores são de alta qualidade e possuem foto de perfil e posts</li>
        </ul>
      </div>
    </InstagramStep2Base>
  );
}
