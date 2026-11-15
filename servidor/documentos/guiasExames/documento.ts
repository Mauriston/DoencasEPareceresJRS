// Ficheiro: servidor/documentos/guiasExames/documento.ts
// GUIAS DE EXAMES da IS em HTML + CSS (impressas em PDF pelo Chromium — servidor/documentos/gerarPdf.ts):
// um único documento com uma página A4 por guia, no modelo "SOLICITAÇÃO DE EXAMES COMPLEMENTARES
// PERICIAIS" dos templates do Google Docs da JRS (estrutura em .especificacao/TEMPLATES_GUIAS.md; o mesmo
// desenho de docSolicitacaoExames em servidor/documentos/solicitacoesConcurso.ts):
//   brasão, MARINHA DO BRASIL / HOSPITAL NAVAL DE RECIFE / JUNTA REGULAR DE SAÚDE, título, caixa
//   Inspecionado / Finalidade IS / SINAIS, "SOLICITO:", o conteúdo da guia, "Recife, PE, {data}" e a
//   assinatura do Presidente com a rubrica sobreposta à linha.
// Conteúdo por tipo de página (utils/guiasExames.ts → paginasDasGuias):
//   laboratoriais (duas colunas, ordem alfabética), audiometria (tabela de limiares e campo do
//   fonoaudiólogo), odontológico (odontograma na largura útil), oftalmologia especial, laudo
//   ginecológico e um exame por página (imagem e "Outros exames").
// Cada página tem altura fixa (sem fluxo entre páginas): o conteúdo de uma guia sempre cabe numa folha.
import { esc, dataMilitar, LARGURA_UTIL_PT } from '../layoutOficial';
import { IMG_BRASAO, PAGINA_ALTURA_PT, PAGINA_LARGURA_PT } from '../paginado';
import type { PaginaGuia } from '../../../utils/guiasExames';
import { ODONTOGRAMA_PNG_BASE64, RUBRICA_PNG_BASE64 } from './imagens';

export interface DadosGuiasExames {
  /** Número da IS no SINAIS. */
  numeroIS: string | number;
  /** "POSTO (QUADRO) NIP NOME" (campo inspecionado da IS). */
  inspecionado: string;
  finalidade: string;
  paginas: PaginaGuia[];
  /** Assinatura (config/emails → assinatura do Presidente); CRM e RQE são fixos. */
  presidenteNome: string;
  presidentePosto: string;
  /** Data de emissão (padrão: hoje, em Recife) ou o texto já formatado. */
  hoje?: Date;
  dataEmissao?: string;
}

const MARGEM_ESQ = 85.04;
const MARGEM_TOPO = 56.69;
/** Linha de assinatura do Presidente (pt a partir do topo da página). */
const LINHA_ASSINATURA = 712;
/** Altura de linha do bloco de assinatura (12 pt, espaçamento 1,15 da Carlito). */
const LINHA_TEXTO = 12 * 1.2207 * 1.15;
const BLOCO_ASSINATURA = 4 * LINHA_TEXTO;
// Rubrica: ~1,6× a altura do bloco de 4 linhas, centrada na coluna, com a base cruzando a linha e o nome
// (.especificacao/referencia-assinatura.png). PNG de 157×270 px.
const RUBRICA_ALTURA = 1.6 * BLOCO_ASSINATURA;
const RUBRICA_LARGURA = RUBRICA_ALTURA * 157 / 270;
const RUBRICA_BASE_ABAIXO_DA_LINHA = 0.3 * BLOCO_ASSINATURA;
const COLUNA = LARGURA_UTIL_PT / 2;

const FREQUENCIAS = ['250', '500', '750', '1K', '1,5K', '2K', '3K', '4K', '6K', '8K'];

const CSS = `
  @page { size: ${PAGINA_LARGURA_PT}pt ${PAGINA_ALTURA_PT}pt; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Carlito', 'Calibri', sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pagina { position: relative; width: ${PAGINA_LARGURA_PT}pt; height: ${PAGINA_ALTURA_PT}pt; overflow: hidden; page-break-after: always; break-after: page; }
  .pagina:last-child { page-break-after: auto; break-after: auto; }
  .corpo { position: absolute; left: ${MARGEM_ESQ}pt; top: ${MARGEM_TOPO}pt; width: ${LARGURA_UTIL_PT}pt; }
  .p { margin: 0; font-size: 12pt; line-height: 1.2207; }
  .p:empty::before { content: '\\200b'; }
  .c { text-align: center; } .b { font-weight: 700; }
  .sb6 { margin-bottom: 6pt; }
  .titulo { font-size: 14pt; margin: 10pt 0 10pt; }
  /* Caixa cinza Inspecionado / Finalidade IS / SINAIS (bordas, fundo e tabulação do template). */
  .caixa { background: #f6f6f6; border: 0.5pt solid #ccc; padding: 6pt 6pt 6pt 6pt; }
  .caixa .linha { font-size: 13pt; margin-bottom: 5pt; padding-left: 98.37pt; text-indent: -98.37pt; }
  .caixa .linha:last-child { margin-bottom: 0; }
  .caixa .rot { display: inline-block; width: 98.37pt; text-indent: 0; }
  .solicito { font-size: 14pt; line-height: 1.2207; margin: 14pt 0 12pt; }
  /* Exames: corpo 13 pt com o recuo do template. */
  .exames { margin: 0; padding: 0 0 0 14.17pt; list-style: none; }
  .exames li { font-size: 13pt; line-height: calc(1.2207 * 1.5); break-inside: avoid; }
  .duas-colunas { column-count: 2; column-gap: 36pt; }
  .exame-unico { font-size: 13pt; padding-left: 14.17pt; line-height: 1.2207; }
  /* Audiometria: tabela 3 × 11 (dB e frequências; OD e OE). */
  .audiometria { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 4pt; }
  .audiometria td { border: 0.75pt solid #000; text-align: center; font-size: 11pt; line-height: 1.2207; height: 22pt; padding: 0; }
  .audiometria tr + tr td { height: 34pt; }
  .audiometria td:first-child { font-weight: 700; }
  .odontograma { display: block; width: ${LARGURA_UTIL_PT}pt; height: auto; }
  /* Assinatura: data à esquerda; Presidente à direita, sob a linha, com a rubrica por cima. */
  .assinatura { position: absolute; left: ${MARGEM_ESQ}pt; width: ${LARGURA_UTIL_PT}pt; top: ${LINHA_ASSINATURA}pt; display: flex; }
  .assinatura .lado { position: relative; width: ${COLUNA}pt; padding: 6.5pt 5pt 0; }
  .assinatura .lado .p { line-height: calc(1.2207 * 1.15); }
  .assinatura .linha-ass { border-top: 1pt solid #000; }
  .rubrica { position: absolute; z-index: 2; left: ${(COLUNA - RUBRICA_LARGURA) / 2}pt; top: ${RUBRICA_BASE_ABAIXO_DA_LINHA - RUBRICA_ALTURA}pt;
    width: ${RUBRICA_LARGURA}pt; height: ${RUBRICA_ALTURA}pt; }
  /* Audiometria: a data sobe uma linha, acima das duas assinaturas (Fonoaudiólogo(a) | Presidente). */
  .assinatura.dupla .data { position: absolute; left: 5pt; top: -${LINHA_TEXTO + 30}pt; white-space: nowrap; }
`;

const cabecalho = (d: DadosGuiasExames) => `
  <div style="height:61.7pt">${IMG_BRASAO}</div>
  <p class="p c b sb6">MARINHA DO BRASIL</p>
  <p class="p c b sb6">HOSPITAL NAVAL DE RECIFE</p>
  <p class="p c b sb6">JUNTA REGULAR DE SAÚDE</p>
  <p class="p c b titulo">SOLICITAÇÃO DE EXAMES COMPLEMENTARES PERICIAIS</p>
  <div class="caixa">
    <p class="p linha"><span class="rot">Inspecionado:</span><b>${esc(d.inspecionado)}</b></p>
    <p class="p linha"><span class="rot">Finalidade IS:</span>${esc(d.finalidade)}</p>
    <p class="p linha"><span class="rot">SINAIS:</span>${esc(d.numeroIS)}</p>
  </div>`;

const presidente = (d: DadosGuiasExames) => `
  <div class="lado linha-ass">
    <img class="rubrica" alt="" src="data:image/png;base64,${RUBRICA_PNG_BASE64}">
    <p class="p c b">${esc(d.presidenteNome.toUpperCase())}</p>
    <p class="p c">${esc(d.presidentePosto)}</p>
    <p class="p c">Presidente</p>
    <p class="p c">CRM-PE: 20674 | RQE: 16460</p>
  </div>`;

const assinatura = (d: DadosGuiasExames, fono: boolean) => {
  const data = `<p class="p b data">Recife, PE, ${esc(d.dataEmissao ?? dataMilitar(d.hoje))}</p>`;
  return fono
    ? `<div class="assinatura dupla">
        <div class="lado linha-ass" style="margin-right:24pt;width:${COLUNA - 24}pt">${data}<p class="p c b">Fonoaudiólogo(a)</p></div>
        ${presidente(d)}
      </div>`
    : `<div class="assinatura"><div class="lado">${data}</div>${presidente(d)}</div>`;
};

const solicito = (texto = '') => `<p class="p b solicito">SOLICITO:${texto ? ` ${esc(texto)}` : ''}</p>`;

/** Conteúdo de uma guia (depois da caixa do inspecionado). */
const conteudo = (p: PaginaGuia): string => {
  switch (p.tipo) {
    case 'laboratoriais':
      return `${solicito()}<ul class="exames duas-colunas">${p.exames.map(e => `<li>${esc(e)}</li>`).join('')}</ul>`;
    case 'audiometria':
      return `${solicito('AUDIOMETRIA')}
        <table class="audiometria">
          <tr><td>dB</td>${FREQUENCIAS.map(f => `<td>${f}</td>`).join('')}</tr>
          <tr><td>OD</td>${FREQUENCIAS.map(() => '<td></td>').join('')}</tr>
          <tr><td>OE</td>${FREQUENCIAS.map(() => '<td></td>').join('')}</tr>
        </table>`;
    case 'odontologico':
      return `${solicito('EXAME ODONTOLÓGICO')}<img class="odontograma" alt="Odontograma" src="data:image/png;base64,${ODONTOGRAMA_PNG_BASE64}">`;
    case 'oftalmologiaEspecial':
      return solicito('AVALIAÇÃO OFTALMOLÓGICA ESPECIAL COM TONOMETRIA, FUNDOSCOPIA E BIOMICROSCOPIA');
    case 'ginecologico':
      return `${solicito()}<p class="p b exame-unico">LAUDO DETALHADO DO EXAME FÍSICO GINECOLÓGICO E DE MAMAS EMITIDO POR ESPECIALISTA</p>`;
    default:
      return `${solicito()}<p class="p b exame-unico">${esc(String(p.exames[0] ?? '').toUpperCase())}</p>`;
  }
};

/** Documento HTML único (uma página A4 por guia) para htmlParaPdf. */
export const htmlGuiasExames = (d: DadosGuiasExames): string => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Guias de exames - IS ${esc(d.numeroIS)}</title><style>${CSS}</style></head>
<body>${d.paginas.map(p => `
  <section class="pagina">
    <div class="corpo">${cabecalho(d)}${conteudo(p)}</div>
    ${assinatura(d, p.tipo === 'audiometria')}
  </section>`).join('')}
</body></html>`;
