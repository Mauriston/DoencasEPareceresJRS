// Ficheiro: services/fichaDados.ts
// Consultas e contas da Ficha do inspecionado (components/ficha/FichaInspecionado.tsx), aba "Inspeções de Saúde":
//  - observarExamesDasInspecoes: os PDFs enviados nas IS do inspecionado (subcoleção inspecoes/{id}/exames), um
//    ouvinte por IS — leitura limitada às IS da pessoa, nunca a coleção inteira (MF2). O campo `categoria`
//    ('exame' | 'atestado') é opcional: ausente = 'exame' (documentos enviados antes de existir a separação).
//  - periodosDasIS / resumoIS / faixa12MesesIS: dias de LTS e de restrições tirados do laudo da IS
//    ("…necessitando de 30 dias de LTS", "Apto com restrições por 90 dias"), contados a partir da data do laudo.
//  - cidsDasIS: CID registrados nas IS (campo opcional `cid`, "descrição abreviatura").
// As funções puras são testadas em services/__tests__/fichaDados.test.ts.
import { getFirestore, collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app } from './firebaseAuth';
import { getDriveEmbedUrl, isGoogleDriveUrl } from '../utils/googleDrive';

// ---------- Exames e atestados enviados nas IS ----------

export type CategoriaExameFicha = 'exame' | 'atestado';

export interface ExameFicha {
  id: string;
  isId: string;
  /** Nº da IS (para o rótulo). */
  is: number;
  /** Caminho no Storage: inspecoes/{isId}/exames/{id}.pdf */
  caminho: string;
  nomeArquivo: string;
  /** Título do 1º documento lido pela IA (ou o nome do arquivo). */
  titulo: string;
  /** AAAA-MM-DD do documento (ou ''). */
  data: string;
  categoria: CategoriaExameFicha;
  enviadoEm: number;
}

interface ExameBruto {
  caminho?: string;
  nomeArquivo?: string;
  categoria?: string;
  itens?: { titulo?: string; data?: string; tipo?: string }[];
  enviadoEm?: Timestamp | null;
}

/** Categoria do exame gravado: 'atestado' só quando marcado assim; ausente/desconhecido = 'exame'. */
export const categoriaDoExame = (e: { categoria?: unknown }): CategoriaExameFicha => (e.categoria === 'atestado' ? 'atestado' : 'exame');

export const exameDaFicha = (isId: string, is: number, id: string, d: ExameBruto): ExameFicha => {
  const item = (d.itens ?? [])[0];
  return {
    id, isId, is,
    caminho: d.caminho || '',
    nomeArquivo: d.nomeArquivo || '',
    titulo: (item?.titulo || '').trim() || d.nomeArquivo || 'Documento',
    data: (item?.data || '').slice(0, 10),
    categoria: categoriaDoExame(d),
    enviadoEm: d.enviadoEm?.toMillis?.() ?? 0,
  };
};

/**
 * Exames de todas as IS informadas (um ouvinte por IS). Devolve a lista única, do mais recente para o mais
 * antigo. IS sem permissão de leitura (firestore.rules: só a equipe) simplesmente não contribuem.
 */
export const observarExamesDasInspecoes = (
  inspecoes: ReadonlyArray<{ id: string; is: number }>,
  onData: (lista: ExameFicha[]) => void,
): (() => void) => {
  const db = getFirestore(app);
  const porIs = new Map<string, ExameFicha[]>();
  const emitir = () => onData([...porIs.values()].flat().sort((a, b) => (b.data || '').localeCompare(a.data || '') || b.enviadoEm - a.enviadoEm));
  if (inspecoes.length === 0) { onData([]); return () => { /* nada a cancelar */ }; }
  const cancelar = inspecoes.map(i => onSnapshot(
    collection(db, 'inspecoes', i.id, 'exames'),
    snap => { porIs.set(i.id, snap.docs.map(d => exameDaFicha(i.id, i.is, d.id, d.data() as ExameBruto))); emitir(); },
    () => { porIs.set(i.id, []); emitir(); },
  ));
  return () => cancelar.forEach(c => c());
};

/** URL de download do PDF de um exame (caminho no Storage), para o modal em tela cheia. */
export const urlDoArquivoFicha = (caminho: string): Promise<string> => getDownloadURL(ref(getStorage(app), caminho));

/** URL para o iframe do modal: link do Drive vira o preview embutido; os demais passam direto. */
export const urlParaModal = (url: string): string => (isGoogleDriveUrl(url) ? getDriveEmbedUrl(url) || url : url);

// ---------- Períodos de LTS e de restrições das IS ----------

export type TipoPeriodoIS = 'lts' | 'restricoes';

export interface PeriodoIS {
  isId: string;
  tipo: TipoPeriodoIS;
  /** AAAA-MM-DD (data do laudo; sem laudo, a da entrevista). */
  inicio: string;
  /** AAAA-MM-DD, inclusive. */
  fim: string;
  dias: number;
}

interface ISParaPeriodo {
  id: string;
  laudo?: string;
  dataLaudo?: string;
  dataEntrevista?: string;
  dataAbertura?: string;
  status?: string;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tipo e dias do laudo: "…necessitando de 30 dias de LTS" → LTS 30; "Apto com restrições por 90 dias" → restrições 90. */
export const periodoDoLaudo = (laudo: string | undefined): { tipo: TipoPeriodoIS; dias: number } | null => {
  const l = semAcento(laudo || '');
  // "30 dias" ou "30 (trinta) dias".
  const m = /(\d{1,4})\s*(?:\([a-z\s]+\)\s*)?dias?\b/.exec(l);
  const dias = m ? Number(m[1]) : 0;
  if (!dias) return null;
  if (/\brestri/.test(l)) return { tipo: 'restricoes', dias };
  if (/\blts\b|licenca para tratamento|incapaz\s+temporari/.test(l)) return { tipo: 'lts', dias };
  return null;
};

/** AAAA-MM-DD + n dias. */
export const somarDiasISO = (iso: string, n: number): string => {
  const [a, m, d] = iso.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
};

/** Períodos de LTS/restrições das IS (ignora as canceladas e as sem laudo com prazo), do mais recente ao mais antigo. */
export const periodosDasIS = (lista: ReadonlyArray<ISParaPeriodo>): PeriodoIS[] => lista
  .filter(i => i.status !== 'cancelada')
  .flatMap(i => {
    const p = periodoDoLaudo(i.laudo);
    const inicio = (i.dataLaudo || i.dataEntrevista || '').slice(0, 10);
    if (!p || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return [];
    return [{ isId: i.id, tipo: p.tipo, inicio, fim: somarDiasISO(inicio, p.dias - 1), dias: p.dias }];
  })
  .sort((a, b) => b.inicio.localeCompare(a.inicio));

export interface ResumoIS {
  ano: number;
  /** IS abertas no ano corrente (canceladas não contam). */
  isNoAno: number;
  isTotal: number;
  lts: { ano: number; total: number };
  restricoes: { ano: number; total: number };
}

/** Dias de um período que caem no ano `ano`. */
const diasNoAno = (p: PeriodoIS, ano: number): number => {
  const ini = p.inicio > `${ano}-01-01` ? p.inicio : `${ano}-01-01`;
  const fim = p.fim < `${ano}-12-31` ? p.fim : `${ano}-12-31`;
  if (fim < ini) return 0;
  const [ya, ma, da] = ini.split('-').map(Number);
  const [yb, mb, db] = fim.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000) + 1;
};

export const resumoIS = (lista: ReadonlyArray<ISParaPeriodo>, hoje: string): ResumoIS => {
  const ano = Number(hoje.slice(0, 4));
  const validas = lista.filter(i => i.status !== 'cancelada');
  const periodos = periodosDasIS(validas);
  const soma = (tipo: TipoPeriodoIS) => {
    const ps = periodos.filter(p => p.tipo === tipo);
    return { ano: ps.reduce((s, p) => s + diasNoAno(p, ano), 0), total: ps.reduce((s, p) => s + p.dias, 0) };
  };
  return {
    ano,
    isNoAno: validas.filter(i => (i.dataAbertura || '').startsWith(String(ano))).length,
    isTotal: validas.length,
    lts: soma('lts'),
    restricoes: soma('restricoes'),
  };
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface MesFaixaIS { chave: string; rotulo: string; tipo: TipoPeriodoIS | null }

/** Os 12 meses até o atual, marcando os que têm LTS (prioridade) ou restrições. */
export const faixa12MesesIS = (periodos: ReadonlyArray<PeriodoIS>, hoje: string): MesFaixaIS[] => {
  const [a, m] = hoje.split('-').map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (11 - i), 1));
    const ano = d.getUTCFullYear(); const mes = d.getUTCMonth() + 1;
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
    const inicio = `${chave}-01`;
    const fim = `${chave}-${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, '0')}`;
    const tipos = periodos.filter(p => p.inicio <= fim && p.fim >= inicio).map(p => p.tipo);
    return { chave, rotulo: MESES[mes - 1], tipo: tipos.includes('lts') ? 'lts' : tipos.includes('restricoes') ? 'restricoes' : null };
  });
};

// ---------- CID das IS ----------

export interface CidIS { chave: string; texto: string; n: number }

/** CID registrados nas IS (campo opcional `cid`; aceita vários separados por ";" ou quebra de linha), por frequência. */
export const cidsDasIS = (lista: ReadonlyArray<{ cid?: unknown }>): CidIS[] => {
  const mapa = new Map<string, CidIS>();
  for (const i of lista) {
    const bruto = Array.isArray(i.cid) ? i.cid.join(';') : typeof i.cid === 'string' ? i.cid : '';
    for (const t of bruto.split(/\s*[;\n]\s*/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean)) {
      const chave = semAcento(t);
      const atual = mapa.get(chave);
      if (atual) atual.n++;
      else mapa.set(chave, { chave, texto: t, n: 1 });
    }
  }
  return [...mapa.values()].sort((x, y) => y.n - x.n || x.texto.localeCompare(y.texto, 'pt-BR'));
};
