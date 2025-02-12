'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FaInstagram, FaTiktok, FaFacebook, FaYoutube } from 'react-icons/fa';
import { toast } from 'sonner';

interface SocialNetwork {
  id: string;
  name: string;
  icon: any;
}

export default function AnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [showResults, setShowResults] = useState(false);

  const socialNetworks: SocialNetwork[] = [
    { id: 'instagram', name: 'Instagram', icon: FaInstagram },
    { id: 'tiktok', name: 'TikTok', icon: FaTiktok },
    { id: 'facebook', name: 'Facebook', icon: FaFacebook },
    { id: 'youtube', name: 'YouTube', icon: FaYoutube },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !selectedNetwork) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      // TODO: Implementar integração com API de análise
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowResults(true);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao analisar perfil');
    } finally {
      setLoading(false);
    }
  };

  const SelectedIcon = socialNetworks.find(sn => sn.id === selectedNetwork)?.icon;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Análise de Perfil</h1>
          <p className="text-lg text-gray-600">
            Descubra como melhorar sua presença nas redes sociais com nossa análise personalizada
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <label htmlFor="social-network" className="block text-sm font-medium text-gray-700 mb-2">
                  Rede Social
                </label>
                <select
                  id="social-network"
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-pink-600 sm:text-sm sm:leading-6"
                >
                  <option value="">Selecione uma rede social</option>
                  {socialNetworks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de Usuário
                </label>
                <div className="relative">
                  {SelectedIcon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <SelectedIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-pink-600 sm:text-sm sm:leading-6 ${
                      SelectedIcon ? 'pl-10' : 'pl-3'
                    }`}
                    placeholder="@seuperfil"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Analisando...' : 'Analisar Perfil'}
              </Button>
            </div>
          </form>
        </Card>

        {showResults && (
          <Card className="mt-8 p-8">
            <h2 className="text-2xl font-bold mb-6">Resultados da Análise</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Pontos Fortes</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Boa taxa de engajamento</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Perfil otimizado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Conteúdo consistente</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Áreas para Melhorar</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">×</span>
                    <span>Baixa frequência de postagens</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">×</span>
                    <span>Poucos seguidores ativos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-500">×</span>
                    <span>Interação limitada com seguidores</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Recomendações</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Aumentar Seguidores</h4>
                  <p className="text-sm text-gray-600">
                    Recomendamos começar com um pacote de 1000 seguidores para aumentar sua credibilidade.
                  </p>
                  <Button
                    className="w-full mt-4"
                    onClick={() => window.location.href = '/servicos?categoria=seguidores'}
                  >
                    Ver Pacotes
                  </Button>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Melhorar Engajamento</h4>
                  <p className="text-sm text-gray-600">
                    Adicione 500 curtidas e 100 comentários para aumentar seu engajamento.
                  </p>
                  <Button
                    className="w-full mt-4"
                    onClick={() => window.location.href = '/servicos?categoria=engajamento'}
                  >
                    Ver Pacotes
                  </Button>
                </Card>

                <Card className="p-4">
                  <h4 className="font-semibold mb-2">Alcance Orgânico</h4>
                  <p className="text-sm text-gray-600">
                    Invista em 1000 visualizações para aumentar seu alcance orgânico.
                  </p>
                  <Button
                    className="w-full mt-4"
                    onClick={() => window.location.href = '/servicos?categoria=visualizacoes'}
                  >
                    Ver Pacotes
                  </Button>
                </Card>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
