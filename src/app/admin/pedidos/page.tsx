'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import OrdersTable from './components/OrdersTable';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Filter, RefreshCw, CheckCircle, Clock, XCircle, AlertCircle, BarChart4 } from 'lucide-react';

// Remover as configurações de revalidação e dynamic que não funcionam em componentes cliente
// export const dynamic = 'force-dynamic';
// export const revalidate = 0;

interface Order {
  id: string;
  user_id: string;
  service_id: string;
  status: string;
  quantity: number;
  amount: number;
  target_username: string;
  payment_status: string;
  payment_method: string;
  payment_id: string;
  external_order_id: string;
  metadata: {
    link: string;
    username?: string;
    post?: {
      shortcode: string;
      display_url: string;
    };
    provider: string;
    provider_service_id: string;
    provider_order_id: string;
    provider_status?: {
      status: string;
      start_count: string;
      remains: string;
      updated_at: string;
      error?: string;
    };
  };
  created_at: string;
  updated_at: string;
  transaction_id: string;
  service?: {
    id: string;
    name: string;
    type: string;
  };
  user?: {
    id: string;
    email: string;
  };
  transaction?: {
    id: string;
  };
}

export default function OrdersPage() {
  const supabase = createClientComponentClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    processing: 0,
    failed: 0,
    canceled: 0,
    pending: 0,
    partial: 0
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
    calculateStats();
  }, [orders, searchTerm, statusFilter, providerFilter, dateFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          service:service_id (*),
          user:user_id (*),
          transaction:transaction_id (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Aplicar filtro de pesquisa
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(term) ||
        (order.external_order_id && order.external_order_id.toLowerCase().includes(term)) ||
        (order.user?.email && order.user.email.toLowerCase().includes(term)) ||
        (order.target_username && order.target_username.toLowerCase().includes(term)) ||
        (order.service?.name && order.service.name.toLowerCase().includes(term)) ||
        (order.metadata?.provider && order.metadata.provider.toLowerCase().includes(term))
      );
    }

    // Aplicar filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Aplicar filtro de provedor
    if (providerFilter !== 'all') {
      filtered = filtered.filter(order => 
        order.metadata?.provider && order.metadata.provider.toLowerCase() === providerFilter.toLowerCase()
      );
    }

    // Aplicar filtro de data
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today') {
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= today;
        });
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= yesterday && orderDate < today;
        });
      } else if (dateFilter === 'last7days') {
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= last7Days;
        });
      } else if (dateFilter === 'last30days') {
        const last30Days = new Date(today);
        last30Days.setDate(last30Days.getDate() - 30);
        
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate >= last30Days;
        });
      }
    }

    setFilteredOrders(filtered);
  };

  const calculateStats = () => {
    const newStats = {
      total: orders.length,
      completed: orders.filter(order => order.status === 'completed').length,
      processing: orders.filter(order => order.status === 'processing').length,
      failed: orders.filter(order => order.status === 'failed').length,
      canceled: orders.filter(order => order.status === 'canceled').length,
      pending: orders.filter(order => order.status === 'pending').length,
      partial: orders.filter(order => order.status === 'partial').length
    };
    setStats(newStats);
  };

  // Extrair lista única de provedores para o filtro
  const providers = ['all', ...new Set(orders
    .filter(order => order.metadata?.provider)
    .map(order => order.metadata.provider))];

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setProviderFilter('all');
    setDateFilter('all');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (providerFilter !== 'all') count++;
    if (dateFilter !== 'all') count++;
    if (searchTerm) count++;
    return count;
  };

  if (loading && !orders.length) {
    return (
      <div className="w-full min-h-screen bg-gray-50">
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="p-4 max-w-full">
        {/* Cabeçalho */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-semibold text-gray-900">Gerenciamento de Pedidos</h1>
            <button
              onClick={fetchOrders}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 w-full sm:w-auto"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <BarChart4 className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total de Pedidos</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Concluídos</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
                <p className="text-xs text-gray-500">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% do total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Em Processamento</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats.processing}</p>
                <p className="text-xs text-gray-500">
                  {stats.total > 0 ? Math.round((stats.processing / stats.total) * 100) : 0}% do total
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Falhas/Cancelados</h3>
                <p className="text-2xl font-semibold text-gray-900">{stats.failed + stats.canceled}</p>
                <p className="text-xs text-gray-500">
                  {stats.total > 0 ? Math.round(((stats.failed + stats.canceled) / stats.total) * 100) : 0}% do total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-medium text-gray-700">Filtros</h2>
            {(statusFilter !== 'all' || providerFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
              <button
                onClick={resetFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar pedidos..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filtro de Status */}
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos os Status</option>
                <option value="pending">Pendente</option>
                <option value="processing">Processando</option>
                <option value="completed">Concluído</option>
                <option value="failed">Falhou</option>
                <option value="canceled">Cancelado</option>
                <option value="partial">Parcial</option>
              </select>
            </div>

            {/* Filtro de Provedor */}
            <div>
              <label htmlFor="provider-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Provedor
              </label>
              <select
                id="provider-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="all">Todos os Provedores</option>
                {providers.filter(p => p !== 'all').map((provider) => (
                  <option key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Data */}
            <div>
              <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <select
                id="date-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Todas as Datas</option>
                <option value="today">Hoje</option>
                <option value="yesterday">Ontem</option>
                <option value="last7days">Últimos 7 dias</option>
                <option value="last30days">Últimos 30 dias</option>
              </select>
            </div>
          </div>
          
          {/* Resumo dos filtros */}
          <div className="mt-4 flex flex-wrap items-center justify-between border-t pt-4">
            <div className="flex items-center text-sm text-gray-700 mb-2 sm:mb-0">
              <span className="font-medium mr-2">{filteredOrders.length}</span> 
              pedidos encontrados
              {filteredOrders.length !== orders.length && (
                <span className="ml-1 text-gray-500">
                  (de <span className="font-medium">{orders.length}</span> total)
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                  <button 
                    onClick={() => setStatusFilter('all')} 
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    &times;
                  </button>
                </span>
              )}
              
              {providerFilter !== 'all' && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                  Provedor: {providerFilter.charAt(0).toUpperCase() + providerFilter.slice(1)}
                  <button 
                    onClick={() => setProviderFilter('all')} 
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    &times;
                  </button>
                </span>
              )}
              
              {dateFilter !== 'all' && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Data: {
                    dateFilter === 'today' ? 'Hoje' : 
                    dateFilter === 'yesterday' ? 'Ontem' : 
                    dateFilter === 'last7days' ? 'Últimos 7 dias' : 
                    'Últimos 30 dias'
                  }
                  <button 
                    onClick={() => setDateFilter('all')} 
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    &times;
                  </button>
                </span>
              )}
              
              {searchTerm && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Busca: "{searchTerm}"
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="ml-1 text-amber-600 hover:text-amber-800"
                  >
                    &times;
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                <Filter className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum pedido encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                Tente ajustar os filtros ou realizar uma nova busca.
              </p>
              {getActiveFiltersCount() > 0 && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
                <div className="flex items-center">
                  <h2 className="text-base font-semibold leading-6 text-gray-900">Pedidos dos Clientes</h2>
                  <p className="ml-4 text-sm text-gray-500 hidden sm:block">
                    Acompanhe todos os pedidos realizados no sistema
                  </p>
                </div>
                <button
                  onClick={fetchOrders}
                  className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </>
                  )}
                </button>
              </div>
              
              <OrdersTable orders={filteredOrders} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
