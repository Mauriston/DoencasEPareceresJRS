// Ficheiro: utils/periodos.ts
// Intervalos de datas do filtro "Período" da visão Tabela das Inspeções de Saúde (Hoje, Esta semana,
// Este mês, Este trimestre, Este semestre, Este ano, Customizado). Funções puras sobre datas ISO
// "AAAA-MM-DD" (intervalos fechados nas duas pontas). "Hoje" vem de hojeISO() (data local do
// aparelho; a JRS trabalha no fuso de Recife). Semana: segunda a domingo. Trimestre e semestre civis.
import { hojeISO, inicioDaSemana, somarDias, dataBr } from './inspecoes';

export type PeriodoId = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'semestre' | 'ano' | 'custom';

export interface Intervalo { inicio: string; fim: string }

export const PERIODOS: { id: PeriodoId; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'semana', rotulo: 'Esta semana' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'trimestre', rotulo: 'Este trimestre' },
  { id: 'semestre', rotulo: 'Este semestre' },
  { id: 'ano', rotulo: 'Este ano' },
  { id: 'custom', rotulo: 'Customizado' },
];

const dois = (n: number): string => String(n).padStart(2, '0');

/** Último dia do mês (1–12) do ano. */
export const ultimoDiaDoMes = (ano: number, mes: number): number => new Date(ano, mes, 0, 12).getDate();

/** Intervalo dos meses [mesInicial, mesInicial + n − 1] do ano. */
const intervaloDeMeses = (ano: number, mesInicial: number, n: number): Intervalo => {
  const mesFinal = mesInicial + n - 1;
  return { inicio: `${ano}-${dois(mesInicial)}-01`, fim: `${ano}-${dois(mesFinal)}-${dois(ultimoDiaDoMes(ano, mesFinal))}` };
};

/**
 * Intervalo do período, relativo a `hoje`. "Customizado" usa `custom` (início e fim, em qualquer ordem;
 * uma ponta vazia fica em aberto); sem `custom`, vale o mês corrente.
 */
export const intervaloDoPeriodo = (id: PeriodoId, hoje: string = hojeISO(), custom?: Partial<Intervalo>): Intervalo => {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  switch (id) {
    case 'hoje': return { inicio: hoje, fim: hoje };
    case 'semana': { const seg = inicioDaSemana(hoje); return { inicio: seg, fim: somarDias(seg, 6) }; }
    case 'trimestre': return intervaloDeMeses(ano, Math.floor((mes - 1) / 3) * 3 + 1, 3);
    case 'semestre': return intervaloDeMeses(ano, mes <= 6 ? 1 : 7, 6);
    case 'ano': return intervaloDeMeses(ano, 1, 12);
    case 'custom': {
      const a = custom?.inicio || '';
      const b = custom?.fim || '';
      if (!a && !b) return intervaloDeMeses(ano, mes, 1);
      const inicio = a && b && a > b ? b : a;
      const fim = a && b && a > b ? a : b;
      return { inicio: inicio || '0000-01-01', fim: fim || '9999-12-31' };
    }
    case 'mes':
    default: return intervaloDeMeses(ano, mes, 1);
  }
};

/** A data (ISO; aceita "AAAA-MM-DDTHH:MM") está no intervalo fechado? */
export const dentroDoIntervalo = (data: string, intervalo: Intervalo): boolean => {
  const dia = data.slice(0, 10);
  return dia >= intervalo.inicio && dia <= intervalo.fim;
};

/** Rótulo do botão do filtro: o nome do período, ou as datas do intervalo customizado ("10/11 – 20/11/2026"). */
export const rotuloDoPeriodo = (id: PeriodoId, custom?: Partial<Intervalo>): string => {
  if (id !== 'custom') return PERIODOS.find(p => p.id === id)?.rotulo ?? '';
  const a = custom?.inicio || '';
  const b = custom?.fim || '';
  if (!a && !b) return 'Customizado';
  if (a && !b) return `A partir de ${dataBr(a)}`;
  if (!a && b) return `Até ${dataBr(b)}`;
  const [ini, fim] = a <= b ? [a, b] : [b, a];
  if (ini === fim) return dataBr(ini);
  return ini.slice(0, 4) === fim.slice(0, 4) ? `${dataBr(ini).slice(0, 5)} – ${dataBr(fim)}` : `${dataBr(ini)} – ${dataBr(fim)}`;
};
