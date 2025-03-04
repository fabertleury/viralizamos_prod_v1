import { Post } from './types';

/**
 * Classe para formatação de links do Instagram
 */
export class LinkFormatter {
  /**
   * Extrai o código do post do Instagram de uma URL
   * @param url URL do post do Instagram
   * @returns Código do post
   */
  extractPostCode(url: string): string | null {
    if (!url) return null;
    
    // Verificar se a URL contém instagram.com
    if (!url.includes('instagram.com')) return null;
    
    try {
      console.log('[LinkFormatter] Extraindo código do post de:', url);
      
      // Tentar diferentes padrões para extrair o código
      
      // Padrão 1: instagram.com/p/{code}
      let match = url.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)(?:\/|\?|$)/);
      
      // Padrão 2: www.instagram.com/p/{code}
      if (!match || !match[1]) {
        match = url.match(/www\.instagram\.com\/p\/([A-Za-z0-9_-]+)(?:\/|\?|$)/);
      }
      
      // Padrão 3: Tentar extrair qualquer código após /p/
      if (!match || !match[1]) {
        match = url.match(/\/p\/([A-Za-z0-9_-]+)(?:\/|\?|$)/);
      }
      
      if (match && match[1]) {
        console.log('[LinkFormatter] Código extraído:', match[1]);
        return match[1];
      } else {
        console.warn('[LinkFormatter] Não foi possível extrair o código do post:', url);
      }
    } catch (error) {
      console.error('[LinkFormatter] Erro ao extrair código do post:', error);
    }
    
    return null;
  }

  /**
   * Formata um link do Instagram para o formato padrão
   * @param url URL original
   * @param includeHttps Se deve incluir o protocolo https:// no link
   * @returns Link formatado ou null se não for possível formatar
   */
  formatInstagramLink(url: string, includeHttps: boolean = true): string | null {
    if (!url) return null;
    
    console.log('[LinkFormatter] Formatando link do Instagram:', url);
    
    // Extrair o código do post
    const postCode = this.extractPostCode(url);
    if (!postCode) {
      console.error('[LinkFormatter] Não foi possível extrair o código do post:', url);
      return null;
    }
    
    console.log('[LinkFormatter] Código extraído:', postCode);
    
    // Formatar o link com ou sem https:// conforme necessário
    const formattedLink = includeHttps
      ? `https://instagram.com/p/${postCode}`
      : `instagram.com/p/${postCode}`;
    
    console.log('[LinkFormatter] Link formatado:', formattedLink);
    
    return formattedLink;
  }

  /**
   * Formata o link de um post para o formato padrão
   * @param post Dados do post
   * @param includeHttps Se deve incluir o protocolo https:// no link
   * @returns Link formatado
   */
  formatPostLink(post: Post, includeHttps: boolean = true): string {
    try {
      console.log('[LinkFormatter] Formatando post:', post);
      
      // Se o post não tiver código, tentar extrair de url ou link
      if (!post.code && (post.url || post.link)) {
        const url = post.url || post.link;
        const postCode = this.extractPostCode(url);
        
        if (postCode) {
          console.log('[LinkFormatter] Link formatado a partir do código:', includeHttps ? `https://instagram.com/p/${postCode}` : `instagram.com/p/${postCode}`);
          return includeHttps 
            ? `https://instagram.com/p/${postCode}` 
            : `instagram.com/p/${postCode}`;
        }
      }
      
      // Se tiver código, usar diretamente
      if (post.code) {
        console.log('[LinkFormatter] Link formatado a partir do código:', includeHttps ? `https://instagram.com/p/${post.code}` : `instagram.com/p/${post.code}`);
        return includeHttps 
          ? `https://instagram.com/p/${post.code}` 
          : `instagram.com/p/${post.code}`;
      }
      
      // Fallback para url ou link original
      return post.url || post.link || '';
    } catch (error) {
      console.error('[LinkFormatter] Erro ao formatar link do post:', error);
      return post.url || post.link || '';
    }
  }
}
