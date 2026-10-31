// Ficheiro: utils/dados.ts
// Helpers puros das convenções de dados (docs/database.md, seção 19): strings, NIP, booleanos,
// datas civis, timestamps com fuso America/Recife, inteiros e ids internos. Sem dependência de
// Firebase/DOM, para valer no frontend, nos testes e no server.ts.

export const FUSO_PADRAO = 'America/Recife';

// ---------- Strings ----------

/** `trim` + espaços internos repetidos viram um só. Não-string vira ''. */
export const normalizarTexto = (v: unknown): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v == null ? '' : String(v).replace(/\s+/g, ' ').trim();

/** Forma canônica para comparar/chaves: sem acento, minúscula, espaços normalizados. */
export const formaCanonica = (v: unknown): string =>
  normalizarTexto(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Rótulo (preserva acentos/caixa, só higieniza espaços) + forma canônica para relações e busca. */
export const rotuloECanonico = (v: unknown): { rotulo: string; canonico: string } =>
  ({ rotulo: normalizarTexto(v), canonico: formaCanonica(v) });

// ---------- NIP (texto, só dígitos) ----------

/**
 * NIP como texto só com dígitos, preservando zeros à esquerda. Aceita "12.3456.78", " 12345678 "
 * ou número legado (zeros perdidos são refeitos até 8 dígitos). Não valida o tamanho.
 */
export const normalizarNip = (v: unknown): string => {
  if (typeof v === 'number' && Number.isInteger(v) && v >= 0) {
    const s = String(v);
    return s.length < 8 ? s.padStart(8, '0') : s;
  }
  return typeof v === 'string' ? v.replace(/\D/g, '') : '';
};

export const nipValido = (v: unknown): boolean => normalizarNip(v).length === 8;

/** "12345678" -> "12.3456.78"; devolve o texto original se não tiver 8 dígitos. */
export const formatarNip = (v: unknown): string => {
  const d = normalizarNip(v);
  return d.length === 8 ? `${d.slice(0, 2)}.${d.slice(2, 6)}.${d.slice(6)}` : normalizarTexto(v);
};

// ---------- Booleanos ----------

const VERDADEIROS = new Set(['sim', 's', 'true', 'verdadeiro', 'v', '1', 'yes', 'y']);
const FALSOS = new Set(['nao', 'n', 'false', 'falso', 'f', '0', 'no', '']);

/** Leitura tolerante de dados legados (SIM/TRUE/VERDADEIRO/1...). `null` se não reconhecer. */
export const lerBooleano = (v: unknown): boolean | null => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1 ? true : v === 0 ? false : null;
  if (v == null) return false;
  const c = formaCanonica(v);
  if (VERDADEIROS.has(c)) return true;
  if (FALSOS.has(c)) return false;
  return null;
};

/** Como `lerBooleano`, mas sempre devolve boolean (valor não reconhecido -> `padrao`). Use ao gravar. */
export const comoBooleano = (v: unknown, padrao = false): boolean => lerBooleano(v) ?? padrao;

// ---------- Datas civis e timestamps (America/Recife) ----------

const pad = (n: number, t = 2) => String(n).padStart(t, '0');

const diaValido = (a: number, m: number, d: number): boolean => {
  if (m < 1 || m > 12 || d < 1 || a < 1000 || a > 9999) return false;
  return d <= new Date(Date.UTC(a, m, 0)).getUTCDate();
};

/** Partes de calendário/relógio de um instante, no fuso pedido. */
const partesNoFuso = (instante: Date, fuso: string) => {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, number> = {};
  f.formatToParts(instante).forEach(x => { if (x.type !== 'literal') p[x.type] = Number(x.value); });
  return p;
};

/** Deslocamento do fuso em minutos para um instante (ex.: -180 para Recife). */
const deslocamentoMin = (instante: Date, fuso: string): number => {
  const p = partesNoFuso(instante, fuso);
  const comoUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((comoUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60000);
};

const sufixoOffset = (min: number): string => {
  const sinal = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  return `${sinal}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
};

/** Instante a partir de relógio local no fuso (sem depender de `new Date(string)`). */
const instanteLocal = (a: number, m: number, d: number, h: number, mi: number, s: number, fuso: string): Date => {
  const naive = Date.UTC(a, m - 1, d, h, mi, s);
  let off = deslocamentoMin(new Date(naive), fuso);
  let t = naive - off * 60000;
  const off2 = deslocamentoMin(new Date(t), fuso);
  if (off2 !== off) { off = off2; t = naive - off * 60000; }
  return new Date(t);
};

/** "2026-10-31" ou "31/10/2026" (data real) -> "2026-10-31"; senão null. Aceita também timestamp ISO. */
export const dataCivilISO = (v: unknown, fuso = FUSO_PADRAO): string | null => {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    const p = partesNoFuso(v, fuso);
    return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
  }
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return diaValido(+m[1], +m[2], +m[3]) ? s : null;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return diaValido(+m[3], +m[2], +m[1]) ? `${m[3]}-${pad(+m[2])}-${pad(+m[1])}` : null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const t = parseTimestamp(s, fuso);
    return t ? dataCivilISO(t, fuso) : null;
  }
  return null;
};

/** "2026-10-31" -> "31/10/2026" (apresentação); '' se inválida. */
export const dataCivilParaBR = (v: unknown): string => {
  const iso = dataCivilISO(v);
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
};

/**
 * Interpreta timestamps sem ambiguidade: ISO 8601 com "Z"/offset (absoluto), ISO sem offset
 * ("2026-10-31T09:30[:00]" ou "2026-10-31 09:30" -> relógio de `fuso`) e "dd/mm/aaaa[ HH:mm[:ss]]".
 * Data sem hora vira meia-noite no fuso. Inválido -> null.
 */
export const parseTimestamp = (v: unknown, fuso = FUSO_PADRAO): Date | null => {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(s);
  let a: number, mo: number, d: number, h: number, mi: number, se: number, z: string | undefined;
  if (m) {
    [a, mo, d, h, mi] = [+m[1], +m[2], +m[3], +m[4], +m[5]]; se = +(m[6] || 0); z = m[7];
  } else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s))) {
    [d, mo, a] = [+m[1], +m[2], +m[3]]; h = +(m[4] || 0); mi = +(m[5] || 0); se = +(m[6] || 0); z = undefined;
  } else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s))) {
    [a, mo, d, h, mi, se, z] = [+m[1], +m[2], +m[3], 0, 0, 0, undefined];
  } else return null;
  if (!diaValido(a, mo, d) || h > 23 || mi > 59 || se > 59) return null;
  if (z) {
    if (z === 'Z') return new Date(Date.UTC(a, mo - 1, d, h, mi, se));
    const zz = /^([+-])(\d{2}):?(\d{2})$/.exec(z)!;
    const off = (zz[1] === '-' ? -1 : 1) * (+zz[2] * 60 + +zz[3]);
    return new Date(Date.UTC(a, mo - 1, d, h, mi, se) - off * 60000);
  }
  return instanteLocal(a, mo, d, h, mi, se, fuso);
};

/** Timestamp ISO 8601 com o offset do fuso, ex.: "2026-10-31T09:30:00-03:00". */
export const timestampISO = (instante: Date = new Date(), fuso = FUSO_PADRAO): string => {
  const p = partesNoFuso(instante, fuso);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${pad(p.second)}${sufixoOffset(deslocamentoMin(instante, fuso))}`;
};

/** Data civil de hoje (AAAA-MM-DD) no fuso institucional. */
export const hojeISO = (agora: Date = new Date(), fuso = FUSO_PADRAO): string => dataCivilISO(agora, fuso)!;

// ---------- Inteiros ----------

/**
 * Inteiro validado: aceita número inteiro ou texto "12"/"-3"/"+4"; rejeita "1.5", "abc", NaN, vazio.
 * Fora de [min,max] -> null.
 */
export const inteiroEmFaixa = (v: unknown, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): number | null => {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string' && /^[+-]?\d+$/.test(v.trim())) n = Number(v.trim());
  else return null;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
};

/** Quantidade de dias: inteiro não negativo (padrão até 36500). */
export const diasInteiro = (v: unknown, max = 36500): number | null => inteiroEmFaixa(v, 0, max);

// ---------- Ids internos ----------

/** UUID v4 para ids internos (crypto.randomUUID quando existir; alternativa com getRandomValues). */
export const novoId = (): string => {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
