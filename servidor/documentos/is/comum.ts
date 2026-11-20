// Ficheiro: servidor/documentos/is/comum.ts
// Peças compartilhadas pelos geradores dos documentos da IS (um arquivo por tipo nesta pasta):
//  - resolverAssinante: quem gerou (rubrica se Admin) ou sempre o Presidente (config/emails → assinatura) com rubrica;
//  - blocoAssinatura: bloco centralizado (nome, posto, cargo, CRM/RQE) com a rubrica do Presidente por cima,
//    no mesmo padrão das guias de exames (servidor/documentos/guiasExames/documento.ts);
//  - cabecalhoGuias / documentoGuias: página no modelo das guias (brasão, MARINHA… e caixa cinza da IS);
//  - cabecalhoSigilo / documentoBasico: página com o bloco "INFORMAÇÃO PESSOAL" + brasão e SEM a caixa cinza
//    (Papeleta de Dispensa e Laudo Pericial);
//  - texto/textoLongo: limpeza dos campos do formulário.
import type { Firestore } from 'firebase-admin/firestore';
import { esc, dataMilitar, LARGURA_UTIL_PT } from '../layoutOficial';
import { IMG_BRASAO, PAGINA_ALTURA_PT, PAGINA_LARGURA_PT } from '../paginado';
import { RUBRICA_PNG_BASE64 } from '../guiasExames/imagens';
import { cargoSemJrs } from '../../../config/emails';
import type { AssinanteDocumento, ISDocumento } from './tipos';

export { esc, dataMilitar };

export const texto = (v: unknown, max = 300): string => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
export const textoLongo = (v: unknown, max = 8000): string => String(v ?? '').replace(/\r\n?/g, '\n').split('\n')
  .map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

/** CRM/RQE do Presidente (fixos, como nas guias). */
export const CRM_PRESIDENTE = '20674';
export const RQE_PRESIDENTE = '16460';

interface UsuarioFs { perfil?: string; nome?: string; postoGraduacao?: string; cargo?: string; crmPe?: string; rqe?: string }

export const resolverAssinante = async (db: Firestore, uid: string, modo: 'gerador' | 'presidente'): Promise<AssinanteDocumento> => {
  const { lerConfigEmails } = await import('../../email/comum');
  const presidente = async (): Promise<AssinanteDocumento> => {
    const { assinatura } = await lerConfigEmails(db);
    return {
      uid: 'presidente', nome: assinatura.presidenteNome, postoGraduacao: assinatura.presidentePosto, cargo: 'Presidente',
      crmPe: CRM_PRESIDENTE, rqe: RQE_PRESIDENTE, rubrica: true, origem: 'presidente',
    };
  };
  if (modo === 'presidente') return presidente();
  const u = ((await db.collection('usuarios').doc(uid).get()).data() || {}) as UsuarioFs;
  // Admin = Presidente: assina com os dados do Presidente e a rubrica.
  if (u.perfil === 'admin') return { ...(await presidente()), uid, origem: 'gerador' };
  return {
    uid, nome: String(u.nome || '').trim(), postoGraduacao: String(u.postoGraduacao || '').trim(), cargo: cargoSemJrs(u.cargo || ''),
    crmPe: String(u.crmPe || '').trim(), rqe: String(u.rqe || '').trim(), rubrica: false, origem: 'gerador',
  };
};

// ---------------------------------------------------------------- Layout

const MARGEM_ESQ = 85.04;
const MARGEM_TOPO = 56.69;
const LINHA_TEXTO = 12 * 1.2207 * 1.15;
const BLOCO = 4 * LINHA_TEXTO;
const RUBRICA_ALTURA = 1.6 * BLOCO;
const RUBRICA_LARGURA = RUBRICA_ALTURA * 157 / 270;
const COLUNA = LARGURA_UTIL_PT / 2;

/** CSS base das páginas dos documentos da IS (A4 fixo, Carlito, como as guias). */
export const CSS_BASE = `
  @page { size: ${PAGINA_LARGURA_PT}pt ${PAGINA_ALTURA_PT}pt; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Carlito', 'Calibri', sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pagina { position: relative; width: ${PAGINA_LARGURA_PT}pt; height: ${PAGINA_ALTURA_PT}pt; overflow: hidden; page-break-after: always; break-after: page; }
  .pagina:last-child { page-break-after: auto; break-after: auto; }
  .corpo { position: absolute; left: ${MARGEM_ESQ}pt; top: ${MARGEM_TOPO}pt; width: ${LARGURA_UTIL_PT}pt; }
  .p { margin: 0; font-size: 12pt; line-height: 1.2207; }
  .p:empty::before { content: '\\200b'; }
  .c { text-align: center; } .b { font-weight: 700; } .j { text-align: justify; }
  .sb6 { margin-bottom: 6pt; } .sb10 { margin-bottom: 10pt; }
  .titulo { font-size: 14pt; margin: 10pt 0 10pt; }
  .caixa { background: #f6f6f6; border: 0.5pt solid #ccc; padding: 6pt; }
  .caixa .linha { font-size: 13pt; margin-bottom: 5pt; padding-left: 98.37pt; text-indent: -98.37pt; }
  .caixa .linha:last-child { margin-bottom: 0; }
  .caixa .rot { display: inline-block; width: 98.37pt; text-indent: 0; }
  .hr { border-top: 1pt solid #888; margin: 10pt 0; }
  .sigilo { text-align: center; color: #cc0000; line-height: 1.2207; }
  .sigilo .t { font-size: 12pt; font-weight: 700; } .sigilo div { font-size: 10pt; } .sigilo .it { font-style: italic; }
  /* Assinatura: bloco de largura de meia página, centralizado (ou à direita), rubrica por cima da linha. */
  .assinatura { position: relative; width: ${COLUNA}pt; margin: 0 auto; padding: 6.5pt 5pt 0; border-top: 1pt solid #000; break-inside: avoid; }
  .assinatura.direita { margin: 0 0 0 auto; }
  .assinatura .p { line-height: calc(1.2207 * 1.15); text-align: center; }
  .assinatura .rubrica { position: absolute; z-index: 2; left: ${(COLUNA - RUBRICA_LARGURA) / 2}pt; top: ${0.3 * BLOCO - RUBRICA_ALTURA}pt;
    width: ${RUBRICA_LARGURA}pt; height: ${RUBRICA_ALTURA}pt; }
`;

/** Bloco de assinatura (linha, nome, posto, cargo, CRM/RQE) com a rubrica quando `a.rubrica`. */
export const blocoAssinatura = (a: AssinanteDocumento, o: { direita?: boolean } = {}): string => {
  const crm = [a.crmPe && `CRM-PE: ${a.crmPe}`, a.rqe && `RQE: ${a.rqe}`].filter(Boolean).join(' | ');
  return `<div class="assinatura${o.direita ? ' direita' : ''}">
    ${a.rubrica ? `<img class="rubrica" alt="" src="data:image/png;base64,${RUBRICA_PNG_BASE64}">` : ''}
    <p class="p b">${esc(a.nome.toUpperCase())}</p>
    ${a.postoGraduacao ? `<p class="p">${esc(a.postoGraduacao)}</p>` : ''}
    ${a.cargo ? `<p class="p">${esc(a.cargo)}</p>` : ''}
    ${crm ? `<p class="p">${esc(crm)}</p>` : ''}
  </div>`;
};

/** Brasão + MARINHA DO BRASIL / HOSPITAL NAVAL DE RECIFE / JUNTA REGULAR DE SAÚDE. */
export const cabecalhoInstitucional = () => `
  <div style="height:61.7pt">${IMG_BRASAO}</div>
  <p class="p c b sb6">MARINHA DO BRASIL</p>
  <p class="p c b sb6">HOSPITAL NAVAL DE RECIFE</p>
  <p class="p c b sb6">JUNTA REGULAR DE SAÚDE</p>`;

/** Bloco vermelho "INFORMAÇÃO PESSOAL – ACESSO RESTRITO". */
export const blocoSigilo = () => `
  <div class="sigilo sb10">
    <div class="t">INFORMAÇÃO PESSOAL – ACESSO RESTRITO</div>
    <div>Art. 5º, Inciso X, da Constituição Federal/1988</div>
    <div>Art. 31 da Lei n° 12.527, de 18 de novembro de 2011</div>
    <div class="it">Art. 55 ao Art. 62 do dec nº7.724, de 16 de novembro de 2012</div>
  </div>`;

/** Modelo das guias: cabeçalho institucional, título e a caixa cinza Inspecionado / Finalidade IS / SINAIS. */
export const cabecalhoGuias = (titulo: string, is: Pick<ISDocumento, 'inspecionado' | 'finalidade' | 'is'>) => `
  ${cabecalhoInstitucional()}
  <p class="p c b titulo">${esc(titulo)}</p>
  <div class="caixa">
    <p class="p linha"><span class="rot">Inspecionado:</span><b>${esc(is.inspecionado)}</b></p>
    <p class="p linha"><span class="rot">Finalidade IS:</span>${esc(is.finalidade)}</p>
    <p class="p linha"><span class="rot">SINAIS:</span>${esc(is.is)}</p>
  </div>`;

/** Documento HTML de uma página A4 (fluxo livre dentro de .corpo); `css` extra opcional. */
export const documentoUmaPagina = (titulo: string, corpo: string, css = ''): string => `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS_BASE}${css}</style></head>
<body><section class="pagina"><div class="corpo">${corpo}</div></section></body></html>`;

/** "Recife, PE, 20NOV2026." */
export const localData = (agora: Date) => `Recife, PE, ${dataMilitar(agora)}.`;

/** Nome do inspecionado sem posto/NIP ("CT (Md) 12.3456.78 FULANO" → "FULANO"): tudo depois do NIP, se houver. */
export const nomeSemPostoNip = (inspecionado: string): string => {
  const m = /\d{2}\.?\d{4}\.?\d{2}\s+(.+)$/.exec(String(inspecionado || '').trim());
  return (m ? m[1] : String(inspecionado || '')).trim();
};
