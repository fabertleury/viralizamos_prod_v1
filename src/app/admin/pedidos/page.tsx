import { createClient } from '@/lib/supabase/server';
import OrdersTable from './components/OrdersTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export default async function OrdersPage() {
  const supabase = createClient();

  const { data: orders, error } = await supabase
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

  if (error) {
    console.error('Erro ao carregar pedidos:', error);
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="text-center text-red-600">Erro ao carregar pedidos</div>
        </div>
      </div>
    );
  }

  return <OrdersTable initialOrders={orders || []} />;
}
