'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatDateToBrasilia } from '@/lib/utils/date';
import { toast } from 'sonner';
import { RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
      charge?: string;
      currency?: string;
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
  };
  user?: {
    id: string;
    email: string;
  };
}

interface OrdersTableProps {
  orders: Order[];
}

export default function OrdersTable({ orders }: OrdersTableProps) {
  const supabase = createClientComponentClient();
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<{ [key: string]: boolean }>({});
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Função para extrair o código do post do Instagram de forma padronizada
  const extractPostCode = (link: string | undefined): string | null => {
    if (!link) return null;
    
    // Se já for um código direto (não uma URL)
    if (link && !link.includes('http') && !link.includes('/')) {
      return link;
    }
    
    // Extrair o código da URL do post
    if (link.includes('instagram.com/p/')) {
      const postCode = link.split('/p/')[1]?.split('/')[0]?.split('?')[0];
      if (postCode) return postCode;
    }
    
    // Extrair o código da URL do reel
    if (link.includes('instagram.com/reel/')) {
      const postCode = link.split('/reel/')[1]?.split('/')[0]?.split('?')[0];
      if (postCode) return postCode;
    }
    
    return null;
  };

  // Função para formatar o link do Instagram corretamente
  const formatInstagramLink = (link: string | undefined): string | null => {
    const code = extractPostCode(link);
    if (!code) return null;
    return `https://instagram.com/p/${code}`;
  };

  // Atualizar os pedidos locais quando os pedidos da prop mudarem
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  useEffect(() => {
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          service:service_id (
            id,
            name
          ),
          user:user_id (
            id,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLocalOrders(data || []);
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error);
      toast.error('Erro ao atualizar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-50 text-green-700 ring-green-600/20';
      case 'pending':
      case 'processing':
      case 'in progress':
        return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'failed':
      case 'rejected':
      case 'canceled':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      case 'partial':
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20';
    }
  };

  const checkOrderStatus = async (orderId: string) => {
    if (!orderId) {
      toast.error('Este pedido não possui um ID externo para verificação');
      return;
    }
    
    try {
      setCheckingStatus(prev => ({ ...prev, [orderId]: true }));
      
      const response = await fetch('/api/orders/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao verificar status do pedido');
      }
      
      toast.success('Status do pedido atualizado com sucesso');
      
      // Atualizar o pedido na lista
      setLocalOrders(localOrders.map(order => 
        order.external_order_id === orderId ? result.data : order
      ));

      // Verificar e corrigir o link do Instagram antes de exibir o modal
      if (result.data && result.data.metadata && result.data.metadata.link) {
        const link = result.data.metadata.link;
        const displayLink = formatInstagramLink(link);
        if (displayLink) {
          result.data.metadata.link = displayLink;
        }
      }

      // Exibir o modal com a resposta da API
      setSelectedOrderStatus({
        order: result.data,
        provider_response: result.provider_response
      });
      setStatusModalOpen(true);
    } catch (error) {
      console.error('Erro ao verificar status do pedido:', error);
      toast.error(error.message || 'Erro ao verificar status do pedido');
    } finally {
      setCheckingStatus(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      setDeleting(true);
      
      // Primeiro, atualizamos o status do pedido para "canceled"
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', orderToDelete.id);
        
      if (updateError) throw updateError;
      
      // Opcionalmente, podemos também tentar cancelar o pedido no provedor
      // através de uma API específica, se disponível
      try {
        const response = await fetch('/api/orders/cancel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            orderId: orderToDelete.id,
            externalOrderId: orderToDelete.external_order_id 
          }),
        });
        
        if (!response.ok) {
          console.warn('Não foi possível cancelar o pedido no provedor, mas foi marcado como cancelado no sistema.');
        }
      } catch (providerError) {
        console.error('Erro ao tentar cancelar no provedor:', providerError);
      }
      
      // Atualizar a lista local
      setLocalOrders(localOrders.map(order => 
        order.id === orderToDelete.id ? { ...order, status: 'canceled' } : order
      ));
      
      toast.success('Pedido cancelado com sucesso');
      setDeleteModalOpen(false);
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error('Erro ao cancelar pedido');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (order: Order) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  return (
    <div>
      <div className="py-6">
        <div className="px-4 sm:px-0 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Pedidos dos Clientes</h1>
              <p className="mt-2 text-sm text-gray-700">
                Acompanhe todos os pedidos realizados no sistema
              </p>
            </div>
            <div className="flex space-x-2">
              <span className="text-sm text-gray-500 self-center mr-2">
                {localOrders.length} pedidos encontrados
              </span>
              <button
                onClick={fetchOrders}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
        </div>

        <div className="mt-8">
          <div className="overflow-x-auto border rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    ID Pedido
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    ID Externo
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Cliente
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Serviço
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Provedor
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Quantidade
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Data
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {localOrders.map((order) => {
                  // Verificar e corrigir o link do Instagram para exibição
                  let displayLink = formatInstagramLink(order.metadata?.link);
                  
                  // Obter o nome do provedor formatado
                  const providerName = order.metadata?.provider_name || 
                                        (order.metadata?.provider ? 
                                          order.metadata.provider.charAt(0).toUpperCase() + 
                                          order.metadata.provider.slice(1) : 
                                          'Fama Redes');
                  
                  // Obter o email do cliente
                  const customerEmail = order.user?.email || 
                                         (order.metadata?.customer?.email) || 
                                         'N/A';
                  
                  // Obter o nome do cliente
                  const customerName = order.metadata?.customer?.name || 
                                        customerEmail.split('@')[0] || 
                                        'N/A';
                  
                  return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {order.id.substring(0, 8)}
                      <div className="text-xs text-gray-500">
                        {order.transaction_id && `Trans: ${order.transaction_id.substring(0, 8)}`}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {order.external_order_id || 'N/A'}
                      {order.payment_id && (
                        <div className="text-xs text-gray-500">
                          Pag: {order.payment_id.substring(0, 10)}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="font-medium">{customerName}</div>
                      <div className="text-xs">{customerEmail}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {order.service?.name || 'N/A'}
                      {order.target_username && (
                        <div className="text-xs text-gray-500">
                          @{order.target_username}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="font-medium">{providerName}</div>
                      {order.metadata?.provider_service_id && (
                        <div className="text-xs text-gray-500">
                          ID: {order.metadata.provider_service_id}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="font-medium">{order.quantity}</div>
                      {order.amount && (
                        <div className="text-xs text-gray-500">
                          R$ {order.amount.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {formatDateToBrasilia(order.created_at)}
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString('pt-BR')}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      {order.payment_status && order.payment_status !== order.status && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.payment_status)}`}>
                            Pag: {order.payment_status}
                          </span>
                        </div>
                      )}
                      {order.metadata?.provider_status?.updated_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          Atualizado: {formatDateToBrasilia(order.metadata.provider_status.updated_at)}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => checkOrderStatus(order.external_order_id)}
                          disabled={!order.external_order_id || checkingStatus[order.external_order_id]}
                          className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          title={!order.external_order_id ? "Este pedido não possui um ID externo para verificação" : "Verificar status do pedido no provedor"}
                        >
                          {checkingStatus[order.external_order_id] ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Verificar Status
                        </button>
                        {displayLink && (
                          <a
                            href={displayLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md bg-blue-50 px-2.5 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            Ver Post
                          </a>
                        )}
                        <button
                          onClick={() => openDeleteModal(order)}
                          disabled={order.status.toLowerCase() === 'canceled'}
                          className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          title="Cancelar pedido"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
            <DialogDescription>
              Informações completas do pedido e status no provedor
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrderStatus && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Informações do Pedido</h3>
                  <div className="border rounded-md p-4 bg-white space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">ID do Pedido</p>
                        <p className="font-medium">{selectedOrderStatus.order.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ID Externo</p>
                        <p className="font-medium">{selectedOrderStatus.order.external_order_id || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Provedor</p>
                        <p className="font-medium">{selectedOrderStatus.order.metadata?.provider || 'Fama Redes'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Serviço</p>
                        <p className="font-medium">{selectedOrderStatus.order.service?.name || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="font-medium">{selectedOrderStatus.order.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Quantidade</p>
                        <p className="font-medium">{selectedOrderStatus.order.quantity}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-500">Cliente</p>
                        <p className="font-medium">{selectedOrderStatus.order.user?.email || selectedOrderStatus.order.metadata?.customer?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Data de Criação</p>
                        <p className="font-medium">{formatDateToBrasilia(selectedOrderStatus.order.created_at)}</p>
                      </div>
                    </div>
                    
                    {selectedOrderStatus.order.metadata?.link && (
                      <div>
                        <p className="text-xs text-gray-500">Link</p>
                        <a 
                          href={formatInstagramLink(selectedOrderStatus.order.metadata.link)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline text-sm break-all"
                        >
                          {formatInstagramLink(selectedOrderStatus.order.metadata.link)}
                        </a>
                      </div>
                    )}
                    
                    {selectedOrderStatus.order.target_username && (
                      <div>
                        <p className="text-xs text-gray-500">Usuário Alvo</p>
                        <p className="font-medium">@{selectedOrderStatus.order.target_username}</p>
                      </div>
                    )}
                    
                    {selectedOrderStatus.order.transaction_id && (
                      <div>
                        <p className="text-xs text-gray-500">ID da Transação</p>
                        <p className="font-medium">{selectedOrderStatus.order.transaction_id}</p>
                      </div>
                    )}
                    
                    {selectedOrderStatus.order.payment_id && (
                      <div>
                        <p className="text-xs text-gray-500">ID do Pagamento</p>
                        <p className="font-medium">{selectedOrderStatus.order.payment_id}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Status do Provedor</h3>
                  <div className="border rounded-md p-4 bg-white">
                    {selectedOrderStatus.order.metadata?.provider_status ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-gray-500">Status</p>
                            <p className={`font-medium ${selectedOrderStatus.order.metadata.provider_status.status.toLowerCase() === 'completed' ? 'text-green-600' : selectedOrderStatus.order.metadata.provider_status.status.toLowerCase() === 'pending' ? 'text-yellow-600' : selectedOrderStatus.order.metadata.provider_status.status.toLowerCase() === 'processing' ? 'text-blue-600' : 'text-gray-900'}`}>
                              {selectedOrderStatus.order.metadata.provider_status.status}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Última Atualização</p>
                            <p className="font-medium">{formatDateToBrasilia(selectedOrderStatus.order.metadata.provider_status.updated_at)}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-gray-500">Contagem Inicial</p>
                            <p className="font-medium">{selectedOrderStatus.order.metadata.provider_status.start_count}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Restante</p>
                            <p className="font-medium">{selectedOrderStatus.order.metadata.provider_status.remains}</p>
                          </div>
                        </div>
                        
                        {selectedOrderStatus.order.metadata.provider_status.charge && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-gray-500">Custo</p>
                              <p className="font-medium">{selectedOrderStatus.order.metadata.provider_status.charge} {selectedOrderStatus.order.metadata.provider_status.currency}</p>
                            </div>
                          </div>
                        )}
                        
                        {selectedOrderStatus.order.metadata.provider_status.error && (
                          <div>
                            <p className="text-xs text-gray-500">Erro</p>
                            <p className="font-medium text-red-600">{selectedOrderStatus.order.metadata.provider_status.error}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhuma informação de status disponível do provedor</p>
                    )}
                  </div>
                  
                  <h3 className="text-sm font-medium text-gray-900 mt-4 mb-2">Resposta da API</h3>
                  <div className="border rounded-md p-4 bg-white">
                    <pre className="text-xs overflow-auto max-h-60">
                      {JSON.stringify(selectedOrderStatus.provider_response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  onClick={() => checkOrderStatus(selectedOrderStatus.order.external_order_id)}
                  disabled={!selectedOrderStatus.order.external_order_id || checkingStatus[selectedOrderStatus.order.external_order_id]}
                >
                  {checkingStatus[selectedOrderStatus.order.external_order_id] ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar Status
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                  onClick={() => setStatusModalOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Cancelar Pedido
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          {orderToDelete && (
            <div className="py-4">
              <div className="border rounded-md p-4 bg-white space-y-2">
                <p><span className="font-medium">ID:</span> {orderToDelete.id}</p>
                <p><span className="font-medium">Serviço:</span> {orderToDelete.service?.name || 'N/A'}</p>
                <p><span className="font-medium">Quantidade:</span> {orderToDelete.quantity}</p>
                <p><span className="font-medium">Status Atual:</span> {orderToDelete.status}</p>
                {orderToDelete.external_order_id && (
                  <p><span className="font-medium">ID Externo:</span> {orderToDelete.external_order_id}</p>
                )}
                <p className="text-red-600 text-sm mt-2">
                  Nota: O pedido será marcado como cancelado no sistema. Se o pedido já foi processado pelo provedor, 
                  pode não ser possível cancelá-lo completamente.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              onClick={handleDeleteOrder}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
