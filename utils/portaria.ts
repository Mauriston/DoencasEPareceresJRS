// Ficheiro: utils/portaria.ts
// Estrutura da Portaria GM-MD nº 3.551/2021 para o leitor (PortariaGuide):
// ids das seções (derivados do nome do arquivo .md), as 17 doenças na ordem do
// quadro sinóptico com o enquadramento legal, o índice e os links de entrada
// (#/…/portaria?secao=cardiopatia-grave&item=4.2 — compatível com o HashRouter).

/** "../content/portaria-3551-2021/01-alienacao-mental.md" → "alienacao-mental". */
export const idDaSecao = (arquivo: string): string => {
  const base = arquivo.split(/[\\/]/).pop() ?? arquivo;
  return base
    .replace(/\.md$/i, '')
    .replace(/^\d+[-_]?/, '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export interface DoencaPortaria {
  /** Id da seção (do nome do arquivo). */
  secao: string;
  /** Nome em caixa de frase (o h1 do .md vem em CAIXA ALTA). */
  nome: string;
  /** Lei nº 6.880/80 (Estatuto dos Militares) — do quadro sinóptico. */
  estatuto: boolean;
  /** Lei nº 11.052/04 (isenção de Imposto de Renda) — do quadro sinóptico. */
  ir: boolean;
  /** Id da doença em Doenças de Lei (constants.ts), quando existe. */
  doencaId?: string;
  /** Nome como aparece na 1ª coluna do quadro sinóptico (para virar link). */
  nomeQuadro: string;
}

/** As 17 doenças, na ordem dos arquivos (= ordem do quadro sinóptico). */
export const DOENCAS_PORTARIA: DoencaPortaria[] = [
  { secao: 'alienacao-mental', nome: 'Alienação mental', estatuto: true, ir: true, doencaId: 'alienacao_mental', nomeQuadro: 'Alienação Mental' },
  { secao: 'cardiopatia-grave', nome: 'Cardiopatia grave', estatuto: true, ir: true, doencaId: 'cardiopatia_grave', nomeQuadro: 'Cardiopatia Grave' },
  { secao: 'cegueira', nome: 'Cegueira', estatuto: true, ir: true, doencaId: 'cegueira', nomeQuadro: 'Cegueira' },
  { secao: 'espondilite-anquilosante', nome: 'Espondilite anquilosante', estatuto: true, ir: true, doencaId: 'espondilite_anquilosante', nomeQuadro: 'Espondilite Anquilosante' },
  { secao: 'estados-avancados-doenca-de-paget', nome: 'Estados avançados da doença de Paget', estatuto: false, ir: true, doencaId: 'estados_avancados_de_doenca_de_paget', nomeQuadro: 'Estados avançados do mal de Paget (osteíte deformante)' },
  { secao: 'hanseniase', nome: 'Hanseníase', estatuto: true, ir: true, doencaId: 'hanseniase', nomeQuadro: 'Hanseníase' },
  { secao: 'doenca-de-parkinson', nome: 'Doença de Parkinson', estatuto: true, ir: true, doencaId: 'doenca_de_parkinson', nomeQuadro: 'Doença de Parkinson' },
  { secao: 'nefropatia-grave', nome: 'Nefropatia grave', estatuto: true, ir: true, doencaId: 'nefropatia_grave', nomeQuadro: 'Nefropatia Grave' },
  { secao: 'neoplasia-maligna', nome: 'Neoplasia maligna', estatuto: true, ir: true, doencaId: 'neoplasia_maligna', nomeQuadro: 'Neoplasia Maligna' },
  { secao: 'paralisia-irreversivel-e-incapacitante', nome: 'Paralisia irreversível e incapacitante', estatuto: true, ir: true, doencaId: 'paralisia_irreversivel', nomeQuadro: 'Paralisia Irreversível e Incapacitante' },
  { secao: 'penfigo', nome: 'Pênfigo', estatuto: true, ir: false, doencaId: 'penfigo', nomeQuadro: 'Pênfigo' },
  { secao: 'sindrome-da-imunodeficiencia-adquirida', nome: 'Síndrome da imunodeficiência adquirida', estatuto: true, ir: true, doencaId: 'sida_aids', nomeQuadro: 'Síndrome da Imunodeficiência Adquirida (SIDA/AIDS)' },
  { secao: 'tuberculose-ativa', nome: 'Tuberculose ativa', estatuto: true, ir: true, doencaId: 'tuberculose_ativa', nomeQuadro: 'Tuberculose Ativa' },
  { secao: 'hepatopatia-grave', nome: 'Hepatopatia grave', estatuto: false, ir: true, doencaId: 'hepatopatias_graves', nomeQuadro: 'Hepatopatia Grave' },
  { secao: 'contaminacao-por-radiacao', nome: 'Contaminação por radiação', estatuto: false, ir: true, doencaId: 'contaminacao_por_radiacao', nomeQuadro: 'Contaminação por radiação' },
  { secao: 'esclerose-multipla', nome: 'Esclerose múltipla', estatuto: true, ir: true, doencaId: 'esclerose_multipla', nomeQuadro: 'Esclerose Múltipla' },
  { secao: 'fibrose-cistica', nome: 'Fibrose cística', estatuto: false, ir: true, nomeQuadro: 'Fibrose Cística' },
];

/** Seção da Portaria correspondente a uma doença de Doenças de Lei (id de constants.ts). */
export const secaoDaDoenca = (doencaId: string | undefined): string | undefined =>
  DOENCAS_PORTARIA.find(d => d.doencaId === doencaId)?.secao;

/** Seção cujo nome no quadro sinóptico é `texto` (ignora caixa e espaços). */
export const doencaDoQuadro = (texto: string): DoencaPortaria | undefined => {
  const n = texto.trim().toLowerCase();
  return DOENCAS_PORTARIA.find(d => d.nomeQuadro.toLowerCase() === n);
};

/** Partes da norma fora das doenças (âncoras dentro de preliminares e o Cap. IV). */
export const PARTES_INICIAIS = [
  { id: 'preliminares', rotulo: 'Portaria e Anexo' },
  { id: 'capitulo-i', rotulo: 'Cap. I · Finalidade e fundamentação' },
  { id: 'capitulo-ii', rotulo: 'Cap. II · Considerações preliminares' },
  { id: 'quadro-sinoptico', rotulo: 'Quadro sinóptico' },
] as const;
export const PARTE_FINAL = { id: 'disposicoes-finais', rotulo: 'Cap. IV · Disposições finais' } as const;

/** Ids para os títulos não numerados do 00-preliminares e do 99-disposicoes-finais. */
export const idTituloPortaria = (texto: string): string | undefined => {
  const t = texto.trim().toUpperCase();
  const cap = t.match(/^CAP[IÍ]TULO\s+([IVX]+)$/);
  if (cap) return `capitulo-${cap[1].toLowerCase()}`;
  if (/^QUADRO SIN[OÓ]PTICO/.test(t)) return 'quadro-sinoptico';
  if (t === 'ANEXO') return 'anexo';
  return undefined;
};

export interface CabecalhoDou {
  publicadoEm?: string;
  edicao?: string;
  secao?: string;
  pagina?: string;
  orgao?: string;
}

/**
 * Separa o cabeçalho do DOU (# DIÁRIO OFICIAL DA UNIÃO, "Publicado em…", "Órgão…")
 * do resto do 00-preliminares.md: ele vira uma linha na descrição da página, não h1.
 */
export const separarCabecalhoDou = (markdown: string): { cabecalho: CabecalhoDou; resto: string } => {
  const linhas = markdown.split('\n');
  const cabecalho: CabecalhoDou = {};
  let i = 0;
  if (!/^#\s+DI[AÁ]RIO OFICIAL/i.test(linhas[0] ?? '')) return { cabecalho, resto: markdown };
  i = 1;
  const campo = (linha: string, rotulo: string) => linha.match(new RegExp(`\\*\\*${rotulo}:\\*\\*\\s*([^|*]+)`, 'i'))?.[1].trim();
  for (; i < linhas.length; i++) {
    const l = linhas[i];
    if (/^#/.test(l)) break;
    if (!l.trim()) continue;
    cabecalho.publicadoEm ??= campo(l, 'Publicado em');
    cabecalho.edicao ??= campo(l, 'Edição');
    cabecalho.secao ??= campo(l, 'Seção');
    cabecalho.pagina ??= campo(l, 'Página');
    cabecalho.orgao ??= campo(l, 'Órgão');
  }
  return { cabecalho, resto: linhas.slice(i).join('\n') };
};

/** Tira o h1 (o nome da doença em CAIXA ALTA) do início do .md: o título da seção é o `nome`. */
export const semTituloPrincipal = (markdown: string): string => markdown.replace(/^\s*#\s+[^\n]*\n+/, '');

/** Caminho da Portaria com a seção (e o item) — `base` é a rota da página (logada ou pública). */
export const portariaPathSecao = (base: string, secao?: string, item?: string): string => {
  if (!secao) return base;
  const q = new URLSearchParams({ secao });
  if (item) q.set('item', item);
  return `${base}?${q.toString()}`;
};
