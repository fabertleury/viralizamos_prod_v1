'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';

interface ServiceApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceApiModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: ServiceApiModalProps) {
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Lógica de importação via API
      // Esta é uma implementação de exemplo, você precisará adaptar 
      // de acordo com a API específica que deseja integrar
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar serviços da API');
      }

      const servicesData = await response.json();

      // Transformar e salvar os serviços importados
      const servicesToSave = servicesData.map((service: any) => ({
        name: service.name,
        descricao: service.description,
        category_id: null, // Você precisará mapear categorias
        status: true
      }));

      const { error } = await supabase
        .from('services_v1')
        .insert(servicesToSave);

      if (error) throw error;

      toast.success(`${servicesToSave.length} serviços importados com sucesso!`);
      onSuccess();
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao importar serviços');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar Serviços via API</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>URL da API</Label>
            <Input 
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="https://api.exemplo.com/servicos"
              required
            />
          </div>

          <div>
            <Label>Chave de API</Label>
            <Input 
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Chave de autorização"
              required
            />
          </div>

          <div className="text-sm text-gray-500">
            <p>Atenção: Certifique-se de que a API suportada esteja configurada corretamente.</p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
