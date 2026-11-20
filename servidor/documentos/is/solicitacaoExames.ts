// Ficheiro: servidor/documentos/is/solicitacaoExames.ts
// Solicitação de Exames da IS: mesmo modelo das guias de exames da abertura da IS (servidor/documentos/guiasExames/
// documento.ts) — brasão, título, caixa Inspecionado / Finalidade IS / SINAIS, "SOLICITO:", um exame por linha (na ordem
// digitada) em duas colunas, "Recife, PE, {data}" à esquerda e o assinante (médico que gerou; rubrica se Admin) à direita, na
// mesma altura fixa da página. `paginaModeloGuias` também é usada pela Declaração de Comparecimento.
// Ajustes (Admin › templates, config/documentosIS → solicitacaoExames): titulo, solicito, instrucoes (abaixo da lista)
// e observacao (rodapé) — só aparecem se preenchidos.
import { PERFIS_DOCUMENTO_IS, ROTULO_DOCUMENTO_IS } from '../../../utils/documentosIS';
import { LARGURA_UTIL_PT } from '../layoutOficial';
import { RUBRICA_PNG_BASE64 } from '../guiasExames/imagens';
import { cabecalhoGuias, dataMilitar, documentoUmaPagina, esc, textoLongo } from './comum';
import { ErroDocumentoIS, type AssinanteDocumento, type ContextoDocumentoIS, type GeradorDocumentoIS } from './tipos';

// ---------------------------------------------------------------- Modelo das guias (compartilhado)

const MARGEM_ESQ = 85.04;
const LINHA_ASSINATURA = 712;
const LINHA_TEXTO = 12 * 1.2207 * 1.15;
const BLOCO = 4 * LINHA_TEXTO;
const RUBRICA_ALTURA = 1.6 * BLOCO;
const RUBRICA_LARGURA = RUBRICA_ALTURA * 157 / 270;
const COLUNA = LARGURA_UTIL_PT / 2;

const CSS_GUIAS = `
  .solicito { font-size: 14pt; line-height: 1.2207; margin: 14pt 0 12pt; }
  .exames { margin: 0; padding: 0 0 0 14.17pt; list-style: none; }
  .exames li { font-size: 13pt; line-height: calc(1.2207 * 1.5); break-inside: avoid; }
  .duas-colunas { column-count: 2; column-gap: 36pt; }
  .obs-guia { font-size: 11pt; line-height: 1.3; margin: 14pt 0 0; white-space: pre-line; }
  .texto-guia { font-size: 13pt; line-height: 1.5; margin: 24pt 0 0; text-align: justify; }
  .ass-guia { position: absolute; left: ${MARGEM_ESQ}pt; width: ${LARGURA_UTIL_PT}pt; top: ${LINHA_ASSINATURA}pt; display: flex; }
  .ass-guia .lado { position: relative; width: ${COLUNA}pt; padding: 6.5pt 5pt 0; }
  .ass-guia .lado .p { line-height: calc(1.2207 * 1.15); }
  .ass-guia .linha-ass { border-top: 1pt solid #000; }
  .ass-guia .rub { position: absolute; z-index: 2; left: ${(COLUNA - RUBRICA_LARGURA) / 2}pt; top: ${0.3 * BLOCO - RUBRICA_ALTURA}pt;
    width: ${RUBRICA_LARGURA}pt; height: ${RUBRICA_ALTURA}pt; }
`;

const ladoAssinante = (a: AssinanteDocumento) => {
  const crm = [a.crmPe && `CRM-PE: ${a.crmPe}`, a.rqe && `RQE: ${a.rqe}`].filter(Boolean).join(' | ');
  return `<div class="lado linha-ass">
    ${a.rubrica ? `<img class="rub" alt="" src="data:image/png;base64,${RUBRICA_PNG_BASE64}">` : ''}
    <p class="p c b">${esc(a.nome.toUpperCase())}</p>
    ${a.postoGraduacao ? `<p class="p c">${esc(a.postoGraduacao)}</p>` : ''}
    ${a.cargo ? `<p class="p c">${esc(a.cargo)}</p>` : ''}
    ${crm ? `<p class="p c">${esc(crm)}</p>` : ''}
  </div>`;
};

/** Página única no modelo das guias: cabeçalho + caixa da IS, `conteudo`, data à esquerda e assinante à direita. */
export const paginaModeloGuias = (titulo: string, conteudo: string, ctx: ContextoDocumentoIS, nomeArquivo: string): string =>
  documentoUmaPagina(nomeArquivo, `${cabecalhoGuias(titulo, ctx.is)}${conteudo}`, CSS_GUIAS)
    .replace('</section>', `<div class="ass-guia"><div class="lado"><p class="p b">Recife, PE, ${esc(dataMilitar(ctx.agora))}</p></div>${ladoAssinante(ctx.assinante)}</div></section>`);

/** Ajuste de texto (string não vazia) ou o padrão. */
export const ajusteTexto = (ajustes: Record<string, unknown>, chave: string, padrao: string): string => {
  const v = ajustes?.[chave];
  return typeof v === 'string' && v.trim() ? v.trim() : padrao;
};

// ---------------------------------------------------------------- Solicitação de Exames

export const TITULO_SOLICITACAO_EXAMES = 'SOLICITAÇÃO DE EXAMES COMPLEMENTARES PERICIAIS';
const MAX_EXAMES = 60;

interface Dados { exames: string[] }

const EXAMES_TESTE = ['Hemograma completo', 'Glicemia de jejum', 'Creatinina', 'TGO / TGP', 'Ureia', 'EAS', 'Colesterol total e frações',
  'Triglicerídeos', 'TSH / T4 livre', 'Hemoglobina glicada', 'Eletrocardiograma', 'RX de tórax PA e perfil', 'Ácido úrico', 'Gama GT'];

export const gerador: GeradorDocumentoIS<Dados> = {
  tipo: 'solicitacaoExames',
  titulo: ROTULO_DOCUMENTO_IS.solicitacaoExames,
  perfis: PERFIS_DOCUMENTO_IS.solicitacaoExames,
  assinante: 'gerador',
  validar: dados => {
    const exames = textoLongo(dados.exames).split('\n').map(l => l.replace(/^[-•*\d.)\s]+(?=\S)/, '').trim()).filter(Boolean);
    if (!exames.length) throw new ErroDocumentoIS(400, 'Informe ao menos um exame (um por linha).');
    if (exames.length > MAX_EXAMES) throw new ErroDocumentoIS(400, `No máximo ${MAX_EXAMES} exames por solicitação.`);
    return { exames: exames.map(e => e.slice(0, 120)) };
  },
  dadosTeste: () => {
    const n = 4 + Math.floor(Math.random() * (EXAMES_TESTE.length - 3));
    return { exames: [...EXAMES_TESTE].sort(() => Math.random() - 0.5).slice(0, n) };
  },
  resumo: d => `${d.exames.length} exame${d.exames.length === 1 ? '' : 's'}`,
  gerarHtml: (d, ctx) => {
    const titulo = ajusteTexto(ctx.ajustes, 'titulo', TITULO_SOLICITACAO_EXAMES);
    const solicito = ajusteTexto(ctx.ajustes, 'solicito', 'SOLICITO:');
    return paginaModeloGuias(titulo, `
      <p class="p b solicito">${esc(solicito)}</p>
      <ul class="exames duas-colunas">${d.exames.map(e => `<li>${esc(e)}</li>`).join('')}</ul>
      ${[ajusteTexto(ctx.ajustes, 'instrucoes', ''), ajusteTexto(ctx.ajustes, 'observacao', '')].filter(Boolean).map(t => `<p class="p obs-guia">${esc(t)}</p>`).join('')}`,
    ctx, `${ROTULO_DOCUMENTO_IS.solicitacaoExames} - IS ${ctx.is.is}`);
  },
};
