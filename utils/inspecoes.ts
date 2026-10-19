// Ficheiro: utils/inspecoes.ts
// Regras puras (sem Firebase) das Inspeções de Saúde: situações e status, prazo de atraso,
// slots de agendamento de 20 minutos e utilitários de data/hora. Datas viajam como texto
// ("AAAA-MM-DD" e "AAAA-MM-DDThh:mm", horário de Recife) — nada de fuso nem Date UTC.

// ---------------------------------------------------------------------------
// Situação e status
// ---------------------------------------------------------------------------

export type SituacaoIS = 'aberta' | 'andamento' | 'finalizada';

/** Status gravado. "Atrasada" não é gravado: é derivado (ver statusEfetivoIS). */
export type StatusIS =
  | 'aberta' | 'agendada' | 'reagendada' | 'faltou' | 'auditoria' | 'revisao_exofficio'
  | 'conclusao_pendente' | 'votacao_pendente' | 'assinaturas_pendentes' | 'tis_assinado' | 'cancelada';
export type StatusExibicaoIS = StatusIS | 'atrasada';

export type TomStatus = 'success' | 'danger' | 'attention' | 'neutral' | 'navy' | 'navyOutline' | 'muted';

export const STATUS_IS: Record<StatusExibicaoIS, { rotulo: string; situacao: SituacaoIS; tom: TomStatus }> = {
  aberta: { rotulo: 'Aberta', situacao: 'aberta', tom: 'navyOutline' },
  atrasada: { rotulo: 'Atrasada', situacao: 'aberta', tom: 'danger' },
  agendada: { rotulo: 'Agendada', situacao: 'andamento', tom: 'navy' },
  reagendada: { rotulo: 'Reagendada', situacao: 'andamento', tom: 'navy' },
  faltou: { rotulo: 'Faltou', situacao: 'andamento', tom: 'danger' },
  auditoria: { rotulo: 'Em auditoria', situacao: 'andamento', tom: 'attention' },
  revisao_exofficio: { rotulo: 'Em Revisão Ex-officio', situacao: 'andamento', tom: 'attention' },
  conclusao_pendente: { rotulo: 'Conclusão pendente', situacao: 'andamento', tom: 'attention' },
  votacao_pendente: { rotulo: 'Votação pendente', situacao: 'andamento', tom: 'attention' },
  assinaturas_pendentes: { rotulo: 'Assinaturas pendentes', situacao: 'andamento', tom: 'attention' },
  tis_assinado: { rotulo: 'TIS assinado', situacao: 'finalizada', tom: 'success' },
  cancelada: { rotulo: 'Cancelada', situacao: 'finalizada', tom: 'muted' },
};

export const SITUACOES_IS: { id: SituacaoIS; rotulo: string; plural: string }[] = [
  { id: 'aberta', rotulo: 'Aberta', plural: 'Abertas' },
  { id: 'andamento', rotulo: 'Em andamento', plural: 'Em andamento' },
  { id: 'finalizada', rotulo: 'Finalizada', plural: 'Finalizadas' },
];

/** Status que o usuário escolhe no menu suspenso (Atrasada é calculado; Cancelada vem da minuta de cancelamento). */
export const STATUS_ESCOLHIVEIS: StatusIS[] = [
  'aberta', 'agendada', 'reagendada', 'faltou', 'auditoria', 'revisao_exofficio',
  'conclusao_pendente', 'votacao_pendente', 'assinaturas_pendentes', 'tis_assinado',
];

export const situacaoDoStatus = (status: StatusIS): SituacaoIS => STATUS_IS[status].situacao;

export const PRAZO_ATRASO_DIAS = 7;
export const PRAZO_ATRASO_DIAS_BENEFICIOS = 60;
export const GRUPO_BENEFICIOS = 'Benefícios';
export const GRUPO_VERIFICACOES = 'Verificações e Términos';

export interface DadosPrazoIS {
  status: StatusIS;
  dataAbertura: string;
  dataEntrevista?: string;
  grupoFinalidade?: string;
}

export const prazoAtrasoDias = (grupoFinalidade?: string): number =>
  grupoFinalidade === GRUPO_BENEFICIOS ? PRAZO_ATRASO_DIAS_BENEFICIOS : PRAZO_ATRASO_DIAS;

/** Dias corridos entre duas datas "AAAA-MM-DD" (b − a). */
export const diasEntre = (a: string, b: string): number => {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
};

/** Dias desde a abertura até hoje. */
export const diasEmAberto = (dataAbertura: string, hoje: string = hojeISO()): number => Math.max(0, diasEntre(dataAbertura, hoje));

/** Aberta e sem entrevista agendada há mais de 7 dias (60 se a finalidade é do grupo Benefícios) = Atrasada. */
export const statusEfetivoIS = (is: DadosPrazoIS, hoje: string = hojeISO()): StatusExibicaoIS => {
  if (is.status === 'aberta' && !is.dataEntrevista && diasEmAberto(is.dataAbertura, hoje) > prazoAtrasoDias(is.grupoFinalidade)) return 'atrasada';
  return is.status;
};

// ---------------------------------------------------------------------------
// Datas
// ---------------------------------------------------------------------------

const dois = (n: number) => String(n).padStart(2, '0');

export const paraISO = (d: Date): string => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
export const hojeISO = (): string => paraISO(new Date());
/** Data local ao meio-dia (evita saltos de horário de verão). */
export const deISO = (iso: string): Date => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const somarDias = (iso: string, n: number): string => { const d = deISO(iso); d.setDate(d.getDate() + n); return paraISO(d); };
/** 0 = domingo … 6 = sábado. */
export const diaDaSemana = (iso: string): number => deISO(iso).getDay();
export const ehDiaUtil = (iso: string): boolean => { const d = diaDaSemana(iso); return d >= 1 && d <= 5; };
/** Segunda-feira da semana da data. */
export const inicioDaSemana = (iso: string): string => { const d = diaDaSemana(iso); return somarDias(iso, d === 0 ? -6 : 1 - d); };
export const inicioDoMes = (iso: string): string => `${iso.slice(0, 7)}-01`;

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const nomeMes = (iso: string): string => MESES[Number(iso.slice(5, 7)) - 1];
export const nomeDiaSemana = (iso: string): string => DIAS_SEMANA[diaDaSemana(iso)];
export const nomeDiaCurto = (iso: string): string => DIAS_CURTOS[diaDaSemana(iso)];

/** "2026-10-19" → "19/10/2026". */
export const dataBr = (iso: string | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
/** "2026-10-19T08:30" → "19/10/2026 08:30". */
export const dataHoraBr = (isoHora: string | undefined): string => {
  if (!isoHora) return '';
  const [d, h] = isoHora.split('T');
  return `${dataBr(d)}${h ? ` ${h.slice(0, 5)}` : ''}`;
};
export const dataDeEntrevista = (isoHora: string): string => isoHora.slice(0, 10);
export const horaDeEntrevista = (isoHora: string): string => isoHora.slice(11, 16);

// ---------------------------------------------------------------------------
// Slots de 20 minutos
// ---------------------------------------------------------------------------

export type Turno = 'manha' | 'tarde';
export const TURNOS: { id: Turno; rotulo: string; inicio: string; fim: string }[] = [
  { id: 'manha', rotulo: 'Manhã', inicio: '07:30', fim: '12:00' },
  { id: 'tarde', rotulo: 'Tarde', inicio: '13:00', fim: '17:00' },
];
export const DURACAO_SLOT_MIN = 20;

export const minutosDe = (hhmm: string): number => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const hhmmDe = (min: number): string => `${dois(Math.floor(min / 60))}:${dois(min % 60)}`;

/** Horários de início dos slots de um turno: o último slot precisa terminar até o fim do turno. */
export const slotsDoTurno = (turno: Turno): string[] => {
  const t = TURNOS.find(x => x.id === turno)!;
  const out: string[] = [];
  for (let m = minutosDe(t.inicio); m + DURACAO_SLOT_MIN <= minutosDe(t.fim); m += DURACAO_SLOT_MIN) out.push(hhmmDe(m));
  return out;
};

export const turnoDoSlot = (hhmm: string): Turno | null => {
  const m = minutosDe(hhmm);
  const t = TURNOS.find(x => m >= minutosDe(x.inicio) && m < minutosDe(x.fim));
  return t ? t.id : null;
};

/** Slot válido = início exato de um slot de 20 min dentro de um dos turnos. */
export const ehSlotValido = (hhmm: string): boolean => { const t = turnoDoSlot(hhmm); return !!t && slotsDoTurno(t).includes(hhmm); };

export const horaFimSlot = (hhmm: string): string => hhmmDe(minutosDe(hhmm) + DURACAO_SLOT_MIN);

// ---------------------------------------------------------------------------
// Agenda: configuração de turnos por perito e bloqueios
// ---------------------------------------------------------------------------

/** Dias úteis, 1 = segunda … 5 = sexta. */
export const DIAS_UTEIS = [1, 2, 3, 4, 5] as const;
export type TurnosDoDia = Partial<Record<Turno, boolean>>;
/** Turnos em que o perito atende, por dia da semana (chave "1".."5"). */
export type ConfigTurnosPerito = Partial<Record<string, TurnosDoDia>>;
export type ConfigAgenda = Record<string, ConfigTurnosPerito>;

/** Bloqueio da agenda. `hora` ausente = turno inteiro; `turno: 'dia'` = manhã e tarde. `peritoUid: '*'` = todos os peritos. */
export interface BloqueioAgenda {
  id: string;
  data: string;
  turno: Turno | 'dia';
  hora?: string;
  peritoUid: string;
  peritoNome?: string;
  motivo: string;
}

export const TODOS_PERITOS = '*';

export const bloqueioAtinge = (b: BloqueioAgenda, peritoUid: string, data: string, hhmm: string): boolean => {
  if (b.data !== data) return false;
  if (b.peritoUid !== TODOS_PERITOS && b.peritoUid !== peritoUid) return false;
  if (b.hora) return b.hora === hhmm;
  return b.turno === 'dia' || b.turno === turnoDoSlot(hhmm);
};

export const peritoAtendeNoTurno = (config: ConfigAgenda, peritoUid: string, data: string, turno: Turno): boolean =>
  !!config[peritoUid]?.[String(diaDaSemana(data))]?.[turno];

export type EstadoSlot = 'livre' | 'ocupado' | 'bloqueado' | 'fora' | 'nao_cabe';

/** Duração da entrevista (min) conforme o grupo da finalidade: Benefícios 60; Verificações e Términos 30; demais 20 (1 slot). */
export const duracaoDoGrupo = (grupo?: string): number => (grupo === GRUPO_BENEFICIOS ? 60 : grupo === GRUPO_VERIFICACOES ? 30 : DURACAO_SLOT_MIN);
export const duracaoDaIS = (is: { grupoFinalidade?: string }): number => duracaoDoGrupo(is.grupoFinalidade);

/** Horários de início dos slots de 20 min que a entrevista toca (30 min = 2 slots; 60 min = 3 slots). */
export const slotsCobertos = (hhmm: string, duracao: number): string[] =>
  Array.from({ length: Math.max(1, Math.ceil(duracao / DURACAO_SLOT_MIN)) }, (_, i) => hhmmDe(minutosDe(hhmm) + i * DURACAO_SLOT_MIN));

/** Hora em que a entrevista termina. */
export const horaFimEntrevista = (hhmm: string, duracao: number): string => hhmmDe(minutosDe(hhmm) + duracao);

/** A entrevista começa e termina dentro do mesmo turno (não atravessa o almoço nem passa das 17:00). */
export const cabeNoTurno = (hhmm: string, duracao: number): boolean => {
  const t = turnoDoSlot(hhmm);
  const turno = TURNOS.find(x => x.id === t);
  return !!turno && minutosDe(hhmm) + duracao <= minutosDe(turno.fim);
};

export const chaveSlot = (peritoUid: string, dataHora: string): string => `${peritoUid}__${dataHora.replace(':', '-')}`;

/** Chaves de todos os slots tocados por uma entrevista (AAAA-MM-DDThh:mm de início + duração). */
export const chavesOcupadas = (peritoUid: string, dataEntrevista: string, duracao: number): string[] =>
  slotsCobertos(dataEntrevista.slice(11, 16), duracao).map(h => chaveSlot(peritoUid, `${dataEntrevista.slice(0, 10)}T${h}`));

interface IsOcupante { id: string; peritoUid: string; dataEntrevista: string; status: string; grupoFinalidade?: string }
/** Slots ocupados por IS agendadas (ignora canceladas e, se informada, a IS `ignorarId`). */
export const ocupadosDe = (inspecoes: IsOcupante[], ignorarId?: string): Set<string> => {
  const s = new Set<string>();
  inspecoes.forEach(i => {
    if (i.id === ignorarId || !i.dataEntrevista || i.status === 'cancelada') return;
    chavesOcupadas(i.peritoUid, i.dataEntrevista, duracaoDaIS(i)).forEach(k => s.add(k));
  });
  return s;
};

// ---------------------------------------------------------------------------
// TIS
// ---------------------------------------------------------------------------

/** Três últimos dígitos do ano atual (2026 → "026"): primeira parte do Nº do TIS. */
export const prefixoAnoTis = (): string => String(new Date().getFullYear()).slice(-3);

/**
 * Máscara do Nº do TIS: AAA.000.N… — AAA = 3 últimos dígitos do ano atual; entre os pontos sempre 000;
 * depois do segundo ponto, 1 ou mais dígitos (ex.: 026.000.123). Quem digita informa só o final: o início
 * é preenchido. Uma colagem completa (com qualquer ano) também é aceita. `anterior` permite apagar até limpar.
 */
export const formatTis = (val: string | undefined | null, anterior: string = ''): string => {
  const texto = String(val || '');
  const d = texto.replace(/\D/g, '');
  if (!d) return '';
  const ano = prefixoAnoTis();
  // Apagando: ao chegar no prefixo fixo, limpa o campo.
  if (texto.length < anterior.length && d.length <= 6) return '';
  const sufixo = d.length >= 6 && d.slice(3, 6) === '000' ? d.slice(6) : d;
  return `${ano}.000.${sufixo.slice(0, 7)}`;
};

/** Nº do TIS válido: três dígitos, ".000." e 1 ou mais dígitos. */
export const tisValido = (val: string): boolean => /^\d{3}\.000\.\d+$/.test(val);
