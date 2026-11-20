// Ficheiro: servidor/documentos/is/termoRecurso.ts
// Termo de Recurso da IS (Ficha › Gerar Documento): mesmo layout do Termo de Reconhecimento de Recurso dos concursos
// (servidor/documentos/termosConcurso.ts → paginaTermoRecurso), com título "IS {Finalidade}" (Benefícios → "IS para
// Concessão de Benefício"), corpo com a data do laudo e o nº da IS, assinatura do Presidente com rubrica e os avisos
// (prazos) por grupo abaixo do divisor. Ajustes (config/documentosIS.termoRecurso): titulo, tituloBeneficios,
// avisosVerificacoes[], avisosBeneficios[].
import { PERFIS_DOCUMENTO_IS, ROTULO_DOCUMENTO_IS, ehGrupoBeneficios } from '../../../utils/documentosIS';
import { documentoOficial, type BlocoSigilo } from '../layoutOficial';
import { RUBRICA_PNG_BASE64 } from '../guiasExames/imagens';
import { dataMilitar, esc } from './comum';
import type { ContextoDocumentoIS, GeradorDocumentoIS } from './tipos';

type Dados = Record<string, never>;

// Mesmas posições do bloco de sigilo do termo dos concursos.
const SIGILO = {
  cabecalho: { topo: 19.9, centro: 314.9, titulo: 14, linhas: 8 } as BlocoSigilo,
  rodape: { topo: 783.7, centro: 308.4, titulo: 14, linhas: 8 } as BlocoSigilo,
};

const AVISO_DOCUMENTOS = 'Todos os recursos deverão ser instruídos por documentos apensos que possam respaldar as pretensões do inspecionado, a fim de possibilitar o deferimento do pleito.';
const AVISO_NOVA_IS = 'Caso o requerimento seja deferido, o candidato será convocado para nova Inspeção de Saúde na JSD/COM3ºDN localizada no Hospital Naval de Natal.';

export const AVISOS_VERIFICACOES_PADRAO = [
  'Prazos para recursos à JSD para militares da ativa: até 45 dias a contar da data da comunicação do laudo pela JRS (data de assinatura deste termo).',
  'O recurso deve ser feito através de requerimento dirigido ao Titular do SDP, via Titular da OM do Militar.',
  AVISO_DOCUMENTOS, AVISO_NOVA_IS,
];
export const AVISOS_BENEFICIOS_PADRAO = [
  'Prazos para recursos à JSD: até 45 dias a contar da data da comunicação do laudo pela JRS (data de assinatura deste termo ou do envio do e-mail informando o resultado).',
  'O recurso deve ser feito através de requerimento junto à Capitania dos Portos do estado do inspecionado.',
  AVISO_DOCUMENTOS, AVISO_NOVA_IS,
];

const str = (v: unknown, padrao: string) => (typeof v === 'string' && v.trim() ? v.trim() : padrao);
const lista = (v: unknown, padrao: string[]) => {
  const l = (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : []).map(x => String(x ?? '').trim()).filter(Boolean);
  return l.length ? l : padrao;
};

/** "2026-11-05" (ou "2026-11-05T10:00") → "05NOV2026"; vazio/ inválido → ''. */
export const dataLaudoMilitar = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? dataMilitar(new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00-03:00`)) : '';
};

export const tituloTermoRecurso = (ctx: Pick<ContextoDocumentoIS, 'is' | 'ajustes'>): string => ehGrupoBeneficios(ctx.is)
  ? str(ctx.ajustes.tituloBeneficios, 'IS para Concessão de Benefício')
  : str(ctx.ajustes.titulo, 'IS {{Finalidade}}').replace(/\{\{\s*finalidade\s*\}\}/gi, ctx.is.finalidade);

const vazio = (classes = '', n = 1) => Array.from({ length: n }, () => `<p class="p ${classes}"></p>`).join('');

export const htmlTermoRecursoIS = (ctx: ContextoDocumentoIS): string => {
  const { is, assinante: a } = ctx;
  const avisos = ehGrupoBeneficios(is)
    ? lista(ctx.ajustes.avisosBeneficios, AVISOS_BENEFICIOS_PADRAO)
    : lista(ctx.ajustes.avisosVerificacoes, AVISOS_VERIFICACOES_PADRAO);
  const nome = is.inspecionado;
  const dataLaudo = dataLaudoMilitar(is.dataLaudo) || '___/___/______';
  const crm = [a.crmPe && `CRM-PE: ${a.crmPe}`, a.rqe && `RQE: ${a.rqe}`].filter(Boolean).join(' | ');
  const corpo = `
      ${vazio('', 2)}
      <p class="p c b">TERMO DE RECONHECIMENTO DE RECURSO - ${esc(tituloTermoRecurso(ctx).toUpperCase())}</p>
      ${vazio('c b', 2)}
      <p class="p l115 j sb10">Eu, <b>${esc(nome)}</b>, <b>DECLARO</b> que fui cientificado sobre meu direito de requerer recurso pela JSD/COM3<sup>o</sup>DN relativo ao laudo exarado na data de <b>${esc(dataLaudo)}</b> pela JRS/HNRe na IS nº <b>${esc(is.is)}</b>, sendo-me entregue uma via deste termo.</p>
      ${vazio('sb10')}
      <p class="p ass b">JRS/HNRe - Recife, PE, ${esc(dataMilitar(ctx.agora))}</p>
      <div class="ass hr"></div>
      <p class="p ass f9">(JS, OM, Local e data)</p>
      ${vazio('ass f9 esp', 3)}${vazio('ass b')}
      <div class="ass hr"></div>
      <p class="p ass b">${esc(nome)}</p>
      ${vazio('ass f9 esp', 4)}
      <div class="ass-pres">
        ${a.rubrica ? `<img class="rubrica" alt="" src="data:image/png;base64,${RUBRICA_PNG_BASE64}">` : ''}
        <div class="ass hr"></div>
        <p class="p ass b">${esc(a.nome.toUpperCase())}</p>
        ${a.postoGraduacao ? `<p class="p ass">${esc(a.postoGraduacao)}</p>` : ''}
        <p class="p ass">${esc(a.cargo || 'Presidente')} da JRS/HNRe</p>
        ${crm ? `<p class="p ass f10">${esc(crm)}</p>` : ''}
      </div>
      ${vazio('sb10')}
      <div class="hr sb10"></div>
      <ol class="avisos">${avisos.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
      <style>
        .ass-pres { position: relative; }
        .ass-pres .rubrica { position: absolute; z-index: 2; height: 75pt; width: ${75 * 157 / 270}pt; top: -42pt;
          left: ${226.77 + (467.72 - 226.77) / 2 - (75 * 157 / 270) / 2}pt; }
        .avisos { margin: 0; padding: 0.9pt 0 0; list-style: none; counter-reset: aviso; }
        .avisos li { counter-increment: aviso; position: relative; margin: 0 0 3pt; padding-left: 14.17pt;
          font-size: 10pt; line-height: 1.2207; text-align: justify; }
        .avisos li::before { content: counter(aviso) '.'; position: absolute; left: 0; }
      </style>`;
  return documentoOficial(`Termo de Recurso - IS ${is.is}`, [{ corpo, ...SIGILO }]);
};

export const gerador: GeradorDocumentoIS<Dados> = {
  tipo: 'termoRecurso',
  titulo: ROTULO_DOCUMENTO_IS.termoRecurso,
  perfis: PERFIS_DOCUMENTO_IS.termoRecurso,
  assinante: 'presidente',
  validar: () => ({}),
  dadosTeste: () => ({}),
  gerarHtml: (_d, ctx) => htmlTermoRecursoIS(ctx),
  email: (_d, ctx) => ({
    paragrafos: [
      `Segue em anexo o Termo de Recurso referente ao laudo da IS nº ${ctx.is.is} fim ${ctx.is.finalidade}${dataLaudoMilitar(ctx.is.dataLaudo) ? `, exarado em ${dataLaudoMilitar(ctx.is.dataLaudo)}` : ''}.`,
      'Os prazos e a forma de requerer o recurso constam no próprio termo.',
    ],
  }),
};
