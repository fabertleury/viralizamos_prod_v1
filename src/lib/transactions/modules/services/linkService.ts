import { Post } from '../types';
import { LinkFormatter } from '../linkFormatter';

/**
 * Serviço para manipulação e formatação de links
 */
export class LinkService {
  private linkFormatter = new LinkFormatter();

  /**
   * Verifica se um link é de um reel do Instagram
   * @param link Link a ser verificado
   * @returns Verdadeiro se for um reel
   */
  isReel(post: Post): boolean {
    return (
      post.type === 'reel' || 
      (post.url && post.url.includes('/reel/')) || 
      (post.link && post.link.includes('/reel/'))
    );
  }

  /**
   * Formata o link de um post para o formato adequado para o provedor
   * @param post Dados do post
   * @returns Link formatado para o provedor
   */
  formatPostLinkForProvider(post: Post): string {
    const isReel = this.isReel(post);
    const postType = isReel ? 'reel' : 'p';
    
    // Extrair o código do post
    let postCode = post.code || post.shortcode;
    if (!postCode && post.url) {
      postCode = this.linkFormatter.extractPostCode(post.url);
    }
    
    if (!postCode) {
      console.error('[LinkService] Código do post não encontrado:', post);
      return post.url || post.link || '';
    }
    
    // Para o provedor enviamos apenas: instagram.com/p/{code} ou instagram.com/reel/{code}
    return `instagram.com/${postType}/${postCode}`;
  }

  /**
   * Formata o link de um perfil para o formato adequado para o provedor
   * @param profileLink Link do perfil
   * @param username Nome de usuário alternativo
   * @returns Username formatado para o provedor
   */
  formatProfileLinkForProvider(profileLink: string, username?: string): string {
    // Para seguidores, extrair apenas o username
    const extractedUsername = this.linkFormatter.extractUsername(profileLink);
    
    if (extractedUsername) {
      return extractedUsername;
    } else if (username) {
      // Se não conseguir extrair o username, usar o que já temos
      return username.replace('@', '');
    }
    
    return profileLink;
  }

  /**
   * Determina se um link é para um pedido de seguidores
   * @param transaction Transação
   * @returns Verdadeiro se for um pedido de seguidores
   */
  isFollowersLink(checkoutType?: string, serviceType?: string, serviceName?: string): boolean {
    return (
      checkoutType === 'Apenas Link do Usuário' || 
      serviceType === 'followers' ||
      (serviceName && serviceName.toLowerCase().includes('seguidor'))
    );
  }
}
