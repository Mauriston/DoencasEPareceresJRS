// Ficheiro: utils/destaquesTexto.ts
// Âncora dos "Destaques do Presidente" (formatação feita pelo Admin sobre o texto das normas, sem alterar os .md):
// cada marcação guarda o trecho exato e um pouco do texto antes e depois (seletor de citação, como o
// W3C Web Annotation). Ao reabrir a página, o trecho é procurado no texto renderizado; se o .md mudou e o
// trecho sumiu, a marcação fica "órfã" para o Admin revisar.

export type TipoDestaque = 'negrito' | 'amarelo' | 'ambos' | 'sublinhado' | 'citacao' | 'nota';

export const TIPOS_DESTAQUE: { tipo: TipoDestaque; rotulo: string; icone: string }[] = [
  { tipo: 'negrito', rotulo: 'Negrito', icone: 'format_bold' },
  { tipo: 'amarelo', rotulo: 'Destaque amarelo', icone: 'ink_highlighter' },
  { tipo: 'ambos', rotulo: 'Negrito + destaque', icone: 'format_color_text' },
  { tipo: 'sublinhado', rotulo: 'Sublinhado', icone: 'format_underlined' },
  { tipo: 'citacao', rotulo: 'Citação (parágrafo)', icone: 'format_quote' },
  { tipo: 'nota', rotulo: 'Nota', icone: 'sticky_note_2' },
];

export interface AncoraTexto {
  /** Trecho exato selecionado. */
  texto: string;
  /** Até CONTEXTO caracteres antes e depois do trecho (desempate entre ocorrências repetidas). */
  prefixo: string;
  sufixo: string;
}

export const CONTEXTO = 40;

export const criarAncora = (completo: string, inicio: number, fim: number): AncoraTexto => ({
  texto: completo.slice(inicio, fim),
  prefixo: completo.slice(Math.max(0, inicio - CONTEXTO), inicio),
  sufixo: completo.slice(fim, fim + CONTEXTO),
});

/** Quantos caracteres do fim de `a` coincidem com o fim de `b` (e vice-versa para o início). */
const sufixoComum = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
};
const prefixoComum = (a: string, b: string) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

/**
 * Posição [início, fim) do trecho no texto atual; null se não existir mais (órfã). Entre várias ocorrências,
 * fica a de maior contexto em comum com o gravado.
 */
export const localizarAncora = (completo: string, a: AncoraTexto): [number, number] | null => {
  if (!a.texto) return null;
  let melhor: [number, number] | null = null;
  let melhorNota = -1;
  for (let i = completo.indexOf(a.texto); i !== -1; i = completo.indexOf(a.texto, i + 1)) {
    const fim = i + a.texto.length;
    const nota = sufixoComum(completo.slice(Math.max(0, i - CONTEXTO), i), a.prefixo)
      + prefixoComum(completo.slice(fim, fim + CONTEXTO), a.sufixo);
    if (nota > melhorNota) { melhor = [i, fim]; melhorNota = nota; }
  }
  return melhor;
};
