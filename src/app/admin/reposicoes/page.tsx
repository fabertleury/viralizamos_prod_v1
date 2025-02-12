'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { formatDateToBrasilia } from '@/lib/utils/date';
import { toast } from 'sonner';

interface Refill {
  id: string;
  created_at: string;
  status: string;
  metadata: {
    provider: string;
    provider_order_id: string;
    provider_refill_id: string;
  };
  order: {
    id: string;
    amount: number;
    quantity: number;
    metadata: {
      link: string;
      username?: string;
      post?: {
        shortcode: string;
      };
    };
    user: {
      email: string;
    };
    service: {
      name: string;
    };
  };
}

export default function ReposicoesPage() {
  const [refills, setRefills] = useState<Refill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRefills();
  }, []);

  const loadRefills = async () => {
    try {
      const supabase = createClientComponentClient();
      
      const { data: refillsData, error } = await supabase
        .from('refills')
        .select(`
          *,
          order:order_id (
            id,
            amount,
            quantity,
            metadata,
            user:user_id (
              email
            ),
            service:service_id (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRefills(refillsData || []);
    } catch (error) {
      console.error('Erro ao carregar reposições:', error);
      toast.error('Erro ao carregar reposições');
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const remaining = 30 - diffDays;
    return remaining > 0 ? remaining : 0;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Reposições</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gerencie as reposições de serviços dos usuários.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Usuário
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Serviço
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Link
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
                        Dias Restantes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-sm text-gray-500 text-center">
                          Carregando...
                        </td>
                      </tr>
                    ) : refills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-sm text-gray-500 text-center">
                          Nenhuma reposição encontrada
                        </td>
                      </tr>
                    ) : (
                      refills.map((refill) => (
                        <tr key={refill.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6">
                            {refill.order.user.email}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {refill.order.service.name}
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <a 
                              href={refill.order.metadata.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {refill.order.metadata.post ? 'Ver Post' : 'Ver Perfil'}
                            </a>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {refill.order.quantity}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {formatDateToBrasilia(refill.created_at)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(refill.status)}`}>
                              {refill.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {getDaysRemaining(refill.created_at)} dias
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
