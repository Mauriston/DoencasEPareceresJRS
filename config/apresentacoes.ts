// Ficheiro: config/apresentacoes.ts
// Apresentações feitas no Claude Design e publicadas como HTML estático em public/apresentacoes/<slug>/.
// Cada uma fica acessível publicamente (sem login) em <origem><base>apresentacoes/<slug>/ — é esse o
// link copiado/compartilhado na página Apresentações. Para incluir uma nova: exporte o HTML standalone
// do Claude Design para public/apresentacoes/<slug>/index.html (+ capa.jpg 16:9) e acrescente aqui.

export interface Apresentacao {
  /** Pasta em public/apresentacoes/ e id da contagem de visualizações. */
  slug: string;
  titulo: string;
  descricao?: string;
}

export const APRESENTACOES: Apresentacao[] = [
  { slug: 'lombalgia-simulacao', titulo: 'Lombalgia e Simulação', descricao: 'JRS · HNRe' },
];

const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

/** Caminho (mesma origem) do HTML da apresentação. */
export const caminhoApresentacao = (a: Apresentacao) => `${base}apresentacoes/${a.slug}/`;
export const capaApresentacao = (a: Apresentacao) => `${caminhoApresentacao(a)}capa.jpg`;
/** URL pública absoluta, para copiar/compartilhar. */
export const urlPublicaApresentacao = (a: Apresentacao) => new URL(caminhoApresentacao(a), window.location.origin).href;
