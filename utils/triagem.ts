// Ficheiro: utils/triagem.ts
// Triagem da IS de concurso (lançada pelo user_medicos_mpi a partir do "TRIAR"
// da tabela): máscaras dos campos, cálculo do IMC e alertas de possível
// inaptidão. Os alertas só aparecem no formulário de triagem; na barra lateral
// os valores que os motivaram ficam em vermelho.

export interface TriagemAlteracao {
  alterado: boolean;
  texto: string;
}

export interface TriagemDados {
  /** Altura em metros com vírgula, ex.: "1,75". */
  altura: string;
  /** kg, 2 ou 3 dígitos. */
  peso: string;
  /** mmHg / bpm, 2 ou 3 dígitos. */
  pas: string;
  pad: string;
  fc: string;
  /** Só o denominador do Snellen (20/xxx), 2 ou 3 dígitos. */
  snellenSC: string;
  /** Opcional (em branco = não aferido). */
  snellenCC: string;
  /** Erros no Ishihara (0 a 15). */
  ishiharaErros: string;
  entrevista: TriagemAlteracao;
  exameClinico: TriagemAlteracao;
  exames: TriagemAlteracao;
}

export interface TriagemRecord extends TriagemDados {
  atualizadoEm: string;
  atualizadoPor: string;
}

export const ISHIHARA_PLACAS = 15;

export const TRIAGEM_VAZIA: TriagemDados = {
  altura: '', peso: '', pas: '', pad: '', fc: '', snellenSC: '', snellenCC: '', ishiharaErros: '',
  entrevista: { alterado: false, texto: '' },
  exameClinico: { alterado: false, texto: '' },
  exames: { alterado: false, texto: '' },
};

const digitos = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

/** Altura com vírgula automática: "175" → "1,75". */
export const mascaraAltura = (v: string): string => {
  const d = digitos(v, 3);
  return d.length <= 1 ? d : `${d[0]},${d.slice(1)}`;
};
export const mascaraInteiro3 = (v: string) => digitos(v, 3);
export const mascaraIshihara = (v: string): string => {
  const d = digitos(v, 2);
  return d && Number(d) > ISHIHARA_PLACAS ? String(ISHIHARA_PLACAS) : d;
};

const num = (v: string): number | null => {
  const n = Number(String(v).replace(',', '.'));
  return v !== '' && Number.isFinite(n) ? n : null;
};

/** IMC com 1 casa decimal (kg/m²), ou null se faltar peso/altura. */
export const calcularImc = (t: Pick<TriagemDados, 'altura' | 'peso'>): number | null => {
  const a = num(t.altura);
  const p = num(t.peso);
  if (!a || !p || a < 0.5) return null;
  return Math.round((p / (a * a)) * 10) / 10;
};

export const formatarDecimal = (n: number | null): string => (n == null ? '' : n.toFixed(1).replace('.', ','));

export type CampoTriagem = 'altura' | 'imc' | 'pas' | 'pad' | 'fc' | 'snellenSC' | 'snellenCC' | 'ishiharaErros';

export interface AlertaTriagem {
  campo: CampoTriagem;
  mensagem: string;
}

export const alertasDaTriagem = (t: TriagemDados): AlertaTriagem[] => {
  const alertas: AlertaTriagem[] = [];
  const altura = num(t.altura);
  const imc = calcularImc(t);
  const pas = num(t.pas);
  const pad = num(t.pad);
  const fc = num(t.fc);
  const sc = num(t.snellenSC);
  const cc = num(t.snellenCC);
  const erros = num(t.ishiharaErros);

  if (altura != null && t.altura.length === 4 && altura < 1.54) {
    alertas.push({ campo: 'altura', mensagem: 'Altura abaixo de 1,54 m: alterar o status para INAPTO pelo CID R62.8.' });
  }
  if (imc != null && imc < 18) alertas.push({ campo: 'imc', mensagem: `IMC ${formatarDecimal(imc)} (< 18): alterar o status para INAPTO pelo CID R62.8.` });
  if (imc != null && imc > 30) alertas.push({ campo: 'imc', mensagem: `IMC ${formatarDecimal(imc)} (> 30): alterar o status para INAPTO pelo CID E66.9.` });
  if (pas != null && pas > 140) alertas.push({ campo: 'pas', mensagem: 'PAS > 140 mmHg: repetir a aferição em 15 min. Se mantiver, inaptidão pelo CID R03.0.' });
  if (pad != null && pad > 100) alertas.push({ campo: 'pad', mensagem: 'PAD > 100 mmHg: repetir a aferição em 15 min. Se mantiver, inaptidão pelo CID R03.1.' });
  if (fc != null && fc > 120) alertas.push({ campo: 'fc', mensagem: 'FC > 120 bpm: repetir a aferição em 15 min. Se mantiver, inaptidão pelo CID R00.0.' });
  // Acuidade pior que 20/100 = denominador maior que 100.
  if (sc != null && sc > 100) alertas.push({ campo: 'snellenSC', mensagem: `Snellen S/C 20/${t.snellenSC} (< 20/100): possível inaptidão pelo CID H52.7, a depender do concurso.` });
  if (cc != null && cc !== 20) alertas.push({ campo: 'snellenCC', mensagem: `Snellen C/C 20/${t.snellenCC}: alterar o status para INAPTO pelo CID H52.7.` });
  if (erros != null && erros >= 5) alertas.push({ campo: 'ishiharaErros', mensagem: `Ishihara com ${t.ishiharaErros} erros (≥ 5): alterar o status para INAPTO pelo CID H53.5.` });
  return alertas;
};

export const ALTERACOES: { chave: 'entrevista' | 'exameClinico' | 'exames'; rotulo: string }[] = [
  { chave: 'entrevista', rotulo: 'Entrevista' },
  { chave: 'exameClinico', rotulo: 'Exame clínico' },
  { chave: 'exames', rotulo: 'Exames' },
];

/** Badge do "TRIADO": alertas + alterações descritas (entrevista, exame clínico, exames). */
export const pendenciasDaTriagem = (t: TriagemDados): number =>
  alertasDaTriagem(t).length + ALTERACOES.filter(a => t[a.chave].alterado && t[a.chave].texto.trim()).length;

/** Erros de preenchimento (campo → mensagem); vazio = pode salvar. */
export const validarTriagem = (t: TriagemDados): Partial<Record<keyof TriagemDados, string>> => {
  const e: Partial<Record<keyof TriagemDados, string>> = {};
  if (!/^\d,\d{2}$/.test(t.altura)) e.altura = 'Informe a altura (ex.: 1,75).';
  for (const k of ['peso', 'pas', 'pad', 'fc'] as const) {
    if (!/^\d{2,3}$/.test(t[k])) e[k] = 'Use 2 ou 3 dígitos.';
  }
  if (!/^\d{2,3}$/.test(t.snellenSC)) e.snellenSC = 'Informe 20/xx ou 20/xxx.';
  if (t.snellenCC && !/^\d{2,3}$/.test(t.snellenCC)) e.snellenCC = 'Informe 20/xx ou 20/xxx, ou deixe em branco.';
  if (!/^\d{1,2}$/.test(t.ishiharaErros) || Number(t.ishiharaErros) > ISHIHARA_PLACAS) e.ishiharaErros = 'De 0 a 15.';
  for (const a of ALTERACOES) {
    if (t[a.chave].alterado && !t[a.chave].texto.trim()) e[a.chave] = 'Descreva a alteração.';
  }
  return e;
};

/** Normaliza o que vem do Firestore (campos ausentes viram vazio). */
export const lerTriagem = (x: any): TriagemRecord | null => {
  if (!x || typeof x !== 'object') return null;
  const alt = (a: any): TriagemAlteracao => ({ alterado: !!a?.alterado, texto: String(a?.texto || '') });
  const s = (v: any) => (v == null ? '' : String(v));
  return {
    altura: s(x.altura), peso: s(x.peso), pas: s(x.pas), pad: s(x.pad), fc: s(x.fc),
    snellenSC: s(x.snellenSC), snellenCC: s(x.snellenCC), ishiharaErros: s(x.ishiharaErros),
    entrevista: alt(x.entrevista), exameClinico: alt(x.exameClinico), exames: alt(x.exames),
    atualizadoEm: s(x.atualizadoEm), atualizadoPor: s(x.atualizadoPor),
  };
};
