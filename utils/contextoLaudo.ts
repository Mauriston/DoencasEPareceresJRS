// Ficheiro: utils/contextoLaudo.ts
// Contexto da IS para validar o laudo (utils/validacaoLaudo.ts), derivado do cadastro do inspecionado e do
// histórico de IS lançadas no app (inclusive as de outras juntas). Regras puras, testadas em
// utils/__tests__/contextoLaudo.test.ts:
//  - tipo de serviço: carreira; temporário Marinheiro-recruta (MN-RC) ou GM/2T médico (RM2-Md) → SMI; demais
//    temporários → SMV; dependente/pensionista/inativo → outro;
//  - cadeia de LTS: soma das LTS do histórico desde o último laudo de aptidão (plena OU com restrições quebram a
//    cadeia). Agregação (só carreira): a partir de 365 dias de LTS ininterrupta; o tempo de agregação é o excedente;
//  - restrições acumuladas: restrições + LTS alternadas desde a última aptidão plena (meses ≈ dias/30);
//  - LTS anterior: a IS mais recente do histórico é de incapacidade temporária; o término vem dos afastamentos
//    calculados (utils/afastamentosIS.ts) ou da data do laudo + dias; "apresentado no prazo" compara com a
//    abertura da IS atual;
//  - AO: ainda sem registro no app → sempre "sem_registro" (as verificações de AO viram alerta de conferência).
// Sem histórico, os campos ficam null ("sem dado").
import { somarDias } from './afastamentos';
import type { TipoServico } from './validacaoLaudo';

export interface CadastroContexto {
  tipo?: 'militar' | 'dependente' | 'pensionista';
  temporario?: boolean;
  rm1?: boolean;
  refo?: boolean;
  /** P/G/Q, ex.: "MN-RC", "2T (RM2-Md)". */
  pgq?: string;
}

export interface ISHistorico {
  is: number;
  dataLaudo?: string;
  laudo?: string;
  afastamentos?: { tipo: 'lts' | 'restricoes'; dias: number; dataTermino: string }[];
}

export interface ISAtualContexto { is: number; dataAbertura?: string; dataEntrevista?: string }

export interface ContextoLaudo {
  /** VinculoFinalidade do app ('Carreira' | 'Temporário' | 'Inativo' | 'Pensionista' | 'Dependente'). */
  vinculo: string;
  tipoServico: TipoServico;
  historicoDisponivel: boolean;
  ltsAnterior: boolean | null;
  ltsAnteriorTermino: string | null;
  apresentadoNoPrazo: boolean | null;
  ltsIninterruptaDias: number | null;
  agregado: boolean | null;
  tempoAgregacaoDias: number | null;
  restricoesAcumuladasMeses: number | null;
  ao: 'sem_registro';
}

export const vinculoDoCadastro = (m: CadastroContexto | null | undefined): string => {
  if (!m) return '';
  if (m.tipo === 'dependente') return 'Dependente';
  if (m.tipo === 'pensionista') return 'Pensionista';
  return m.temporario ? 'Temporário' : (m.rm1 || m.refo) ? 'Inativo' : 'Carreira';
};

export const tipoServicoDoCadastro = (m: CadastroContexto | null | undefined): TipoServico => {
  const v = vinculoDoCadastro(m);
  if (v === 'Carreira') return 'carreira';
  if (v !== 'Temporário') return 'outro';
  const pgq = String(m?.pgq || '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (/^MN-RC\b/.test(pgq) || /RECRUTA/.test(pgq)) return 'SMI';
  if (/^(GM|2T)\b/.test(pgq) && /\((?:RM\d-)?MD\)/.test(pgq)) return 'SMI';
  return 'SMV';
};

const norm = (t: string) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Episodio = { tipo: 'lts' | 'restricoes' | 'apto' | 'outro'; dias: number; termino: string | null; data: string };

const diasDoTexto = (t: string): number => {
  const d = t.match(/(\d+)\s*\(?[a-z ]*\)?\s*dias/);
  if (d) return Number(d[1]);
  const m = t.match(/(\d+)\s*mes(es)?/);
  return m ? Number(m[1]) * 30 : 0;
};

/** Classifica o laudo de uma IS do histórico. */
export const episodioDaIS = (i: ISHistorico): Episodio | null => {
  const t = norm(i.laudo || '');
  const data = i.dataLaudo || '';
  if (!t.trim() || !data) return null;
  const lts = (i.afastamentos || []).filter(a => a.tipo === 'lts');
  const rest = (i.afastamentos || []).filter(a => a.tipo === 'restricoes');
  const ultimo = (l: { dataTermino: string }[]) => l.map(a => a.dataTermino).sort().pop() || null;
  if (/incapaz\w*\s+temporariamente|continua\s+incapaz|incapaz b-?1|incapaz b-?2/.test(t)) {
    const dias = lts.length ? lts.reduce((s, a) => s + a.dias, 0) : diasDoTexto(t);
    return { tipo: 'lts', dias, termino: ultimo(lts) || (dias ? somarDias(data, dias - 1) : null), data };
  }
  if (/incapaz\w*\s+definitiv/.test(t) && !/apto/.test(t)) return { tipo: 'outro', dias: 0, termino: null, data };
  if (/\bapto\b|\bapta\b|apto a\b/.test(t)) {
    if (/restri/.test(t)) {
      const dias = rest.length ? rest.reduce((s, a) => s + a.dias, 0) : diasDoTexto(t);
      return { tipo: 'restricoes', dias, termino: ultimo(rest), data };
    }
    return { tipo: 'apto', dias: 0, termino: null, data };
  }
  return { tipo: 'outro', dias: 0, termino: null, data };
};

export const derivarContexto = (cadastro: CadastroContexto | null | undefined, historico: ISHistorico[], atual: ISAtualContexto): ContextoLaudo => {
  const vinculo = vinculoDoCadastro(cadastro);
  const tipoServico = tipoServicoDoCadastro(cadastro);
  const ref = atual.dataAbertura || (atual.dataEntrevista || '').slice(0, 10);
  const anteriores = historico
    .filter(i => i.is !== atual.is && (!ref || !i.dataLaudo || i.dataLaudo <= ref || i.is < atual.is))
    .map(episodioDaIS).filter((e): e is Episodio => !!e && e.tipo !== 'outro')
    .sort((a, b) => a.data.localeCompare(b.data));
  const vazio: ContextoLaudo = {
    vinculo, tipoServico, historicoDisponivel: false, ltsAnterior: null, ltsAnteriorTermino: null, apresentadoNoPrazo: null,
    ltsIninterruptaDias: null, agregado: null, tempoAgregacaoDias: tipoServico === 'carreira' ? null : 0, restricoesAcumuladasMeses: null, ao: 'sem_registro',
  };
  if (!anteriores.length) return vazio;
  let cadeiaLts = 0; let acumRest = 0;
  for (const e of anteriores) {
    if (e.tipo === 'lts') { cadeiaLts += e.dias; acumRest += e.dias; } else if (e.tipo === 'restricoes') { cadeiaLts = 0; acumRest += e.dias; } else { cadeiaLts = 0; acumRest = 0; }
  }
  const ultimo = anteriores[anteriores.length - 1];
  const ltsAnterior = ultimo.tipo === 'lts';
  const termino = ltsAnterior ? ultimo.termino : null;
  const carreira = tipoServico === 'carreira';
  return {
    ...vazio,
    historicoDisponivel: true,
    ltsAnterior,
    ltsAnteriorTermino: termino,
    apresentadoNoPrazo: ltsAnterior && termino && ref ? ref <= termino : null,
    ltsIninterruptaDias: cadeiaLts,
    agregado: carreira ? cadeiaLts >= 365 : false,
    tempoAgregacaoDias: carreira ? Math.max(0, cadeiaLts - 365) : 0,
    restricoesAcumuladasMeses: Math.floor(acumRest / 30),
  };
};
