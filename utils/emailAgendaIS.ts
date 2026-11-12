// Ficheiro: utils/emailAgendaIS.ts
// Regras puras do e-mail "IS agendadas" do dia seguinte (servidor/email/agendaIS.ts; testes em
// utils/__tests__/emailAgendaIS.test.ts):
//  - envio automático às 18h de domingo a quinta (a agenda é a de segunda a sexta), mesmo sem IS;
//  - não sai em véspera de feriado (nacional, de PE ou do Recife — utils/escalaSpa.ts);
//  - datas no fuso de Recife.
import { feriados } from './escalaSpa';

const DIAS_SEMANA = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];

const partes = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Data inválida: ${iso}`);
  return { y: Number(m[1]), mes: Number(m[2]), d: Number(m[3]) };
};

/** AAAA-MM-DD válida (o dia existe no calendário). */
export const dataIsoValida = (iso: string): boolean => {
  try {
    const { y, mes, d } = partes(iso);
    const dt = new Date(Date.UTC(y, mes - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === d;
  } catch { return false; }
};

/** Dia da semana (0 = domingo) de uma data AAAA-MM-DD. */
export const diaDaSemana = (iso: string): number => { const { y, mes, d } = partes(iso); return new Date(Date.UTC(y, mes - 1, d)).getUTCDay(); };

/** AAAA-MM-DD somado de `dias`. */
export const somarDias = (iso: string, dias: number): string => {
  const { y, mes, d } = partes(iso);
  return new Date(Date.UTC(y, mes - 1, d + dias)).toISOString().slice(0, 10);
};

/** Hoje (AAAA-MM-DD) em Recife. */
export const hojeEmRecife = (agora: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);

/** "13/11/2026" */
export const dataBrDeIso = (iso: string): string => { const { y, mes, d } = partes(iso); return `${String(d).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${y}`; };

/** "13/11/2026 (SEXTA-FEIRA)" */
export const dataTituloDeIso = (iso: string): string => `${dataBrDeIso(iso)} (${DIAS_SEMANA[diaDaSemana(iso)]})`;

/** Nome do feriado na data (nacional, PE ou Recife), ou ''. */
export const feriadoEm = (iso: string): string => feriados(partes(iso).y)[iso] || '';

export type DecisaoEnvio = { enviar: true; data: string } | { enviar: false; data: string; motivo: string };

/**
 * Decide o envio automático do dia `hoje` (AAAA-MM-DD, Recife): manda a agenda de amanhã de domingo a quinta,
 * salvo quando amanhã é feriado (véspera de feriado). Sem IS agendadas, o e-mail sai do mesmo jeito.
 */
export const decidirEnvioAutomatico = (hoje: string): DecisaoEnvio => {
  const data = somarDias(hoje, 1);
  const dow = diaDaSemana(hoje);
  if (dow === 5 || dow === 6) return { enviar: false, data, motivo: 'Sexta e sábado não têm envio (a agenda seguinte é de fim de semana).' };
  const feriado = feriadoEm(data);
  if (feriado) return { enviar: false, data, motivo: `Véspera de feriado (${feriado}).` };
  return { enviar: true, data };
};

/** Assunto do e-mail: "IS AGENDADAS EM 13/11/2026". */
export const assuntoAgendaIS = (data: string): string => `IS AGENDADAS EM ${dataBrDeIso(data)}`;

/** Caminho do PDF no Storage: um arquivo por data (um reenvio substitui o anterior, sem duplicar). */
export const caminhoPdfAgendaIS = (data: string): string => `agendaIS/${data.slice(0, 4)}/IS_AGENDADAS_${data}.pdf`;

/** "HH:MM" de "AAAA-MM-DDThh:mm". */
export const horaDe = (dataEntrevista: string): string => String(dataEntrevista || '').slice(11, 16);

/** Só e-mails institucionais (@marinha.mil.br). */
export const ehInstitucional = (e: string): boolean => /^[^\s@]+@marinha\.mil\.br$/i.test(String(e || '').trim());

const emailOk = (e: string): boolean => /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(e);

export interface UsuarioParaEmail { perfil?: string; ativo?: boolean; email?: string; gmail?: string }

/**
 * Destinatários: PARA = caixa da JRS + institucionais (@marinha.mil.br) dos user_medicos e user_medicos_mpi;
 * CC = Gmail do Admin, user_medicos, user_medicos_mpi e user_secretaria. Só usuários ativos; sem repetir
 * (um endereço que já está no PARA não vai em cópia).
 */
export const destinatariosAgendaIS = (usuarios: UsuarioParaEmail[], caixaJrs: string): { para: string[]; cc: string[] } => {
  const ativos = usuarios.filter(u => u.ativo !== false);
  const norm = (e?: string) => String(e || '').trim().toLowerCase();
  const para = new Set([norm(caixaJrs)]);
  ativos.filter(u => u.perfil === 'user_medicos' || u.perfil === 'user_medicos_mpi')
    .map(u => norm(u.email)).filter(ehInstitucional).forEach(e => para.add(e));
  const cc = new Set<string>();
  ativos.filter(u => ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'].includes(String(u.perfil)))
    .map(u => norm(u.gmail)).filter(e => emailOk(e) && !para.has(e)).forEach(e => cc.add(e));
  return { para: [...para].filter(Boolean), cc: [...cc] };
};
