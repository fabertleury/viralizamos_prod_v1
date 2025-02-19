'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Image from 'next/image';

export default function ConfiguracoesPage() {
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [headerSnippet, setHeaderSnippet] = useState('');
  const [footerSnippet, setFooterSnippet] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [termsOfUse, setTermsOfUse] = useState('');
  const [privacyPolicy, setPrivacyPolicy] = useState('');
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    secure: false
  });
  const [emailTemplate, setEmailTemplate] = useState({
    welcome: '',
    resetPassword: '',
    support: ''
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (type: 'seo' | 'snippets' | 'logo' | 'compliance' | 'smtp' | 'email') => {
    try {
      switch(type) {
        case 'logo':
          if (logoFile) {
            // Lógica para upload de logo
            toast.success('Logo atualizada com sucesso!');
          }
          break;
        case 'compliance':
          // Salvar termos de uso e política de privacidade
          toast.success('Documentos de compliance atualizados!');
          break;
        case 'smtp':
          // Validar e salvar configurações de SMTP
          toast.success('Configurações de SMTP salvas!');
          break;
        case 'email':
          // Salvar templates de email
          toast.success('Templates de email atualizados!');
          break;
        default:
          toast.success(`Configurações de ${type} salvas com sucesso!`);
      }
    } catch (error) {
      toast.error(`Erro ao salvar configurações de ${type}`);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Configurações do Sistema</h1>
      
      <Tabs defaultValue="logo" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="snippets">Snippets</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="comunicacao">Comunicação</TabsTrigger>
        </TabsList>
        
        <TabsContent value="logo">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="logo-upload">Upload de Logo</Label>
                  <Input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                  />
                </div>
                {logoPreview && (
                  <div className="flex justify-center">
                    <Image 
                      src={logoPreview} 
                      alt="Logo Preview" 
                      width={200} 
                      height={100} 
                      className="object-contain" 
                    />
                  </div>
                )}
                <Button onClick={() => handleSave('logo')}>Salvar Logo</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Compliance e Privacidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="terms-of-use">Termos de Uso</Label>
                  <Textarea
                    id="terms-of-use"
                    value={termsOfUse}
                    onChange={(e) => setTermsOfUse(e.target.value)}
                    placeholder="Digite os termos de uso"
                    rows={5}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="privacy-policy">Política de Privacidade</Label>
                  <Textarea
                    id="privacy-policy"
                    value={privacyPolicy}
                    onChange={(e) => setPrivacyPolicy(e.target.value)}
                    placeholder="Digite a política de privacidade"
                    rows={5}
                  />
                </div>
                <Button onClick={() => handleSave('compliance')}>Salvar Documentos</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comunicacao">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Comunicação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">Configurações de SMTP</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp-host">Host</Label>
                      <Input 
                        id="smtp-host"
                        value={smtpConfig.host}
                        onChange={(e) => setSmtpConfig({...smtpConfig, host: e.target.value})}
                        placeholder="smtp.exemplo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-port">Porta</Label>
                      <Input 
                        id="smtp-port"
                        type="number"
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig({...smtpConfig, port: e.target.value})}
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-username">Usuário</Label>
                      <Input 
                        id="smtp-username"
                        value={smtpConfig.username}
                        onChange={(e) => setSmtpConfig({...smtpConfig, username: e.target.value})}
                        placeholder="seu-email@exemplo.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="smtp-password">Senha</Label>
                      <Input 
                        id="smtp-password"
                        type="password"
                        value={smtpConfig.password}
                        onChange={(e) => setSmtpConfig({...smtpConfig, password: e.target.value})}
                        placeholder="Senha do SMTP"
                      />
                    </div>
                  </div>
                  <Button onClick={() => handleSave('smtp')}>Salvar Configurações SMTP</Button>
                </div>

                <div className="grid gap-4">
                  <h3 className="text-lg font-semibold">Templates de Email</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="welcome-template">Template de Boas-Vindas</Label>
                      <Textarea
                        id="welcome-template"
                        value={emailTemplate.welcome}
                        onChange={(e) => setEmailTemplate({...emailTemplate, welcome: e.target.value})}
                        placeholder="Modelo de email de boas-vindas"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="reset-password-template">Template de Redefinição de Senha</Label>
                      <Textarea
                        id="reset-password-template"
                        value={emailTemplate.resetPassword}
                        onChange={(e) => setEmailTemplate({...emailTemplate, resetPassword: e.target.value})}
                        placeholder="Modelo de email de redefinição de senha"
                        rows={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="support-template">Template de Suporte</Label>
                      <Textarea
                        id="support-template"
                        value={emailTemplate.support}
                        onChange={(e) => setEmailTemplate({...emailTemplate, support: e.target.value})}
                        placeholder="Modelo de email de suporte"
                        rows={4}
                      />
                    </div>
                    <Button onClick={() => handleSave('email')}>Salvar Templates</Button>
                  </div>
                </div>
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
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="seo-title">Título Padrão do Site</Label>
                  <Textarea
                    id="seo-title"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="Digite o título padrão para SEO"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="seo-description">Descrição Padrão</Label>
                  <Textarea
                    id="seo-description"
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="Digite a descrição padrão para SEO"
                  />
                </div>
                <Button onClick={() => handleSave('seo')}>Salvar Configurações de SEO</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snippets">
          <Card>
            <CardHeader>
              <CardTitle>Snippets de Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="header-snippet">Snippet do Header</Label>
                  <Textarea
                    id="header-snippet"
                    value={headerSnippet}
                    onChange={(e) => setHeaderSnippet(e.target.value)}
                    placeholder="Cole aqui os scripts ou tags para o header"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="footer-snippet">Snippet do Footer</Label>
                  <Textarea
                    id="footer-snippet"
                    value={footerSnippet}
                    onChange={(e) => setFooterSnippet(e.target.value)}
                    placeholder="Cole aqui os scripts ou tags para o footer"
                  />
                </div>
                <Button onClick={() => handleSave('snippets')}>Salvar Snippets</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
