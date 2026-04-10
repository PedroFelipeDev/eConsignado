import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function normalizeContract(contract: string) {
  return contract.replace(/^0+/, '').trim();
}

export function normalizeCPF(cpf: string) {
  return cpf.replace(/\D/g, '');
}

export function formatCPF(cpf: string) {
  const clean = normalizeCPF(cpf);
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function getYearFromCompetence(competence: string) {
  const parts = competence.split('/');
  return parts.length === 2 ? parts[1] : '';
}

export function getYears(data: any[]) {
  const years = new Set(data.map(item => getYearFromCompetence(item.competencia)));
  return Array.from(years).filter(y => y !== '').sort();
}

export function maskDate(value: string) {
  const clean = value.replace(/\D/g, '').substring(0, 8);
  if (clean.length <= 2) return clean;
  if (clean.length <= 4) return `${clean.substring(0, 2)}/${clean.substring(2)}`;
  return `${clean.substring(0, 2)}/${clean.substring(2, 4)}/${clean.substring(4)}`;
}

export function maskCompetence(value: string) {
  const clean = value.replace(/\D/g, '').substring(0, 6);
  if (clean.length <= 2) return clean;
  return `${clean.substring(0, 2)}/${clean.substring(2)}`;
}
