'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

// Interfaces para os tipos de dados
interface Provider {
  id: string;
  name: string;
  slug: string;
  api_key?: string;
  api_url?: string;
  status: boolean;
}

interface Service {
  id: string;
  name: string;
  type: string;
  preco: number;
  quantidade: number;
  provider_id: string;
}

export default function PaymentDebugPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [formData, setFormData] = useState({
    amount: '',
    service_id: '',
    provider_id: '',
    target_username: 'viralizei.ia',
    type: 'comentarios'
  });
  
  const supabase = createClient();
  
  // Carregar provedores e serviços ao iniciar a página
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carregar provedores
        const { data: providersData, error: providersError } = await supabase
          .from('providers')
          .select('*')
          .eq('status', 'TRUE'); // Alterar para 'TRUE' em maiúsculas

        console.log('Query to providers:', supabase.from('providers').select('*').eq('status', 'TRUE')); // Log da consulta
        console.log('Providers Data:', providersData); // Log para verificar dados dos provedores

        if (providersError) {
          console.error('Erro ao carregar provedores:', providersError);
          toast.error('Erro ao carregar provedores');
          return;
        }

        setProviders(providersData || []);

        // Carregar serviços
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*');

        console.log('Services Data:', servicesData); // Log para verificar dados dos serviços

        if (servicesError) {
          console.error('Erro ao carregar serviços:', servicesError);
          toast.error('Erro ao carregar serviços');
          return;
        }

        setServices(servicesData || []);

        // Se houver provedores, selecionar o primeiro por padrão
        if (providersData && providersData.length > 0) {
          setFormData(prev => ({
            ...prev,
            provider_id: providersData[0].id
          }));

          // Filtrar serviços pelo provedor selecionado
          const filtered = servicesData?.filter(service => 
            service.provider_id === providersData[0].id && 
            service.type === formData.type
          ) || [];

          setFilteredServices(filtered);

          // Se houver serviços filtrados, selecionar o primeiro por padrão
          if (filtered.length > 0) {
            setFormData(prev => ({
              ...prev,
              service_id: filtered[0].id,
              amount: filtered[0].preco.toString()
            }));
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar dados');
      }
    };
    
    fetchData();
  }, []);
  
  // Atualizar serviços filtrados quando o provedor ou tipo mudar
  useEffect(() => {
    if (formData.provider_id && formData.type) {
      const filtered = services.filter(service => 
        service.provider_id === formData.provider_id && 
        service.type === formData.type
      );
      
      setFilteredServices(filtered);
      
      // Se houver serviços filtrados, selecionar o primeiro por padrão
      if (filtered.length > 0 && !filtered.some(s => s.id === formData.service_id)) {
        setFormData(prev => ({
          ...prev,
          service_id: filtered[0].id,
          amount: filtered[0].preco.toString()
        }));
      }
    }
  }, [formData.provider_id, formData.type, services]);
  
  // Atualizar o valor amount quando o serviço mudar
  useEffect(() => {
    if (formData.service_id) {
      const selectedService = services.find(s => s.id === formData.service_id);
      if (selectedService) {
        setFormData(prev => ({
          ...prev,
          amount: selectedService.preco.toString()
        }));
      }
    }
  }, [formData.service_id, services]);

  // Função para gerar dados de teste completos
  const generateTestData = () => {
    const paymentId = `test_${Date.now()}`;
    const selectedService = services.find(s => s.id === formData.service_id);
    
    return {
      user_id: 'test_user',
      order_id: paymentId,
      type: formData.type,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      status: 'pending',
      payment_method: 'pix',
      payment_id: paymentId,
      metadata: {
        posts: [
          {
            postId: 'test_post_1',
            postCode: 'test123',
            postLink: 'https://instagram.com/p/test123',
            comentarios: 50,
            type: 'post'
          },
          {
            postId: 'test_post_2',
            postCode: 'test456',
            postLink: 'https://instagram.com/reel/test456',
            comentarios: 50,
            type: 'reel'
          }
        ],
        serviceDetails: {
          id: formData.service_id || 'test_service',
          name: selectedService?.name || 'Serviço de Teste',
          preco: formData.amount ? parseFloat(formData.amount) : 0,
          quantidade: selectedService?.quantidade || 100,
          provider_id: formData.provider_id,
          type: formData.type
        }
      },
      customer_name: 'Usuário de Teste',
      customer_email: 'teste@exemplo.com',
      customer_phone: '11999999999',
      target_username: formData.target_username,
      target_full_name: 'Usuário de Teste',
      payment_qr_code: 'test_qr_code',
      payment_external_reference: paymentId,
      service_id: formData.service_id || 'test_service',
      provider_id: formData.provider_id,
      target_profile_link: `https://www.instagram.com/${formData.target_username}/`
    };
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const testData = generateTestData();
      
      // Log dos dados que serão enviados
      console.log('Enviando dados de teste:', testData);
      
      // Enviar para a rota de teste
      const response = await axios.post('/api/test/payment-debug', testData);
      
      setResult(response.data);
      
      if (response.data.amountStatus === 'OK') {
        toast.success('Teste realizado com sucesso! Valor amount está presente.');
      } else {
        toast.error('Teste falhou! Valor amount está ausente ou nulo.');
      }
    } catch (error: any) {
      console.error('Erro ao testar pagamento:', error);
      toast.error(error.response?.data?.error || 'Erro ao testar pagamento');
      setResult(error.response?.data || { error: 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Teste de Debug de Pagamento</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Configuração do Teste</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provedor</label>
              <select
                className="w-full p-2 border rounded-md"
                value={formData.provider_id}
                onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de serviço</label>
              <select
                className="w-full p-2 border rounded-md"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="curtidas">Curtidas</option>
                <option value="seguidores">Seguidores</option>
                <option value="comentarios">Comentários</option>
                <option value="visualizacoes">Visualizações</option>
                <option value="reels">Reels</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Serviço</label>
              <select
                className="w-full p-2 border rounded-md"
                value={formData.service_id}
                onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
              >
                {filteredServices.length > 0 ? (
                  filteredServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - R$ {service.preco.toFixed(2)} - {service.quantidade} {formData.type}
                    </option>
                  ))
                ) : (
                  <option value="">Nenhum serviço disponível</option>
                )}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Valor (amount)</label>
              <Input
                type="number"
                placeholder="Ex: 99.90"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este valor é preenchido automaticamente com base no serviço selecionado
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Nome de usuário alvo</label>
              <Input
                placeholder="Ex: viralizei.ia"
                value={formData.target_username}
                onChange={(e) => setFormData({ ...formData, target_username: e.target.value })}
              />
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </span>
              ) : (
                'Testar Pagamento'
              )}
            </Button>
          </div>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Resultado do Teste</h2>
          
          {result ? (
            <div>
              <div className={`p-3 mb-4 rounded-md ${result.amountStatus === 'OK' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <p className="font-medium">Status do valor amount: {result.amountStatus}</p>
                <p>Valor: {result.amountValue !== null && result.amountValue !== undefined ? result.amountValue : 'NULO'}</p>
              </div>
              
              <Textarea
                className="w-full h-[400px] font-mono text-sm"
                value={JSON.stringify(result, null, 2)}
                readOnly
              />
            </div>
          ) : (
            <p className="text-gray-500 italic">Execute o teste para ver os resultados aqui.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
