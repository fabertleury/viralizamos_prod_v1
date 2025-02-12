'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  TagIcon,
  UserGroupIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCartIcon },
  { name: 'Usuários', href: '/admin/usuarios', icon: UsersIcon },
  { name: 'Serviços', href: '/admin/servicos', icon: TagIcon },
  { name: 'Categorias', href: '/admin/categorias', icon: TagIcon },
  { name: 'Provedores', href: '/admin/provedores', icon: UserGroupIcon },
  { name: 'Redes Sociais', href: '/admin/redes', icon: ShareIcon },
  { name: 'Transações', href: '/admin/transacoes', icon: CurrencyDollarIcon },
  { name: 'FAQs', href: '/admin/faqs', icon: QuestionMarkCircleIcon },
  { name: 'Configurações', href: '/admin/configuracoes', icon: CogIcon },
];

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={setOpen}>
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
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                    <button
                      type="button"
                      className="-m-2.5 p-2.5"
                      onClick={() => setOpen(false)}
                    >
                      <span className="sr-only">Fechar sidebar</span>
                      <XMarkIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </Transition.Child>
                {/* Sidebar component for mobile */}
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                  <div className="flex h-16 shrink-0 items-center">
                    <Image
                      width={150}
                      height={40}
                      className="h-8 w-auto"
                      src="/images/logo.png"
                      alt="Viralizai"
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
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                                  ${
                                    pathname === item.href
                                      ? 'bg-gray-50 text-purple-600'
                                      : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                                  }
                                `}
                              >
                                <item.icon
                                  className={`
                                    h-6 w-6 shrink-0
                                    ${
                                      pathname === item.href
                                        ? 'text-purple-600'
                                        : 'text-gray-400 group-hover:text-purple-600'
                                    }
                                  `}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </li>
                    </ul>
                  </nav>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Image
              width={150}
              height={40}
              className="h-8 w-auto"
              src="/images/logo.png"
              alt="Viralizai"
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
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${
                            pathname === item.href
                              ? 'bg-gray-50 text-purple-600'
                              : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon
                          className={`
                            h-6 w-6 shrink-0
                            ${
                              pathname === item.href
                                ? 'text-purple-600'
                                : 'text-gray-400 group-hover:text-purple-600'
                            }
                          `}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
