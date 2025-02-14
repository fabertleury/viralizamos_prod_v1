'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ChevronRight, Plus, Minus } from 'lucide-react';
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
  quantities: { [key: string]: number };
}

export default function CurtidasPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<{[key: string]: number}>({});
  const supabase = createClient();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Log para debug
        console.log('Buscando serviços de curtidas...');

        // Buscar serviços relacionados a curtidas usando a coluna 'categoria'
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
            metadata
          `)
          .or(`categoria.ilike.%curtida%,name.ilike.%curtida%`)
          .eq('status', true)
          .order('preco', { ascending: true });

        // Log adicional para verificar dados
        console.log('Dados retornados:', data);
        console.log('Erro retornado:', error);

        if (error) throw error;

        // Mapear os dados para o formato esperado
        const curtidasServices = (data || []).filter(service => 
          service.categoria?.toLowerCase().includes('curtida') || 
          service.name.toLowerCase().includes('curtida')
        ).map(service => {
          // Tratar metadata de forma segura
          let metadata = {};
          try {
            metadata = service.metadata && typeof service.metadata === 'string' 
              ? JSON.parse(service.metadata) 
              : service.metadata || {};
          } catch (parseError) {
            console.error('Erro ao parsear metadata:', parseError);
          }

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
            discount_price: metadata['discount_price'],
            quantities: {
              '20': 20,
              '50': 50,
              '100': 100,
              '250': 250,
              '500': 500,
              '1000': 1000,
              '2500': 2500,
              '5000': 5000
            }
          };
        });

        setServices(curtidasServices);
      } catch (error) {
        console.error('Erro detalhado ao buscar serviços:', error);
        toast.error('Não foi possível carregar os serviços');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const updateServiceQuantity = (serviceId: string, quantity: number) => {
    setSelectedServices(prev => ({
      ...prev,
      [serviceId]: quantity
    }));
  };

  const calculateTotalPrice = (service: Service) => {
    const quantity = selectedServices[service.id] || 0;
    const basePrice = service.discount_price || service.price;
    const baseQuantity = 20; // Quantidade base de referência

    // Calcular preço proporcional
    const proportionalPrice = (basePrice / baseQuantity) * quantity;
    
    // Arredondar para 2 casas decimais
    const roundedPrice = Math.ceil(proportionalPrice * 100) / 100;

    return roundedPrice.toFixed(2);
  };

  const isServiceSelected = (serviceId: string) => {
    return selectedServices[serviceId] && selectedServices[serviceId] > 0;
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
                  Curtidas para Instagram
                </h2>
                <p className="text-xl md:text-2xl mb-0">
                  Aumente o engajamento do seu perfil com curtidas de alta qualidade
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Card 
                    key={service.id} 
                    className={`p-6 bg-white hover:shadow-lg transition-shadow duration-200 h-full flex flex-col ${
                      isServiceSelected(service.id) ? 'border-2 border-purple-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        <Heart className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {service.name}
                      </h3>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 flex-grow">
                      {service.description}
                    </p>
                    
                    <div className="mb-4">
                      <p className="text-center text-gray-600 mb-2">
                        Escolha a quantidade
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {Object.entries(service.quantities).map(([key, value]) => (
                          <Button
                            key={key}
                            variant={selectedServices[service.id] === value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateServiceQuantity(service.id, value)}
                          >
                            {key}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    {isServiceSelected(service.id) && (
                      <div className="text-center mb-4">
                        {service.discount_price && (
                          <p className="text-gray-500 line-through mb-1">
                            De: R$ {service.price.toFixed(2)}
                          </p>
                        )}
                        <p className="text-2xl font-bold text-purple-600">
                          Por: R$ {calculateTotalPrice(service)} 
                          <span className="text-sm ml-2 text-gray-600">
                            para {selectedServices[service.id]} curtidas
                          </span>
                        </p>
                      </div>
                    )}
                    
                    {isServiceSelected(service.id) && (
                      <Link 
                        href={`/checkout/instagram/curtidas/step1?service=${service.id}&quantity=${selectedServices[service.id]}`}
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
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
