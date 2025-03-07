'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  min_quantity: number;
  max_quantity: number;
  slug: string;
  categoria: string;
  status: boolean;
  discount_price?: number;
  quantidade_preco: { quantidade: number; preco: number }[];
  metadata?: {
    service_details?: {
      global_reach?: boolean;
      fast_delivery?: boolean;
      guaranteed_security?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export default function ComentariosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<{[key: string]: number}>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        console.log('Buscando serviços de comentários...');

        // Modificando a consulta para ser mais abrangente
        const { data, error } = await supabase
          .from('services')
          .select(`
            id, 
            name, 
            descricao, 
            preco, 
            min_order, 
            max_order,
            categoria,
            status,
            metadata,
            service_variations,
            checkout_type_id
          `)
          .eq('status', true)
          .order('preco', { ascending: true });

        console.log('Dados retornados:', data);
        console.log('Erro retornado:', error);

        if (error) throw error;

        // Filtrando serviços de comentários de forma mais abrangente
        const comentariosServices = (data || []).filter(service => {
          const categoria = service.categoria?.toLowerCase() || '';
          const nome = service.name?.toLowerCase() || '';
          
          return (
            categoria.includes('comentario') || 
            categoria.includes('comentário') || 
            nome.includes('comentario') || 
            nome.includes('comentário')
          );
        }).map(service => {
          let metadata: Record<string, any> = {};
          try {
            metadata = service.metadata && typeof service.metadata === 'string' 
              ? JSON.parse(service.metadata) 
              : service.metadata || {};
          } catch (parseError) {
            console.error('Erro ao parsear metadata:', parseError);
          }

          const variations = service.service_variations || (metadata.quantidade_preco as any[]) || [];

          return {
            id: service.id,
            name: service.name,
            description: service.descricao,
            price: service.preco,
            min_quantity: service.min_order || 50,
            max_quantity: service.max_order || 10000,
            slug: service.name.toLowerCase().replace(/\s+/g, '-'),
            categoria: service.categoria,
            status: service.status,
            discount_price: metadata.discount_price,
            quantidade_preco: variations,
            metadata: {
              service_details: metadata.service_details || {}
            }
          };
        });

        setServices(comentariosServices);
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        toast.error('Erro ao carregar serviços. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const getServiceDetails = (service: Service) => {
    const details = [];

    if (service.metadata?.service_details?.fast_delivery) {
      details.push({ icon: '✓', label: 'Entrega rápida' });
    }

    if (service.metadata?.service_details?.global_reach) {
      details.push({ icon: '✓', label: 'Alcance global' });
    }

    if (service.metadata?.service_details?.guaranteed_security) {
      details.push({ icon: '✓', label: 'Segurança garantida' });
    }

    return details;
  };

  const isServiceSelected = (serviceId: string) => {
    return selectedServices[serviceId] !== undefined;
  };

  const hasDiscount = (service: Service) => {
    return service.discount_price !== undefined;
  };

  const getOriginalPrice = (service: Service) => {
    return service.price;
  };

  const calculateTotalPrice = (service: Service) => {
    const quantity = selectedServices[service.id];
    const price = service.quantidade_preco.find(variation => variation.quantidade === quantity)?.preco || service.price;
    return price;
  };

  const updateServiceQuantity = (serviceId: string, quantity: number) => {
    setSelectedServices(prevState => ({ ...prevState, [serviceId]: quantity }));
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        {/* Banner de destaque */}
        <div className="container mx-auto px-4 mb-12">
          <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl overflow-hidden shadow-xl animate-gradient-x">
            <div className="absolute inset-0 bg-black opacity-20"></div>
            <div className="relative z-10 flex items-center justify-center p-12 text-center">
              <div className="text-white max-w-2xl">
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                  Comentários para Instagram
                </h2>
                <p className="text-xl md:text-2xl mb-0">
                  Aumente o engajamento dos seus posts com comentários de qualidade
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 animate-pulse h-full">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </Card>
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {services.map((service, index) => (
                  <Card 
                    key={service.id} 
                    className="flex flex-col p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out relative"
                  >
                    {/* Badge de Mais Vendido */}
                    {index === 0 && (
                      <div className="absolute top-0 right-0 m-2 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md z-10">
                        Mais Vendido
                      </div>
                    )}

                    <div className="flex-grow flex flex-col">
                      {/* Título do Serviço */}
                      <div className="mb-4 text-center">
                        <h3 className="text-2xl font-bold text-gray-900 break-words">
                          {service.name}
                        </h3>
                        <p className="text-sm font-medium text-purple-600 mt-1 bg-purple-50 py-1 px-2 rounded-md mx-auto inline-block">
                          Divida em até 5 posts diferentes!
                        </p>
                      </div>

                      {/* Detalhes adicionais do serviço */}
                      <div className="flex justify-between mb-4">
                        {getServiceDetails(service).map((detail, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center text-sm text-gray-600"
                          >
                            <span className="mr-2">{detail.icon}</span>
                            {detail.label}
                          </div>
                        ))}
                      </div>

                      <div className="mb-4">
                        <p className="text-center text-gray-600 mb-2 font-semibold">
                          Escolha a quantidade
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {service.quantidade_preco.map((variation) => (
                            <Button
                              key={variation.quantidade}
                              variant={selectedServices[service.id] === variation.quantidade ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => updateServiceQuantity(service.id, variation.quantidade)}
                              className={`min-w-[80px] transition-all duration-300 ease-in-out ${
                                selectedServices[service.id] === variation.quantidade 
                                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transform scale-105' 
                                  : 'hover:bg-purple-100'
                              }`}
                            >
                              {variation.quantidade}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {isServiceSelected(service.id) && (
                        <div className="text-center mb-4">
                          {hasDiscount(service) ? (
                            <>
                              <p className="text-gray-500 line-through text-lg">
                                De: R$ {getOriginalPrice(service)}
                              </p>
                              <p className="text-2xl font-bold text-purple-600">
                                Por: R$ {calculateTotalPrice(service)}
                              </p>
                              <p className="text-xs text-green-600 font-medium mt-1 bg-green-50 py-1 px-2 rounded-md inline-block">
                                Promoção!
                              </p>
                            </>
                          ) : (
                            <p className="text-2xl font-bold text-purple-600">
                              Por: R$ {calculateTotalPrice(service)}
                            </p>
                          )}
                        </div>
                      )}

                      {isServiceSelected(service.id) && (
                        <Link 
                          href={`/checkout/instagram/comentarios/step1?service_id=${service.id}&quantity=${selectedServices[service.id]}`}
                          className="w-full mt-auto"
                        >
                          <Button 
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 ease-in-out transform hover:scale-105"
                            size="lg"
                          >
                            Comprar Agora
                          </Button>
                        </Link>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-gray-900 mb-2">Nenhum serviço disponível no momento</h3>
              <p className="text-gray-600">Por favor, volte mais tarde ou entre em contato com o suporte.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
