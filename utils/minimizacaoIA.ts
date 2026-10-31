// Ficheiro: utils/minimizacaoIA.ts
// Minimização dos dados enviados ao Gemini (LGPD, docs/database.md seção 17): o texto livre que
// acompanha uma imagem/PDF é higienizado (sem NIP, CPF, e-mail, telefone) e truncado.
import { mascararSensivel } from './logSeguro';

export const MAX_PROMPT_IA = 2000;
/** Teto do base64 de imagem/PDF aceito pelo servidor (~12 MB de arquivo). */
export const MAX_BASE64_IA = 16_000_000;

/** Higieniza (mascara identificadores) e trunca o texto livre enviado à IA. */
export const higienizarParaIA = (texto: unknown, max = MAX_PROMPT_IA): string =>
  mascararSensivel(texto).replace(/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, '[telefone]').trim().slice(0, max);

/** Valida o base64 recebido do cliente antes de repassar ao Gemini. */
export const base64ValidoParaIA = (b64: unknown): b64 is string =>
  typeof b64 === 'string' && b64.length > 0 && b64.length <= MAX_BASE64_IA && /^[A-Za-z0-9+/=\r\n]+$/.test(b64);
