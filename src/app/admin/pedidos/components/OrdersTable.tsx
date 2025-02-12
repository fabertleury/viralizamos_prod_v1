'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatDateToBrasilia } from '@/lib/utils/date';

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
}

interface OrdersTableProps {
  initialOrders: Order[];
}

export default function OrdersTable({ initialOrders }: OrdersTableProps) {
  const supabase = createClientComponentClient();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(false);

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
        return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
      case 'failed':
      case 'rejected':
        return 'bg-red-50 text-red-700 ring-red-600/20';
      default:
        return 'bg-gray-50 text-gray-700 ring-gray-600/20';
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
            {loading && (
              <div className="text-sm text-gray-500">
                Atualizando...
              </div>
            )}
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
                        Cliente
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Serviço
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Link/Username
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Quantidade
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Valor
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {order.external_order_id}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.user?.email}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.service?.name}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {order.metadata.link ? (
                            <a 
                              href={order.metadata.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {order.target_username || order.metadata.username}
                            </a>
                          ) : (
                            order.target_username || order.metadata.username
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {order.quantity}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          R$ {order.amount.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          {order.metadata.provider_status && (
                            <div className="mt-1 text-xs text-gray-500">
                              <div>Status: {order.metadata.provider_status.status}</div>
                              {order.metadata.provider_status.remains && (
                                <div>Restantes: {order.metadata.provider_status.remains}</div>
                              )}
                              {order.metadata.provider_status.error && (
                                <div className="text-red-500">
                                  Erro: {order.metadata.provider_status.error}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDateToBrasilia(order.created_at)}
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
    </div>
  );
}
