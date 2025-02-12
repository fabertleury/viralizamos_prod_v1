'use client';

import { useEffect, useState } from 'react';
import packageJson from '../../../package.json';

export function Footer() {
  const [productionVersion, setProductionVersion] = useState<string | null>(null);
  const localVersion = packageJson.version;

  useEffect(() => {
    // Buscar a versão em produção
    const fetchProductionVersion = async () => {
      try {
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          setProductionVersion(data.version);
        }
      } catch (error) {
        console.error('Erro ao buscar versão em produção:', error);
      }
    };

    // Só buscar a versão em produção se não estivermos em desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      fetchProductionVersion();
    }
  }, []);

  return (
    <footer className="w-full py-2 text-center text-sm text-gray-500 border-t">
      <div className="container mx-auto flex justify-between items-center px-4">
        <div>
          {new Date().getFullYear()} ViralizAI. Todos os direitos reservados.
        </div>
        <div className="flex items-center space-x-2">
          <span>v{localVersion}</span>
          {productionVersion && productionVersion !== localVersion && (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
              prod: v{productionVersion}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
