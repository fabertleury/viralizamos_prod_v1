'use client';

import { useState, useRef, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { ProfileInput } from '@/components/profile-analyzer/ProfileInput';
import { ProfileHeader } from '@/components/profile-analyzer/ProfileHeader';
import { RecentPosts } from '@/components/profile-analyzer/RecentPosts';
import { MetricsAnalysis } from '@/components/profile-analyzer/MetricsAnalysis';
import { GrowthAnalysis } from '@/components/profile-analyzer/GrowthAnalysis';
import { ShareReport } from '@/components/profile-analyzer/ShareReport';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import './styles.css';

export default function ProfileAnalyzerPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');

  // Função para fazer proxy de imagens do Instagram
  const proxyInstagramImage = (originalUrl: string) => {
    if (!originalUrl) return '/default-profile.png';
    
    try {
      const url = new URL(originalUrl);
      
      // Remove o domínio e deixa apenas o caminho e query
      let path = url.pathname.replace(/^\//, '');
      
      // Adiciona a query string se existir
      if (url.search) {
        path += url.search;
      }
      
      // Codifica o caminho para evitar problemas com caracteres especiais
      const encodedPath = encodeURIComponent(path);
      
      return `/proxy/instagram-image/${encodedPath}`;
    } catch (error) {
      console.error('Erro ao processar URL da imagem:', error);
      return '/default-profile.png';
    }
  };

  // Função para buscar conteúdo do Instagram
  const fetchInstagramContent = async (username: string, type: 'posts' | 'reels') => {
    try {
      // Busca conteúdo usando a nova API
      const response = await fetch(`/api/instagram-content?username=${username}&type=${type}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro ao buscar ${type}`);
      }

      const data = await response.json();

      // Processamento dos dados recebidos
      return {
        username: data.username,
        type: data.type,
        total: data.total,
        content: data.content.map((item: any) => ({
          id: item.id,
          type: item.type,
          caption: item.caption,
          likes: item.likes,
          comments: item.comments,
          mediaUrl: proxyInstagramImage(item.mediaUrl),
          timestamp: item.timestamp
        }))
      };
    } catch (error) {
      console.error(`Erro ao buscar ${type} do Instagram:`, error);
      throw error;
    }
  };

  // Função para buscar dados do perfil do Instagram
  const fetchInstagramProfile = async (username: string) => {
    try {
      // Busca informações do perfil usando a nova API
      const response = await fetch(`/api/instagram-profile?username=${username}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar perfil');
      }

      const data = await response.json();

      // Processamento dos dados recebidos
      return {
        username: data.username,
        fullName: data.fullName,
        profilePic: proxyInstagramImage(data.profilePicUrl),
        followers: data.followerCount,
        biography: data.biography,
        isVerified: data.isVerified
      };
    } catch (error) {
      console.error('Erro ao buscar perfil do Instagram:', error);
      throw error;
    }
  };

  // Função para lidar com a análise do perfil
  const handleAnalyzeProfile = async (username: string) => {
    setIsLoading(true);
    try {
      // Busca informações do perfil
      const profileInfo = await fetchInstagramProfile(username);

      // Busca posts
      const postsData = await fetchInstagramContent(username, 'posts');

      // Busca reels
      const reelsData = await fetchInstagramContent(username, 'reels');

      // Atualiza o estado com os dados
      setProfileData({
        profile: {
          username: profileInfo.username,
          fullName: profileInfo.fullName,
          profilePicUrl: profileInfo.profilePic,
          followerCount: profileInfo.followers,
          biography: profileInfo.biography,
          isVerified: profileInfo.isVerified
        },
        posts: postsData.content,
        reels: reelsData.content
      });

    } catch (error) {
      console.error('Erro na análise do perfil:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Efeito para analisar o perfil automaticamente quando receber username na URL
  useEffect(() => {
    const username = searchParams.get('username');
    if (username && !profileData && !isLoading) {
      handleAnalyzeProfile(username);
    }
  }, [searchParams]);

  return (
    <>
      <Header />
      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <ProfileInput 
              onAnalyze={handleAnalyzeProfile} 
              isLoading={isLoading} 
              initialUsername={searchParams.get('username') || ''} 
            />
            
            {profileData && (
              <div className="mt-8 space-y-8">
                <ProfileHeader profileData={profileData.profile} />
                {activeTab === 'posts' && (
                  <RecentPosts posts={profileData.posts} />
                )}
                {activeTab === 'reels' && (
                  <RecentPosts posts={profileData.reels} />
                )}
                <MetricsAnalysis 
                  profile={{
                    username: profileData.profile.username,
                    full_name: profileData.profile.fullName,
                    biography: profileData.profile.biography,
                    followers: profileData.profile.followerCount,
                    following: 0,
                    is_private: false,
                    is_verified: profileData.profile.isVerified,
                    posts_count: profileData.posts.length,
                    profile_pic_url: profileData.profile.profilePicUrl
                  }}
                  posts={profileData.posts}
                />
                <GrowthAnalysis profileData={profileData.profile} />
                <ShareReport reportRef={reportRef} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
