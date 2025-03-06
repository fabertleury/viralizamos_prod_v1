import { SocialMediaService } from '@/lib/services/socialMediaService';
import { Transaction, Provider, Post, ProviderRequestData } from './types';
import { 
  DatabaseService, 
  LinkService, 
  ProviderService, 
  TransactionService 
} from './services';

/**
 * Processa pedidos para provedores
 */
export class OrderProcessor {
  private databaseService = new DatabaseService();
  private linkService = new LinkService();
  private providerService = new ProviderService();
  private transactionService = new TransactionService();

  /**
   * Processa pedidos de curtidas com múltiplos posts
   * @param transaction Dados da transação
   * @param provider Provedor a ser utilizado
   * @param posts Lista de posts para processar
   * @param username Nome de usuário para o pedido
   * @returns Lista de pedidos criados
   */
  async processLikesOrder(transaction: Transaction, provider: Provider, posts?: Post[], username?: string): Promise<any[]> {
    try {
      // Validar posts
      if (!posts || posts.length === 0) {
        console.error('[OrderProcessor] Nenhum post encontrado para processar');
        throw new Error('Nenhum post encontrado para processar');
      }
      
      console.log('[OrderProcessor] Processando', posts.length, 'posts');
      
      // Se não tiver username, tentar extrair dos metadados da transação
      if (!username) {
        username = transaction.target_username || 
                  transaction.metadata?.username || 
                  transaction.metadata?.profile?.username;
        console.log('[OrderProcessor] Usando username dos metadados da transação:', username);
      }
      
      console.log('[OrderProcessor] Checkout de curtidas para:', username);
      
      const orders: any[] = [];
      
      // Calcular a quantidade dividida entre os posts
      const originalQuantity = transaction.service?.quantity || transaction.metadata?.service?.quantity;
      const dividedQuantity = Math.floor(originalQuantity / posts.length);
      
      console.log(`[OrderProcessor] Quantidade original: ${originalQuantity}, Quantidade dividida por post: ${dividedQuantity}`);
      
      for (const post of posts) {
        try {
          console.log('[OrderProcessor] Processando post:', post);
          
          // Formatar o link para o provedor
          const postLinkForProvider = this.linkService.formatPostLinkForProvider(post);
          console.log('[OrderProcessor] Link formatado para o provedor:', postLinkForProvider);
          
          // Extrair o ID do serviço
          const serviceId = this.transactionService.getServiceId(transaction);
          
          if (!serviceId) {
            console.error('[OrderProcessor] ID do serviço não encontrado na transação:', transaction);
            throw new Error('ID do serviço não encontrado na transação');
          }
          
          // Preparar os dados para a requisição ao provedor
          const providerRequestData: ProviderRequestData = {
            service: serviceId,
            link: postLinkForProvider,
            quantity: dividedQuantity, // Usar a quantidade dividida
            transaction_id: transaction.id,
            target_username: username,
            key: provider.api_key,
            action: 'add'
          };
          
          // Log detalhado para depuração
          this.providerService.logRequestDetails(providerRequestData);
          
          // Enviar para o endpoint do provedor
          const orderResponse = await this.providerService.sendOrderToProvider(provider, providerRequestData);
          console.log('[OrderProcessor] Resposta do provedor para o post:', orderResponse);
          
          // Criar pedido no banco de dados
          const order = await this.databaseService.createOrderInDatabase(
            transaction, 
            provider, 
            orderResponse, 
            postLinkForProvider, 
            username, 
            post, 
            posts.length, 
            providerRequestData
          );
          
          orders.push({
            success: true,
            data: {
              order: order,
              response: orderResponse
            },
            post: post
          });
          
        } catch (error) {
          console.error('[OrderProcessor] Erro ao processar post:', post, error);
          orders.push({
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            post: post
          });
          
          // Continuar processando os próximos posts
          continue;
        }
      }
      
      // Atualizar o status da transação
      await this.databaseService.updateTransactionStatus(transaction.id);
      
      return orders;
    } catch (error) {
      console.error('[OrderProcessor] Erro ao processar pedido de curtidas:', error);
      throw error;
    }
  }

  /**
   * Processa pedidos para o provedor usando API direta ou SocialMediaService
   * @param transaction Dados da transação
   * @param provider Provedor a ser utilizado
   * @param targetLink Link alvo para o pedido
   * @param username Nome de usuário para o pedido
   * @returns Pedido criado
   */
  async processGenericOrder(transaction: Transaction, provider: Provider, targetLink: string, username: string): Promise<any> {
    try {
      // Extrair o external_id do serviço
      const serviceId = this.transactionService.getServiceId(transaction);
      
      if (!serviceId) {
        console.error('[OrderProcessor] ID do serviço não encontrado na transação:', transaction);
        throw new Error('ID do serviço não encontrado na transação');
      }
      
      console.log('[OrderProcessor] Usando external_id do serviço:', serviceId);
      
      // Verificar se é um pedido de seguidores (checkout_type = 'Apenas Link do Usuário')
      const isFollowersOrder = this.linkService.isFollowersLink(
        transaction.checkout_type,
        transaction.service?.type,
        transaction.service?.name
      );
      
      // Formatar o link de acordo com o tipo de pedido
      let formattedTargetLink = targetLink;
      
      if (targetLink.includes('instagram.com')) {
        console.log('[OrderProcessor] Detectado link do Instagram, formatando:', targetLink);
        
        if (isFollowersOrder) {
          // Para seguidores, extrair apenas o username
          formattedTargetLink = this.linkService.formatProfileLinkForProvider(targetLink, username);
          console.log('[OrderProcessor] Username formatado para seguidores:', formattedTargetLink);
        } else {
          // Para posts e reels, formatar o link adequadamente
          const isReel = targetLink.includes('/reel/');
          const postType = isReel ? 'reel' : 'p';
          
          console.log('[OrderProcessor] Tipo de link detectado:', isReel ? 'REEL' : 'POST');
          
          // Extrair o código do post usando o LinkFormatter
          const linkFormatter = new LinkService().linkFormatter;
          const postCode = linkFormatter.extractPostCode(targetLink);
          
          if (postCode) {
            // Para o provedor enviamos apenas: instagram.com/p/{code} ou instagram.com/reel/{code}
            formattedTargetLink = `instagram.com/${postType}/${postCode}`;
            console.log('[OrderProcessor] Link formatado para o provedor (sem https):', formattedTargetLink);
          } else {
            console.warn('[OrderProcessor] Não foi possível extrair o código do post, usando o link original');
          }
        }
      }
      
      // Verificar se o provedor tem API configurada
      if (provider && provider.api_url && provider.api_key) {
        console.log('[OrderProcessor] Provedor tem API configurada, usando endpoint dinâmico');
        
        // Verificar se há múltiplos posts na transação
        const hasMultiplePosts = transaction.metadata?.posts && transaction.metadata.posts.length > 1;
        const totalPosts = hasMultiplePosts ? transaction.metadata.posts.length : 1;
        
        // Calcular a quantidade dividida se houver múltiplos posts
        const originalQuantity = transaction.service?.quantity || transaction.metadata?.service?.quantity;
        const quantity = hasMultiplePosts ? Math.floor(originalQuantity / totalPosts) : originalQuantity;
        
        console.log(`[OrderProcessor] Quantidade original: ${originalQuantity}, Quantidade a enviar: ${quantity}, Total de posts: ${totalPosts}`);
        
        // Preparar os dados para a requisição ao provedor
        const providerRequestData: ProviderRequestData = {
          service: serviceId,
          link: formattedTargetLink,
          quantity: quantity, // Usar a quantidade dividida se necessário
          transaction_id: transaction.id,
          target_username: username,
          key: provider.api_key,
          action: 'add'
        };
        
        // Log detalhado para depuração
        this.providerService.logRequestDetails(providerRequestData);
        
        // Enviar para o endpoint do provedor
        const orderResponse = await this.providerService.sendOrderToProvider(provider, providerRequestData);
        console.log('[OrderProcessor] Resposta do provedor:', orderResponse);
        
        // Criar pedido no banco de dados
        return await this.databaseService.createOrderInDatabase(
          transaction, 
          provider, 
          orderResponse, 
          formattedTargetLink, 
          username, 
          totalPosts, 
          providerRequestData
        );
      } else {
        // Criar o serviço social media diretamente
        console.log('[OrderProcessor] Provedor não tem API configurada, usando SocialMediaService diretamente');
        const socialMediaService = new SocialMediaService(provider);
        
        // Criar o pedido
        const orderResponse = await socialMediaService.createOrder({
          service: serviceId,
          link: formattedTargetLink,
          quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
          provider_id: provider.id
        });
        
        console.log('[OrderProcessor] Resposta do SocialMediaService:', orderResponse);
        
        // Criar pedido no banco de dados
        return await this.databaseService.createOrderInDatabase(
          transaction, 
          provider, 
          orderResponse, 
          formattedTargetLink, 
          username, 
          1, // totalPosts
          {
            service: serviceId,
            link: formattedTargetLink,
            quantity: transaction.service?.quantity || transaction.metadata?.service?.quantity,
            provider_id: provider.id
          } // providerRequestData
        );
      }
    } catch (error) {
      console.error('[OrderProcessor] Erro ao processar pedido:', error);
      throw error;
    }
  }
}
