// Ficheiro: servidor/documentos/layoutOficial.ts
// Base dos documentos oficiais da JRS/HNRe gerados em HTML + CSS e impressos em PDF pelo Chromium
// (servidor/documentos/gerarPdf.ts). Reproduz a página dos templates do Google Docs que eles
// substituem: A4, margens de 3 cm (esq.) e 1,5 cm (dir.), fonte Carlito (métrica idêntica à Calibri,
// a mesma que o Google Docs embute nos PDFs), cabeçalho e rodapé vermelhos "INFORMAÇÃO PESSOAL –
// ACESSO RESTRITO" e o brasão da República.
//
// Medidas em pt, tiradas dos PDFs exportados dos templates (pdftotext -bbox) e conferidas por
// sobreposição (scripts/documentos/comparar-com-template.mjs). A altura de linha do Google Docs é a
// métrica natural da fonte (Carlito: 1,2207 × corpo) multiplicada pelo espaçamento do parágrafo.
import { BRASAO_PNG_BASE64 } from './brasao';

/** Largura útil da página: 595,28 − 85,04 (3 cm) − 42,52 (1,5 cm). */
export const LARGURA_UTIL_PT = 467.72;
const MARGEM_ESQ_PT = 85.04;

/** Escapa texto para HTML (os dados vêm do Firestore/usuário). */
export const esc = (v: unknown): string => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Data no padrão militar DDMMMAAAA (ex.: 07NOV2026), no fuso de Recife. */
export const dataMilitar = (agora: Date = new Date()): string => {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Recife', day: '2-digit', month: '2-digit', year: 'numeric' }).formatToParts(agora);
  const v = (t: string) => p.find(x => x.type === t)?.value || '';
  const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${v('day')}${MESES[Number(v('month')) - 1]}${v('year')}`;
};

/** Bloco "INFORMAÇÃO PESSOAL – ACESSO RESTRITO" com as três bases legais. */
export interface BlocoSigilo {
  /** Topo do bloco (pt, a partir do topo da página). */
  topo: number;
  /** Centro horizontal do texto (pt, a partir da borda esquerda). */
  centro: number;
  /** Corpo do título e das linhas de base legal. */
  titulo: number;
  linhas: number;
}

const blocoSigilo = (b: BlocoSigilo, classe = ''): string => `
  <div class="sigilo ${classe}" style="top:${b.topo}pt;left:${b.centro - 200}pt;--t:${b.titulo}pt;--l:${b.linhas}pt">
    <div class="sigilo-titulo">INFORMAÇÃO PESSOAL – ACESSO RESTRITO</div>
    <div>Art. 5º, Inciso X, da Constituição Federal/1988</div>
    <div>Art. 31 da Lei n° 12.527, de 18 de novembro de 2011</div>
    <div class="it">Art. 55 ao Art. 62 do dec nº7.724, de 16 de novembro de 2012</div>
  </div>`;

const CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Carlito', 'Calibri', sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pagina { position: relative; width: 595.28pt; height: 841.89pt; overflow: hidden; page-break-after: always; }
  .pagina:last-child { page-break-after: auto; }
  .sigilo { position: absolute; width: 400pt; text-align: center; color: #cc0000; white-space: nowrap; }
  .sigilo > div { font-size: var(--l); line-height: 1.2207; }
  .sigilo .sigilo-titulo { font-size: var(--t); font-weight: 700; }
  .sigilo .it { font-style: italic; }
  .corpo { position: absolute; left: ${MARGEM_ESQ_PT}pt; width: ${LARGURA_UTIL_PT}pt; }
  /* Parágrafo no modelo do Google Docs: corpo 12 pt, espaçamento simples (1,2207 = métrica da Carlito). */
  .p { margin: 0; font-size: 12pt; line-height: 1.2207; white-space: pre-wrap; }
  .p:empty::before { content: '\\200b'; }
  .l115 { line-height: calc(1.2207 * 1.15); }
  /* O Google Docs põe o espaço extra do espaçamento 1,5 só abaixo da linha; o CSS divide meio a meio.
     Sobe o texto meia entrelinha (sem mudar o fluxo) para a 1ª linha cair no mesmo lugar. */
  .l150 { line-height: calc(1.2207 * 1.5); position: relative; top: calc(-1.2207em * 0.25); }
  .c { text-align: center; }
  .j { text-align: justify; }
  .b { font-weight: 700; }
  .sb3 { margin-bottom: 3pt; }
  .sb10 { margin-bottom: 10pt; }
  .f9 { font-size: 9pt; color: #434343; }
  .f10 { font-size: 10pt; }
  /* Coluna de assinaturas: recuo de 8 cm a partir da margem esquerda, texto centralizado. */
  .ass { margin-left: 226.77pt; text-align: center; }
  /* Linha horizontal do Google Docs: parágrafo de uma linha com o traço cinza a ~9 pt do topo. */
  .hr { position: relative; height: calc(12pt * 1.2207); }
  .hr::after { content: ''; position: absolute; left: 2.9pt; right: 3.66pt; top: 9.03pt; border-top: 1pt solid #888; }
  .brasao { height: 60.4pt; }
  .brasao img { display: block; width: 56.7pt; height: 56.7pt; margin: 0 auto; }
  sup { font-size: 0.65em; line-height: 0; vertical-align: 0.42em; }
`;

export interface PaginaOficial {
  /** HTML do corpo (sem o brasão e o "MARINHA DO BRASIL…", que entram aqui). */
  corpo: string;
  cabecalho: BlocoSigilo;
  rodape: BlocoSigilo;
}

/** Documento HTML completo de uma ou mais páginas A4 no layout oficial. */
export const documentoOficial = (titulo: string, paginas: PaginaOficial[]): string => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS}</style></head>
<body>${paginas.map(p => `
  <section class="pagina">
    ${blocoSigilo(p.cabecalho)}
    <div class="corpo" style="top:99.7pt">
      <div class="brasao"><img alt="" src="data:image/png;base64,${BRASAO_PNG_BASE64}"></div>
      <p class="p l115 c b">MARINHA DO BRASIL</p>
      <p class="p l115 c b">HOSPITAL NAVAL DE RECIFE</p>
      <p class="p l115 c b">JUNTA REGULAR DE SAÚDE</p>
      ${p.corpo}
    </div>
    ${blocoSigilo(p.rodape, 'rodape')}
  </section>`).join('')}
<script>
  // Nomes longos podem quebrar linha e empurrar o corpo sobre o rodapé. Antes de imprimir
  // (gerarPdf chama __ajustar), remove linhas em branco flexíveis (.esp) até o corpo caber.
  window.__ajustar = () => {
    document.querySelectorAll('.pagina').forEach(pg => {
      const corpo = pg.querySelector('.corpo'), rod = pg.querySelector('.rodape');
      const limite = () => rod.getBoundingClientRect().top - 2;
      let esp = [...corpo.querySelectorAll('.esp')].reverse();
      while (corpo.getBoundingClientRect().bottom > limite() && esp.length) esp.shift().remove();
    });
  };
</script>
</body></html>`;
