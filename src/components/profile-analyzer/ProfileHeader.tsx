import Image from 'next/image';
import { FaCheckCircle, FaHeart, FaComment, FaHashtag } from 'react-icons/fa';

interface ProfileHeaderProps {
  profileData: {
    username: string;
    full_name: string;
    biography: string;
    followers_count: number;
    following_count: number;
    media_count: number;
    profile_pic_url: string;
    is_verified: boolean;
  };
}

export function ProfileHeader({ profileData }: ProfileHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Foto do Perfil */}
        <div className="relative w-32 h-32">
          <Image
            src={`/api/proxy/image?url=${encodeURIComponent(profileData.profile_pic_url)}`}
            alt={profileData.username}
            width={128}
            height={128}
            className="rounded-full"
            priority
            onError={(e: any) => {
              e.target.src = '/images/default-avatar.png'; // Imagem padrão em caso de erro
            }}
          />
          {profileData.is_verified && (
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1">
              <FaCheckCircle className="w-6 h-6 text-blue-500" />
            </div>
          )}
        </div>

        {/* Informações do Perfil */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <h2 className="text-2xl font-bold">@{profileData.username}</h2>
            <span className="text-gray-500">{profileData.full_name}</span>
          </div>

          <p className="text-gray-600 mb-4 max-w-2xl">
            {profileData.biography}
          </p>

          {/* Estatísticas */}
          <div className="flex items-center justify-center md:justify-start gap-8">
            <div className="text-center">
              <div className="text-xl font-bold">
                {profileData.followers_count.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-gray-500">Seguidores</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                {profileData.following_count.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-gray-500">Seguindo</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold">
                {profileData.media_count.toLocaleString('pt-BR')}
              </div>
              <div className="text-sm text-gray-500">Posts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
