'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
  social_id: string;
}

interface Social {
  id: string;
  name: string;
  icon: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface CheckoutType {
  id: string;
  name: string;
  slug: string;
}

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: any;
  onSuccess: () => void;
}

export function ServiceFormModal({ isOpen, onClose, service, onSuccess }: ServiceFormModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [socials, setSocials] = useState<Social[]>([]);
  const [checkoutTypes, setCheckoutTypes] = useState<CheckoutType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSocial, setSelectedSocial] = useState<string>("");
  const [formData, setFormData] = useState({
    name: '',
    descricao: '',
    preco: '',
    quantidade: '',
    category_id: '',
    subcategory_id: '',
    checkout_type_id: '',
    featured: false,
    status: true,
    external_id: ''
  });

  const supabase = createClient();

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        descricao: service.descricao || '',
        preco: service.preco?.toString() || '',
        quantidade: service.quantidade?.toString() || '',
        category_id: service.category_id || '',
        subcategory_id: service.subcategory_id || '',
        checkout_type_id: service.checkout_type_id || '',
        featured: service.featured || false,
        status: service.status !== false,
        external_id: service.external_id || ''
      });
    }
  }, [service]);

  useEffect(() => {
    const fetchData = async () => {
      const [socialsResponse, categoriesResponse, checkoutTypesResponse] = await Promise.all([
        supabase
          .from('socials')
          .select('*')
          .order('name'),
        supabase
          .from('categories')
          .select(`
            id, 
            name,
            social_id,
            subcategories (
              id,
              name,
              category_id
            )
          `)
          .eq('active', true)
          .order('order_position'),
        supabase
          .from('checkout_types')
          .select('id, name, slug')
          .order('name')
      ]);

      if (socialsResponse.data) {
        setSocials(socialsResponse.data);
      }

      if (categoriesResponse.data) {
        setCategories(categoriesResponse.data);
      }

      if (checkoutTypesResponse.data) {
        setCheckoutTypes(checkoutTypesResponse.data);
      }

      // Se estiver editando, buscar a rede social da categoria
      if (service?.category_id) {
        const category = categoriesResponse.data?.find(c => c.id === service.category_id);
        if (category) {
          setSelectedSocial(category.social_id);
        }
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, service]);

  const filteredCategories = categories.filter(cat => cat.social_id === selectedSocial);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        descricao: formData.descricao,
        preco: parseFloat(formData.preco),
        quantidade: parseInt(formData.quantidade),
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id || null, // Garante que string vazia vira null
        checkout_type_id: formData.checkout_type_id,
        featured: formData.featured,
        status: formData.status,
        external_id: formData.external_id
      };

      if (service?.id) {
        const { error } = await supabase
          .from('services')
          .update(data)
          .eq('id', service.id);

        if (error) throw error;
        toast.success('Serviço atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('services')
          .insert([data]);

        if (error) throw error;
        toast.success('Serviço criado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao salvar serviço');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {service ? 'Editar' : 'Novo'} Serviço
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Preço</label>
            <Input
              type="number"
              step="0.01"
              value={formData.preco}
              onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <Input
              type="number"
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">ID do Serviço na FAMA</label>
            <Input
              value={formData.external_id}
              onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
              required
              placeholder="Ex: 123456"
            />
          </div>

          {/* Seleção de Rede Social */}
          <div>
            <label className="block text-sm font-medium mb-1">Rede Social</label>
            <Select
              value={selectedSocial}
              onValueChange={(value) => {
                setSelectedSocial(value);
                setFormData({
                  ...formData,
                  category_id: '',
                  subcategory_id: ''
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma rede social" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {socials.map((social) => (
                  <SelectItem key={social.id} value={social.id}>
                    {social.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Categoria */}
          {selectedSocial && (
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    category_id: value,
                    subcategory_id: '' // Limpa a subcategoria quando muda a categoria
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Seleção de Subcategoria */}
          {formData.category_id && (
            <div>
              <label className="block text-sm font-medium mb-1">Subcategoria</label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(value) => setFormData({ ...formData, subcategory_id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma subcategoria" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {categories
                    .find(cat => cat.id === formData.category_id)
                    ?.subcategories?.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {subcategory.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Checkout</label>
            <Select
              value={formData.checkout_type_id}
              onValueChange={(value) => setFormData({ ...formData, checkout_type_id: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um tipo de checkout" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {checkoutTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="featured" className="text-sm font-medium">
              Destaque
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="status"
              checked={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="status" className="text-sm font-medium">
              Ativo
            </label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
