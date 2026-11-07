// Ficheiro: servidor/documentos/paginado.ts
// Base dos documentos oficiais que podem ter mais de uma página (o texto cresce com o histórico, os
// quesitos ou os exames): o corpo flui entre as margens e o que se repete em toda página — cabeçalho e
// rodapé de sigilo, assinatura no rodapé, "- n de N -" — vai numa sobreposição posicionada em
// coordenadas absolutas da página (no Chromium, o headerTemplate usa a página inteira como referência).
// Medidas em pt, tiradas dos PDFs exportados dos templates do Google Docs (ver layoutOficial.ts).
import { esc } from './layoutOficial';
import { BRASAO_PNG_BASE64 } from './brasao';

export const PAGINA_LARGURA_PT = 595.28;
export const PAGINA_ALTURA_PT = 841.89;

export interface Margens { topo: number; base: number; esq: number; dir: number }

/** Documento pronto para o PDF: HTML do corpo + o que vai em toda página. */
export interface DocumentoPaginado {
  html: string;
  margens: Margens;
  /** HTML com elementos em posição absoluta (pt, a partir do canto da página); repetido em toda página. */
  sobreposicao?: string;
}

/** Bloco "INFORMAÇÃO PESSOAL – ACESSO RESTRITO" em posição absoluta (para a sobreposição). */
export const sigiloAbsoluto = (o: { topo: number; centro: number; titulo: number; linhas: number; cor: string }): string => `
  <div style="position:absolute;top:${o.topo}pt;left:${o.centro - 200}pt;width:400pt;text-align:center;color:${o.cor};font-family:Carlito,Calibri,sans-serif;white-space:nowrap;-webkit-print-color-adjust:exact">
    <div style="font-size:${o.titulo}pt;line-height:1.2207;font-weight:700">INFORMAÇÃO PESSOAL – ACESSO RESTRITO</div>
    <div style="font-size:${o.linhas}pt;line-height:1.2207">Art. 5º, Inciso X, da Constituição Federal/1988</div>
    <div style="font-size:${o.linhas}pt;line-height:1.2207">Art. 31 da Lei n° 12.527, de 18 de novembro de 2011</div>
    <div style="font-size:${o.linhas}pt;line-height:1.2207;font-style:italic">Art. 55 ao Art. 62 do dec nº7.724, de 16 de novembro de 2012</div>
  </div>`;

/** Texto em posição absoluta, centralizado num ponto x (para a sobreposição). */
export const textoAbsoluto = (o: { topo: number; centro: number; html: string; tamanho?: number; negrito?: boolean; largura?: number }): string => {
  const largura = o.largura ?? 300;
  return `<div style="position:absolute;top:${o.topo}pt;left:${o.centro - largura / 2}pt;width:${largura}pt;text-align:center;font-family:Carlito,Calibri,sans-serif;font-size:${o.tamanho ?? 12}pt;line-height:1.2207;${o.negrito ? 'font-weight:700;' : ''}color:#000">${o.html}</div>`;
};

export const IMG_BRASAO = `<img alt="" src="data:image/png;base64,${BRASAO_PNG_BASE64}" style="display:block;width:56.7pt;height:56.7pt;margin:0 auto">`;

/** Texto livre (histórico, quesitos, exames): escapado, com as quebras de linha preservadas. */
export const textoLivre = (v: unknown): string => esc(String(v ?? '').replace(/\r\n?/g, '\n').trim());

const CSS_BASE = `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Carlito', 'Calibri', sans-serif; font-size: 12pt; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  /* Nada pode passar da margem direita no fluxo: o Chromium encolheria a página inteira para caber. */
  .p { margin: 0; font-size: 12pt; line-height: 1.2207; white-space: pre-wrap; }
  .p:empty::before { content: '\\200b'; }
  /* Google Docs: o espaço extra do espaçamento > 1 fica só abaixo da linha; o CSS divide meio a meio. */
  .l115 { line-height: calc(1.2207 * 1.15); position: relative; top: calc(-1.2207em * 0.075); }
  .c { text-align: center; } .d { text-align: right; } .j { text-align: justify; }
  .b { font-weight: 700; }
  .quebra { break-before: page; }
`;

/** Monta o HTML. A largura útil vem da página (gerarPdf ajusta a janela a ela para medir igual à impressão). */
export const documentoPaginado = (titulo: string, margens: Margens, css: string, corpo: string, sobreposicao?: string): DocumentoPaginado => ({
  margens,
  sobreposicao,
  html: `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>${CSS_BASE} @page { size: ${PAGINA_LARGURA_PT}pt ${PAGINA_ALTURA_PT}pt; margin: ${margens.topo}pt ${margens.dir}pt ${margens.base}pt ${margens.esq}pt; } ${css}</style></head>
<body>${corpo}</body></html>`,
});
