'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSave } from '@fortawesome/free-solid-svg-icons';

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
  social_id: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface Social {
  id: string;
  name: string;
  icon: string;
}

export default function CriarServicoPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const serviceId = searchParams.get('id');

  const [socials, setSocials] = useState<Social[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSocial, setSelectedSocial] = useState<string | null>(null);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    descricao: '',
    type: '',
    quantidade: '',
    preco: '',
    category_id: '',
    subcategory_id: '',
    status: true,
    featured: false,
    delivery_time: '',
    min_order: '',
    max_order: '',
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Buscar redes sociais
        const { data: socialsData, error: socialsError } = await supabase
          .from('social')
          .select('*');
        
        if (socialsError) throw socialsError;
        setSocials(socialsData || []);

        // Buscar categorias
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*, subcategories(*)');
        
        if (categoriesError) throw categoriesError;
        setCategories(categoriesData || []);

        // Se for edição, buscar dados do serviço
        if (serviceId) {
          const { data: serviceData, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', serviceId)
            .single();
          
          if (serviceError) throw serviceError;
          
          if (serviceData) {
            // Encontrar a categoria e rede social
            const category = categoriesData.find(c => c.id === serviceData.category_id);
            const social = category?.social_id;
            
            setSelectedSocial(social);
            setFormData({
              name: serviceData.name,
              descricao: serviceData.descricao,
              type: serviceData.type,
              quantidade: serviceData.quantidade.toString(),
              preco: serviceData.preco.toString(),
              category_id: serviceData.category_id,
              subcategory_id: serviceData.subcategory_id || '',
              status: serviceData.status,
              featured: serviceData.featured,
              delivery_time: serviceData.delivery_time || '',
              min_order: serviceData.min_order || '',
              max_order: serviceData.max_order || '',
            });

            // Filtrar categorias e subcategorias
            const categoriesBySocial = categoriesData.filter(c => c.social_id === social);
            setFilteredCategories(categoriesBySocial);

            const subcategoriesByCategory = categoriesBySocial
              .find(c => c.id === serviceData.category_id)?.subcategories || [];
            setFilteredSubcategories(subcategoriesByCategory);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast.error('Erro ao carregar dados');
      }
    };

    fetchInitialData();
  }, [serviceId]);

  const handleSocialChange = (socialId: string) => {
    setSelectedSocial(socialId);
    const categoriesBySocial = categories.filter(c => c.social_id === socialId);
    setFilteredCategories(categoriesBySocial);
    setFilteredSubcategories([]);
    setFormData(prev => ({
      ...prev,
      category_id: '',
      subcategory_id: '',
    }));
  };

  const handleCategoryChange = (categoryId: string) => {
    const selectedCategory = filteredCategories.find(c => c.id === categoryId);
    const subcategories = selectedCategory?.subcategories || [];
    
    setFilteredSubcategories(subcategories);
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: '',
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        ...formData,
        quantidade: parseFloat(formData.quantidade),
        preco: parseFloat(formData.preco),
        min_order: formData.min_order ? parseFloat(formData.min_order) : null,
        max_order: formData.max_order ? parseFloat(formData.max_order) : null,
      };

      let result;
      if (serviceId) {
        // Atualizar serviço existente
        result = await supabase
          .from('services')
          .update(dataToSubmit)
          .eq('id', serviceId);
        
        toast.success('Serviço atualizado com sucesso!');
      } else {
        // Criar novo serviço
        result = await supabase
          .from('services')
          .insert(dataToSubmit);
        
        toast.success('Serviço criado com sucesso!');
      }

      if (result.error) throw result.error;

      // Redirecionar para a página de serviços
      router.push('/admin/servicos_v1');
    } catch (error) {
      console.error('Erro ao salvar serviço:', error);
      toast.error('Erro ao salvar serviço');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        {serviceId ? 'Editar Serviço' : 'Criar Novo Serviço'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Rede Social</Label>
          <Select 
            value={selectedSocial || ''} 
            onValueChange={handleSocialChange}
            required
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione a rede social" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {socials.map(social => (
                <SelectItem key={social.id} value={social.id}>
                  {social.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Categoria</Label>
          <Select 
            value={formData.category_id} 
            onValueChange={handleCategoryChange}
            disabled={!selectedSocial}
            required
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Selecione a categoria" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {filteredCategories.map(category => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredSubcategories.length > 0 && (
          <div>
            <Label>Subcategoria</Label>
            <Select 
              value={formData.subcategory_id || ''} 
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                subcategory_id: value 
              }))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione a subcategoria" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {filteredSubcategories.map(subcategory => (
                  <SelectItem key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label>Nome do Serviço</Label>
          <Input 
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Ex: Curtidas Instagram"
            required
          />
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea 
            name="descricao"
            value={formData.descricao}
            onChange={handleInputChange}
            placeholder="Descrição do serviço"
          />
        </div>

        <div>
          <Label>Tipo</Label>
          <Input 
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            placeholder="Ex: Curtidas"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Quantidade</Label>
            <Input 
              name="quantidade"
              value={formData.quantidade}
              onChange={handleInputChange}
              type="number"
              required
            />
          </div>

          <div>
            <Label>Preço</Label>
            <Input 
              name="preco"
              value={formData.preco}
              onChange={handleInputChange}
              type="number"
              step="0.01"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Tempo de Entrega (dias)</Label>
            <Input 
              name="delivery_time"
              value={formData.delivery_time}
              onChange={handleInputChange}
              type="number"
              placeholder="Ex: 1"
            />
          </div>

          <div>
            <Label>Pedido Mínimo</Label>
            <Input 
              name="min_order"
              value={formData.min_order}
              onChange={handleInputChange}
              type="number"
              placeholder="Ex: 100"
            />
          </div>

          <div>
            <Label>Pedido Máximo</Label>
            <Input 
              name="max_order"
              value={formData.max_order}
              onChange={handleInputChange}
              type="number"
              placeholder="Ex: 10000"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Label>Status</Label>
          <Select 
            value={formData.status.toString()} 
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              status: value === 'true' 
            }))}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="true">Ativo</SelectItem>
              <SelectItem value="false">Inativo</SelectItem>
            </SelectContent>
          </Select>

          <Label>Destaque</Label>
          <Select 
            value={formData.featured.toString()} 
            onValueChange={(value) => setFormData(prev => ({ 
              ...prev, 
              featured: value === 'true' 
            }))}
          >
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Selecione destaque" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="true">Sim</SelectItem>
              <SelectItem value="false">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end space-x-4 mt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.push('/admin/servicos_v1')}
          >
            Cancelar
          </Button>
          <Button type="submit">
            <FontAwesomeIcon icon={faSave} className="mr-2" />
            {serviceId ? 'Atualizar Serviço' : 'Criar Serviço'}
          </Button>
        </div>
      </form>
    </div>
  );
}
