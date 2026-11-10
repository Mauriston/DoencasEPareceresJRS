// Ficheiro: utils/calendarioIS.ts
// Regras puras da visão Calendário das IS: quem pode ser arrastado para remarcar, a fila de IS abertas
// ainda sem entrevista (painel à esquerda) e a grade do mês só com os dias úteis (seg–sex).
import { diasEmAberto, hojeISO, inicioDaSemana, inicioDoMes, somarDias, statusEfetivoIS, type StatusIS } from './inspecoes';

interface DadosArrasteIS {
  status: StatusIS;
  situacao?: string;
  dataEntrevista?: string;
  laudo?: string;
  tis?: string;
  ds1a?: string;
  finalidade?: string;
  grupoFinalidade?: string;
}

const preenchido = (v?: string) => !!v && v.trim() !== '';

/** IS ligada a concurso (os concursos têm agenda própria, por turno). */
export const ehISDeConcurso = (is: Pick<DadosArrasteIS, 'finalidade' | 'grupoFinalidade'>): boolean =>
  /concurso/i.test(`${is.grupoFinalidade ?? ''} ${is.finalidade ?? ''}`);

/**
 * Uma IS agendada pode ser arrastada para outro dia/horário (remarcar) se ainda não tem laudo, Nº do TIS
 * nem DS-1a, não faltou, não está cancelada nem finalizada e não é de concurso.
 */
export const podeArrastarIS = (is: DadosArrasteIS): boolean =>
  preenchido(is.dataEntrevista)
  && !preenchido(is.laudo) && !preenchido(is.tis) && !preenchido(is.ds1a)
  && !['faltou', 'cancelada', 'tis_assinado'].includes(is.status)
  && is.situacao !== 'finalizada'
  && !ehISDeConcurso(is);

interface DadosAbertaIS { id: string; is: number; status: StatusIS; dataAbertura: string; dataEntrevista?: string; grupoFinalidade?: string }

/** IS abertas e ainda sem entrevista, das mais antigas (mais dias em aberto) para as mais novas; empate pelo nº. */
export const abertasNaoAgendadas = <T extends DadosAbertaIS>(inspecoes: T[], hoje: string = hojeISO()): T[] =>
  inspecoes
    .filter(i => i.status === 'aberta' && !i.dataEntrevista)
    .sort((a, b) => diasEmAberto(b.dataAbertura, hoje) - diasEmAberto(a.dataAbertura, hoje) || a.is - b.is);

/** A IS aberta passou do prazo de agendamento (status efetivo "Atrasada"). */
export const abertaAtrasada = (is: DadosAbertaIS, hoje: string = hojeISO()): boolean => statusEfetivoIS(is, hoje) === 'atrasada';

/** "Benefícios — Reforma" / "Benefícios: Reforma" → "Reforma": a finalidade sem o nome do grupo à frente. */
export const finalidadeSemGrupo = (finalidade: string, grupo?: string): string => {
  const f = (finalidade || '').trim();
  if (!grupo) return f;
  const g = grupo.trim();
  if (f.toLowerCase().startsWith(g.toLowerCase())) {
    const resto = f.slice(g.length).replace(/^\s*[-–—:|/·]\s*/, '').trim();
    if (resto) return resto;
  }
  return f;
};

/** "1T (IM) 44.4444.44 FULANO DE TAL" → "FULANO DE TAL" (sem posto, quadro e NIP). */
export const nomeCurtoInspecionado = (inspecionado: string): string => inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || inspecionado;

/** "1 dia" / "12 dias". */
export const rotuloDiasEmAberto = (dias: number): string => `${dias} dia${dias === 1 ? '' : 's'}`;

/**
 * Semanas (seg–sex) da grade do mês da data `ancora`: começa na segunda da semana do dia 1 e só mantém
 * as semanas que têm algum dia útil do mês (um mês que começa no sábado não abre com uma semana vazia).
 */
export const semanasUteisDoMes = (ancora: string): string[][] => {
  const mes = ancora.slice(0, 7);
  const inicio = inicioDaSemana(inicioDoMes(ancora));
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 5 }, (_, d) => somarDias(inicio, w * 7 + d)))
    .filter(sem => sem.some(d => d.slice(0, 7) === mes));
};
