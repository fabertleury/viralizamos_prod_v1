'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import axios from 'axios';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, faCoffee, faLemon, faCar, faHeart, faStar, faClock, faCheck, 
  faShield, faRocket, faGlobe, faUsers, faThumbsUp, faEye, faComment, 
  faBolt, faMedal, faTrophy, faGem, faCrown, faFire, faSmile, faLock, faUnlock 
} from '@fortawesome/free-solid-svg-icons';

interface ServiceQuantityPrice {
  quantidade: number;
  preco: number;
}

interface ServiceDetail {
  icon: string;
  title: string;
}

export default function EditarServicoImportadoPage() {
  const router = useRouter();
  const params = useParams();
  
  // Estados para campos do serviço
  const [serviceId, setServiceId] = useState('');
  const [famaServiceId, setFamaServiceId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [minOrder, setMinOrder] = useState('0');
  const [maxOrder, setMaxOrder] = useState('0');
  const [quantidade, setQuantidade] = useState('0');
  const [preco, setPreco] = useState('0');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [successRate, setSuccessRate] = useState('');
  const [refill, setRefill] = useState(false);
  const [checkoutTypeId, setCheckoutTypeId] = useState('');
  const [status, setStatus] = useState(true);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetail[]>([{ icon: '', title: '' }]);

  // Estado para quantidades e preços
  const [quantityPrices, setQuantityPrices] = useState<ServiceQuantityPrice[]>([
    { quantidade: 50, preco: 10.00 }
  ]);

  // Interfaces para tipos de dados
  interface Category {
    id: string;
    name: string;
    subcategories?: Subcategory[];
  }

  interface Subcategory {
    id: string;
    name: string;
  }

  interface CheckoutType {
    id: string;
    name: string;
  }

  // Estados para opções de seleção
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [checkoutTypes, setCheckoutTypes] = useState<CheckoutType[]>([]);

  useEffect(() => {
    // Buscar detalhes do serviço da API do Fama Redes
    const fetchFamaService = async () => {
      try {
        const serviceId = params.serviceId as string;
        if (!serviceId) {
          toast.error('ID do serviço não encontrado');
          return;
        }

        const response = await axios.post('/api/fama-services', {
          action: 'service_details',
          service_id: serviceId
        });

        const service = response.data;
        // Verificar se o serviço já existe no banco de dados antes de carregar
        const { data: existingService } = await supabase
          .from('services')
          .select('*')
          .eq('external_id', service.external_id)
          .single();

        if (existingService) {
          // Carregar os dados do serviço existente
          setServiceId(existingService.id || '');
          setFamaServiceId(existingService.external_id || '');
          setName(existingService.name || '');
          setType(existingService.type || '');
          setCategory(existingService.category_id || '');
          setSubcategory(existingService.subcategory_id || '');
          setDescription(existingService.descricao || '');
          setMinOrder(existingService.min_order?.toString() || '0');
          setMaxOrder(existingService.max_order?.toString() || '0');
          setQuantidade(existingService.quantidade?.toString() || '0');
          setPreco(existingService.preco?.toString() || '0');
          setSuccessRate(existingService.success_rate?.toString() || '0');
          setRefill(existingService.metadata?.refill || false);
          setCheckoutTypeId(existingService.checkout_type_id || '');
          setStatus(existingService.status !== false);
          setQuantityPrices(existingService.service_variations || existingService.metadata?.quantidade_preco || [{ quantidade: 50, preco: 10.00 }]);
          setServiceDetails(existingService.service_details || existingService.metadata?.serviceDetails || [{ icon: '', title: '' }]);
        } else {
          toast.error('Serviço não encontrado no banco de dados!');
        }
      } catch (error) {
        console.error('Erro ao buscar serviço:', error);
        toast.error('Erro ao buscar serviço');
      }
    };

    fetchFamaService();
  }, [params.serviceId]);

  // Buscar dados de seleção
  useEffect(() => {
    const fetchSelectionData = async () => {
      try {
        const [
          categoriesResponse, 
          checkoutTypesResponse
        ] = await Promise.all([
          supabase
            .from('categories')
            .select('*, subcategories(*)'),
          supabase
            .from('checkout_types')
            .select('*')
        ]);

        if (categoriesResponse.data) setCategories(categoriesResponse.data);
        if (checkoutTypesResponse.data) setCheckoutTypes(checkoutTypesResponse.data);
      } catch (error) {
        console.error('Erro ao buscar dados de seleção:', error);
        toast.error('Erro ao carregar dados de seleção');
      }
    };

    fetchSelectionData();
  }, []);

  // Atualizar subcategorias quando a categoria muda
  useEffect(() => {
    const selectedCategoryObj = categories.find(cat => cat.id === category);
    setSubcategories(selectedCategoryObj?.subcategories || []);
  }, [category, categories]);

  // Adicionar nova linha de quantidade e preço
  const addQuantityPriceRow = () => {
    setQuantityPrices([
      ...quantityPrices, 
      { quantidade: 0, preco: 0 }
    ]);
  };

  // Remover linha de quantidade e preço
  const removeQuantityPriceRow = (index: number) => {
    if (quantityPrices.length > 1) {
      const newRows = [...quantityPrices];
      newRows.splice(index, 1);
      setQuantityPrices(newRows);
    }
  };

  // Atualizar quantidade ou preço
  const updateQuantityPrice = (
    index: number, 
    field: 'quantidade' | 'preco', 
    value: string
  ) => {
    const newRows = [...quantityPrices];
    newRows[index][field] = field === 'quantidade' 
      ? parseInt(value) 
      : parseFloat(value);
    setQuantityPrices(newRows);
  };

  // Lista de ícones disponíveis para seleção
  const availableIcons = [
    { name: 'faCoffee', icon: faCoffee, label: 'Café' },
    { name: 'faLemon', icon: faLemon, label: 'Limão' },
    { name: 'faCar', icon: faCar, label: 'Carro' },
    { name: 'faHeart', icon: faHeart, label: 'Coração' },
    { name: 'faStar', icon: faStar, label: 'Estrela' },
    { name: 'faClock', icon: faClock, label: 'Relógio' },
    { name: 'faCheck', icon: faCheck, label: 'Verificado' },
    { name: 'faShield', icon: faShield, label: 'Escudo' },
    { name: 'faRocket', icon: faRocket, label: 'Foguete' },
    { name: 'faGlobe', icon: faGlobe, label: 'Globo' },
    { name: 'faUsers', icon: faUsers, label: 'Usuários' },
    { name: 'faThumbsUp', icon: faThumbsUp, label: 'Curtida' },
    { name: 'faEye', icon: faEye, label: 'Visualização' },
    { name: 'faComment', icon: faComment, label: 'Comentário' },
    { name: 'faBolt', icon: faBolt, label: 'Raio' },
    { name: 'faMedal', icon: faMedal, label: 'Medalha' },
    { name: 'faTrophy', icon: faTrophy, label: 'Troféu' },
    { name: 'faGem', icon: faGem, label: 'Gema' },
    { name: 'faCrown', icon: faCrown, label: 'Coroa' },
    { name: 'faFire', icon: faFire, label: 'Fogo' },
    { name: 'faSmile', icon: faSmile, label: 'Sorriso' },
    { name: 'faLock', icon: faLock, label: 'Bloqueado' },
    { name: 'faUnlock', icon: faUnlock, label: 'Desbloqueado' },
  ];

  const addServiceDetail = () => {
    setServiceDetails([...serviceDetails, { icon: 'faHeart', title: '' }]);
  };

  const updateServiceDetail = (index: number, field: 'icon' | 'title', value: string) => {
    const newDetails = [...serviceDetails];
    newDetails[index][field] = value;
    setServiceDetails(newDetails);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        id: serviceId,
        external_id: famaServiceId,
        name,
        type,
        category_id: category,
        subcategory_id: subcategory,
        checkout_type_id: checkoutTypeId,
        descricao: description,
        min_order: parseInt(minOrder),
        max_order: parseInt(maxOrder),
        quantidade: parseInt(quantidade),
        preco: parseFloat(preco),
        delivery_time: deliveryTime,
        success_rate: parseFloat(successRate),
        status,
        service_variations: quantityPrices,
        service_details: serviceDetails,
        metadata: {
          origem: "fama_redes",
          refill,
        },
      };

      // Usar upsert para evitar duplicação
      const { error } = await supabase
        .from('services')
        .upsert([serviceData]);

      if (error) {
        throw new Error('Erro ao cadastrar serviço: ' + error.message);
      }

      toast.success('Serviço cadastrado com sucesso!');
      router.push('/admin/servicos_v1');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao cadastrar serviço';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Editar Serviço</h1>
        <div className="flex space-x-2">
          <Link 
            href="/admin/servicos_v1" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded flex items-center space-x-2"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span>Voltar para Lista</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ID do Serviço Fama Redes */}
          <div>
            <label className="block mb-2">ID do Serviço Fama Redes</label>
            <input
              type="text"
              value={famaServiceId}
              onChange={(e) => setFamaServiceId(e.target.value)}
              className="w-full p-2 border rounded"
              required
              readOnly
            />
          </div>

          {/* Nome do Serviço */}
          <div>
            <label className="block mb-2">Nome do Serviço</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block mb-2">Tipo</label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block mb-2">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategoria */}
          <div>
            <label className="block mb-2">Subcategoria</label>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={!category}
              required
            >
              <option value="">Selecione uma subcategoria</option>
              {subcategories.map((subcat) => (
                <option key={subcat.id} value={subcat.id}>
                  {subcat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Checkout */}
          <div>
            <label className="block mb-2">Tipo de Checkout</label>
            <select
              value={checkoutTypeId}
              onChange={(e) => setCheckoutTypeId(e.target.value)}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Selecione um tipo de checkout</option>
              {checkoutTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mínimo, Máximo, Quantidade e Preço */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block mb-2">Pedido Mínimo</label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-full p-2 border rounded"
                min="1"
              />
            </div>
            <div>
              <label className="block mb-2">Pedido Máximo</label>
              <input
                type="number"
                value={maxOrder}
                onChange={(e) => setMaxOrder(e.target.value)}
                className="w-full p-2 border rounded"
                min="1"
              />
            </div>
            <div>
              <label className="block mb-2">Quantidade</label>
              <input
                type="number"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-full p-2 border rounded"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Preço Base (R$)</label>
              <input
                type="number"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="w-full p-2 border rounded"
                min="0.01"
                required
              />
            </div>
          </div>

          {/* Tempo de Entrega */}
          <div>
            <label className="block mb-2">Tempo de Entrega</label>
            <input
              type="text"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Ex: 1-2 horas"
            />
          </div>

          {/* Taxa de Sucesso */}
          <div>
            <label className="block mb-2">Taxa de Sucesso (%)</label>
            <input
              type="number"
              value={successRate}
              onChange={(e) => setSuccessRate(e.target.value)}
              className="w-full p-2 border rounded"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          {/* Descrição */}
          <div className="col-span-2">
            <label className="block mb-2">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          {/* Detalhes do Serviço */}
          <div className="col-span-2">
            <h2 className="text-lg font-bold mb-4">Detalhes do Serviço</h2>
            {serviceDetails.map((detail, index) => (
              <div key={index} className="flex items-center mb-4">
                <div className="w-1/2 mr-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ícone</label>
                  <div className="relative">
                    <select
                      value={detail.icon}
                      onChange={(e) => updateServiceDetail(index, 'icon', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">Selecione um ícone</option>
                      {availableIcons.map((iconOption) => (
                        <option key={iconOption.name} value={iconOption.name}>
                          {iconOption.label}
                        </option>
                      ))}
                    </select>
                    {detail.icon && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <FontAwesomeIcon 
                          icon={availableIcons.find(i => i.name === detail.icon)?.icon || faHeart} 
                          className="text-gray-500" 
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input
                    type="text"
                    placeholder="Título"
                    value={detail.title}
                    onChange={(e) => updateServiceDetail(index, 'title', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="ml-2 flex items-end">
                  <button 
                    type="button" 
                    onClick={addServiceDetail} 
                    className="mb-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md px-2 py-1"
                  >
                    +
                  </button>
                  {serviceDetails.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => {
                        const newDetails = [...serviceDetails];
                        newDetails.splice(index, 1);
                        setServiceDetails(newDetails);
                      }} 
                      className="mb-1 ml-1 bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1"
                    >
                      -
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="col-span-2 flex items-center">
            <input
              type="checkbox"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
              className="mr-2"
            />
            <label>Serviço Ativo</label>
          </div>

          {/* Refilável */}
          <div className="col-span-2 flex items-center">
            <input
              type="checkbox"
              checked={refill}
              onChange={(e) => setRefill(e.target.checked)}
              className="mr-2"
            />
            <label>Serviço Refilável</label>
          </div>
        </div>

        {/* Seção de Quantidades e Preços */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Quantidades e Preços</h2>
          <div className="space-y-2">
            {quantityPrices.map((qp, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="flex-1">
                  <label className="block mb-1">Quantidade</label>
                  <input
                    type="number"
                    value={qp.quantidade}
                    onChange={(e) => updateQuantityPrice(index, 'quantidade', e.target.value)}
                    className="w-full p-2 border rounded"
                    min="1"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={qp.preco}
                    onChange={(e) => updateQuantityPrice(index, 'preco', e.target.value)}
                    className="w-full p-2 border rounded"
                    min="0.01"
                    required
                  />
                </div>
                {quantityPrices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuantityPriceRow(index)}
                    className="mt-6 bg-red-500 text-white p-2 rounded hover:bg-red-600"
                  >
                    Remover
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addQuantityPriceRow}
              className="mt-2 bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              Adicionar Quantidade/Preço
            </button>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <Link 
            href="/admin/servicos_v1" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Salvar Serviço
          </button>
        </div>
      </form>
    </div>
  );
}
