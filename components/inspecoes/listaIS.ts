// Ficheiro: components/inspecoes/listaIS.ts
// Regras de apresentação da lista de Inspeções de Saúde (auditoria v3, 2b · I4–I8 · G1):
//  • pesos de status — contorno navy para o fluxo normal (Agendada/Reagendada), neutro para Aberta, ouro para
//    etapa pendente na JRS, vinho só para Atrasada/Faltou (tomStatusIS);
//  • etapa do fluxo em 6 passos (Entrevista → Auditoria → Conclusão → Votação → Assinaturas → TIS assinado);
//  • prazo das abertas sem agendamento ("9 de 7 dias", com barra);
//  • ordem de trabalho da aba Ativas: Hoje → próximos dias (um grupo por dia) → entrevistados aguardando
//    conclusão (mais antigos primeiro) → abertas sem agendamento (mais urgentes primeiro); Finalizadas por mês.
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import {
  STATUS_IS, statusEfetivoIS, diasEmAberto, prazoAtrasoDias, dataDeEntrevista, horaDeEntrevista, horaFimEntrevista,
  duracaoDaIS, nomeDiaSemana, nomeDiaCurto, nomeMes, somarDias,
  type StatusExibicaoIS, type TomStatus,
} from '../../utils/inspecoes';

/** Tom da tag de status na lista (I8/G1): Aberta neutro, Agendada/Reagendada contorno; o resto como em STATUS_IS. */
export const tomStatusIS = (status: StatusExibicaoIS): TomStatus => {
  if (status === 'aberta') return 'neutral';
  if (status === 'agendada' || status === 'reagendada') return 'navyOutline';
  return STATUS_IS[status].tom;
};

export const TOTAL_ETAPAS_IS = 6;

/** Etapa do fluxo da IS (null = sem etapa: aberta sem agendamento ou cancelada; Realizando Exames = passo 0). `passo` 0 = voltou ao início (faltou). */
export const etapaIS = (status: StatusExibicaoIS): { rotulo: string; passo: number } | null => {
  switch (status) {
    case 'agendada': case 'reagendada': return { rotulo: 'Entrevista', passo: 1 };
    case 'faltou': return { rotulo: 'Faltou · reagendar', passo: 0 };
    // Guias entregues: o prazo de 7 dias úteis já foi cumprido; aguarda o agendamento (sem barra de prazo).
    case 'realizando_exames': return { rotulo: 'Exames · agendar', passo: 0 };
    case 'parecer_solicitado': return { rotulo: 'Parecer', passo: 2 };
    case 'auditoria': return { rotulo: 'Auditoria', passo: 2 };
    case 'revisao_exofficio': return { rotulo: 'Revisão ex-officio', passo: 2 };
    case 'restituicao_auditoria': case 'restituicao_jsd': return { rotulo: 'Restituição', passo: 2 };
    case 'conclusao_pendente': return { rotulo: 'Conclusão', passo: 3 };
    case 'votacao_pendente': return { rotulo: 'Votação', passo: 4 };
    case 'assinaturas_pendentes': return { rotulo: 'Assinaturas', passo: 5 };
    case 'tis_assinado': return { rotulo: 'TIS assinado', passo: 6 };
    default: return null;
  }
};

export interface PrazoIS { texto: string; pct: number; atrasada: boolean }

/** Prazo da IS aberta sem agendamento ("9 de 7 dias"); null para as demais (Realizando Exames já cumpriu o prazo). */
export const prazoIS = (is: InspecaoRecord, hoje: string): PrazoIS | null => {
  if (is.status !== 'aberta' || is.dataEntrevista) return null;
  const dias = diasEmAberto(is.dataAbertura, hoje);
  const prazo = prazoAtrasoDias(is.grupoFinalidade);
  return { texto: `${dias} de ${prazo} dia${prazo !== 1 ? 's' : ''}`, pct: Math.min(100, Math.round((dias / prazo) * 100)), atrasada: dias > prazo };
};

const maiuscula = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const ddmm = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ha = (dias: number): string => (dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`);

export type TipoGrupoIS = 'dia' | 'aguardando' | 'abertas' | 'mes';

export interface GrupoIS {
  chave: string;
  tipo: TipoGrupoIS;
  /** "Hoje · sábado, 14/11", "Segunda, 16/11 · amanhã", "Entrevistados · aguardando conclusão"… */
  titulo: string;
  /** Texto menor ao lado do título ("3 IS", "mais antigos primeiro"). */
  dica: string;
  /** AAAA-MM-DD do dia (só tipo 'dia'). */
  data?: string;
  itens: InspecaoRecord[];
}

/** Coluna "Quando" sem repetir data/hora do cabeçalho do grupo (I6). */
export const quandoIS = (is: InspecaoRecord, tipo: TipoGrupoIS, hoje: string): { linha1: string; linha2: string } => {
  if (!is.dataEntrevista) return { linha1: `Aberta ${ddmm(is.dataAbertura)}`, linha2: tipo === 'abertas' ? ha(diasEmAberto(is.dataAbertura, hoje)) : '' };
  const hora = horaDeEntrevista(is.dataEntrevista);
  if (tipo === 'dia') return { linha1: hora, linha2: `a ${horaFimEntrevista(hora, duracaoDaIS(is))}` };
  const data = dataDeEntrevista(is.dataEntrevista);
  return { linha1: `${maiuscula(nomeDiaCurto(data))} ${ddmm(data)}`, linha2: hora };
};

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Título do grupo de um dia: "Hoje · sábado, 14/11", "Segunda, 16/11 · amanhã". */
export const tituloDia = (data: string, hoje: string): string => {
  const base = `${nomeDiaSemana(data)}, ${ddmm(data)}`;
  if (data === hoje) return `Hoje · ${base}`;
  return `${maiuscula(base)}${data === somarDias(hoje, 1) ? ' · amanhã' : ''}`;
};

/** Aba Ativas (abertas + em andamento) na ordem de trabalho. */
export const agruparAtivasIS = (lista: InspecaoRecord[], hoje: string): GrupoIS[] => {
  const porHora = (a: InspecaoRecord, b: InspecaoRecord) => a.dataEntrevista.localeCompare(b.dataEntrevista) || a.is - b.is;
  const comData = lista.filter(i => !!i.dataEntrevista).sort(porHora);
  const dias: GrupoIS[] = [];
  for (const is of comData) {
    const d = dataDeEntrevista(is.dataEntrevista);
    if (d < hoje) continue;
    const ultimo = dias[dias.length - 1];
    if (ultimo?.data === d) ultimo.itens.push(is);
    else dias.push({ chave: d, tipo: 'dia', titulo: tituloDia(d, hoje), dica: '', data: d, itens: [is] });
  }
  dias.forEach(g => { g.dica = plural(g.itens.length, 'IS', 'IS'); });
  const aguardando = comData.filter(i => dataDeEntrevista(i.dataEntrevista) < hoje);
  // Realizando Exames (prazo cumprido com a entrega das guias) vai depois das Abertas.
  const urgencia = (i: InspecaoRecord) => (i.status === 'realizando_exames' ? -1 : diasEmAberto(i.dataAbertura, hoje) / prazoAtrasoDias(i.grupoFinalidade));
  const abertas = lista.filter(i => !i.dataEntrevista)
    .sort((a, b) => urgencia(b) - urgencia(a) || a.dataAbertura.localeCompare(b.dataAbertura) || a.is - b.is);
  const grupos = [...dias];
  if (aguardando.length) grupos.push({ chave: 'aguardando', tipo: 'aguardando', titulo: 'Entrevistados · aguardando conclusão', dica: `${plural(aguardando.length, 'IS', 'IS')} · mais antigos primeiro`, itens: aguardando });
  if (abertas.length) grupos.push({ chave: 'abertas', tipo: 'abertas', titulo: 'Abertas · sem agendamento', dica: `${plural(abertas.length, 'IS', 'IS')} · prazo: 7 dias (60 em Benefícios)`, itens: abertas });
  return grupos;
};

/** Data de referência de uma finalizada: a entrevista; sem ela, a abertura. */
const referenciaFinalizada = (i: InspecaoRecord): string => (i.dataEntrevista ? i.dataEntrevista : i.dataAbertura);

/** Finalizadas, mais recentes primeiro (já ordenadas, para paginar antes de agrupar). */
export const ordenarFinalizadasIS = (lista: InspecaoRecord[]): InspecaoRecord[] =>
  [...lista].sort((a, b) => referenciaFinalizada(b).localeCompare(referenciaFinalizada(a)) || b.is - a.is);

/** Aba Finalizadas: um grupo por mês (a lista já vem ordenada e paginada). */
export const agruparFinalizadasIS = (lista: InspecaoRecord[]): GrupoIS[] => {
  const grupos: GrupoIS[] = [];
  for (const is of lista) {
    const mes = referenciaFinalizada(is).slice(0, 7);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.chave === mes) ultimo.itens.push(is);
    else grupos.push({ chave: mes, tipo: 'mes', titulo: `${maiuscula(nomeMes(`${mes}-01`))} de ${mes.slice(0, 4)}`, dica: '', itens: [is] });
  }
  grupos.forEach(g => { g.dica = plural(g.itens.length, 'IS', 'IS'); });
  return grupos;
};

/** Status efetivo + tom da lista. */
export const statusListaIS = (is: InspecaoRecord, hoje: string): { status: StatusExibicaoIS; rotulo: string; tom: TomStatus } => {
  const status = statusEfetivoIS(is, hoje);
  return { status, rotulo: STATUS_IS[status].rotulo, tom: tomStatusIS(status) };
};
