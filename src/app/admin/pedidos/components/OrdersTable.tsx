'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatDateToBrasilia } from '@/lib/utils/date';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
    type: string;
  };
  user?: {
    id: string;
    email: string;
  };
}

interface OrdersTableProps {
  initialOrders: Order[];
}

export default function OrdersTable({ initialOrders }: OrdersTableProps) {
  const supabase = createClientComponentClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<{ [key: string]: boolean }>({});
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<any>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          service:service_id (
            id,
            name,
            type
          ),
          user:user_id (
            id,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error);
      toast.error('Erro ao atualizar pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

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
      setOrders(orders.map(order => 
        order.external_order_id === orderId ? result.data : order
      ));

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

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Pedidos dos Clientes</h1>
              <p className="mt-2 text-sm text-gray-700">
                Acompanhe todos os pedidos realizados no sistema
              </p>
            </div>
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

        <div className="mt-4 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
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
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {order.id.substring(0, 8)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.external_order_id || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.user?.email || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.service?.name || 'N/A'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.quantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDateToBrasilia(order.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          {order.metadata?.provider_status?.updated_at && (
                            <div className="text-xs text-gray-500 mt-1">
                              Atualizado: {formatDateToBrasilia(order.metadata.provider_status.updated_at)}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Status do Pedido</DialogTitle>
            <DialogDescription>
              Detalhes do status do pedido no provedor
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrderStatus && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Informações do Pedido</h3>
                  <div className="mt-2 border rounded-md p-3 bg-gray-50">
                    <p><span className="font-medium">ID:</span> {selectedOrderStatus.order.id}</p>
                    <p><span className="font-medium">ID Externo:</span> {selectedOrderStatus.order.external_order_id}</p>
                    <p><span className="font-medium">Status:</span> {selectedOrderStatus.order.status}</p>
                    <p><span className="font-medium">Quantidade:</span> {selectedOrderStatus.order.quantity}</p>
                    {selectedOrderStatus.order.metadata?.provider_status && (
                      <>
                        <p><span className="font-medium">Status Provedor:</span> {selectedOrderStatus.order.metadata.provider_status.status}</p>
                        <p><span className="font-medium">Contagem Inicial:</span> {selectedOrderStatus.order.metadata.provider_status.start_count}</p>
                        <p><span className="font-medium">Restante:</span> {selectedOrderStatus.order.metadata.provider_status.remains}</p>
                        {selectedOrderStatus.order.metadata.provider_status.charge && (
                          <p><span className="font-medium">Custo:</span> {selectedOrderStatus.order.metadata.provider_status.charge} {selectedOrderStatus.order.metadata.provider_status.currency}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Resposta da API</h3>
                  <div className="mt-2 border rounded-md p-3 bg-gray-50">
                    <pre className="text-xs overflow-auto max-h-60">
                      {JSON.stringify(selectedOrderStatus.provider_response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  onClick={() => setStatusModalOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
