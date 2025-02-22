'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  UserGroupIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/card';
import { useInstagramAPI } from '@/hooks/useInstagramAPI';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface Stats {
  totalClients: number;
  totalOrders: number;
  totalRevenue: number;
  openTickets: number;
  recentOrders: Array<{
    id: string;
    created_at: string;
    amount: number;
    status: string;
    user: {
      id: string;
      name: string;
    };
  }>;
  recentTickets: Array<{
    id: string;
    title: string;
    status: string;
    created_at: string;
    user: {
      id: string;
      name: string;
    };
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

const InstagramAPIStatusCard = () => {
  const { checkInstagramAPIStatus } = useInstagramAPI();
  const [apiStatus, setApiStatus] = useState({
    status: 'offline',
    detail: 'Verificando...',
    last_checked: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAPIStatus = async () => {
      try {
        setIsLoading(true);
        const status = await checkInstagramAPIStatus();
        setApiStatus(status);
      } catch (error) {
        console.error('Erro ao buscar status da API:', error);
        setApiStatus({
          status: 'offline',
          detail: 'Falha na verificação',
          last_checked: new Date()
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAPIStatus();
    const intervalId = setInterval(fetchAPIStatus, 5 * 60 * 1000); // Atualiza a cada 5 minutos

    return () => clearInterval(intervalId);
  }, []);

  const getStatusIcon = () => {
    switch (apiStatus.status) {
      case 'online':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />;
      default:
        return <XCircleIcon className="h-8 w-8 text-red-500" />;
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-4 flex items-center space-x-4">
      <div>
        {getStatusIcon()}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Status da API do Instagram
        </h3>
        <p className="text-sm text-gray-600">
          {apiStatus.detail}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Última verificação: {apiStatus.last_checked.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalOrders: 0,
    totalRevenue: 0,
    openTickets: 0,
    recentOrders: [],
    recentTickets: [],
    monthlyRevenue: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Total de Clientes
      const { data: clients } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client');

      const totalClients = clients?.length || 0;

      // Total de Pedidos e Receita
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('amount');
      
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.amount || 0), 0) || 0;

      // Tickets Abertos
      const { count: ticketsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Pedidos Recentes
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          amount,
          status,
          user:profiles!orders_user_id_fkey (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Tickets Recentes
      const { data: recentTickets } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          status,
          created_at,
          user:profiles!tickets_user_id_fkey (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Receita Mensal (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data: monthlyOrders } = await supabase
        .from('orders')
        .select('created_at, amount')
        .gte('created_at', sixMonthsAgo.toISOString());

      const monthlyRevenue = monthlyOrders?.reduce((acc: any[], order) => {
        const month = new Date(order.created_at).toLocaleString('pt-BR', { month: 'long' });
        const existingMonth = acc.find(m => m.month === month);
        if (existingMonth) {
          existingMonth.revenue += order.amount || 0;
        } else {
          acc.push({ month, revenue: order.amount || 0 });
        }
        return acc;
      }, []) || [];

      setStats({
        totalClients,
        totalOrders,
        totalRevenue,
        openTickets: ticketsCount || 0,
        recentOrders: recentOrders || [],
        recentTickets: recentTickets || [],
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const stats_cards = [
    {
      name: 'Total de Clientes',
      value: stats.totalClients,
      icon: UserGroupIcon,
      change: '12%',
      changeType: 'increase',
    },
    {
      name: 'Total de Pedidos',
      value: stats.totalOrders,
      icon: ShoppingCartIcon,
      change: '2.1%',
      changeType: 'increase',
    },
    {
      name: 'Receita Total',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(stats.totalRevenue),
      icon: CurrencyDollarIcon,
      change: '4.3%',
      changeType: 'decrease',
    },
    {
      name: 'Tickets Abertos',
      value: stats.openTickets,
      icon: ChatBubbleLeftRightIcon,
      change: '3%',
      changeType: 'decrease',
    },
  ];

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats_cards.map((item) => (
            <Card key={item.name}>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <item.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{item.value}</p>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gray-50 px-4 py-2">
                  <div className="text-sm">
                    <div className="flex items-center justify-between">
                      <div
                        className={classNames(
                          item.changeType === 'increase' ? 'text-green-600' : 'text-red-600',
                          'flex items-center text-sm font-medium'
                        )}
                      >
                        {item.changeType === 'increase' ? (
                          <ArrowUpIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                        )}
                        <span className="ml-1">{item.change}</span>
                      </div>
                      <div className="text-gray-500">vs. último mês</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Pedidos Recentes */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Pedidos Recentes
              </h3>
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {stats.recentOrders.map((order, orderIdx) => (
                    <li key={order.id}>
                      <div className="relative pb-8">
                        {orderIdx !== stats.recentOrders.length - 1 ? (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span
                              className={classNames(
                                'bg-blue-500',
                                'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'
                              )}
                            >
                              <ShoppingCartIcon className="h-5 w-5 text-white" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                Pedido de <span className="font-medium text-gray-900">
                                  {order.user?.name || 'Usuário Removido'}
                                </span>
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              <time dateTime={order.created_at}>
                                {new Date(order.created_at).toLocaleDateString('pt-BR')}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          {/* Tickets Recentes */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Tickets Recentes
              </h3>
              <div className="flow-root">
                <ul role="list" className="-mb-8">
                  {stats.recentTickets.map((ticket, ticketIdx) => (
                    <li key={ticket.id}>
                      <div className="relative pb-8">
                        {ticketIdx !== stats.recentTickets.length - 1 ? (
                          <span
                            className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span
                              className={classNames(
                                ticket.status === 'open' ? 'bg-yellow-500' : 'bg-green-500',
                                'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'
                              )}
                            >
                              <ChatBubbleLeftRightIcon className="h-5 w-5 text-white" aria-hidden="true" />
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-500">
                                {ticket.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                por {ticket.user?.name || 'Usuário Removido'}
                              </p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              <time dateTime={ticket.created_at}>
                                {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <InstagramAPIStatusCard />
      </div>
    </div>
  );
}
