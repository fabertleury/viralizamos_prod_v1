/**
 * Formata um número para exibição simplificada (1K, 2K, 1M)
 * @param num Número a ser formatado
 * @returns String formatada
 */
export function formatNumber(num: number): string {
  if (!num && num !== 0) return '0';
  
  if (num === 0) return '0';
  
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
}
