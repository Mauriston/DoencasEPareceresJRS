// Ficheiro: utils/afastamentos.ts
// Regras puras da página Férias (férias e afastamentos dos usuários da JRS; testes em utils/__tests__/afastamentos.test.ts):
//  - data fim = início + duração − 1 (dias corridos);
//  - status automático: Gozada (fim antes de hoje), Em gozo (hoje entre início e fim); senão o escolhido
//    (Confirmada ou Programada);
//  - grupos da timeline: JRS (Admin e user_medicos), MPI (user_medicos_mpi) e Secretaria;
//  - médicos (Admin, user_medicos, user_medicos_mpi) geram bloqueio na agenda das IS; a Secretaria, não.

export type TipoAfastamento = 'ferias' | 'lts' | 'lic_adm';
export type StatusAfastamento = 'programada' | 'confirmada' | 'em_gozo' | 'gozada';
export type GrupoAfastamento = 'jrs' | 'mpi' | 'secretaria';

export const TIPOS_AFASTAMENTO: { id: TipoAfastamento; rotulo: string; curto: string }[] = [
  { id: 'ferias', rotulo: 'Férias', curto: 'Férias' },
  { id: 'lts', rotulo: 'LTS', curto: 'LTS' },
  { id: 'lic_adm', rotulo: 'LIC Adm (Licença Administrativa)', curto: 'LIC Adm' },
];

export const STATUS_AFASTAMENTO: { id: StatusAfastamento; rotulo: string; tom: 'success' | 'attention' | 'navy' | 'navyOutline' | 'muted' }[] = [
  { id: 'programada', rotulo: 'Programada', tom: 'navyOutline' },
  { id: 'confirmada', rotulo: 'Confirmada', tom: 'navy' },
  { id: 'em_gozo', rotulo: 'Em gozo', tom: 'attention' },
  { id: 'gozada', rotulo: 'Gozada', tom: 'muted' },
];

export const GRUPOS_AFASTAMENTO: { id: GrupoAfastamento; rotulo: string }[] = [
  { id: 'jrs', rotulo: 'JRS' },
  { id: 'mpi', rotulo: 'MPI' },
  { id: 'secretaria', rotulo: 'Secretaria' },
];

/** Perfis que têm férias/afastamentos e acessam a página (usuários da JRS). */
export const PERFIS_JRS = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'];
export const podeVerFerias = (perfil: string | undefined): boolean => PERFIS_JRS.includes(String(perfil || ''));

export const rotuloTipo = (t: TipoAfastamento | string): string => TIPOS_AFASTAMENTO.find(x => x.id === t)?.curto ?? String(t || '');
export const rotuloStatus = (s: StatusAfastamento | string): string => STATUS_AFASTAMENTO.find(x => x.id === s)?.rotulo ?? String(s || '');

export const grupoDoPerfil = (perfil: string | undefined): GrupoAfastamento =>
  perfil === 'user_medicos_mpi' ? 'mpi' : perfil === 'user_secretaria' ? 'secretaria' : 'jrs';

/** Médico (Admin, user_medicos, user_medicos_mpi): o afastamento bloqueia a agenda das IS. */
export const geraBloqueioNaAgenda = (perfil: string | undefined): boolean => ['admin', 'user_medicos', 'user_medicos_mpi'].includes(String(perfil || ''));

const partes = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? { y: Number(m[1]), mes: Number(m[2]), d: Number(m[3]) } : null;
};
export const dataValida = (iso: string): boolean => {
  const p = partes(iso);
  if (!p) return false;
  const dt = new Date(Date.UTC(p.y, p.mes - 1, p.d));
  return dt.getUTCMonth() === p.mes - 1 && dt.getUTCDate() === p.d;
};
export const somarDias = (iso: string, dias: number): string => {
  const p = partes(iso);
  if (!p) return '';
  return new Date(Date.UTC(p.y, p.mes - 1, p.d + dias)).toISOString().slice(0, 10);
};
/** Dias corridos entre duas datas (b − a). */
export const diasEntre = (a: string, b: string): number => {
  const pa = partes(a); const pb = partes(b);
  if (!pa || !pb) return 0;
  return Math.round((Date.UTC(pb.y, pb.mes - 1, pb.d) - Date.UTC(pa.y, pa.mes - 1, pa.d)) / 86_400_000);
};

/** Data fim (inclusive) = início + duração − 1; '' se inválida. */
export const dataFimDe = (inicio: string, duracaoDias: number): string =>
  dataValida(inicio) && Number.isInteger(duracaoDias) && duracaoDias >= 1 ? somarDias(inicio, duracaoDias - 1) : '';

export interface AfastamentoBase {
  dataInicio: string;
  dataFim: string;
  status: StatusAfastamento;
}

/** Status efetivo: Gozada se o fim já passou; Em gozo se hoje está no período; senão o escolhido (Confirmada/Programada). */
export const statusEfetivo = (a: AfastamentoBase, hoje: string): StatusAfastamento => {
  if (a.dataFim && a.dataFim < hoje) return 'gozada';
  if (a.dataInicio && a.dataInicio <= hoje && (!a.dataFim || hoje <= a.dataFim)) return 'em_gozo';
  return a.status === 'confirmada' ? 'confirmada' : 'programada';
};

/** Status a gravar na criação/edição: período passado já nasce Gozada; em curso, Em gozo; futuro, o escolhido. */
export const statusAoGravar = (a: AfastamentoBase, hoje: string): StatusAfastamento => statusEfetivo(a, hoje);

/** Título do evento no Google Agenda: "{usuário} - FÉRIAS 2026" / "- LTS" / "- LIC ADM (motivo)". */
export const tituloEventoAfastamento = (usuario: string, tipo: TipoAfastamento, referencia?: string, motivo?: string): string => {
  const base = tipo === 'ferias' ? `FÉRIAS${referencia ? ` ${referencia}` : ''}` : tipo === 'lts' ? 'LTS' : `LIC ADM${motivo ? ` (${motivo})` : ''}`;
  return `${usuario} - ${base}`;
};

// ---------------------------------------------------------------- Timeline (Gantt)

export interface JanelaTimeline { inicio: string; fim: string; meses: { chave: string; rotulo: string; inicio: string; dias: number }[] }

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

/** Janela de meses inteiros cobrindo [de, ate] (AAAA-MM-DD). */
export const janelaDeMeses = (de: string, ate: string): JanelaTimeline => {
  const a = partes(de) ?? partes(ate)!; const b = partes(ate) ?? a;
  const meses: JanelaTimeline['meses'] = [];
  let y = a.y; let m = a.mes;
  while (y < b.y || (y === b.y && m <= b.mes)) {
    const inicio = `${y}-${String(m).padStart(2, '0')}-01`;
    const dias = new Date(Date.UTC(y, m, 0)).getUTCDate();
    meses.push({ chave: `${y}-${m}`, rotulo: `${MESES[m - 1]}/${String(y).slice(2)}`, inicio, dias });
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  const ultimo = meses[meses.length - 1];
  return { inicio: meses[0].inicio, fim: somarDias(ultimo.inicio, ultimo.dias - 1), meses };
};

/** Filtro de período da página Férias: semestre (jan–jun / jul–dez) ou ano civil de hoje. */
export type PeriodoFerias = 'semestre' | 'ano';
export const PERIODOS_FERIAS: { id: PeriodoFerias; rotulo: string }[] = [
  { id: 'semestre', rotulo: 'Este semestre' },
  { id: 'ano', rotulo: 'Este ano' },
];
export const PERIODO_PADRAO: PeriodoFerias = 'ano';
export const intervaloDoPeriodo = (periodo: PeriodoFerias, hoje: string): { inicio: string; fim: string } => {
  const y = hoje.slice(0, 4);
  if (periodo === 'ano') return { inicio: `${y}-01-01`, fim: `${y}-12-31` };
  return Number(hoje.slice(5, 7)) <= 6 ? { inicio: `${y}-01-01`, fim: `${y}-06-30` } : { inicio: `${y}-07-01`, fim: `${y}-12-31` };
};
/** O afastamento toca o período (basta um dia em comum). */
export const tocaPeriodo = (a: { dataInicio: string; dataFim: string }, p: { inicio: string; fim: string }): boolean =>
  a.dataInicio <= p.fim && a.dataFim >= p.inicio;

/** Escalas da Timeline: meses mostrados antes e depois de hoje (hoje sempre no meio). */
export const ESCALAS_TIMELINE = [
  { id: 'bimestral', rotulo: 'Bimestral', mesesCadaLado: 1 },
  { id: 'quadrimestral', rotulo: 'Quadrimestral', mesesCadaLado: 2 },
  { id: 'semestral', rotulo: 'Semestral', mesesCadaLado: 3 },
  { id: 'anual', rotulo: 'Anual', mesesCadaLado: 6 },
] as const;
export type EscalaTimeline = typeof ESCALAS_TIMELINE[number]['id'];
export const ESCALA_PADRAO: EscalaTimeline = 'quadrimestral';

/** Mesma data N meses adiante/atrás (dia ajustado ao fim do mês quando não existe, ex.: 31/03 − 1 mês = 28/02). */
const somarMeses = (iso: string, n: number): string => {
  const p = partes(iso)!;
  const alvo = new Date(Date.UTC(p.y, p.mes - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), Math.min(p.d, ultimo))).toISOString().slice(0, 10);
};

/**
 * Janela centrada em hoje: de (hoje − N meses) a (hoje + N meses). Os meses das pontas entram cortados
 * (só os dias dentro da janela), para que a linha de hoje fique no meio.
 */
export const janelaCentrada = (hoje: string, mesesCadaLado: number): JanelaTimeline => {
  const inicio = somarMeses(hoje, -mesesCadaLado);
  const fim = somarMeses(hoje, mesesCadaLado);
  const inteiros = janelaDeMeses(inicio, fim);
  const meses = inteiros.meses.map(m => {
    const fimMes = somarDias(m.inicio, m.dias - 1);
    const de = m.inicio < inicio ? inicio : m.inicio;
    const ate = fimMes > fim ? fim : fimMes;
    return { ...m, inicio: de, dias: diasEntre(de, ate) + 1 };
  });
  return { inicio, fim, meses };
};

/** Posição da barra na janela, em % (esquerda e largura), cortada nas bordas; null se fora da janela. */
export const posicaoNaJanela = (j: Pick<JanelaTimeline, 'inicio' | 'fim'>, inicio: string, fim: string): { esquerda: number; largura: number } | null => {
  if (fim < j.inicio || inicio > j.fim) return null;
  const total = diasEntre(j.inicio, j.fim) + 1;
  const ini = inicio < j.inicio ? j.inicio : inicio;
  const fi = fim > j.fim ? j.fim : fim;
  return { esquerda: (diasEntre(j.inicio, ini) / total) * 100, largura: ((diasEntre(ini, fi) + 1) / total) * 100 };
};
