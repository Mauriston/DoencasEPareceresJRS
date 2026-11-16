// Ficheiro: utils/emailsEnviados.ts
// Contrato e regras puras dos e-mails enviados com CONTEÚDO (aba Emails da Ficha do inspecionado):
//  - emails_enviados/{id}: metadados de um envio (tipo, assunto, para, cc, quem, quando) e os vínculos
//    (nips dos inspecionados envolvidos e isIds das IS) — a Ficha consulta where('nips', 'array-contains', nip);
//  - emails_enviados/{id}/conteudo/corpo: o HTML e o texto simples COMO SAÍRAM (lidos só quando o e-mail é aberto);
//  - inspecoes/{isId}/emails/{autoId} (utils/registroEmailsIS.ts) ganha `conteudoId` → emails_enviados/{id}.
// Só o servidor grava (servidor/email/registroEmailsIS.ts, Admin SDK); só a equipe lê (firestore.rules → isEquipe).
// Anexos nunca são gravados (só o nome). Registros antigos (sem conteúdo) aparecem só com os metadados.
// Testes em utils/__tests__/emailsEnviados.test.ts.
import type { TipoEmail } from '../config/emails';
import type { RegistroEmailIS } from './registroEmailsIS';
import { mesclarHistoricoEmails, rotuloDoEnvio, type LegadoEmailsIS } from './historicoEmailsIS';

/** Tipos fora de config/emails (envios internos ligados a um inspecionado). */
export type TipoEmailExtra = 'impressaoParecer';
export type TipoEmailEnviado = TipoEmail | TipoEmailExtra;

export const COL_EMAILS_ENVIADOS = 'emails_enviados';
/** Subcoleção e id do documento do corpo (emails_enviados/{id}/conteudo/corpo). */
export const SUB_CONTEUDO = 'conteudo';
export const DOC_CORPO = 'corpo';

export interface EmailEnviado {
  tipo: TipoEmailEnviado;
  assunto: string;
  para: string[];
  cc: string[];
  variante?: string;
  /** NIPs (só dígitos) dos inspecionados envolvidos (e-mails em lote: todos os do lote). */
  nips: string[];
  /** IS envolvidas (ids de inspecoes). */
  isIds: string[];
  /** Nome do anexo, quando houve (o arquivo não é gravado). */
  anexo?: string;
  /** O corpo foi gravado (emails_enviados/{id}/conteudo/corpo). */
  temConteudo: boolean;
  enviadoEmMs: number;
  enviadoPor: { uid: string; usuario: string; nome?: string };
}

export interface CorpoEmailEnviado {
  /** HTML como saiu (ausente quando passou do limite — ver htmlOmitido). */
  html?: string;
  /** Texto simples como saiu (cortado no limite). */
  texto?: string;
  htmlOmitido?: 'tamanho';
  textoCortado?: boolean;
}

// ---------------------------------------------------------------- Gravação (servidor)

/** O documento do Firestore tem limite de 1 MiB: o HTML fica bem abaixo, com folga para o texto. */
export const LIMITE_HTML_BYTES = 700_000;
export const LIMITE_TEXTO_CHARS = 100_000;

const bytesUtf8 = (s: string): number => new TextEncoder().encode(s).length;

/** Tira scripts e imagens embutidas (data:) — o que sobra é o que o e-mail mostra. */
export const enxugarHtml = (html: string): string => String(html || '')
  .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
  .replace(/(["'(])data:[^"')\s]{2000,}/g, '$1');

/**
 * Corpo a gravar: HTML (sem scripts; sem imagens embutidas grandes) até LIMITE_HTML_BYTES — acima disso, omitido
 * (um HTML cortado ao meio quebraria a exibição) — e o texto simples até LIMITE_TEXTO_CHARS.
 */
export const prepararCorpoParaRegistro = (html?: string, texto?: string): CorpoEmailEnviado => {
  const corpo: CorpoEmailEnviado = {};
  if (html) {
    const limpo = enxugarHtml(html);
    if (bytesUtf8(limpo) <= LIMITE_HTML_BYTES) corpo.html = limpo;
    else corpo.htmlOmitido = 'tamanho';
  }
  if (texto) {
    corpo.texto = texto.length > LIMITE_TEXTO_CHARS ? texto.slice(0, LIMITE_TEXTO_CHARS) : texto;
    if (texto.length > LIMITE_TEXTO_CHARS) corpo.textoCortado = true;
  }
  return corpo;
};

/** NIPs só com dígitos, sem vazios nem repetidos. */
export const nipsValidos = (nips: unknown[]): string[] =>
  [...new Set(nips.map(n => String(n ?? '').replace(/\D/g, '')).filter(Boolean))];

// ---------------------------------------------------------------- Exibição (app)

/** Política do documento exibido: nada de scripts, conexões ou formulários; só imagens/estilos/fontes. */
export const CSP_EMAIL = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:; form-action 'none'";

/**
 * HTML para o <iframe sandbox srcdoc>: sem scripts (também barrados pelo sandbox e pela CSP), com a CSP no
 * <head> e links abrindo em outra aba (<base target="_blank">).
 */
export const htmlSeguroParaIframe = (html: string): string => {
  const cabeca = `<meta http-equiv="Content-Security-Policy" content="${CSP_EMAIL}"><base target="_blank">`;
  const limpo = enxugarHtml(html).replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  if (/<head[^>]*>/i.test(limpo)) return limpo.replace(/<head[^>]*>/i, m => `${m}${cabeca}`);
  return `<!doctype html><html><head><meta charset="utf-8">${cabeca}</head><body>${limpo}</body></html>`;
};

export const ROTULO_TIPO_EXTRA: Record<TipoEmailExtra, string> = {
  impressaoParecer: 'Pedido de impressão do parecer',
};

export const rotuloDoEnvioFicha = (tipo: TipoEmailEnviado, variante?: string): string =>
  tipo in ROTULO_TIPO_EXTRA ? ROTULO_TIPO_EXTRA[tipo as TipoEmailExtra] : rotuloDoEnvio(tipo as TipoEmail, variante);

/** Item da aba Emails (histórico e painel principal). */
export interface ItemEmailFicha {
  /** Id do item: o do emails_enviados ou "{isId}:{chave}" (registro antigo da IS). */
  id: string;
  tipo: TipoEmailEnviado;
  rotulo: string;
  assunto: string;
  para: string[];
  cc: string[];
  enviadoEmMs: number;
  /** Login de quem enviou ('' quando não se sabe). */
  usuario: string;
  nomeUsuario?: string;
  /** Nº das IS deste inspecionado ligadas ao envio. */
  numerosIS: number[];
  anexo?: string;
  /** emails_enviados/{id} com o corpo gravado (o painel lê o HTML). */
  conteudoId?: string;
  /** Envio só nos campos antigos da IS (sem o registro do histórico). */
  legado: boolean;
}

export interface ISParaEmails extends LegadoEmailsIS { id: string; is: number }

/**
 * Junta, do mais recente para o mais antigo: os envios com conteúdo (emails_enviados do NIP) e, de cada IS do
 * inspecionado, o histórico antigo (inspecoes/{isId}/emails e campos antigos — mesclarHistoricoEmails) que não
 * aponta para um envio já listado.
 */
export const emailsDaFicha = (
  enviados: (EmailEnviado & { id: string })[],
  porIS: { is: ISParaEmails; registros: (RegistroEmailIS & { id: string; conteudoId?: string })[] }[],
  usuarioDoUid: (uid: string) => string | undefined = () => undefined,
): ItemEmailFicha[] => {
  const numeroDaIS = new Map(porIS.map(p => [p.is.id, p.is.is]));
  const listados = new Set(enviados.map(e => e.id));
  const itens: ItemEmailFicha[] = enviados.map(e => ({
    id: e.id, tipo: e.tipo, rotulo: rotuloDoEnvioFicha(e.tipo, e.variante), assunto: e.assunto || '',
    para: Array.isArray(e.para) ? e.para : [], cc: Array.isArray(e.cc) ? e.cc : [],
    enviadoEmMs: Number(e.enviadoEmMs) || 0, usuario: e.enviadoPor?.usuario || '', nomeUsuario: e.enviadoPor?.nome,
    numerosIS: (e.isIds || []).map(id => numeroDaIS.get(id)).filter((n): n is number => typeof n === 'number'),
    anexo: e.anexo, conteudoId: e.temConteudo ? e.id : undefined, legado: false,
  }));
  for (const { is, registros } of porIS) {
    const porChave = new Map(registros.map(r => [r.id, r]));
    for (const h of mesclarHistoricoEmails(registros, is, usuarioDoUid)) {
      const r = porChave.get(h.chave);
      if (r?.conteudoId && listados.has(r.conteudoId)) continue;
      itens.push({
        id: `${is.id}:${h.chave}`, tipo: h.tipo, rotulo: h.rotulo, assunto: h.assunto, para: h.para, cc: r?.cc ?? [],
        enviadoEmMs: h.enviadoEmMs, usuario: h.usuario, nomeUsuario: r?.enviadoPor?.nome, numerosIS: [is.is], legado: h.legado,
      });
    }
  }
  return itens.sort((a, b) => b.enviadoEmMs - a.enviadoEmMs);
};

const fmtIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife', year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/** ms → AAAA-MM-DD no horário de Recife ('' sem data). */
export const isoDoEnvio = (ms: number): string => (ms ? fmtIso.format(new Date(ms)) : '');
/** ms → hh:mm no horário de Recife ('' sem data). */
export const horaDoEnvio = (ms: number): string => (ms ? fmtHora.format(new Date(ms)) : '');

/** "Para fulano@x, beltrano@y" curto para o histórico (primeiro destinatário + "e mais N"). */
export const resumoDestinatarios = (para: string[]): string =>
  !para.length ? 'destinatários da configuração' : para.length === 1 ? para[0] : `${para[0]} e mais ${para.length - 1}`;
