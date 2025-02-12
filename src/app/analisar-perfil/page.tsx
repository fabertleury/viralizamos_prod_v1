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
  const reportRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const handleAnalyzeProfile = async (username: string) => {
    setIsLoading(true);
    try {
      // Buscar informações do perfil
      const profileResponse = await fetch(`/api/instagram/profile?username=${username}`);
      
      if (!profileResponse.ok) {
        throw new Error('Perfil não encontrado');
      }

      const profileInfo = await profileResponse.json();

      if (!profileInfo?.data) {
        throw new Error('Dados do perfil inválidos');
      }

      // Buscar posts do perfil
      const postsResponse = await fetch(`/api/instagram/posts?username=${username}`);
      
      if (!postsResponse.ok) {
        throw new Error('Não foi possível carregar os posts');
      }

      const posts = await postsResponse.json();

      if (!posts?.data?.items) {
        throw new Error('Dados dos posts inválidos');
      }

      // Combinar dados do perfil e posts
      const combinedData = {
        username: profileInfo.data.username,
        full_name: profileInfo.data.full_name,
        biography: profileInfo.data.biography || '',
        followers_count: profileInfo.data.follower_count,
        following_count: profileInfo.data.following_count,
        media_count: profileInfo.data.media_count || 0,
        profile_pic_url: profileInfo.data.profile_pic_url,
        is_verified: profileInfo.data.is_verified || false,
        posts: posts.data.items
      };

      setProfileData(combinedData);

    } catch (error: any) {
      console.error('Erro ao analisar perfil:', error);
      toast.error(error.message || 'Erro ao analisar perfil');
      setProfileData(null);
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
                <ProfileHeader profileData={profileData} />
                <RecentPosts posts={profileData.posts} />
                <MetricsAnalysis 
                  profile={{
                    username: profileData.username,
                    full_name: profileData.full_name,
                    biography: profileData.biography,
                    followers: profileData.followers_count,
                    following: profileData.following_count,
                    is_private: false,
                    is_verified: profileData.is_verified,
                    posts_count: profileData.media_count,
                    profile_pic_url: profileData.profile_pic_url
                  }}
                  posts={profileData.posts}
                />
                <GrowthAnalysis profileData={profileData} />
                <ShareReport reportRef={reportRef} />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
