'use client';

import { useState } from 'react';
import { ProfileHeader } from '@/components/profile-analyzer/ProfileHeader';
import { ProfileInput } from '@/components/profile-analyzer/ProfileInput';
import { EngagementAnalysis } from '@/components/profile-analyzer/EngagementAnalysis';
import { EngagementProjectionChart } from '@/components/profile-analyzer/EngagementProjectionChart';
import { AdvancedMetrics } from '@/components/profile-analyzer/AdvancedMetrics';
import { PDFShareButton } from '@/components/profile-analyzer/PDFShareButton';
import { FaSpinner, FaPlus, FaHeart } from 'react-icons/fa';
import { Header } from '@/components/layout/header';

interface ProfileData {
  username?: string;
  full_name?: string;
  biography?: string;
  followers_count?: number;
  following_count?: number;
  media_count?: number;
  profile_pic_url?: string;
  is_verified?: boolean;
}

interface ContentData {
  id: string;
  type: string;
  caption: string;
  likes: number;
  comments: number;
  mediaUrl: string;
  timestamp: number;
  parentId?: string;
  views?: number;
}

// Função para avaliar o desempenho de um post
function evaluatePostPerformance(
  post: ContentData, 
  followerCount: number
): { 
  status: 'good' | 'average' | 'poor', 
  message: string 
} {
  const likePercentage = (post.likes / followerCount) * 100;
  const commentPercentage = (post.comments / followerCount) * 100;

  // Avaliação de curtidas
  if (likePercentage < 3) {
    return {
      status: 'poor',
      message: 'Desempenho baixo. Considere melhorar o conteúdo.'
    };
  }

  if (likePercentage >= 3 && likePercentage < 5) {
    return {
      status: 'average',
      message: 'Desempenho razoável. Há espaço para melhorias.'
    };
  }

  return {
    status: 'good',
    message: 'Ótimo desempenho! Continue assim.'
  };
}

// Função para calcular projeção de engajamento
function calculateEngagementProjection(
  currentFollowers: number, 
  currentLikes: number, 
  currentComments: number,
  currentReelViews?: number
) {
  // Projeção conservadora com os serviços da Viralizai
  return {
    followers: Math.round(currentFollowers * 1.5), // 50% de crescimento
    likes: Math.round(currentLikes * 2), // Dobrar curtidas
    comments: Math.round(currentComments * 2.5), // 150% de crescimento em comentários
    reelViews: currentReelViews ? Math.round(currentReelViews * 3) : undefined // Triplicar visualizações de Reels
  };
}

export default function ProfileAnalyzerPage() {
  const [username, setUsername] = useState('');
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [contentData, setContentData] = useState<ContentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'posts' | 'reels'>('posts');

  // Calcular métricas agregadas
  const calculateAggregateMetrics = (data: ContentData[]) => {
    const totalLikes = data.reduce((sum, item) => sum + item.likes, 0);
    const totalComments = data.reduce((sum, item) => sum + item.comments, 0);
    const totalReelViews = data
      .filter(item => item.type === 'video')
      .reduce((sum, item) => sum + (item.views || 0), 0);

    return {
      totalLikes,
      averageLikes: totalLikes / data.length,
      totalComments,
      averageComments: totalComments / data.length,
      totalReelViews,
      averageReelViews: totalReelViews / data.filter(item => item.type === 'video').length
    };
  };

  async function fetchInstagramProfile(username: string) {
    try {
      const profileResponse = await fetch(`/api/instagram-profile?username=${username}`);
      if (!profileResponse.ok) {
        throw new Error('Erro ao buscar perfil');
      }
      return await profileResponse.json();
    } catch (error) {
      console.error('Erro na busca do perfil:', error);
      throw error;
    }
  }

  async function fetchInstagramContent(username: string) {
    try {
      console.log('[DEBUG] Iniciando busca de conteúdo para:', username);
      const contentResponse = await fetch(`/api/instagram-content?username=${username}`);
      
      console.log('[DEBUG] Status da resposta de conteúdo:', contentResponse.status);
      
      if (!contentResponse.ok) {
        const errorText = await contentResponse.text();
        console.error('[DEBUG] Erro na resposta de conteúdo:', errorText);
        throw new Error(`Erro ao buscar conteúdo: ${errorText}`);
      }
      
      const data = await contentResponse.json();
      console.log('[DEBUG] Dados de conteúdo recebidos:', JSON.stringify(data, null, 2));
      
      return data.content || [];
    } catch (error) {
      console.error('[DEBUG] Erro completo na busca do conteúdo:', error);
      throw error;
    }
  }

  async function handleAnalyzeProfile(inputUsername: string) {
    setLoading(true);
    setError(null);
    setProfileData(null);
    setContentData([]);

    try {
      const profile = await fetchInstagramProfile(inputUsername);
      const content = await fetchInstagramContent(inputUsername);

      setProfileData(profile);
      setContentData(content);
      setUsername(inputUsername);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  // Função para criar URL de proxy segura
  const proxyImageUrl = (originalUrl: string) => {
    if (!originalUrl) return '/default-avatar.png';
    return `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  };

  // Renderizar conteúdo (posts ou reels)
  const renderContentGrid = (contentType: 'posts' | 'reels') => {
    const filteredContent = contentData
      .filter(item => 
        contentType === 'posts' 
          ? item.type === 'image' || item.type === 'carousel'
          : item.type === 'video'
      )
      // Limitar para 10 posts/reels
      .slice(0, 10);

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {filteredContent.map((post) => {
          const postPerformance = profileData?.followers_count 
            ? evaluatePostPerformance(post, profileData.followers_count) 
            : null;

          return (
            <div 
              key={post.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden transform transition-transform hover:scale-105 relative"
            >
              <img 
                src={proxyImageUrl(post.mediaUrl)} 
                alt={post.caption || 'Conteúdo do Instagram'} 
                className="w-full h-48 object-cover"
              />

              <div className="p-3">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>❤️ {post.likes}</span>
                  <span>💬 {post.comments}</span>
                </div>

                {postPerformance && (
                  <div 
                    className={`text-xs font-semibold mb-2 p-1 rounded text-center ${
                      postPerformance.status === 'good' 
                        ? 'bg-green-100 text-green-800' 
                        : postPerformance.status === 'average' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {postPerformance.message}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Calcular métricas agregadas
  const metrics = calculateAggregateMetrics(contentData);

  // Calcular projeção de engajamento
  const engagementProjection = profileData?.followers_count
    ? calculateEngagementProjection(
        profileData.followers_count, 
        metrics.totalLikes, 
        metrics.totalComments,
        metrics.totalReelViews
      )
    : null;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <ProfileInput onAnalyze={handleAnalyzeProfile} />

          {loading && (
            <div className="flex justify-center items-center my-8">
              <FaSpinner className="animate-spin text-4xl text-blue-500" />
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4" role="alert">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {profileData && (
            <div className="w-full">
              <ProfileHeader profileData={profileData} />

              {/* Posts e Reels */}
              {contentData.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                  <div className="flex mb-4 border-b">
                    <button 
                      className={`px-4 py-2 ${activeContentTab === 'posts' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
                      onClick={() => setActiveContentTab('posts')}
                    >
                      Posts
                    </button>
                    <button 
                      className={`px-4 py-2 ${activeContentTab === 'reels' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}
                      onClick={() => setActiveContentTab('reels')}
                    >
                      Reels
                    </button>
                  </div>

                  <h3 className="text-2xl font-bold mb-6 text-center">
                    Últimos {activeContentTab === 'posts' ? 'Posts' : 'Reels'}
                  </h3>

                  {renderContentGrid(activeContentTab)}

                  {/* Botões de Ação */}
                  <div className="mt-6 flex justify-center space-x-4">
                    <button 
                      className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                      onClick={() => {/* Lógica para adicionar seguidores */}}
                    >
                      <FaPlus className="mr-2" /> Adicionar Seguidores
                    </button>
                    <button 
                      className="flex items-center bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition"
                      onClick={() => {/* Lógica para adicionar curtidas */}}
                    >
                      <FaHeart className="mr-2" /> Adicionar Curtidas
                    </button>
                  </div>
                </div>
              )}

              {/* Métricas Avançadas */}
              {profileData && contentData.length > 0 && (
                <AdvancedMetrics 
                  profileData={profileData}
                  contentData={contentData}
                />
              )}

              {/* Análise de Engajamento */}
              {profileData.followers_count && contentData.length > 0 && (
                <EngagementAnalysis 
                  followers={profileData.followers_count}
                  likes={metrics.totalLikes}
                  comments={metrics.totalComments}
                  reelViews={metrics.totalReelViews}
                />
              )}

              {/* Projeção de Engajamento */}
              {engagementProjection && (
                <EngagementProjectionChart 
                  currentData={{
                    followers: profileData.followers_count || 0,
                    likes: metrics.totalLikes,
                    comments: metrics.totalComments,
                    reelViews: metrics.totalReelViews
                  }}
                  projectedData={engagementProjection}
                />
              )}

              {/* Compartilhamento de PDF */}
              {profileData && contentData.length > 0 && (
                <PDFShareButton 
                  profileData={profileData}
                  contentData={contentData}
                  metrics={metrics}
                  engagementProjection={engagementProjection}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
