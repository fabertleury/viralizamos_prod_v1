'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type ConfigItem = {
  id?: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'text' | 'url' | 'email' | 'color';
  description: string;
  group_name: string;
  is_public: boolean;
  default_value?: string;
  editable?: boolean;
  sensitive?: boolean;
};

export default function ConfiguracoesPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [configurations, setConfigurations] = useState<{[key: string]: ConfigItem}>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  console.log('ConfiguracoesPage: Componente renderizado');

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Erro global capturado:', event.error);
      setErrorMessage(event.error?.message || 'Erro desconhecido');
      toast.error(event.error?.message || 'Erro desconhecido');
    };

    window.addEventListener('error', handleError);
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const fetchConfigurations = useCallback(async () => {
    console.log('fetchConfigurations: Iniciando busca de configurações');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('Sessão obtida:', session);
      
      if (!session) {
        console.error('Usuário não autenticado');
        toast.error('Usuário não autenticado');
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      console.log('Dados do perfil:', profileData);

      if (!profileData || profileData.role !== 'admin') {
        console.error('Sem permissão de admin');
        toast.error('Você não tem permissão para acessar esta página');
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .order('key');

      console.log('Dados de configurações:', { data, error });

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        throw error;
      }

      if (data) {
        const configMap = data.reduce((acc, config) => {
          console.log('Processando configuração:', config);
          
          // Garantir que editable seja sempre um booleano
          const safeConfig = {
            ...config,
            editable: config.editable === true || config.editable === 'true'
          };
          
          console.log('Configuração segura:', safeConfig);
          
          acc[config.key] = safeConfig;
          return acc;
        }, {} as {[key: string]: ConfigItem});
        
        console.log('Mapa de configurações final:', configMap);
        
        setConfigurations(configMap);
      }
    } catch (error) {
      console.error('Erro completo ao buscar configurações:', error);
      toast.error('Não foi possível carregar as configurações. Tente novamente.');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    console.log('useEffect: Chamando fetchConfigurations');
    fetchConfigurations();
  }, [fetchConfigurations]);

  const handleConfigChange = useCallback((key: string, value: string) => {
    console.log('handleConfigChange: Alterando configuração', key, value);
    setConfigurations(prev => ({
      ...prev,
      [key]: { 
        ...prev[key], 
        value: value 
      }
    }));
  }, []);

  const handleSaveConfig = useCallback(async (group: string) => {
    console.log('handleSaveConfig: Salvando configurações do grupo', group);
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('Sessão obtida:', session);
      
      if (!session) {
        console.error('Usuário não autenticado');
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      console.log('Dados do perfil:', profileData);

      if (!profileData || profileData.role !== 'admin') {
        console.error('Sem permissão de admin');
        toast.error('Você não tem permissão para salvar configurações');
        return;
      }

      // Filtrar configurações do grupo 
      const groupConfigs = Object.values(configurations)
        .filter(config => config.group_name === group)
        .map(({ id, ...config }) => ({
          ...config,
          is_public: config.is_public ?? false,
          editable: config.editable === true || config.editable === 'true'
        }));

      console.log(`Configurações do grupo ${group}:`, groupConfigs);

      if (groupConfigs.length === 0) {
        console.log(`Nenhuma configuração encontrada para o grupo ${group}`);
        toast.warning(`Nenhuma configuração encontrada para o grupo ${group}`);
        return;
      }

      // Preparar dados para upsert
      const upsertData = groupConfigs.map(config => ({
        key: config.key,
        value: config.value,
        type: config.type,
        description: config.description,
        group_name: config.group_name,
        is_public: config.is_public,
        editable: config.editable
      }));

      console.log('Dados para upsert:', upsertData);

      const { data, error } = await supabase
        .from('configurations')
        .upsert(upsertData, { 
          onConflict: 'key',
          returning: 'minimal'
        });

      console.log('Resultado do upsert:', { data, error });

      if (error) {
        console.error('Detalhes completos do erro:', error);
        throw error;
      }
      
      console.log(`Configurações de ${group} salvas com sucesso!`);
      toast.success(`Configurações de ${group} salvas com sucesso!`);
      await fetchConfigurations();
    } catch (error) {
      console.error(`Erro ao salvar configurações de ${group}:`, error);
      
      // Mensagens de erro mais detalhadas
      if (error instanceof Error) {
        console.error(`Erro: ${error.message}`);
        toast.error(`Erro: ${error.message}`);
      } else {
        console.error(`Não foi possível salvar as configurações de ${group}. Tente novamente.`);
        toast.error(`Não foi possível salvar as configurações de ${group}. Tente novamente.`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [configurations, fetchConfigurations, supabase]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleLogoUpload: Fazendo upload da logo');
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `logo.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('system_assets')
          .upload(filePath, file, { 
            upsert: true 
          });

        console.log('Erro de upload:', uploadError);

        if (uploadError) throw uploadError;

        const { data: { publicUrl }, error: urlError } = supabase.storage
          .from('system_assets')
          .getPublicUrl(filePath);

        console.log('Erro de URL:', urlError);

        if (urlError) throw urlError;

        await supabase
          .from('configurations')
          .update({ value: publicUrl })
          .eq('key', 'logo_url');

        console.log('Logo atualizada com sucesso!');
        toast.success('Logo atualizada com sucesso!');
        await fetchConfigurations();
      } catch (error) {
        console.error('Erro ao fazer upload da logo:', error);
        toast.error('Não foi possível fazer upload da logo. Tente novamente.');
      }
    }
  }, [fetchConfigurations]);

  const renderConfigInput = useCallback((config: ConfigItem) => {
    console.log('renderConfigInput: Renderizando input para configuração', config.key);
    if (!config.editable) return <p>{config.value}</p>;

    switch (config.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id={config.key}
              checked={config.value === 'true'}
              onChange={(e) => handleConfigChange(config.key, e.target.checked.toString())}
              disabled={isLoading}
            />
            <Label htmlFor={config.key}>{config.description}</Label>
          </div>
        );
      case 'text':
        return (
          <Textarea
            id={config.key}
            value={config.value}
            onChange={(e) => handleConfigChange(config.key, e.target.value)}
            placeholder={config.description}
            rows={4}
            disabled={isLoading}
          />
        );
      case 'color':
        return (
          <div className="flex items-center space-x-2">
            <Input
              type="color"
              id={config.key}
              value={config.value}
              onChange={(e) => handleConfigChange(config.key, e.target.value)}
              disabled={isLoading}
            />
            <Label htmlFor={config.key}>{config.description}</Label>
          </div>
        );
      default:
        return (
          <Input
            id={config.key}
            value={config.value}
            onChange={(e) => handleConfigChange(config.key, e.target.value)}
            placeholder={config.description}
            type={config.type === 'number' ? 'number' : 'text'}
            disabled={isLoading}
          />
        );
    }
  }, [handleConfigChange, isLoading]);

  const renderConfigGroup = useCallback((group: string) => {
    console.log('renderConfigGroup: Renderizando grupo de configurações', group);
    const groupConfigs = Object.values(configurations)
      .filter(config => config.group_name === group);

    if (groupConfigs.length === 0) {
      return null;
    }

    return (
      <Card key={group} className="mb-6">
        <CardHeader>
          <CardTitle>
            {group === 'instagram_api' ? 'Configurações da API do Instagram' : 
             group.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupConfigs.map(config => (
              <div key={config.key} className="space-y-2">
                <Label htmlFor={config.key}>
                  {config.description || config.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Label>
                {renderConfigInput(config)}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={() => handleSaveConfig(group)}
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }, [configurations, handleSaveConfig, renderConfigInput, isLoading]);

  if (errorMessage) {
    return (
      <div className="p-4 text-red-500">
        <h2>Erro na página de configurações</h2>
        <p>{errorMessage}</p>
        <Button onClick={() => {
          setErrorMessage(null);
          router.push('/');
        }}>
          Voltar para a página inicial
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Configurações do Sistema</h1>
      
      {/* Logo */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Logo</CardTitle>
          </CardHeader>
          <CardContent>
            {renderConfigGroup('logo')}
            
            <div className="mt-4">
              <Label htmlFor="logo-upload">Upload de Logo</Label>
              <Input 
                id="logo-upload" 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
              />
              {logoPreview && (
                <div className="mt-4">
                  <Image 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    width={200} 
                    height={100} 
                    className="object-contain"
                  />
                </div>
              )}
              {configurations['logo_url']?.value && (
                <div className="mt-4">
                  <Label>Logo Atual</Label>
                  <Image 
                    src={configurations['logo_url'].value} 
                    alt="Logo Atual" 
                    width={200} 
                    height={100} 
                    className="object-contain"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Renderizar grupos de configurações */}
        {['seo', 'comunicacao', 'aparencia', 'sistema', 'mercadopago'].map(group => 
          renderConfigGroup(group)
        )}

        {/* Instagram API */}
        {renderConfigGroup('instagram_api')}

        {/* Compliance */}
        {renderConfigGroup('compliance')}
      </div>
    </div>
  );
}
