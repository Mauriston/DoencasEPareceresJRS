// Ficheiro: servidor/documentos/termosConcurso.ts
// Termos dos concursos em HTML + CSS (substituem os templates do Google Docs do Apps Script):
//  - Termo de Reconhecimento de Recurso – Inspeção de Saúde para Ingresso
//    (antes: "JRSApp - TEMPLATE RECONHECIMENTO RECURSO");
//  - Termo de Cientificação de Resultado de IS Ingresso/Seleção
//    (antes: "JRSApp - TERMO DE CIENTIFICAÇÃO DE RESULTADO").
// Texto e formatação idênticos aos templates; os campos entram já escapados.
import { documentoOficial, esc, dataMilitar, type BlocoSigilo, type PaginaOficial } from './layoutOficial';

export interface DadosTermoRecurso {
  candidatoId: string;
  candidatoNome: string;
  nomeConcurso: string;
  /** Data do laudo como aparece no termo (ex.: 05NOV2026). */
  dataLaudo: string;
  nomeUsuario: string;
  postoGraduacao: string;
  cargo: string;
  /** Data de emissão (padrão: hoje, em Recife). */
  hoje?: Date;
  /** Texto da data de emissão já formatado (substitui `hoje`; usado na comparação com o template). */
  dataEmissao?: string;
}

export type StatusCientificacao = 'APTO' | 'INAPTO' | 'INSUF DOCUMENTAL';

export interface DadosTermoCientificacao {
  candidatoId: string;
  candidatoNome: string;
  nomeConcurso: string;
  status: StatusCientificacao;
  hoje?: Date;
  dataEmissao?: string;
}

// Cabeçalho e rodapé de cada template (posição e corpo medidos nos PDFs originais).
const SIGILO_RECURSO = {
  cabecalho: { topo: 19.9, centro: 314.9, titulo: 14, linhas: 8 } as BlocoSigilo,
  rodape: { topo: 783.7, centro: 308.4, titulo: 14, linhas: 8 } as BlocoSigilo,
};
const SIGILO_CIENTIFICACAO = {
  cabecalho: { topo: 19.9, centro: 314.9, titulo: 12, linhas: 10 } as BlocoSigilo,
  rodape: { topo: 778.8, centro: 318.9, titulo: 12, linhas: 10 } as BlocoSigilo,
};

const vazio = (classes = '', n = 1) => Array.from({ length: n }, () => `<p class="p ${classes}"></p>`).join('');

/** Página do Termo de Reconhecimento de Recurso. */
export const paginaTermoRecurso = (d: DadosTermoRecurso): PaginaOficial => {
  const corpo = `
      ${vazio('', 2)}
      <p class="p c b">TERMO DE RECONHECIMENTO DE RECURSO - INSPEÇÃO DE SAÚDE PARA INGRESSO</p>
      ${vazio('c b', 2)}
      <p class="p l115 j sb10">Eu, <b>${esc(d.candidatoNome)}, candidato ao concurso ${esc(d.nomeConcurso)}, nº de inscrição ${esc(d.candidatoId)}, DECLARO </b>que fui cientificado sobre o motivo da inaptidão na Inspeção de Saúde para Ingresso bem como sobre o meu direito de requerer recurso administrativo pela JSD/Com3<sup>o</sup>DN, relativo ao laudo exarado em <b>${esc(d.dataLaudo)}</b> pela JRS/HNRe, sendo-me entregue uma via deste termo.</p>
      ${vazio('sb10')}
      <p class="p ass b">JRS/HNRe - Recife, PE, ${esc(d.dataEmissao ?? dataMilitar(d.hoje))}</p>
      <div class="ass hr"></div>
      <p class="p ass f9">(JS, OM, Local e data)</p>
      ${vazio('ass f9 esp', 3)}${vazio('ass b')}
      <div class="ass hr"></div>
      <p class="p ass b">${esc(d.candidatoNome)}</p>
      ${vazio('ass f9 esp', 4)}
      <div class="ass hr"></div>
      <p class="p ass b">${esc(d.nomeUsuario)}</p>
      <p class="p ass">${esc(d.postoGraduacao)}</p>
      <p class="p ass">${esc(d.cargo)}</p>
      ${vazio('ass f9')}${vazio('sb10')}
      <div class="hr sb10"></div>
      <ol class="avisos">
        <li>Prazos para recursos à JSD para candidatos a Ingresso: até dois dias a contar da data da comunicação do laudo pela JRS (data de assinatura deste termo).</li>
        <li>O recurso deverá ser solicitado na OM organizadora local do concurso junto com a apresentação deste termo.</li>
        <li>Todos os recursos deverão ser instruídos por documentos apensos que possam respaldar as pretensões do inspecionado, a fim de possibilitar o deferimento do pleito.</li>
        <li>Caso o requerimento seja deferido, o candidato será convocado para nova Inspeção de Saúde na JSD/COM3ºDN localizada no Hospital Naval de Natal.</li>
      </ol>
      <style>
        .avisos { margin: 0; padding: 0.9pt 0 0; list-style: none; counter-reset: aviso; }
        .avisos li { counter-increment: aviso; position: relative; margin: 0 0 3pt; padding-left: 14.17pt;
          font-size: 10pt; line-height: 1.2207; text-align: justify; }
        .avisos li::before { content: counter(aviso) '.'; position: absolute; left: 0; }
      </style>`;
  return { corpo, ...SIGILO_RECURSO };
};

/** HTML do Termo de Reconhecimento de Recurso (uma página). */
export const htmlTermoRecurso = (d: DadosTermoRecurso): string =>
  documentoOficial(`Termo de Recurso - ${d.candidatoId}`, [paginaTermoRecurso(d)]);

/** Página do Termo de Cientificação de Resultado. A opção do resultado leva "X" e negrito. */
export const paginaTermoCientificacao = (d: DadosTermoCientificacao): PaginaOficial => {
  const marca = (s: StatusCientificacao) => (d.status === s ? 'X' : '');
  const opcao = (s: StatusCientificacao, depois: string) =>
    `<span class="${d.status === s ? 'b' : ''}">( <b>${marca(s)}</b> )${depois}</span>`;
  const corpo = `
      <div style="height:27.3pt"></div>
      ${vazio()}
      <p class="p c b">TERMO DE CIENTIFICAÇÃO DE RESULTADO DE IS INGRESSO/SELEÇÃO</p>
      ${vazio('c b')}${vazio()}
      <p class="p l150 sb10">Eu,<b> ${esc(d.candidatoNome)}, </b>candidato ao concurso <b>${esc(d.nomeConcurso)}</b>, <b>n<sup>o</sup> de inscrição ${esc(d.candidatoId)}</b>, declaro que tomei ciência do resultado da Inspeção de Saúde a que fui submetido pela JRS/HNRe, tendo sido considerado: </p>
      ${vazio('sb10')}
      <p class="p sb10">${opcao('APTO', '   Apto')}</p>
      <p class="p sb10">${opcao('INAPTO', '  Inapto')}</p>
      <p class="p j sb10 idm${d.status === 'INSUF DOCUMENTAL' ? ' b' : ''}"><span class="tab">( <b>${marca('INSUF DOCUMENTAL')}</b> ) </span>Impossibilitado de finalizar Inspeção de Saúde por não apresentação da totalidade dos exames previstos no Edital do Concurso/Aviso de Convocação.</p>
      ${vazio('sb10 esp', 3)}
      <p class="p ass b">Recife, PE, ${esc(d.dataEmissao ?? dataMilitar(d.hoje))}</p>
      <div class="ass hr"></div>
      <p class="p ass f9">( Local e data)</p>
      ${vazio('ass f9 esp', 3)}${vazio('ass b')}
      <div class="ass hr"></div>
      <p class="p ass b">${esc(d.candidatoNome)}</p>
      <style>
        /* Opção com recuo deslocado (2ª linha a 0,5 cm) e tabulação a 27,46 pt. */
        .idm { padding-left: 14.17pt; text-indent: -14.17pt; }
        .idm .tab { display: inline-block; min-width: 27.46pt; text-indent: 0; white-space: pre; }
      </style>`;
  return { corpo, ...SIGILO_CIENTIFICACAO };
};

/** HTML do Termo de Cientificação de Resultado (uma página). */
export const htmlTermoCientificacao = (d: DadosTermoCientificacao): string =>
  documentoOficial(`Termo de Cientificação - ${d.candidatoId}`, [paginaTermoCientificacao(d)]);

/** Inapto: Termo de Recurso (1ª página) + Termo de Cientificação com "Inapto" marcado (2ª página). */
export const htmlTermoRecursoComCientificacao = (d: DadosTermoRecurso): string =>
  documentoOficial(`Termo de Recurso e Cientificação - ${d.candidatoId}`, [
    paginaTermoRecurso(d),
    paginaTermoCientificacao({ candidatoId: d.candidatoId, candidatoNome: d.candidatoNome, nomeConcurso: d.nomeConcurso, status: 'INAPTO', hoje: d.hoje, dataEmissao: d.dataEmissao }),
  ]);
