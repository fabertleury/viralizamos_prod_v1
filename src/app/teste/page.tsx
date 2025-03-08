'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function TestePage() {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const checkProfileWithGraphQL = async () => {
    if (!username) {
      toast.error('Por favor, digite um nome de usuário');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      // Fazendo a requisição para a API GraphQL do Instagram
      const response = await fetch(`/api/instagram/graphql-check?username=${username}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao verificar o perfil');
      }

      setResult(data);
      toast.success('Perfil verificado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao verificar perfil:', err);
      setError(err.message || 'Ocorreu um erro ao verificar o perfil');
      toast.error(err.message || 'Ocorreu um erro ao verificar o perfil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Teste de Verificação de Perfil do Instagram (GraphQL)</h1>
      
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Nome de usuário do Instagram"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="max-w-md"
          />
          <Button 
            onClick={checkProfileWithGraphQL}
            disabled={isLoading}
          >
            {isLoading ? 'Verificando...' : 'Verificar Perfil'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md mb-4">
          <p className="font-semibold">Erro:</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-gray-100 rounded-md">
          <h2 className="text-xl font-semibold mb-2">Resultado:</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Nome de usuário:</p>
              <p>{result.username}</p>
            </div>
            <div>
              <p className="font-semibold">Nome completo:</p>
              <p>{result.full_name || 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold">Status do perfil:</p>
              <p className={result.is_private ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                {result.is_private ? 'Privado' : 'Público'}
              </p>
            </div>
            <div>
              <p className="font-semibold">Seguidores:</p>
              <p>{result.follower_count?.toLocaleString() || 'N/A'}</p>
            </div>
            <div>
              <p className="font-semibold">Seguindo:</p>
              <p>{result.following_count?.toLocaleString() || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="font-semibold">Dados brutos:</p>
            <pre className="bg-gray-800 text-white p-4 rounded-md overflow-auto mt-2 text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
