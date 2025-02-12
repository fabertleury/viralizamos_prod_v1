import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, 
  ShoppingCart, 
  CreditCard, 
  Share2, 
  Tags, 
  Users, 
  Truck, 
  MessageSquare, 
  HelpCircle,
  Settings,
  Users2,
  RefreshCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabase } from '@/lib/hooks/useSupabase';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard
  },
  {
    title: 'Pedidos',
    href: '/admin/pedidos',
    icon: ShoppingCart
  },
  {
    title: 'Transações',
    href: '/admin/transacoes',
    icon: CreditCard
  },
  {
    title: 'Redes Sociais',
    href: '/admin/redes-sociais',
    icon: Share2
  },
  {
    title: 'Categorias',
    href: '/admin/categorias',
    icon: Tags
  },
  {
    title: 'Usuários',
    href: '/admin/usuarios',
    icon: Users
  },
  {
    title: 'Provedores',
    href: '/admin/provedores',
    icon: Truck
  },
  {
    title: 'Tickets de Suporte',
    href: '/admin/tickets',
    icon: MessageSquare
  },
  {
    title: 'FAQs',
    href: '/admin/faqs',
    icon: HelpCircle
  },
  {
    title: 'Configurações',
    href: '/admin/configuracoes',
    icon: Settings
  },
  {
    title: 'Sessões',
    href: '/admin/sessoes',
    icon: Users2
  },
  {
    title: 'Reposições',
    href: '/admin/reposicoes',
    icon: RefreshCcw
  },
  {
    title: 'Tickets',
    href: '/admin/tickets',
    icon: MessageSquare
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { supabase } = useSupabase();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-64 min-h-screen bg-white border-r">
      <div className="flex flex-col h-full">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-800">Admin</h2>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900',
                      isActive && 'bg-gray-100 text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
