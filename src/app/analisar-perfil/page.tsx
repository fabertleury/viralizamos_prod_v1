'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInstagramAPI } from '@/hooks/useInstagramAPI';
import { toast } from 'sonner';
import { ProfileHeader } from '@/components/profile-analyzer/ProfileHeader';
import { ProfileInput } from '@/components/profile-analyzer/ProfileInput';
import { EngagementAnalysis } from '@/components/profile-analyzer/EngagementAnalysis';
import { EngagementProjectionChart } from '@/components/profile-analyzer/EngagementProjectionChart';
import { AdvancedMetrics } from '@/components/profile-analyzer/AdvancedMetrics';
import { PDFShareButton } from '@/components/profile-analyzer/PDFShareButton';
import { ShareReport } from '@/components/profile-analyzer/ShareReport';
import { FaSpinner, FaPlus, FaHeart } from 'react-icons/fa';
import { Header } from '@/components/layout/header';
import Link from 'next/link';

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
  // Projeção conservadora com os serviços da Viralizamos
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'posts' | 'reels'>('posts');
  const { fetchInstagramProfileInfo, fetchContent } = useInstagramAPI();
  const searchParams = useSearchParams();

  // Estado para controlar o modal de confirmação
  const [showProfilePreviewModal, setShowProfilePreviewModal] = useState(false);
  const [profilePreviewData, setProfilePreviewData] = useState<any>(null);

  // Efeito para iniciar análise ou mostrar modal de confirmação
  useEffect(() => {
    const initializeAnalysis = async () => {
      const username = searchParams.get('username');
      const isPreview = searchParams.get('preview') === 'true';

      if (!username) return;

      try {
        // Buscar informações do perfil
        const profileInfo = await fetchInstagramProfileInfo(username);
        
        if (isPreview) {
          // Mostrar modal de confirmação
          setProfilePreviewData(profileInfo);
          setShowProfilePreviewModal(true);
        } else {
          // Iniciar análise diretamente
          await startProfileAnalysis(username);
        }
      } catch (error) {
        console.error('Erro ao buscar informações do perfil:', error);
        toast.error('Erro ao buscar informações do perfil');
      }
    };

    initializeAnalysis();
  }, [searchParams]);

  // Função para continuar análise após visualizar preview
  const handleContinueAnalysis = async () => {
    const username = searchParams.get('username');
    if (username) {
      setShowProfilePreviewModal(false);
      await startProfileAnalysis(username);
    }
  };

  // Modal de preview do perfil
  const renderProfilePreviewModal = () => {
    if (!profilePreviewData) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <img 
              src={profilePreviewData.profile_pic_url} 
              alt="Foto de Perfil" 
              className="w-32 h-32 rounded-full mb-4 object-cover"
            />
            <h2 className="text-2xl font-bold mb-2">
              {profilePreviewData.full_name || profilePreviewData.username}
            </h2>
            <p className="text-gray-600 mb-4 text-center">
              @{profilePreviewData.username}
            </p>

            <div className="flex justify-between w-full mb-4">
              <div className="text-center">
                <strong>{profilePreviewData.posts_count || 0}</strong>
                <p className="text-sm text-gray-500">Posts</p>
              </div>
              <div className="text-center">
                <strong>{profilePreviewData.followers_count || 0}</strong>
                <p className="text-sm text-gray-500">Seguidores</p>
              </div>
              <div className="text-center">
                <strong>{profilePreviewData.following_count || 0}</strong>
                <p className="text-sm text-gray-500">Seguindo</p>
              </div>
            </div>

            {profilePreviewData.biography && (
              <p className="text-center text-gray-700 mb-4 italic">
                "{profilePreviewData.biography}"
              </p>
            )}

            <div className="flex space-x-4">
              <button 
                onClick={() => setShowProfilePreviewModal(false)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
              <button 
                onClick={handleContinueAnalysis}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Continuar Análise
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleAnalyzeProfile = async (username: string) => {
    setUsername(username);
    setLoading(true);
    setError(null);

    try {
      const profileInfo = await fetchInstagramProfileInfo(username);
      console.log('Dados do perfil recebidos:', profileInfo);

      if (!profileInfo) {
        toast.error('Não foi possível buscar informações do perfil');
        setError('Falha na busca de informações');
        setLoading(false);
        return;
      }

      // Verificar se o perfil é privado
      if (profileInfo.is_private) {
        setError('Perfil privado. Por favor, torne o perfil público.');
        setLoading(false);
        return;
      }

      // Mapear dados do perfil com verificações adicionais
      const mappedProfileData = {
        username: profileInfo.username || username,
        full_name: profileInfo.full_name || profileInfo.username,
        biography: profileInfo.biography || 'Sem biografia',
        followers_count: profileInfo.followers || 0,
        following_count: profileInfo.following || 0,
        media_count: profileInfo.totalPosts || 0,
        profile_pic_url: profileInfo.profilePicture || '',
        is_verified: profileInfo.isVerified || false
      };

      console.log('Dados do perfil mapeados:', mappedProfileData);
      setProfileData(mappedProfileData);

      try {
        const content = await fetchContent(username, 'profile_analysis');
        console.log('Conteúdo do perfil:', content);
        
        // Se não houver conteúdo, definir um aviso
        if (content.length === 0) {
          toast.warning('Nenhum conteúdo encontrado para este perfil');
        }

        setContentData(content);
      } catch (contentError: any) {
        // Tratamento específico para erros de conteúdo
        if (contentError.message.includes('privado')) {
          setError('Perfil privado. Por favor, torne o perfil público.');
        } else {
          setError('Não foi possível buscar o conteúdo do perfil');
          toast.error(contentError.message);
        }
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Erro ao buscar dados do perfil:', err);
      
      // Tratamento de erros específicos
      if (err.message.includes('privado')) {
        setError('Perfil privado. Por favor, torne o perfil público.');
      } else if (err.message.includes('não encontrado')) {
        setError('Perfil não encontrado. Verifique o nome de usuário.');
      } else {
        setError('Erro ao buscar dados do perfil');
      }
      
      toast.error(err.message);
      setLoading(false);
    }
  };

  // Remover análise automática
  useEffect(() => {
    // Limpar qualquer estado inicial
    setUsername('');
    setProfileData(null);
    setContentData([]);
    setLoading(false);
    setError(null);
  }, []);

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

  // Função para iniciar análise do perfil
  const startProfileAnalysis = async (username: string) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar informações do perfil
      const profileInfo = await fetchInstagramProfileInfo(username);
      
      // Atualizar estado com dados do perfil
      setProfileData({
        username: profileInfo.username,
        full_name: profileInfo.full_name,
        biography: profileInfo.biography,
        followers_count: profileInfo.followers,
        following_count: profileInfo.following,
        media_count: profileInfo.totalPosts,
        profile_pic_url: profileInfo.profilePicture,
        is_verified: profileInfo.isVerified
      });

      // Buscar conteúdo do perfil
      const contentResult = await fetchContent(username, 'profile_analysis');
      setContentData(contentResult);

      setLoading(false);
    } catch (error) {
      console.error('Erro na análise do perfil:', error);
      setError('Não foi possível analisar o perfil. Tente novamente.');
      setLoading(false);
      toast.error('Erro na análise do perfil');
    }
  };

  return (
    <>
      <Header />
      {renderProfilePreviewModal()}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <ProfileInput 
            onAnalyze={handleAnalyzeProfile} 
            isLoading={loading}
            initialUsername={username}
          />

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
                  {profileData && (
                    <div className="flex flex-col md:flex-row justify-center items-center gap-4 mt-6">
                      <Link 
                        href="/instagram/seguidores" 
                        className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        <FaPlus className="mr-2" /> Adicionar Seguidores
                      </Link>
                      <Link 
                        href="/instagram/curtidas" 
                        className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                      >
                        <FaHeart className="mr-2" /> Adicionar Curtidas
                      </Link>
                    </div>
                  )}
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

              {/* Relatório de Compartilhamento */}
              {profileData && contentData.length > 0 && (
                <ShareReport 
                  username={profileData.username || ''} 
                  profileData={profileData}
                  contentData={contentData}
                  metrics={metrics}
                  reportRef={null}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
