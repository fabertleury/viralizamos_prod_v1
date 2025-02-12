import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatNumber(value: number, maxDecimals: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0
  }).format(value)
}
