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
    // Log para depuração
    console.log('[LinkService] Verificando se é reel:', post);
    
    // Verificar múltiplos indicadores de que é um reel
    const isReelByType = post.type === 'reel';
    const isReelByUrl = post.url && post.url.includes('/reel/');
    const isReelByLink = post.link && post.link.includes('/reel/');
    const isReelByPostLink = post.postLink && post.postLink.includes('/reel/');
    
    const result = isReelByType || isReelByUrl || isReelByLink || isReelByPostLink;
    
    // Log do resultado
    console.log(`[LinkService] É reel? ${result} (type=${isReelByType}, url=${isReelByUrl}, link=${isReelByLink}, postLink=${isReelByPostLink})`);
    
    return result;
  }

  /**
   * Formata o link de um post para o formato adequado para o provedor
   * @param post Dados do post
   * @returns Link formatado para o provedor
   */
  formatPostLinkForProvider(post: Post): string {
    const isReel = this.isReel(post);
    const postType = isReel ? 'reel' : 'p';
    
    console.log('[LinkService] Formatando link para o provedor:', post);
    
    // Extrair o código do post de todas as fontes possíveis
    let postCode = post.postCode || post.code || post.shortcode;
    
    // Se não encontrou o código, tentar extrair das URLs
    if (!postCode) {
      if (post.postLink) {
        postCode = this.linkFormatter.extractPostCode(post.postLink);
      } else if (post.url) {
        postCode = this.linkFormatter.extractPostCode(post.url);
      } else if (post.link) {
        postCode = this.linkFormatter.extractPostCode(post.link);
      }
    }
    
    if (!postCode) {
      console.error('[LinkService] Código do post não encontrado:', post);
      // Retornar a URL original se disponível
      return post.postLink || post.url || post.link || '';
    }
    
    // Para o provedor enviamos com https: https://instagram.com/p/{code} ou https://instagram.com/reel/{code}
    const formattedLink = `https://instagram.com/${postType}/${postCode}`;
    console.log(`[LinkService] Link formatado: ${formattedLink} (isReel=${isReel}, postType=${postType})`);
    
    return formattedLink;
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
      // Retornar o link completo com https para o provedor
      return `https://instagram.com/${extractedUsername}`;
    } else if (username) {
      // Se não conseguir extrair o username, usar o que já temos
      const cleanUsername = username.replace('@', '');
      return `https://instagram.com/${cleanUsername}`;
    }
    
    // Se não conseguir extrair o username, retornar o link original
    // Garantir que o link tenha https://
    if (!profileLink.startsWith('https://')) {
      return profileLink.startsWith('http://') 
        ? profileLink.replace('http://', 'https://') 
        : `https://${profileLink}`;
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
