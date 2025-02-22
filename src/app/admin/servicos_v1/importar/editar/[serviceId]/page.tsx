'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-client';
import axios from 'axios';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

interface FamaService {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
}

interface ServiceQuantityPrice {
  quantidade: number;
  preco: number;
}

export default function EditarServicoImportadoPage() {
  const router = useRouter();
  const params = useParams();
  
  // Estados para campos do serviço
  const [famaServiceId, setFamaServiceId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [description, setDescription] = useState('');
  const [minOrder, setMinOrder] = useState('0');
  const [maxOrder, setMaxOrder] = useState('0');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [successRate, setSuccessRate] = useState('');
  const [refill, setRefill] = useState(false);
  const [checkoutTypeId, setCheckoutTypeId] = useState('');
  const [status, setStatus] = useState(true);

  // Estado para quantidades e preços
  const [quantityPrices, setQuantityPrices] = useState<ServiceQuantityPrice[]>([
    { quantidade: 50, preco: 10.00 }
  ]);

  // Estados para opções de seleção
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [checkoutTypes, setCheckoutTypes] = useState<any[]>([]);

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
        
        console.group('Dados do Serviço Carregados');
        console.log('Serviço completo:', service);
        console.log('Metadados:', service.metadata);
        console.log('Variações de Preço:', service.metadata?.quantidade_preco);
        console.groupEnd();

        // Preencher todos os campos com os dados do serviço
        setFamaServiceId(service.external_id || service.service?.toString() || '');
        setName(service.name || '');
        setType(service.type || '');
        
        // Configurar categoria e subcategoria
        setCategory(service.category_id || service.category?.id || '');
        setSubcategory(service.subcategory_id || service.subcategory?.id || '');
        
        // Configurar checkout type
        setCheckoutTypeId(service.checkout_type_id || '');
        
        // Configurar pedidos mínimos e máximos
        setMinOrder(service.min_order?.toString() || service.min?.toString() || '0');
        setMaxOrder(service.max_order?.toString() || service.max?.toString() || '0');
        
        // Configurar tempo de entrega
        setDeliveryTime(service.delivery_time || '');
        
        // Configurar taxa de sucesso
        setSuccessRate(service.success_rate?.toString() || '');
        
        // Configurar descrição
        setDescription(service.descricao || service.description || '');
        
        // Configurar refill
        setRefill(service.refill || false);
        
        // Configurar quantidade e preços
        const quantityPricesFromMetadata = service.metadata?.quantidade_preco || 
          (service.quantidade && service.preco ? [{ 
            quantidade: service.quantidade, 
            preco: service.preco 
          }] : [{ quantidade: 50, preco: 10.00 }]);
        
        setQuantityPrices(quantityPricesFromMetadata);
        
        // Status padrão
        setStatus(service.status !== false);

      } catch (error) {
        console.error('Erro ao buscar detalhes do serviço:', error);
        toast.error('Falha ao carregar detalhes do serviço');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validações básicas
      if (!name || !category || !subcategory || !checkoutTypeId) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }

      // Validar quantidades e preços
      const validQuantityPrices = quantityPrices.map(qp => ({
        quantidade: qp.quantidade > 0 ? qp.quantidade : 50,
        preco: qp.preco > 0 ? qp.preco : 10.00
      }));

      // Garantir que haja pelo menos uma entrada de quantidade/preço
      if (validQuantityPrices.length === 0) {
        validQuantityPrices.push({ quantidade: 50, preco: 10.00 });
      }

      // Preparar dados para inserção
      const serviceData = {
        name,
        type,
        category_id: category,
        subcategory_id: subcategory,
        descricao: description || '',
        status,
        delivery_time: deliveryTime || '',
        min_order: parseInt(minOrder || '0'),
        max_order: parseInt(maxOrder || '0'),
        external_id: famaServiceId,
        success_rate: successRate ? parseFloat(successRate) : null,
        checkout_type_id: checkoutTypeId,
        quantidade: validQuantityPrices[0].quantidade, // Garantir valor padrão
        preco: validQuantityPrices[0].preco, // Garantir valor padrão
        metadata: {
          origem: 'fama_redes',
          refill,
          quantidade_preco: validQuantityPrices
        }
      };

      // Log dos dados antes da inserção
      console.log('Dados para inserção no Supabase:', serviceData);

      // Inserir no Supabase
      const { data, error } = await supabase
        .from('services')
        .upsert(serviceData)
        .select()
        .single();

      if (error) {
        // Log detalhado do erro do Supabase
        console.error('Erro detalhado do Supabase:', {
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        });
        
        throw error;
      }

      toast.success(`Serviço ${name} salvo com sucesso!`);
      router.push('/admin/servicos_v1');
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      
      // Log detalhado do erro
      if (error instanceof Error) {
        console.error('Detalhes do erro:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }

      toast.error(`Falha ao salvar serviço: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

          {/* Mínimo e Máximo */}
          <div className="grid grid-cols-2 gap-2">
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
