'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client'; 
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ServiceFormModal } from './components/ServiceFormModal';
import { ServiceVariationModal } from './components/ServiceVariationModal';
import { ServiceApiModal } from './components/ServiceApiModal';
import { ProviderSelectionModal } from './components/ProviderSelectionModal';
import { ServiceSelectionModal } from './components/ServiceSelectionModal';
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
  category?: {
    id: string;
    name: string;
    icon: string;
    social?: {
      id: string;
      name: string;
      icon: string;
    }
  }
  provider?: {
    id: string;
    name: string;
    slug: string;
  }
}

interface Provider {
  id: string;
  name: string;
  slug: string;
  description: string;
  api_key: string;
  api_url: string;
  status: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export default function ServicosV1Page() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedServiceVariations, setSelectedServiceVariations] = useState<Service | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showVariationModal, setShowVariationModal] = useState(false);
  const [showServiceSelectionModal, setShowServiceSelectionModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showInactiveServices, setShowInactiveServices] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Estado para controlar quais serviços têm variações expandidas
  const [expandedServiceVariations, setExpandedServiceVariations] = useState<{ [key: string]: boolean }>({});

  // Estado para controlar o modal de variações
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);
  const [selectedProviderFilter, setSelectedProviderFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [selectedCheckoutType, setSelectedCheckoutType] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

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
      console.log('Buscando serviços...');
      // Buscar todos os serviços com join explícito para provedores
      const { data: servicesData, error: servicesError } = await supabase
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
          ),
          provider:providers(id, name, slug)
        `)
        .order('name');

      if (servicesError) throw servicesError;

      // Buscar todos os provedores para ter uma referência completa
      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('id, name, slug');
        
      if (providersError) throw providersError;
      
      // Criar um mapa de provedores para fácil acesso por ID
      const providersMap = (providersData || []).reduce((map, provider) => {
        map[provider.id] = provider;
        return map;
      }, {});

      // Adicionar informações completas do provedor aos serviços
      const enhancedServices = (servicesData || []).map(service => {
        // Se o serviço já tem o provedor carregado, manter como está
        if (service.provider && service.provider.name) {
          return service;
        }
        
        // Se não tem provedor carregado mas tem provider_id, buscar do mapa
        if (service.provider_id && providersMap[service.provider_id]) {
          return {
            ...service,
            provider: providersMap[service.provider_id]
          };
        }
        
        // Caso contrário, manter como está
        return service;
      });

      console.log('Serviços carregados:', enhancedServices?.length);
      if (enhancedServices?.length > 0) {
        console.log('Exemplo de serviço:', enhancedServices[0]);
        console.log('Provider ID:', enhancedServices[0]?.provider_id);
        console.log('Provider:', enhancedServices[0]?.provider);
      }
      
      setServices(enhancedServices || []);
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
      text: "Esta ação irá desativar o serviço!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, desativar!',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('services')
          .update({ status: false })
          .eq('id', id);

        if (error) throw error;

        setServices(services.map(s => s.id === id ? { ...s, status: false } : s));
        toast.success('Serviço desativado com sucesso!');
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao desativar serviço');
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

  // Agrupar serviços por provedor
  const servicesByProvider = services.reduce((acc, service) => {
    const providerName = service.provider?.name || 'Sem Provedor';
    if (!acc[providerName]) {
      acc[providerName] = [];
    }
    acc[providerName].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Agrupar serviços por categoria
  const servicesByCategory = services.reduce((acc, service) => {
    const categoryName = service.category?.name || 'Sem Categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Agrupar serviços por tipo de checkout
  const servicesByCheckoutType = services.reduce((acc, service) => {
    let checkoutType = 'Não definido';
    
    // Verificar se o serviço tem tipo de checkout definido
    if (service.checkout_type_id) {
      // Mapear IDs para nomes mais amigáveis
      if (service.checkout_type_id === '1') {
        checkoutType = 'Mostrar Posts';
      } else if (service.checkout_type_id === '2') {
        checkoutType = 'Apenas Link do Usuário';
      }
    }
    
    if (!acc[checkoutType]) {
      acc[checkoutType] = [];
    }
    acc[checkoutType].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Filtrar serviços com base nos filtros selecionados
  const filteredServices = services.filter(service => {
    // Filtro por rede social
    if (selectedSocial && service.category?.social?.name !== selectedSocial) {
      return false;
    }
    
    // Filtro por provedor
    if (selectedProviderFilter && service.provider?.name !== selectedProviderFilter) {
      return false;
    }
    
    // Filtro por categoria
    if (selectedCategoryFilter && service.category?.name !== selectedCategoryFilter) {
      return false;
    }
    
    // Filtro por tipo de checkout
    if (selectedCheckoutType) {
      let serviceCheckoutType = 'Não definido';
      if (service.checkout_type_id === '1') {
        serviceCheckoutType = 'Mostrar Posts';
      } else if (service.checkout_type_id === '2') {
        serviceCheckoutType = 'Apenas Link do Usuário';
      }
      
      if (serviceCheckoutType !== selectedCheckoutType) {
        return false;
      }
    }
    
    // Filtro por status (ativo/inativo)
    if (!showInactiveServices && !service.status) {
      return false;
    }
    
    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        service.name.toLowerCase().includes(term) ||
        service.descricao?.toLowerCase().includes(term) ||
        service.categoria?.toLowerCase().includes(term) ||
        service.provider?.name?.toLowerCase().includes(term) ||
        service.external_id?.toLowerCase().includes(term)
      );
    }
    
    return true;
  });

  const handleOpenApiModal = () => {
    console.log('Abrindo modal de importação via API');
    setShowProviderModal(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Serviços</h1>
        <div className="flex space-x-2">
          <Button onClick={handleOpenApiModal}>
            <FontAwesomeIcon icon={faExternalLinkAlt} className="mr-2" />
            Importar da API
          </Button>
          <Button onClick={() => router.push('/admin/servicos_v1/criar')}>
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar serviços..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchTerm('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Seção de filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-3">Filtros</h2>
        
        {/* Filtro de redes sociais */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Rede Social</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm"
              variant={selectedSocial === null ? 'default' : 'outline'}
              onClick={() => setSelectedSocial(null)}
            >
              Todas
            </Button>
            {Object.keys(servicesBySocial).map((socialName) => (
              <Button 
                key={socialName}
                size="sm"
                variant={selectedSocial === socialName ? 'default' : 'outline'}
                onClick={() => setSelectedSocial(socialName)}
              >
                {socialName}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtro de provedores */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Provedor</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm"
              variant={selectedProviderFilter === null ? 'default' : 'outline'}
              onClick={() => setSelectedProviderFilter(null)}
            >
              Todos
            </Button>
            {Object.keys(servicesByProvider).map((providerName) => (
              <Button 
                key={providerName}
                size="sm"
                variant={selectedProviderFilter === providerName ? 'default' : 'outline'}
                onClick={() => setSelectedProviderFilter(providerName)}
              >
                {providerName}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtro de categorias */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Categoria</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm"
              variant={selectedCategoryFilter === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategoryFilter(null)}
            >
              Todas
            </Button>
            {Object.keys(servicesByCategory).map((categoryName) => (
              <Button 
                key={categoryName}
                size="sm"
                variant={selectedCategoryFilter === categoryName ? 'default' : 'outline'}
                onClick={() => setSelectedCategoryFilter(categoryName)}
              >
                {categoryName}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtro de tipo de checkout */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Tipo de Checkout</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm"
              variant={selectedCheckoutType === null ? 'default' : 'outline'}
              onClick={() => setSelectedCheckoutType(null)}
            >
              Todos
            </Button>
            {Object.keys(servicesByCheckoutType).map((checkoutType) => (
              <Button 
                key={checkoutType}
                size="sm"
                variant={selectedCheckoutType === checkoutType ? 'default' : 'outline'}
                onClick={() => setSelectedCheckoutType(checkoutType)}
              >
                {checkoutType}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtro de status */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
          <div className="flex gap-2">
            <Button 
              size="sm"
              variant={!showInactiveServices ? 'default' : 'outline'}
              onClick={() => setShowInactiveServices(false)}
            >
              Ativos
            </Button>
            <Button 
              size="sm"
              variant={showInactiveServices ? 'default' : 'outline'}
              onClick={() => setShowInactiveServices(true)}
            >
              Todos (incluir inativos)
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredServices.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredServices.map((service) => (
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

                    {/* Informação do provedor */}
                    <div className="mt-2 bg-gray-50 p-2 rounded text-xs">
                      <div className="font-medium text-gray-600">Provedor</div>
                      <div className="font-semibold text-purple-700">
                        {service.provider?.name || (service.provider_id ? `ID: ${service.provider_id}` : 'Sem provedor')}
                      </div>
                    </div>

                    {/* Informação do ID externo */}
                    {service.external_id && (
                      <div className="mt-2 bg-gray-50 p-2 rounded text-xs">
                        <div className="font-medium text-gray-600">ID Externo</div>
                        <div className="font-semibold text-blue-600 break-all">
                          {service.external_id}
                        </div>
                      </div>
                    )}

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
                              <p>Desativar Serviço</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center">Nenhum serviço encontrado</p>
          )}
        </div>
      )}

      {/* Modal de Formulário */}
      <ServiceFormModal 
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          setShowFormModal(false);
        }}
        editingService={editingService}
      />

      {/* Modal de Variações */}
      <ServiceVariationModal 
        isOpen={showVariationModal}
        onClose={() => {
          setShowVariationModal(false);
          setEditingService(null);
        }}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          setShowVariationModal(false);
          setEditingService(null);
        }}
        service={editingService || null}
      />

      {/* Modal de API */}
      <ServiceApiModal 
        isOpen={showApiModal}
        onClose={() => setShowApiModal(false)}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          setShowApiModal(false);
        }}
        selectedProvider={selectedProvider}
      />

      {/* Modal de Seleção de Provedor */}
      <ProviderSelectionModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onSelectProvider={(provider) => {
          // Salvar o provedor selecionado
          setSelectedProvider(provider);
          // Fechar o modal de seleção de provedores
          setShowProviderModal(false);
          // Abrir o modal de seleção de serviços
          setShowServiceSelectionModal(true);
        }}
      />

      {/* Modal de Seleção de Serviços */}
      <ServiceSelectionModal
        isOpen={showServiceSelectionModal}
        onClose={() => setShowServiceSelectionModal(false)}
        selectedProvider={selectedProvider}
      />

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
