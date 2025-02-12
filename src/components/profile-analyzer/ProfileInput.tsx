import { useState, useEffect } from 'react';
import { FaInstagram, FaSearch } from 'react-icons/fa';
import { Button } from '@/components/ui/button';

interface ProfileInputProps {
  onAnalyze: (username: string) => void;
  isLoading: boolean;
  initialUsername?: string;
}

export function ProfileInput({ onAnalyze, isLoading, initialUsername = '' }: ProfileInputProps) {
  const [username, setUsername] = useState(initialUsername);

  // Quando receber um username inicial, fazer a análise automaticamente
  useEffect(() => {
    if (initialUsername && !isLoading) {
      onAnalyze(initialUsername.replace('@', '').trim());
    }
  }, [initialUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onAnalyze(username.replace('@', '').trim());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto text-center px-4">
      <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">
        Analise seu perfil com nossa Inteligência Artificial de graça!
      </h1>
      
      <p className="text-lg md:text-xl text-gray-600 mb-8">
        Descubra como melhorar seu perfil no Instagram e bombar nas redes!
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaInstagram className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Digite seu @usuario"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || !username.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analisando...
            </>
          ) : (
            <>
              <FaSearch className="-ml-1 mr-2 h-5 w-5" />
              Analisar Agora
            </>
          )}
        </Button>
      </form>

      <p className="text-sm text-gray-500 mt-4">
        Análise completa e gratuita do seu perfil em segundos!
      </p>
    </div>
  );
}
