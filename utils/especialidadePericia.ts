// Ficheiro: utils/especialidadePericia.ts
// Especialidade médica da Perícia Menor, deduzida do CID (services/especialidadePericiaIA.ts classifica pela IA;
// esta tabela por capítulo do CID-10 é a reserva quando a IA falha e a referência dada a ela).
export const ESPECIALIDADES = [
  'Ortopedia', 'Clínica Médica', 'Psiquiatria', 'Gineco-Obstetrícia', 'Cirurgia Geral',
  'Cardiologia', 'Otorrino', 'Oftalmologia', 'Oncologia', 'Neurologia',
] as const;
export type Especialidade = typeof ESPECIALIDADES[number];

export const ehEspecialidade = (v: unknown): v is Especialidade => typeof v === 'string' && (ESPECIALIDADES as readonly string[]).includes(v);

/** Código do CID normalizado: "M54.5" / "m545" → "M545". */
export const normalizarCodigoCid = (c: string): string => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Código a partir do registro: cidCodigo ou o início do rótulo ("G432 - ..."). */
export const codigoCidDaPericia = (p: { cid?: string; cidCodigo?: string }): string =>
  normalizarCodigoCid(p.cidCodigo || (String(p.cid || '').match(/^\s*([A-Za-z]\d{2}(?:\.?\d)?)/)?.[1] ?? ''));

/** Especialidade provável pelo capítulo/agrupamento do CID-10 (reserva determinística). */
export const especialidadePorCapitulo = (codigo: string): Especialidade => {
  const c = normalizarCodigoCid(codigo);
  const l = c[0];
  const n = Number(c.slice(1, 3));
  if (!l || Number.isNaN(n)) return 'Clínica Médica';
  if (l === 'C' || (l === 'D' && n <= 48)) return 'Oncologia';
  if (l === 'F') return 'Psiquiatria';
  if (l === 'G') return 'Neurologia';
  if (l === 'H') return n <= 59 ? 'Oftalmologia' : 'Otorrino';
  if (l === 'I') return n >= 80 ? 'Cirurgia Geral' : 'Cardiologia';
  if (l === 'J') return n <= 39 ? 'Otorrino' : 'Clínica Médica';
  if (l === 'K') return (n >= 35 && n <= 46) || (n >= 60 && n <= 64) || (n >= 80 && n <= 87) ? 'Cirurgia Geral' : 'Clínica Médica';
  if (l === 'M') return 'Ortopedia';
  if (l === 'N') return n >= 70 && n <= 98 ? 'Gineco-Obstetrícia' : 'Clínica Médica';
  if (l === 'O') return 'Gineco-Obstetrícia';
  if (l === 'S' || l === 'T') {
    if (l === 'S' && n <= 9) return 'Neurologia';
    if (l === 'S' && (n === 5)) return 'Oftalmologia';
    if (l === 'S' && (n >= 20 && n <= 39)) return 'Cirurgia Geral';
    return 'Ortopedia';
  }
  if (l === 'R') {
    if (n === 51) return 'Neurologia';
    if (n >= 10 && n <= 19) return 'Cirurgia Geral';
    if (n === 0 || n === 7) return 'Cardiologia';
    return 'Clínica Médica';
  }
  return 'Clínica Médica';
};
