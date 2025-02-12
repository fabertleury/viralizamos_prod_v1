'use client';

import AdminLayout from '@/components/admin/layout/AdminLayout';

export default function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
