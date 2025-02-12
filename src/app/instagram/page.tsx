'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Heart, Eye, Users, Play, Clock } from 'lucide-react';

interface Subcategory {
  id: string;
  name: string;
  description: string | null;
  slug: string;
}

// Mapeamento de slugs das subcategorias para slugs das rotas
const slugMap: { [key: string]: string } = {
  'curtidas-brasileiras': 'curtidas',
  'curtidas-mundiais': 'curtidas',
  'seguidores-brasileiros': 'seguidores',
  'seguidores-mundiais': 'seguidores',
  'visualizacoes-reels': 'visualizacao',
  'visualizacoes-stories': 'visualizacao',
};

// Função para agrupar subcategorias por tipo
const groupSubcategoriesByType = (subcategories: Subcategory[]) => {
  const groups = new Map<string, Subcategory[]>();
  
  subcategories.forEach(sub => {
    const baseSlug = slugMap[sub.slug] || sub.slug;
    if (!groups.has(baseSlug)) {
      groups.set(baseSlug, []);
    }
    groups.get(baseSlug)?.push(sub);
  });

  return Array.from(groups.entries()).map(([baseSlug, subs]) => ({
    slug: baseSlug,
    name: getGroupName(baseSlug),
    subcategories: subs
  }));
};

const getGroupName = (slug: string): string => {
  switch (slug) {
    case 'curtidas':
      return 'Curtidas';
    case 'seguidores':
      return 'Seguidores';
    case 'visualizacao':
      return 'Visualizações';
    default:
      return slug.charAt(0).toUpperCase() + slug.slice(1);
  }
};

export default function InstagramPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Primeiro busca a rede social Instagram
        const { data: socialData, error: socialError } = await supabase
          .from('socials')
          .select(`
            id,
            categories:categories (
              id,
              subcategories:subcategories (
                id,
                name,
                description,
                slug,
                active,
                order_position
              )
            )
          `)
          .ilike('name', 'instagram')
          .single();

        if (socialError) throw socialError;
        if (!socialData) throw new Error('Rede social Instagram não encontrada');

        // Filtra e organiza as subcategorias
        const allSubcategories = socialData.categories
          .flatMap(category => category.subcategories)
          .filter(sub => sub.active)
          .sort((a, b) => a.order_position - b.order_position);

        setSubcategories(allSubcategories || []);
      } catch (error) {
        console.error('Erro ao carregar subcategorias:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getIcon = (slug: string) => {
    const baseSlug = slugMap[slug] || slug;
    switch (baseSlug) {
      case 'curtidas':
        return <Heart className="w-6 h-6" />;
      case 'visualizacao':
        return <Eye className="w-6 h-6" />;
      case 'seguidores':
        return <Users className="w-6 h-6" />;
      case 'views-reels':
        return <Play className="w-6 h-6" />;
      case 'views-stories':
        return <Clock className="w-6 h-6" />;
      default:
        return <Heart className="w-6 h-6" />;
    }
  };

  const groupedSubcategories = groupSubcategoriesByType(subcategories);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Serviços para Instagram
              </h1>
              <p className="text-lg text-gray-600">
                Escolha o serviço que você precisa para impulsionar seu perfil no Instagram
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedSubcategories.map((group) => (
                  <Link 
                    key={group.slug} 
                    href={`/instagram/${group.slug}`}
                    className="transform transition-all duration-200 hover:scale-105"
                  >
                    <Card className="p-6 cursor-pointer bg-white hover:shadow-lg transition-shadow duration-200">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                          {getIcon(group.slug)}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {group.name}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {group.subcategories.length > 1 
                          ? `${group.subcategories.length} opções disponíveis` 
                          : '1 opção disponível'}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-12 text-center">
              <p className="text-sm text-gray-500">
                Todos os nossos serviços são entregues de forma gradual e natural para manter a segurança da sua conta.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
