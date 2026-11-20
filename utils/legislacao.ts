// Ficheiro: utils/legislacao.ts
// Página Legislação: grupos das abas e texto em Markdown de cada norma.
// O texto vem de content/legislacao/<id>.md (id = slug do documento no Firestore,
// convertido do PDF do Storage legislacao/<id>.pdf). A Portaria GM-MD nº 3.551/2021
// reaproveita o texto revisado de content/portaria-3551-2021.
import { marked, type Tokens } from 'marked';
import { paraCaixaDeFrase } from './normaMarkdown';

export type GrupoLegislacao = 'leis' | 'portarias' | 'dgpm' | 'cfm';

export const GRUPOS_LEGISLACAO: { value: GrupoLegislacao; label: string }[] = [
  { value: 'leis', label: 'Leis e Decretos' },
  { value: 'portarias', label: 'Portarias' },
  { value: 'dgpm', label: 'DGPM' },
  { value: 'cfm', label: 'Res CFM' },
];

/** Grupo da norma pelo id (slug) ou, na falta, pela identificação ("LEI nº…", "RESOLUÇÃO CFM…"). */
export const grupoDaLegislacao = (id: string, identificacao = ''): GrupoLegislacao => {
  const t = `${id} ${identificacao}`.toLowerCase();
  if (/(^|\W)(res(olu[cç][aã]o)?[-\s]+cfm|cfm)/.test(t)) return 'cfm';
  if (/dgpm/.test(t)) return 'dgpm';
  if (/portaria/.test(t)) return 'portarias';
  return 'leis';
};

const legislacaoModules = import.meta.glob('../content/legislacao/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const portariaModules = import.meta.glob('../content/portaria-3551-2021/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const TEXTOS: Record<string, string> = Object.fromEntries(
  Object.entries(legislacaoModules).map(([caminho, md]) => [caminho.split('/').pop()!.replace(/\.md$/, ''), md]),
);
TEXTOS['portaria-gm-md-3551-2021'] = Object.keys(portariaModules).sort().map(c => portariaModules[c]).join('\n\n');

/** Markdown da norma, sem o título "# …" inicial (o título vai no cabeçalho da página). */
export const textoDaLegislacao = (id: string): string | null => {
  const md = TEXTOS[id];
  return md ? md.replace(/^\s*#\s[^\n]*\n/, '') : null;
};

export interface TituloIndice {
  id: string;
  texto: string;
  nivel: number;
}

const slug = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'secao';

/** Ids únicos para os títulos (h2–h6), na ordem do documento. Os mesmos ids são aplicados no DOM. */
export const titulosDoMarkdown = (markdown: string): TituloIndice[] => {
  const usados = new Map<string, number>();
  return marked.lexer(markdown)
    .filter((t): t is Tokens.Heading => t.type === 'heading' && t.depth >= 2)
    .map(t => {
      const base = slug(t.text);
      const n = (usados.get(base) ?? 0) + 1;
      usados.set(base, n);
      const texto = t.text.replace(/\*\*|__|\*/g, '');
      return { id: n > 1 ? `${base}-${n}` : base, texto: paraCaixaDeFrase(texto), nivel: t.depth };
    });
};

/** Itens do índice: a estrutura (Títulos, Capítulos, Seções, Anexos); só os artigos quando não há estrutura. */
export const itensDoIndice = (titulos: TituloIndice[]): TituloIndice[] => {
  const ehArtigo = (t: TituloIndice) => /^art\.?\s/i.test(t.texto);
  const estrutura = titulos.filter(t => !ehArtigo(t) && t.nivel <= 3);
  return estrutura.length >= 2 ? estrutura : titulos.filter(t => t.nivel <= 3);
};
