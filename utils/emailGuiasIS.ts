// Ficheiro: utils/emailGuiasIS.ts
// Regras puras dos e-mails das GUIAS DE EXAMES (servidor/email/guiasIS.ts) e do e-mail de abertura
// (servidor/email/aberturaIS.ts), testadas em utils/__tests__/emailGuiasIS.test.ts:
//  - inspecionadoSemNip: "POSTO (QUADRO) NIP NOME" → "POSTO (QUADRO) NOME" (vocativo "Prezado …" e assuntos);
//  - vocativoInspecionado: "Prezado …" / "Prezada …" conforme o sexo do cadastro (sem sexo: "Prezado");
//  - linhasExamesGuias: tabela Tipo | Exame do e-mail ao inspecionado — um exame por linha, os laboratoriais
//    todos numa linha só, separados por vírgula;
//  - assuntos e nome do anexo.

export const ASSUNTO_GUIAS_INSPECIONADO = 'GUIA DOS EXAMES PARA INSPEÇÃO DE SAÚDE';
export const assuntoGuiasSecretaria = (nomeInspecionado: string): string => `EXAMES DE ${String(nomeInspecionado || '').trim()}`.trim();
/** Nome do PDF anexado: "Guias de exames - IS 1234567.pdf". */
export const nomeAnexoGuias = (numeroIs: number | string): string => `Guias de exames - IS ${String(numeroIs ?? '').trim()}.pdf`;
/** Caminho do PDF no Storage (gerado pelo servidor — POST /api/documentos/guias-exames). */
export const caminhoGuiasExames = (isId: number | string): string => `inspecoes/${String(isId)}/guias/guias-exames.pdf`;

// NIP: "12.3456.78" (formatarNip em utils/dados.ts); aceita também os 8 dígitos sem pontos, isolados.
const NIP = /(^|\s)(?:\d{2}\.\d{4}\.\d{2}|\d{8})(?=\s|$)/;

/** "CT (Md) 12.3456.78 MAURISTON RENAN MARTINS SILVA" → "CT (Md) MAURISTON RENAN MARTINS SILVA". Sem NIP: o texto como está. */
export const inspecionadoSemNip = (inspecionado: string | undefined | null): string =>
  String(inspecionado || '').replace(NIP, '$1').replace(/\s{2,}/g, ' ').trim();

export type SexoCadastro = 'Masculino' | 'Feminino' | string | undefined | null;
const ehFeminino = (sexo: SexoCadastro): boolean => /^f/i.test(String(sexo || '').trim());

/** "Prezado CT (Md) FULANO" (ou "Prezada …" quando o cadastro diz Feminino). */
export const vocativoInspecionado = (inspecionado: string, sexo?: SexoCadastro): string =>
  `${ehFeminino(sexo) ? 'Prezada' : 'Prezado'} ${inspecionadoSemNip(inspecionado)}`.trim();

/** "o Senhor" / "a Senhora" conforme o sexo do cadastro; sem sexo: "o(a) Senhor(a)". `maiuscula` para início de frase. */
export const tratamentoInspecionado = (sexo?: SexoCadastro, maiuscula = false): string => {
  const s = String(sexo || '').trim();
  const t = /^f/i.test(s) ? 'a Senhora' : /^m/i.test(s) ? 'o Senhor' : 'o(a) Senhor(a)';
  return maiuscula ? t.charAt(0).toUpperCase() + t.slice(1) : t;
};

export interface GrupoGuia { grupo: string; exames: string[] }
export interface LinhaExameGuia {
  tipo: string;
  exame: string;
  /** Primeira linha do grupo: a célula Tipo aparece (rowspan) só nela. */
  primeira: boolean;
  /** Quantas linhas o grupo ocupa (rowspan da célula Tipo). */
  rowspan: number;
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const ehGrupoLaboratorial = (grupo: string): boolean => /laborat/.test(semAcento(String(grupo || '')));

/** "Exames laboratoriais" → "Exames Laboratoriais" (rótulo da coluna Tipo; preposições em minúsculas). */
export const rotuloTipoGuia = (grupo: string): string =>
  String(grupo || '').trim().split(/\s+/).map((p, i) => (i > 0 && /^(de|da|do|das|dos|e)$/i.test(p) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1))).join(' ');

/** Linhas da tabela Tipo | Exame, na ordem dos grupos das guias; laboratoriais numa linha só, separados por vírgula. */
export const linhasExamesGuias = (grupos: GrupoGuia[] | undefined | null): LinhaExameGuia[] => {
  const saida: LinhaExameGuia[] = [];
  (grupos ?? []).forEach(g => {
    const exames = (g.exames ?? []).map(e => String(e || '').trim()).filter(Boolean);
    if (!exames.length) return;
    const tipo = rotuloTipoGuia(g.grupo);
    const itens = ehGrupoLaboratorial(g.grupo) ? [exames.join(', ')] : exames;
    itens.forEach((exame, i) => saida.push({ tipo, exame, primeira: i === 0, rowspan: itens.length }));
  });
  return saida;
};
