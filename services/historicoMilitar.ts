// Ficheiro: services/historicoMilitar.ts
// Histórico de um militar para a ficha de detalhe (página Militares): perícias menores. Os pareceres
// vêm do Firestore (observarPareceres, pelo militarId); as perícias menores ainda estão na planilha
// (Apps Script, getPericiaMenorList) e são ligadas ao militar pelo NIP que consta no INSPECIONADO.
import { GAS_URL } from '../config/endpoints';
import { formatNip } from '../utils/format';

export interface PericiaMenorHist {
  inspecionado: string;
  cid: string;
  dispensas: string;
  dataAtestado: string;
  dataAtestadoTs: number;
  vigente: boolean;
  concluido: boolean;
  link: string;
}

let cache: { quando: number; dados: Promise<PericiaMenorHist[]> } | null = null;
const VALIDADE_MS = 60_000;

/** Lista completa de perícias menores (uma leitura por minuto, compartilhada entre fichas abertas em sequência). */
const lerTodas = (): Promise<PericiaMenorHist[]> => {
  if (!cache || Date.now() - cache.quando > VALIDADE_MS) {
    const dados = fetch(`${GAS_URL}?action=getPericiaMenorList`)
      .then(r => r.json())
      .then(j => (j.success && Array.isArray(j.data) ? (j.data as PericiaMenorHist[]) : []))
      .catch(() => { cache = null; return [] as PericiaMenorHist[]; });
    cache = { quando: Date.now(), dados };
  }
  return cache.dados;
};

export const periciasMenoresDoMilitar = async (nip: string): Promise<PericiaMenorHist[]> => {
  const alvo = formatNip(nip);
  if (!alvo) return [];
  return (await lerTodas()).filter(p => String(p.inspecionado).includes(alvo)).sort((a, b) => b.dataAtestadoTs - a.dataAtestadoTs);
};
