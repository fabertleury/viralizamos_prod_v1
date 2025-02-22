'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; 
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ServiceFormModal } from './components/ServiceFormModal';
import { ServiceVariationModal } from './components/ServiceVariationModal';
import { ServiceApiModal } from './components/ServiceApiModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEdit, 
  faToggleOn, 
  faToggleOff, 
  faStar, 
  faPlus, 
  faLayerGroup,
  faTrash, // Adicionar ícone de lixeira
  faExternalLinkAlt,
  faChevronUp,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { SocialIcon } from '@/components/ui/social-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface Service {
  id: string;
  name: string;
  type: string;
  quantidade: number;
  preco: number;
  descricao: string;
  categoria: string;
  status: boolean;
  delivery_time: string;
  min_order: number;
  max_order: number;
  provider_id?: string;
  success_rate?: number;
  external_id?: string;
  metadata?: any;
  category_id: string;
  created_at: string;
  updated_at: string;
  featured: boolean;
  checkout_type_id?: string;
  subcategory_id?: string;
  category: {
    id: string;
    name: string;
    icon: string;
    social: {
      id: string;
      name: string;
      icon: string;
    };
  };
}

export default function ServicosV1Page() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);
  const supabase = createClient();

  // Estado para controlar quais serviços têm variações expandidas
  const [expandedServiceVariations, setExpandedServiceVariations] = useState<{ [key: string]: boolean }>({});

  // Estado para controlar o modal de variações
  const [selectedServiceVariations, setSelectedServiceVariations] = useState<any | null>(null);

  // Função para alternar a expansão das variações de um serviço
  const toggleServiceVariations = (serviceId: string) => {
    setExpandedServiceVariations(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
  };

  // Função para adicionar nova variação
  const handleAddVariation = async (service: any) => {
    try {
      // Abrir modal ou prompt para adicionar variação
      const novaQuantidade = prompt('Digite a quantidade:');
      const novoPreco = prompt('Digite o preço:');

      if (!novaQuantidade || !novoPreco) {
        toast.error('Quantidade e preço são obrigatórios');
        return;
      }

      const quantidade = parseInt(novaQuantidade);
      const preco = parseFloat(novoPreco);

      if (isNaN(quantidade) || isNaN(preco)) {
        toast.error('Quantidade e preço devem ser números válidos');
        return;
      }

      // Recuperar variações atuais
      const currentVariations = service.metadata?.quantidade_preco || [];
      
      // Verificar se já existe uma variação com essa quantidade
      const existingVariationIndex = currentVariations.findIndex(
        (v: any) => v.quantidade === quantidade
      );

      let updatedVariations;
      if (existingVariationIndex !== -1) {
        // Substituir variação existente
        updatedVariations = [
          ...currentVariations.slice(0, existingVariationIndex),
          { quantidade, preco },
          ...currentVariations.slice(existingVariationIndex + 1)
        ];
      } else {
        // Adicionar nova variação
        updatedVariations = [...currentVariations, { quantidade, preco }];
      }

      // Atualizar serviço no Supabase
      const { error } = await supabase
        .from('services')
        .update({ 
          metadata: { 
            ...service.metadata, 
            quantidade_preco: updatedVariations 
          } 
        })
        .eq('id', service.id);

      if (error) {
        console.error('Erro ao atualizar variações:', error);
        toast.error('Falha ao adicionar variação');
        return;
      }

      // Atualizar lista de serviços
      fetchServices();
      toast.success('Variação adicionada com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar variação:', error);
      toast.error('Erro ao processar variação');
    }
  };

  // Função para remover variação
  const handleRemoveVariation = async (service: any, variacaoIndex: number) => {
    try {
      const currentVariations = service.metadata?.quantidade_preco || [];
      
      // Remover variação específica
      const updatedVariations = [
        ...currentVariations.slice(0, variacaoIndex),
        ...currentVariations.slice(variacaoIndex + 1)
      ];

      // Atualizar serviço no Supabase
      const { error } = await supabase
        .from('services')
        .update({ 
          metadata: { 
            ...service.metadata, 
            quantidade_preco: updatedVariations 
          } 
        })
        .eq('id', service.id);

      if (error) {
        console.error('Erro ao remover variação:', error);
        toast.error('Falha ao remover variação');
        return;
      }

      // Atualizar lista de serviços
      fetchServices();
      toast.success('Variação removida com sucesso');
    } catch (error) {
      console.error('Erro ao remover variação:', error);
      toast.error('Erro ao processar remoção');
    }
  };

  // Função para abrir modal de variações
  const openVariationsModal = (service: any) => {
    setSelectedServiceVariations(service);
  };

  // Função para adicionar nova variação no modal
  const handleAddVariationInModal = async () => {
    try {
      if (!selectedServiceVariations) return;

      const novaQuantidade = prompt('Digite a quantidade:');
      const novoPreco = prompt('Digite o preço:');

      if (!novaQuantidade || !novoPreco) {
        toast.error('Quantidade e preço são obrigatórios');
        return;
      }

      const quantidade = parseInt(novaQuantidade);
      const preco = parseFloat(novoPreco);

      if (isNaN(quantidade) || isNaN(preco)) {
        toast.error('Quantidade e preço devem ser números válidos');
        return;
      }

      // Recuperar variações atuais
      const currentVariations = selectedServiceVariations.metadata?.quantidade_preco || [];
      
      // Verificar se já existe uma variação com essa quantidade
      const existingVariationIndex = currentVariations.findIndex(
        (v: any) => v.quantidade === quantidade
      );

      let updatedVariations;
      if (existingVariationIndex !== -1) {
        // Substituir variação existente
        updatedVariations = [
          ...currentVariations.slice(0, existingVariationIndex),
          { quantidade, preco },
          ...currentVariations.slice(existingVariationIndex + 1)
        ];
      } else {
        // Adicionar nova variação
        updatedVariations = [...currentVariations, { quantidade, preco }];
      }

      // Atualizar serviço no Supabase
      const { error } = await supabase
        .from('services')
        .update({ 
          metadata: { 
            ...selectedServiceVariations.metadata, 
            quantidade_preco: updatedVariations 
          } 
        })
        .eq('id', selectedServiceVariations.id);

      if (error) {
        console.error('Erro ao atualizar variações:', error);
        toast.error('Falha ao adicionar variação');
        return;
      }

      // Atualizar lista de serviços
      fetchServices();
      toast.success('Variação adicionada com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar variação:', error);
      toast.error('Erro ao processar variação');
    }
  };

  // Função para remover variação no modal
  const handleRemoveVariationInModal = async (variacaoIndex: number) => {
    try {
      if (!selectedServiceVariations) return;

      const currentVariations = selectedServiceVariations.metadata?.quantidade_preco || [];
      
      // Remover variação específica
      const updatedVariations = [
        ...currentVariations.slice(0, variacaoIndex),
        ...currentVariations.slice(variacaoIndex + 1)
      ];

      // Atualizar serviço no Supabase
      const { error } = await supabase
        .from('services')
        .update({ 
          metadata: { 
            ...selectedServiceVariations.metadata, 
            quantidade_preco: updatedVariations 
          } 
        })
        .eq('id', selectedServiceVariations.id);

      if (error) {
        console.error('Erro ao remover variação:', error);
        toast.error('Falha ao remover variação');
        return;
      }

      // Atualizar lista de serviços
      fetchServices();
      toast.success('Variação removida com sucesso');
    } catch (error) {
      console.error('Erro ao remover variação:', error);
      toast.error('Erro ao processar remoção');
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          category:categories(
            id,
            name,
            icon,
            social:social_id(
              id,
              name,
              icon
            )
          )
        `)
        .order('name');

      if (error) throw error;

      setServices(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [refreshKey]);

  const handleStatusToggle = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ status: !service.status })
        .eq('id', service.id);

      if (error) throw error;
      
      setServices(services.map(s => 
        s.id === service.id ? { ...s, status: !s.status } : s
      ));
      
      toast.success('Status atualizado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: "Esta ação não pode ser desfeita!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, deletar!',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('services')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setServices(services.filter(s => s.id !== id));
        toast.success('Serviço deletado com sucesso!');
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao deletar serviço');
      }
    }
  };

  const handleToggleFeatured = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ featured: !service.featured })
        .eq('id', service.id);

      if (error) throw error;
      
      setServices(services.map(s => 
        s.id === service.id ? { ...s, featured: !s.featured } : s
      ));
      
      toast.success('Destaque atualizado com sucesso!');
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao atualizar destaque');
    }
  };

  const openEditService = (service: Service) => {
    setEditingService(service);
    setShowFormModal(true);
  };

  const openAddVariation = (service: Service) => {
    setEditingService(service);
    setShowVariationModal(true);
  };

  // Agrupar serviços por rede social
  const servicesBySocial = services.reduce((acc, service) => {
    const socialName = service.category?.social?.name || 'Outros';
    if (!acc[socialName]) {
      acc[socialName] = [];
    }
    acc[socialName].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Serviços V1</h1>
        <div className="flex space-x-2">
          <Link href="/admin/servicos_v1/criar" passHref>
            <Button>
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Novo Serviço
            </Button>
          </Link>
          <Button 
            variant="secondary" 
            onClick={() => router.push('/admin/servicos_v1/importar')}
          >
            Importar via API
          </Button>
        </div>
      </div>

      {/* Filtro de redes sociais */}
      <div className="flex space-x-2 mb-4">
        <Button 
          variant={selectedSocial === null ? 'default' : 'outline'}
          onClick={() => setSelectedSocial(null)}
        >
          Todos
        </Button>
        {Object.keys(servicesBySocial).map((socialName) => (
          <Button 
            key={socialName}
            variant={selectedSocial === socialName ? 'default' : 'outline'}
            onClick={() => setSelectedSocial(socialName)}
          >
            {socialName}
          </Button>
        ))}
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(servicesBySocial)
            .filter(([socialName]) => selectedSocial === null || socialName === selectedSocial)
            .map(([socialName, socialServices]) => (
              <div key={socialName} className="bg-white border rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">{socialName}</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {socialServices.map((service) => (
                    <div 
                      key={service.id} 
                      className="border rounded-lg p-4 flex flex-col"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <SocialIcon 
                              social={service.category?.social?.name || 'default'} 
                              className="w-6 h-6" 
                            />
                            <span className="font-semibold text-sm">{service.name}</span>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs ${
                            service.status ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {service.status ? 'Ativo' : 'Inativo'}
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="font-medium text-gray-600">Preço Base</div>
                            <div className="font-bold text-blue-700">
                              R$ {service.preco.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="font-medium text-gray-600">Categoria</div>
                            <div>{service.category?.name || 'Não definida'}</div>
                          </div>
                        </div>

                        <div className="mt-4 border-t pt-2 flex justify-between items-center">
                          <div className="text-xs text-gray-500">
                            Criado em: {new Date(service.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex space-x-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link 
                                    href={`/admin/servicos_v1/importar/editar/${service.id}`} 
                                    className="text-blue-500 hover:text-blue-700"
                                  >
                                    <FontAwesomeIcon icon={faEdit} />
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar Serviço</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={() => openVariationsModal(service)}
                                    className="text-green-500 hover:text-green-700"
                                  >
                                    <FontAwesomeIcon icon={faLayerGroup} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Variações de Preço</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={() => handleStatusToggle(service)}
                                    className={`${service.status ? 'text-green-500' : 'text-red-500'} hover:opacity-75`}
                                  >
                                    <FontAwesomeIcon icon={service.status ? faToggleOn : faToggleOff} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{service.status ? 'Desativar' : 'Ativar'} Serviço</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={() => handleToggleFeatured(service)}
                                    className={`${service.featured ? 'text-yellow-500' : 'text-gray-400'} hover:opacity-75`}
                                  >
                                    <FontAwesomeIcon icon={faStar} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{service.featured ? 'Remover Destaque' : 'Destacar'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button 
                                    onClick={() => handleDelete(service.id)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Deletar Serviço</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {showFormModal && (
        <ServiceFormModal 
          isOpen={showFormModal} 
          onClose={() => {
            setShowFormModal(false);
            setEditingService(null);
          }}
          service={editingService}
          onSuccess={() => {
            setShowFormModal(false);
            setEditingService(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showVariationModal && (
        <ServiceVariationModal 
          isOpen={showVariationModal} 
          onClose={() => {
            setShowVariationModal(false);
            setEditingService(null);
          }}
          service={editingService}
          onSuccess={() => {
            setShowVariationModal(false);
            setEditingService(null);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {showApiModal && (
        <ServiceApiModal 
          isOpen={showApiModal} 
          onClose={() => setShowApiModal(false)}
          onSuccess={() => {
            setShowApiModal(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}

      {/* Modal de Variações */}
      {selectedServiceVariations && (
        <Dialog open={!!selectedServiceVariations} onOpenChange={() => setSelectedServiceVariations(null)}>
          <DialogContent className="sm:max-w-[425px] bg-white">
            <DialogHeader>
              <DialogTitle>Variações de Preço - {selectedServiceVariations.name}</DialogTitle>
              <DialogDescription>
                Gerencie as variações de preço para este serviço
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {selectedServiceVariations.metadata?.quantidade_preco?.length > 0 ? (
                <div className="space-y-2">
                  {selectedServiceVariations.metadata.quantidade_preco.map((variacao: any, index: number) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center bg-gray-50 p-2 rounded"
                    >
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Quantidade:</span> {variacao.quantidade} un
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-gray-600">Preço:</span> R$ {variacao.preco.toFixed(2)}
                      </div>
                      <button 
                        onClick={() => handleRemoveVariationInModal(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center">Nenhuma variação de preço cadastrada</p>
              )}
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setSelectedServiceVariations(null)}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleAddVariationInModal}
              >
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Adicionar Variação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
