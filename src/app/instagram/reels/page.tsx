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
  quantidade_preco: { quantidade: number; preco: number; preco_original?: number }[];
  metadata?: {
    service_details?: {
      global_reach?: boolean;
      fast_delivery?: boolean;
      guaranteed_security?: boolean;
      [key: string]: any;
    };
    [key: string]: any;
  };
  type: string;
}

export default function ReelsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<{[key: string]: number}>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        console.log('Buscando serviços de reels...');

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
            checkout_type_id,
            type
          `)
          .eq('status', true)
          .order('preco', { ascending: true });

        console.log('Dados retornados:', data);
        console.log('Erro retornado:', error);

        if (error) throw error;

        // Filtrando serviços de reels
        const reelsServices = (data || []).filter(service => {
          const categoria = service.categoria?.toLowerCase() || '';
          const nome = service.name?.toLowerCase() || '';
          
          return (
            categoria.includes('reel') || 
            nome.includes('reel') ||
            service.type === 'reels'
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
          
          // Garantir que as variações tenham o formato correto com preco_original
          const formattedVariations = variations.map((v: any) => ({
            quantidade: v.quantidade,
            preco: v.preco,
            preco_original: v.preco_original || null
          }));

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
            quantidade_preco: formattedVariations,
            metadata: {
              service_details: metadata.service_details || {}
            },
            type: service.type
          };
        });

        setServices(reelsServices);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        toast.error('Erro ao carregar serviços. Por favor, tente novamente.');
        setLoading(false);
      }
    };

    fetchServices();
  }, [supabase]);

  const handleQuantityChange = (serviceId: string, quantity: number) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: quantity
    }));
  };

  const handleAddToCart = (service: Service) => {
    const quantity = selectedServices[service.id] || service.min_quantity;
    
    // Lógica para adicionar ao carrinho
    // ...
    
    toast.success(`${quantity} ${service.name} adicionado ao carrinho!`);
  };

  const getServiceFeatures = (service: Service) => {
    const features = [];
    
    if (service.metadata?.service_details?.global_reach) {
      features.push('Alcance Global');
    }
    
    if (service.metadata?.service_details?.fast_delivery) {
      features.push('Entrega Rápida');
    }
    
    if (service.metadata?.service_details?.guaranteed_security) {
      features.push('Segurança Garantida');
    }
    
    return features;
  };

  const hasDiscount = (service: Service) => {
    if (service.discount_price !== undefined) return true;
    
    // Verificar se existe preço promocional nas variações
    const quantity = selectedServices[service.id];
    const variation = service.quantidade_preco.find(v => v.quantidade === quantity);
    
    return variation && variation.preco_original && variation.preco_original > variation.preco;
  };

  const getOriginalPrice = (service: Service) => {
    if (service.discount_price !== undefined) return service.price;
    
    // Obter preço original da variação selecionada
    const quantity = selectedServices[service.id];
    const variation = service.quantidade_preco.find(v => v.quantidade === quantity);
    
    return variation && variation.preco_original ? variation.preco_original : service.price;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Reels para Instagram</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-center col-span-full">Carregando serviços...</p>
          ) : services.length === 0 ? (
            <p className="text-center col-span-full">Nenhum serviço de reels encontrado.</p>
          ) : (
            services.map(service => (
              <Card key={service.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-2">{service.name}</h2>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-bold text-blue-600">
                      R$ {service.price.toFixed(2)}
                    </span>
                    {hasDiscount(service) && (
                      <span className="text-sm text-gray-500 line-through">
                        R$ {getOriginalPrice(service).toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  {getServiceFeatures(service).length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold mb-2">Características:</h3>
                      <ul className="text-sm text-gray-600">
                        {getServiceFeatures(service).map((feature, index) => (
                          <li key={index} className="flex items-center mb-1">
                            <span className="mr-2">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label htmlFor={`quantity-${service.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade:
                    </label>
                    <input
                      type="number"
                      id={`quantity-${service.id}`}
                      min={service.min_quantity}
                      max={service.max_quantity}
                      value={selectedServices[service.id] || service.min_quantity}
                      onChange={(e) => handleQuantityChange(service.id, parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Min: {service.min_quantity} | Max: {service.max_quantity}
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      onClick={() => handleAddToCart(service)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition-colors duration-300"
                    >
                      Adicionar ao Carrinho
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
