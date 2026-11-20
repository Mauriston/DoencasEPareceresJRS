// Ficheiro: utils/nomeArquivoDocumento.ts
// Nome "humano" dos PDFs que o app gera (app e servidor): {TIPO_DOCUMENTO}_{NOME_INSPECIONADO}_IS{n}[_{AAAAMMDDHHMM}].pdf
// — maiúsculas, sem acentos, espaços → "_", só [A-Z0-9_]. Os caminhos no Storage NÃO mudam; o nome vai no
// Content-Disposition do objeto (metadado), no download do servidor, no <a download> e no anexo do e-mail.

export type TipoDocumentoArquivo =
  | 'GUIA_DE_EXAMES' | 'SOLICITACAO_DE_EXAMES' | 'DECLARACAO_DE_COMPARECIMENTO' | 'TERMO_DE_RECURSO'
  | 'PAPELETA_DE_DISPENSA' | 'LAUDO_PERICIAL' | 'PEDIDO_DE_PARECER' | 'TERMO_DE_CIENTIFICACAO'
  | 'SOLICITACAO_DE_PARECER' | 'PERICIA_MENOR';

/** Tipos com vários documentos por IS: levam o carimbo AAAAMMDDHHMM depois do IS{n}. */
export const TIPOS_COM_CARIMBO: readonly TipoDocumentoArquivo[] = ['SOLICITACAO_DE_EXAMES', 'DECLARACAO_DE_COMPARECIMENTO', 'PAPELETA_DE_DISPENSA'];

/** Tipo do arquivo a partir do tipo do documento da IS (utils/documentosIS.ts). */
export const TIPO_ARQUIVO_DOCUMENTO_IS: Record<string, TipoDocumentoArquivo> = {
  solicitacaoExames: 'SOLICITACAO_DE_EXAMES',
  declaracaoComparecimento: 'DECLARACAO_DE_COMPARECIMENTO',
  termoRecurso: 'TERMO_DE_RECURSO',
  papeletaDispensa: 'PAPELETA_DE_DISPENSA',
  laudoPericial: 'LAUDO_PERICIAL',
};

/** Trecho do nome: maiúsculas, sem acentos, só [A-Z0-9_], sem "_" repetido nas pontas. */
export const trechoNomeArquivo = (t: unknown): string =>
  String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

/** Só o nome do inspecionado: tira "posto (quadro) NIP" do início ("CT (MD) 12.3456.78 FULANO" → "FULANO"). */
export const nomeSemPostoNip = (inspecionado: unknown): string => {
  const s = String(inspecionado ?? '').trim();
  const m = /^.*?(?:\d{2}\.\d{4}\.\d{2}|\d{8})\s*[-–—]?\s*(.+)$/.exec(s);
  return (m ? m[1] : s).trim();
};

const dois = (n: number) => String(n).padStart(2, '0');
/** AAAAMMDDHHMM no fuso local. */
export const carimboArquivo = (d: Date = new Date()): string =>
  `${d.getFullYear()}${dois(d.getMonth() + 1)}${dois(d.getDate())}${dois(d.getHours())}${dois(d.getMinutes())}`;

export interface DadosNomeArquivo {
  tipo: TipoDocumentoArquivo | string;
  /** Nome do inspecionado/candidato (posto/NIP são removidos). */
  nome?: unknown;
  /** Número da IS (vira "IS{n}"). */
  is?: unknown;
  /** Identificador quando não há IS (concurso, nº do parecer...). */
  identificador?: unknown;
  /** true = acrescenta AAAAMMDDHHMM (padrão: só para TIPOS_COM_CARIMBO); Date = usa essa data. */
  carimbo?: boolean | Date;
}

/** Nome do arquivo, ex.: GUIA_DE_EXAMES_FULANO_DE_TAL_IS425.pdf */
export const nomeArquivoDocumento = (d: DadosNomeArquivo): string => {
  const is = trechoNomeArquivo(d.is);
  const comCarimbo = d.carimbo === undefined ? TIPOS_COM_CARIMBO.includes(d.tipo as TipoDocumentoArquivo) : !!d.carimbo;
  const partes = [
    trechoNomeArquivo(d.tipo) || 'DOCUMENTO',
    trechoNomeArquivo(nomeSemPostoNip(d.nome)).slice(0, 80),
    is ? `IS${is}` : trechoNomeArquivo(d.identificador).slice(0, 60),
    comCarimbo ? carimboArquivo(d.carimbo instanceof Date ? d.carimbo : new Date()) : '',
  ].filter(Boolean);
  return `${partes.join('_')}.pdf`;
};

/** Content-Disposition com o nome (ASCII em filename, e filename* UTF-8). */
export const contentDisposition = (nome: string, tipo: 'inline' | 'attachment' = 'inline'): string => {
  const ascii = nome.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${tipo}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nome)}`;
};

/** Nome do arquivo a partir de um Content-Disposition (filename* tem prioridade); '' se não houver. */
export const nomeDoContentDisposition = (cd: string | null | undefined): string => {
  if (!cd) return '';
  const estrela = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(cd);
  if (estrela) { try { return decodeURIComponent(estrela[1].trim()); } catch { /* cai no simples */ } }
  const simples = /filename\s*=\s*"?([^";]+)"?/i.exec(cd);
  return simples ? simples[1].trim() : '';
};
