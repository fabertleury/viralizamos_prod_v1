import { NextResponse } from 'next/server';
import axios from 'axios';
import { ProfileCheckResult } from '@/lib/instagram/profileScraper';

// Lista de indicadores de perfil privado que procuramos no HTML
const PRIVATE_INDICATORS = [
  '"is_private":true',
  'Esta conta é privada',
  'This account is private',
  'Conta privada',
  'Private account',
  '"isPrivate":true',
  'class="PrivateProfilePage"',
  'Siga esta conta para ver suas fotos e vídeos',
  'Follow this account to see their photos and videos',
  // Novo indicador exato encontrado pelo usuário
  'Essa conta é privada',
  '<span class="x1lliihq x1plvlek xryxfnj x1n2onr6 x1ji0vk5 x18bv5gf x193iq5w xeuugli x1fj9vlw x13faqbe x1vvkbs x1s928wv xhkezso x1gmr53x x1cpjm7i x1fgarty x1943h6x x1i0vuye x5n08af x1tu3fi x3x7a5m x10wh9bi x1wdrske x8viiok x18hxmgj" dir="auto"',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`[Server Scraper] Verificando perfil: ${username}`);
    const profileUrl = `https://www.instagram.com/${username}/`;
    
    // Configurar headers para simular um navegador
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0'
    };

    const response = await axios.get(profileUrl, { 
      headers,
      timeout: 10000 // 10 segundos de timeout
    });
    
    const html = response.data;
    console.log(`[Server Scraper] Resposta recebida para ${username}, tamanho: ${html.length} caracteres`);

    // Verificar se o perfil é privado e coletar os indicadores encontrados
    const foundIndicators: string[] = [];
    let isPrivate = false;
    
    for (const indicator of PRIVATE_INDICATORS) {
      if (html.includes(indicator)) {
        foundIndicators.push(indicator);
        isPrivate = true;
      }
    }
    
    // Verificação adicional para o texto "Essa conta é privada" com a classe específica
    const privateTextRegex = /<span[^>]*>Essa conta é privada<\/span>/i;
    if (privateTextRegex.test(html)) {
      foundIndicators.push("Regex: <span>Essa conta é privada</span>");
      isPrivate = true;
    }
    
    // Extrair um trecho do HTML para análise (limitado a 1000 caracteres para não sobrecarregar)
    const htmlSnippet = html.length > 1000 
      ? html.substring(0, 500) + '...' + html.substring(html.length - 500)
      : html;

    // Extrair informações básicas do perfil
    let profilePicUrl = null;
    let fullName = null;

    // Tentar extrair a URL da foto de perfil
    const profilePicMatch = html.match(/"profile_pic_url":"([^"]+)"/);
    if (profilePicMatch && profilePicMatch[1]) {
      profilePicUrl = profilePicMatch[1].replace(/\\u0026/g, '&');
    }

    // Tentar extrair o nome completo
    const fullNameMatch = html.match(/"full_name":"([^"]+)"/);
    if (fullNameMatch && fullNameMatch[1]) {
      fullName = fullNameMatch[1];
    }

    // Extrair um trecho específico do HTML que contém "Essa conta é privada"
    let privateTextContext = "";
    const privateTextIndex = html.indexOf("Essa conta é privada");
    if (privateTextIndex !== -1) {
      const startIndex = Math.max(0, privateTextIndex - 100);
      const endIndex = Math.min(html.length, privateTextIndex + 100);
      privateTextContext = html.substring(startIndex, endIndex);
    }

    const result: ProfileCheckResult & { 
      foundIndicators: string[],
      htmlSnippet: string,
      privateTextContext: string
    } = {
      isPublic: !isPrivate,
      username,
      profilePicUrl,
      fullName,
      error: null,
      foundIndicators,
      htmlSnippet,
      privateTextContext
    };

    console.log(`[Server Scraper] Resultado para ${username}:`, {
      ...result,
      htmlSnippet: '(omitido para log)',
      privateTextContext: privateTextContext ? '(encontrado)' : '(não encontrado)'
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`[Server Scraper] Erro ao verificar perfil ${username}:`, error.message);
    
    // Verificar se o erro é de perfil não encontrado (404)
    if (error.response && error.response.status === 404) {
      return NextResponse.json(
        { 
          isPublic: false,
          username,
          profilePicUrl: null,
          fullName: null,
          error: 'Perfil não encontrado',
          foundIndicators: ['Perfil não encontrado (404)'],
          htmlSnippet: error.response?.data || 'Sem conteúdo',
          privateTextContext: ''
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { 
        isPublic: false,
        username,
        profilePicUrl: null,
        fullName: null,
        error: `Erro ao verificar perfil: ${error.message}`,
        foundIndicators: [],
        htmlSnippet: error.response?.data || 'Sem conteúdo',
        privateTextContext: ''
      },
      { status: 500 }
    );
  }
}
