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

export default function VisualizacoesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<{[key: string]: number}>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        console.log('Buscando serviços de visualizações...');

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
            service_variations
          `)
          .or(`categoria.ilike.%visualiza%,name.ilike.%visualiza%`)
          .eq('status', true)
          .order('preco', { ascending: true });

        console.log('Dados retornados:', data);
        console.log('Erro retornado:', error);

        if (error) throw error;

        const visualizacoesServices = (data || []).filter(service => 
          service.categoria?.toLowerCase().includes('visualiza') || 
          service.name.toLowerCase().includes('visualiza')
        ).map(service => {
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

        setServices(visualizacoesServices);
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        toast.error('Erro ao carregar serviços. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

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
                  Visualizações para Instagram
                </h2>
                <p className="text-xl md:text-2xl mb-0">
                  Aumente a visibilidade dos seus conteúdos com visualizações de qualidade
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id} className="p-6 bg-white hover:shadow-lg transition-shadow duration-200 h-full flex flex-col">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    
                    <div className="flex items-center mb-4">
                      <div className="text-2xl font-bold text-gray-900">
                        R$ {service.price.toFixed(2)}
                      </div>
                      {service.discount_price && (
                        <div className="ml-2 text-lg text-gray-500 line-through">
                          R$ {service.discount_price.toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {service.metadata?.service_details?.fast_delivery && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">✓</span>
                          <span>Entrega rápida</span>
                        </div>
                      )}
                      {service.metadata?.service_details?.global_reach && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">✓</span>
                          <span>Alcance global</span>
                        </div>
                      )}
                      {service.metadata?.service_details?.guaranteed_security && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">✓</span>
                          <span>Segurança garantida</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Link href={`/checkout/instagram/visualizacao/step1?service_id=${service.id}`}>
                      <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                        Selecionar
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
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
