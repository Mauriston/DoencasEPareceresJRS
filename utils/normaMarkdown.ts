// Ficheiro: utils/normaMarkdown.ts
// Renderizador "estruturado" de textos normativos em Markdown (Portaria GM-MD
// nº 3.551/2021 e, opcionalmente, DGPM-406). Opt-in: o MarkdownContent só o usa
// com a prop `estruturado`; sem ela continua o marked puro de antes.
//
// O que muda em relação ao marked padrão (auditoria v3, §10 · PT3–PT6):
// - parágrafo que começa com **4.2.** → número numa coluna própria (recuo
//   deslocado), com id por item (`${prefixo}--4.2`), e as listas logo abaixo
//   entram no corpo do item;
// - lista cujos itens começam todos por um marcador ("**a)**", "1)", "(a)") →
//   <ol class="md-alineas" type="a|1"> sem bolinha, com a letra numa coluna;
// - blockquote logo após um título (o item x.1, a conceituação, que a conversão
//   do PDF pôs em citação) → quadro "Conceito" intencional;
// - títulos deslocados de nível, em caixa de frase quando vieram em CAIXA ALTA,
//   com id (itens numerados como os parágrafos; os demais via `idTitulo`);
// - tabela dentro de um contêiner com rolagem lateral; opcionalmente Sim/Não →
//   ✓/— e a 1ª coluna como link.
import { Marked, type Token, type Tokens } from 'marked';

export interface LinkTabela {
  href: string;
  /** Id de destino dentro da página (vira data-secao, para a navegação interna). */
  secao?: string;
}

export interface OpcoesNorma {
  /** Prefixo dos ids de item (ex.: 'cardiopatia-grave' → id 'cardiopatia-grave--4.2'). */
  prefixo?: string;
  /** Soma ao nível dos títulos (ex.: 1 → ## vira h3). Limite h6. */
  deslocarTitulos?: number;
  /** Converte títulos em CAIXA ALTA para caixa de frase. */
  caixaDeFrase?: boolean;
  /** Id para títulos não numerados (ex.: "CAPÍTULO I" → 'capitulo-i'). */
  idTitulo?: (texto: string, nivel: number) => string | undefined;
  /** Células "Sim"/"Não" viram ✓/— (com o texto para leitores de tela). */
  tabelaSimNao?: boolean;
  /** Link para o texto da 1ª coluna das linhas da tabela. */
  linkTabela?: (texto: string) => LinkTabela | undefined;
}

/** Id de um item numerado dentro de uma seção. */
export const idItem = (prefixo: string | undefined, numero: string): string =>
  prefixo ? `${prefixo}--${numero}` : `item-${numero}`;

// ─── Caixa de frase ──────────────────────────────────────────────────────────

/** Siglas e nomes que mantêm a grafia ao passar um título de CAIXA ALTA para caixa de frase. */
const GRAFIAS: string[] = [
  'GM-MD', 'AMP', 'APM', 'HFA', 'SIDA/AIDS', 'SIDA', 'AIDS', 'IR', 'NYHA', 'DOU',
  'Marinha', 'Exército', 'Aeronáutica', 'Hospital das Forças Armadas', 'Forças Armadas',
  'Ministério da Defesa', 'Diário Oficial da União', 'Juntas de Inspeção de Saúde',
  'Agentes Médico-Periciais', 'Agentes Médico Periciais', 'Paget', 'Parkinson',
];
const ROMANO = /^(?=[IVXLC]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

const escaparRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** "DA FINALIDADE, DA APLICAÇÃO" → "Da finalidade, da aplicação"; mantém siglas, nomes próprios e numerais romanos. Textos que já têm minúsculas voltam iguais. */
export const paraCaixaDeFrase = (texto: string): string => {
  if (!/\p{Lu}/u.test(texto) || /\p{Ll}/u.test(texto)) return texto;
  let s = texto
    .split(/(\s+)/)
    .map(p => (ROMANO.test(p.replace(/[.,;:]$/, '')) ? p : p.toLocaleLowerCase('pt-BR')))
    .join('');
  for (const g of GRAFIAS) {
    s = s.replace(new RegExp(`(^|[^\\p{L}])${escaparRegex(g.toLocaleLowerCase('pt-BR'))}(?![\\p{L}])`, 'gu'), (_m, antes) => `${antes}${g}`);
  }
  // "Nº" dentro do título fica "nº" (ex.: "Portaria GM-MD nº 3.551").
  return s.charAt(0).toLocaleUpperCase('pt-BR') + s.slice(1);
};

// ─── Utilitários de tokens ───────────────────────────────────────────────────

const NUMERO_ITEM = /^(\d+(?:\.\d+)*)\.?$/;
const NUMERO_NO_TEXTO = /^(\d+(?:\.\d+)*)\.\s+/;
const MARCADOR_FORTE = /^\(?([a-z]{1,2}|\d{1,2})\)$/;
const MARCADOR_TEXTO = /^(\(?(?:[a-z]{1,2}|\d{1,2})\))\s+/;

type ComTokens = { tokens?: Token[] };
type Anotado = {
  _numero?: string;
  _filhos?: Token[];
  _alineas?: { tipo: 'a' | '1'; marcadores: string[] };
  _conceito?: { numero?: string };
};

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Remove espaços iniciais do primeiro token de texto (depois de tirar o marcador). */
const aparar = (inline: Token[]) => {
  const t = inline[0] as Tokens.Text | undefined;
  if (t && t.type === 'text') {
    t.text = t.text.replace(/^\s+/, '');
    t.raw = t.raw.replace(/^\s+/, '');
    if (!t.text && !t.tokens?.length) inline.shift();
  }
};

/** Primeiro bloco com inline de um item de lista (text compacto ou paragraph). */
const inlineDoItem = (item: Tokens.ListItem): Token[] | undefined => {
  const primeiro = item.tokens[0] as (Token & ComTokens) | undefined;
  if (!primeiro || (primeiro.type !== 'text' && primeiro.type !== 'paragraph')) return undefined;
  return primeiro.tokens;
};

/** Tira o marcador ("a)", "1)", "(a)") do início do item; devolve o marcador ou null. */
const extrairMarcador = (item: Tokens.ListItem, aplicar: boolean): string | null => {
  const inline = inlineDoItem(item);
  if (!inline?.length) return null;
  const t0 = inline[0] as Token & ComTokens & { text?: string };
  if (t0.type === 'strong' && t0.text && MARCADOR_FORTE.test(t0.text.trim())) {
    if (aplicar) { inline.shift(); aparar(inline); }
    return t0.text.trim();
  }
  if (t0.type === 'text' && typeof t0.text === 'string' && !t0.tokens?.length) {
    const m = t0.text.match(MARCADOR_TEXTO);
    if (m) {
      if (aplicar) {
        const tt = t0 as Tokens.Text;
        tt.text = tt.text.slice(m[0].length);
        tt.raw = tt.raw.replace(MARCADOR_TEXTO, '');
      }
      return m[1];
    }
  }
  return null;
};

/** Marca listas de alíneas (recursivo: listas dentro de itens). */
const anotarListas = (tokens: Token[]) => {
  for (const tk of tokens) {
    if (tk.type === 'list') {
      const lista = tk as Tokens.List & Anotado;
      const marcadores = lista.items.map(i => extrairMarcador(i, false));
      if (!lista.ordered && marcadores.length && marcadores.every(Boolean)) {
        lista.items.forEach(i => extrairMarcador(i, true));
        const tipo = /\d/.test(marcadores[0]!) ? '1' : 'a';
        lista._alineas = { tipo, marcadores: marcadores as string[] };
      }
      lista.items.forEach(i => anotarListas(i.tokens));
    } else if (tk.type === 'blockquote') {
      anotarListas((tk as Tokens.Blockquote).tokens);
    }
  }
};

/** Número do item no início de um parágrafo em negrito (**4.2.**); remove-o do texto. */
const extrairNumeroParagrafo = (p: Tokens.Paragraph): string | null => {
  const t0 = p.tokens[0] as Token & { text?: string };
  if (t0?.type !== 'strong' || !t0.text) return null;
  const m = t0.text.trim().match(NUMERO_ITEM);
  if (!m) return null;
  p.tokens.shift();
  aparar(p.tokens);
  return m[1];
};

/** Número no início de um parágrafo sem negrito ("4.1. Texto"), usado no quadro Conceito. */
const extrairNumeroTexto = (p: Tokens.Paragraph): string | undefined => {
  const t0 = p.tokens[0] as Tokens.Text | undefined;
  if (t0?.type !== 'text') return undefined;
  const m = t0.text.match(NUMERO_NO_TEXTO);
  if (!m) return undefined;
  t0.text = t0.text.slice(m[0].length);
  t0.raw = t0.raw.replace(NUMERO_NO_TEXTO, '');
  if (t0.tokens?.length) {
    // Texto com inline aninhado: tira o número do primeiro pedaço.
    const f = t0.tokens[0] as Tokens.Text;
    if (f?.type === 'text') f.text = f.text.replace(NUMERO_NO_TEXTO, '');
  }
  return m[1];
};

/** Anota o nível de cima: parágrafos numerados (+ listas que os seguem) e quadros Conceito. */
const anotarTopo = (tokens: Token[]): Token[] => {
  anotarListas(tokens);
  const saida: Token[] = [];
  let anteriorEhTitulo = false;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.type === 'space') { saida.push(tk); continue; }
    if (tk.type === 'paragraph') {
      const p = tk as Tokens.Paragraph & Anotado;
      const numero = extrairNumeroParagrafo(p);
      if (numero) {
        p._numero = numero;
        p._filhos = [];
        while (i + 1 < tokens.length && (tokens[i + 1].type === 'list' || tokens[i + 1].type === 'space')) {
          p._filhos.push(tokens[++i]);
        }
      }
    } else if (tk.type === 'blockquote' && anteriorEhTitulo) {
      const bq = tk as Tokens.Blockquote & Anotado;
      const p0 = bq.tokens.find(t => t.type === 'paragraph') as Tokens.Paragraph | undefined;
      bq._conceito = { numero: p0 ? extrairNumeroTexto(p0) : undefined };
    }
    anteriorEhTitulo = tk.type === 'heading';
    saida.push(tk);
  }
  // No mesmo array (o lexer pendura `links` nele).
  tokens.splice(0, tokens.length, ...saida);
  return tokens;
};

// ─── Renderização ────────────────────────────────────────────────────────────

const atributoId = (id?: string) => (id ? ` id="${escapar(id)}"` : '');

const criarMarked = (op: OpcoesNorma) => {
  const m = new Marked({ gfm: true, breaks: false });
  m.use({
    hooks: { processAllTokens: (tokens: Token[]) => anotarTopo(tokens) as never },
    renderer: {
      heading(this: { parser: { parseInline: (t: Token[]) => string } }, token: Tokens.Heading) {
        const nivel = Math.min(6, Math.max(1, token.depth + (op.deslocarTitulos ?? 0)));
        const texto = op.caixaDeFrase ? paraCaixaDeFrase(token.text) : token.text;
        const html = texto !== token.text ? escapar(texto) : this.parser.parseInline(token.tokens);
        const num = token.text.match(/^(\d+(?:\.\d+)*)\.?\s/);
        const id = num ? idItem(op.prefixo, num[1]) : op.idTitulo?.(token.text, nivel);
        return `<h${nivel}${atributoId(id)}>${html}</h${nivel}>\n`;
      },
      paragraph(this: { parser: { parse: (t: Token[]) => string; parseInline: (t: Token[]) => string } }, token: Tokens.Paragraph & Anotado) {
        if (!token._numero) return false;
        const corpo = `<p>${this.parser.parseInline(token.tokens)}</p>${token._filhos?.length ? this.parser.parse(token._filhos) : ''}`;
        return `<div class="md-item"${atributoId(idItem(op.prefixo, token._numero))}><span class="md-item-num">${escapar(token._numero)}.</span><div class="md-item-corpo">${corpo}</div></div>\n`;
      },
      list(this: { parser: { parse: (t: Token[]) => string } }, token: Tokens.List & Anotado) {
        if (!token._alineas) return false;
        const itens = token.items
          .map((item, i) => `<li><span class="md-alinea-marcador">${escapar(token._alineas!.marcadores[i])}</span><div class="md-alinea-corpo">${this.parser.parse(item.tokens)}</div></li>`)
          .join('\n');
        return `<ol class="md-alineas" type="${token._alineas.tipo}">\n${itens}\n</ol>\n`;
      },
      blockquote(this: { parser: { parse: (t: Token[]) => string } }, token: Tokens.Blockquote & Anotado) {
        if (!token._conceito) return false;
        const n = token._conceito.numero;
        return `<aside class="md-conceito"${atributoId(n ? idItem(op.prefixo, n) : undefined)} aria-label="Conceito${n ? ` ${n}` : ''}"><p class="md-conceito-rotulo">Conceito${n ? ` · ${escapar(n)}` : ''}</p>${this.parser.parse(token.tokens)}</aside>\n`;
      },
      table(this: { parser: { parseInline: (t: Token[]) => string } }, token: Tokens.Table) {
        const alinhar = (a: Tokens.TableCell['align']) => (a ? ` style="text-align:${a}"` : '');
        const cab = token.header.map(c => `<th scope="col"${alinhar(c.align)}>${this.parser.parseInline(c.tokens)}</th>`).join('');
        const linhas = token.rows.map(linha => {
          const cels = linha.map((c, ci) => {
            const bruto = c.text.trim();
            if (op.tabelaSimNao && /^(sim|não|nao)$/i.test(bruto)) {
              const sim = /^sim$/i.test(bruto);
              return `<td class="md-simnao${sim ? ' md-sim' : ' md-nao'}"><span aria-hidden="true">${sim ? '✓' : '—'}</span><span class="sr-only">${sim ? 'Sim' : 'Não'}</span></td>`;
            }
            let html = this.parser.parseInline(c.tokens);
            if (ci === 0 && op.linkTabela) {
              const l = op.linkTabela(bruto);
              if (l) html = `<a href="${escapar(l.href)}"${l.secao ? ` data-secao="${escapar(l.secao)}"` : ''}>${html}</a>`;
            }
            return ci === 0 ? `<th scope="row"${alinhar(c.align)}>${html}</th>` : `<td${alinhar(c.align)}>${html}</td>`;
          }).join('');
          return `<tr>${cels}</tr>`;
        }).join('\n');
        return `<div class="md-tabela" role="region" tabindex="0" aria-label="Tabela (role para os lados)"><table>\n<thead><tr>${cab}</tr></thead>\n<tbody>\n${linhas}\n</tbody></table></div>\n`;
      },
    },
  });
  return m;
};

/** Markdown → HTML com a estrutura de texto normativo (ver o cabeçalho do arquivo). */
export const renderizarNorma = (markdown: string, opcoes: OpcoesNorma = {}): string =>
  criarMarked(opcoes).parse(markdown) as string;

// ─── Busca no texto ──────────────────────────────────────────────────────────

/** Minúsculas e sem acento, com o mapa de cada caractere normalizado para o índice no original. */
export const normalizarComMapa = (s: string): { texto: string; mapa: number[] } => {
  let texto = '';
  const mapa: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const n = s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (let k = 0; k < n.length; k++) { texto += n[k]; mapa.push(i); }
  }
  return { texto, mapa };
};

/** Ocorrências de `termo` em `texto` (sem diferenciar caixa nem acento), como [início, fim) no texto original. */
export const acharOcorrencias = (texto: string, termo: string): Array<[number, number]> => {
  const alvo = normalizarComMapa(termo.trim()).texto;
  if (!alvo) return [];
  const { texto: norm, mapa } = normalizarComMapa(texto);
  const res: Array<[number, number]> = [];
  let de = 0;
  for (;;) {
    const i = norm.indexOf(alvo, de);
    if (i < 0) break;
    res.push([mapa[i], mapa[i + alvo.length - 1] + 1]);
    de = i + alvo.length;
  }
  return res;
};
