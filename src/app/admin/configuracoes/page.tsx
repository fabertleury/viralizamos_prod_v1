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

  const fetchConfigurations = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Usuário não autenticado');
        router.push('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profileData || profileData.role !== 'admin') {
        toast.error('Você não tem permissão para acessar esta página');
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .order('key');

      if (error) throw error;

      if (data) {
        const configMap = data.reduce((acc, config) => {
          acc[config.key] = config;
          return acc;
        }, {} as {[key: string]: ConfigItem});
        
        setConfigurations(configMap);
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      toast.error('Não foi possível carregar as configurações. Tente novamente.');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  const handleConfigChange = useCallback((key: string, value: string) => {
    setConfigurations(prev => ({
      ...prev,
      [key]: { 
        ...prev[key], 
        value: value 
      }
    }));
  }, []);

  const handleSaveConfig = useCallback(async (group: string) => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Usuário não autenticado');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profileData || profileData.role !== 'admin') {
        toast.error('Você não tem permissão para salvar configurações');
        return;
      }

      // Filtrar configurações do grupo 
      const groupConfigs = Object.values(configurations)
        .filter(config => config.group_name === group)
        .map(({ id, ...config }) => ({
          ...config,
          is_public: config.is_public ?? false,
          editable: config.editable ?? true
        }));

      console.log(`Salvando configurações do grupo ${group}:`, groupConfigs);

      if (groupConfigs.length === 0) {
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
      
      toast.success(`Configurações de ${group} salvas com sucesso!`);
      await fetchConfigurations();
    } catch (error) {
      console.error(`Erro ao salvar configurações de ${group}:`, error);
      
      // Mensagens de erro mais detalhadas
      if (error instanceof Error) {
        toast.error(`Erro: ${error.message}`);
      } else {
        toast.error(`Não foi possível salvar as configurações de ${group}. Tente novamente.`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [configurations, fetchConfigurations, supabase]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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

        if (uploadError) throw uploadError;

        const { data: { publicUrl }, error: urlError } = supabase.storage
          .from('system_assets')
          .getPublicUrl(filePath);

        if (urlError) throw urlError;

        await supabase
          .from('configurations')
          .update({ value: publicUrl })
          .eq('key', 'logo_url');

        toast.success('Logo atualizada com sucesso!');
        await fetchConfigurations();
      } catch (error) {
        console.error('Erro ao fazer upload da logo:', error);
        toast.error('Não foi possível fazer upload da logo. Tente novamente.');
      }
    }
  }, [fetchConfigurations]);

  const renderConfigInput = useCallback((config: ConfigItem) => {
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
    const groupConfigs = Object.values(configurations)
      .filter(config => config.group_name === group);

    return (
      <div className="grid gap-4">
        {groupConfigs.map(config => (
          <div key={config.key}>
            <Label htmlFor={config.key}>{config.description}</Label>
            {renderConfigInput(config)}
          </div>
        ))}
        <Button 
          onClick={() => handleSaveConfig(group)}
          className="mt-4"
          disabled={isLoading}
        >
          {isLoading ? 'Salvando...' : `Salvar Configurações de ${group}`}
        </Button>
      </div>
    );
  }, [configurations, handleSaveConfig, renderConfigInput, isLoading]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Configurações do Sistema</h1>
      
      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
        </TabsList>
        
        <TabsContent value="logo">
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
        </TabsContent>
        
        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de SEO</CardTitle>
            </CardHeader>
            <CardContent>
              {renderConfigGroup('seo')}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="comunicacao">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Comunicação</CardTitle>
            </CardHeader>
            <CardContent>
              {renderConfigGroup('comunicacao')}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              {renderConfigGroup('compliance')}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Aparência</CardTitle>
            </CardHeader>
            <CardContent>
              {renderConfigGroup('aparencia')}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
