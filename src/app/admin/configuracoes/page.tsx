'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(false);

  const handleCheckAdmin = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      if (response.ok) {
        toast.success(
          <div className="space-y-2">
            <div><strong>Status:</strong> {data.isAdmin ? 'Administrador' : 'Não Administrador'}</div>
            <div><strong>Email:</strong> {data.email}</div>
            <div><strong>Role:</strong> {data.role}</div>
          </div>
        );
      } else {
        toast.error(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      toast.error('Erro ao verificar status de admin');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-600">
          Gerencie as configurações do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status do Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Verifique seu status e permissões no sistema
            </p>
            <button
              onClick={handleCheckAdmin}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Verificar Status Admin'}
            </button>
          </CardContent>
        </Card>

        {/* Adicione mais cards de configuração aqui */}
      </div>
    </div>
  );
}
