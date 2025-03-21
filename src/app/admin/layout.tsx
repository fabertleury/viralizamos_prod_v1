'use client';

import React, { Fragment, useState, useEffect } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  TagIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ShareIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  UserCircleIcon,
  Settings,
  Users,
  Image as ImageIcon,
  BarChart,
  ArrowRightOnRectangleIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  ChatBubbleBottomCenterTextIcon,
  NetworkIcon,
  ChartBarIcon,
  ServerIcon,
  BanknotesIcon,
  TicketIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Toaster, toast } from 'sonner';
import { classNames } from '../lib/helpers';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: ChartBarIcon },
  { name: 'APIs', href: '/admin/apis', icon: ServerIcon },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCartIcon },
  { name: 'Transações', href: '/admin/transacoes', icon: CurrencyDollarIcon },
  { name: 'Financeiro', href: '/admin/financeiro', icon: BanknotesIcon },
  { name: 'Redes Sociais', href: '/admin/socials', icon: ShareIcon },
  { name: 'Verificação Instagram', href: '/admin/verificacao-instagram', icon: CheckBadgeIcon },
  { name: 'Categorias', href: '/admin/categories', icon: TagIcon },
  { name: 'Provedores', href: '/admin/provedores', icon: BuildingStorefrontIcon },
  { name: 'Serviços', href: '/admin/servicos_v1', icon: CubeIcon },
  { name: 'Cupons', href: '/admin/cupons', icon: TicketIcon },
  { name: 'Clientes', href: '/admin/clientes', icon: UsersIcon },
  { name: 'Tickets de Suporte', href: '/admin/tickets', icon: ChatBubbleLeftRightIcon },
  { name: "FAQ's", href: '/admin/faqs', icon: QuestionMarkCircleIcon },
  { name: 'Usuários', href: '/admin/users', icon: UserGroupIcon },
  { name: 'Sessões', href: '/admin/sessions', icon: UserCircleIcon },
  { name: 'Reposições', href: '/admin/reposicoes', icon: ArrowPathIcon },
  { 
    name: 'Configurações', 
    href: '/admin/configuracoes', 
    icon: CogIcon  
  },
  { 
    name: 'Automações', 
    href: '/admin/automacoes', 
    icon: WrenchScrewdriverIcon,
    tag: 'ALPHA' 
  },
  { 
    name: 'Depoimentos', 
    href: '/admin/depoimentos', 
    icon: ChatBubbleBottomCenterTextIcon 
  }
];

// Adicionar log detalhado de ícones
console.log('Navigation Icons:', navigation.map(item => ({
  name: item.name,
  icon: item.icon ? item.icon.name : 'UNDEFINED',
  iconComponent: item.icon ? React.createElement(item.icon, { className: 'h-6 w-6' }) : null
})));

function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdminPermission = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          router.push('/login');
          setIsLoading(false);
          return;
        }

        if (!session.user) {
          toast.error('Erro ao carregar usuário');
          router.push('/login');
          setIsLoading(false);
          return;
        }

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Erro ao carregar perfil:', error);
          toast.error('Erro ao carregar perfil');
          router.push('/login');
          setIsLoading(false);
          return;
        }

        if (!profileData) {
          toast.error('Perfil não encontrado');
          router.push('/login');
          setIsLoading(false);
          return;
        }

        if (profileData.role !== 'admin') {
          toast.error('Você não tem permissão para acessar esta área');
          router.push('/login');
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error('Erro ao verificar permissão de admin:', error);
        toast.error('Erro ao verificar permissão de admin');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminPermission();
  }, [router, supabase]);

  return { isAdmin, isLoading };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { isAdmin, isLoading } = useAdminAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex h-full w-full">
      <Toaster />
      {/* Mobile sidebar */}
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <HeadlessDialog as="div" className="relative z-50 lg:hidden" onClose={setSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <HeadlessDialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <Image
                      src="/images/viralizamos-color.png"
                      alt="Viralizamos"
                      width={150}
                      height={40}
                      className="h-8 w-auto"
                      priority
                    />
                  </div>
                  <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                      <li>
                        <ul role="list" className="-mx-2 space-y-1">
                          {navigation.map((item) => (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={classNames(
                                  pathname === item.href
                                    ? 'bg-gray-50 text-indigo-600'
                                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                                  'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                                )}
                              >
                                {item.icon ? React.createElement(item.icon, {
                                  className: classNames(
                                    pathname === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                                    'h-6 w-6 shrink-0'
                                  )
                                }) : (
                                  <span className="text-red-500">No Icon</span>
                                )}
                                {item.name}
                                {item.tag && (
                                  <span className="ml-2 rounded bg-indigo-600 px-2 py-1 text-xs text-white">
                                    {item.tag}
                                  </span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </HeadlessDialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Image
              src="/images/viralizamos-color.png"
              alt="Viralizamos"
              width={150}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={classNames(
                          pathname === item.href
                            ? 'bg-gray-50 text-indigo-600'
                            : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        )}
                      >
                        {item.icon ? React.createElement(item.icon, {
                          className: classNames(
                            pathname === item.href ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                            'h-6 w-6 shrink-0'
                          )
                        }) : (
                          <span className="text-red-500">No Icon</span>
                        )}
                        {item.name}
                        {item.tag && (
                          <span className="ml-2 rounded bg-indigo-600 px-2 py-1 text-xs text-white">
                            {item.tag}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:pl-72">
        <main className="flex-1 py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <Toaster richColors position="top-right" />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
