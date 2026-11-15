// Ficheiro: servidor/email/templateResultadoBeneficios.ts
// Os três modelos do e-mail "RESULTADO DE IS FIM {finalidade} - {inspecionado}" do grupo **Benefícios** (tipo
// 'resultadoBeneficios'), a partir dos templates enviados pelo Presidente da JRS
// (.especificacao/templates/resultado-*.html), no padrão visual do NAC / Verificações
// (servidor/email/templateAgendamentoMoldura.ts: banner, corpo branco, assinaturas "Por ordem de:" com a 1ª
// dinâmica + Presidente, rodapé cinza). O texto do corpo depois do bloco de identificação não muda; nos dois de
// enquadramento, o item 2 ganhou os BOTÕES de acesso ao CPMM do modelo de não enquadramento (mantido o texto
// informativo deles). HTML puro, sem JavaScript (Zimbra).
// Placeholders (servidor/email/resultadoBeneficios.ts): {{inspecionado}} {{finalidade_is}} {{numero_is}}
// {{numero_tis}} {{data}} {{banner_url}} {{logo_rodape_url}} e a assinatura dinâmica.
import { abrirEmailJrs, BOTOES_CPMM, FECHAR_EMAIL_JRS, h3 } from './templateAgendamentoMoldura';
import type { ModeloResultadoBeneficios } from '../../utils/emailResultadoBeneficios';

const P = 'margin:0 0 15px;text-align:justify;font-size:16px';
const LI = 'margin-bottom:8px;text-align:justify';
const UL = 'margin:0 0 25px;padding-left:20px;line-height:1.7;color:#333333;font-size:16px';

const VERMELHO = '#c62828';
const VERDE = '#008000';

/** Vocativo, frase da conclusão e bloco de identificação (comuns aos três modelos). */
const cabecalho = (conclusao: string, rotuloConclusao: string, cor: string) => `
<p style="margin:0 0 20px;font-size:18px;color:#333333"><strong>Prezado(a) Senhor(a),</strong></p>
<p style="margin:0 0 20px;font-size:16px;text-align:justify">Após reunião em Plenário, a JRS/HNRe concluiu pelo <strong style="color:${cor}">${conclusao}</strong> no Benefício requerido.</p>

<div style="background-color:#f4f6f9;border-left:4px solid #050f41;padding:20px;margin-bottom:30px;border-radius:4px">
<p style="margin:0 0 10px;font-size:18px;color:#050f41;font-weight:bold;text-transform:uppercase">📅 Resultado de Perícia Realizada Fim Concessão de Benefícios</p>
<ul style="margin:0;padding-left:20px;list-style-type:disc;line-height:1.6;font-size:17px">
<li style="margin-bottom:6px">Inspecionado: Sr(a). <span style="color:#050f41;font-weight:bold">{{inspecionado}}</span></li>
<li style="margin-bottom:6px"><span style="color:#050f41">Finalidade IS:</span> <span style="color:#050f41;font-weight:bold">{{finalidade_is}}</span></li>
<li style="margin-bottom:6px"><span style="color:#050f41">IS:</span> <span style="color:#050f41;font-weight:bold">{{numero_is}}</span></li>
<li style="margin-bottom:6px"><span style="color:#050f41">TIS:</span> <span style="color:#050f41;font-weight:bold">{{numero_tis}}</span></li>
<li style="margin-bottom:6px">Data: <span style="padding:2px 5px;font-weight:bold;color:#050f41">{{data}}</span></li>
<li style="margin-bottom:0">Conclusão JRS/HNRe: <strong style="color:${cor}">${rotuloConclusao}</strong></li>
</ul>
</div>
`;

const NAO_ENQUADRAMENTO = `${abrirEmailJrs('Resultado de Inspeção de Saúde (Benefícios) - JRS/HNRe')}${cabecalho('NÃO ENQUADRAMENTO', 'NÃO ENQUADRAMENTO', VERMELHO)}
${h3('1. Orientações Interposição de Recursos')}
<div style="background-color:#fff5f5;border:1px solid #f8d7da;padding:20px;margin-bottom:35px;border-radius:4px">
<p style="margin:0;font-size:16px;color:#333333;line-height:1.6;text-align:justify">Caso o requerente discorde do laudo, tem o direito de interpor recurso de 1ª instância à <strong>Junta Superior Distrital (JSD/COM3ºDN)</strong> através de requerimento junto ao Órgão de Pessoal (SVPM, Capitanias dos Portos, CPesFN) <span style="color:#993300;font-weight:bold">em até 45 dias</span> a contar da data deste comunicado.</p>
</div>

${h3('2. Solicitação de Documentos Médico-Periciais')}
<p style="${P}">Caso deseje obter o Termo de Inspeção de Saúde (TIS) referente a IS realizada, poderá ser feita <strong>solicitação ao Centro de Perícias Médicas da Marinha (CPMM)</strong> utilizando os botões de acesso direto abaixo:</p>
${BOTOES_CPMM}
${FECHAR_EMAIL_JRS}`;

const ENQUADRAMENTO_MILITAR = `${abrirEmailJrs('Resultado de Inspeção de Saúde (Benefícios) - JRS/HNRe')}${cabecalho('ENQUADRAMENTO', 'ENQUADRAMENTO LEGAL', VERDE)}
${h3('1. Orientações sobre as Próximas Etapas')}
<p style="${P}">Em conformidade com o disposto no item 9.1.6 da DGPM-406 9ª Rev, a <strong style="color:#000080">IS foi encaminhada para Revisão Ex-Officio pela Junta Superior Distrital (JSD/COM3ºDN</strong>), que poderá executar 3 ações diferentes:</p>
<ul style="${UL}">
<li style="${LI}"><strong><span style="background-color:#99cc00;padding:0 3px">HOMOLOGAÇÃO</span> do Laudo exarado pela JRS/HNRe:</strong> Significa que a JSD/COM3ºDN concordou completamente com o laudo exarado pela JRS/HNRe, ratificando-o</li>
<li style="${LI}"><strong><span style="background-color:#ffcc99;padding:0 3px">REVISÃO</span> do Laudo exarado pela JRS/HNRe:</strong> Significa que a JSD/COM3ºDN discordou total ou parcialmente do laudo exarado pela JRS/HNRe, retificando-o.</li>
<li style="margin-bottom:0;text-align:justify"><strong><span style="background-color:#ff6600;padding:0 3px">CONVOCAÇÃO DO REQUERENTE</span></strong> (para IS presencial no Hospital Naval de Natal<strong>):</strong> Significa que a JSD/COM3ºDN não obteve as informações necessárias para exarar seu laudo através da avaliação puramente documental e precisar realizar esclarecimentos presencialmente.</li>
</ul>

${h3('2. Solicitação de Documentos Médico-Periciais')}
<p style="${P}">Informamos que após a análise pericial da <strong style="color:#000080">JSD/COM3ºDN</strong>, uma cópia do Termo de Inspeção de Saúde poderá ser solicitado ao Centro de Perícias Médicas da Marinha (CPMM) através do envio <a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/REQUERIMENTO.ods" target="_blank" style="color:#050f41"><strong>deste requerimento</strong></a> para o e-mail <a href="mailto:cpmm.secom@marinha.mil.br" style="color:#050f41">cpmm.secom@marinha.mil.br</a>.</p>
<p style="${P}">Para mais informações sobre solicitações de documentos Médicos-Periciais ao CPMM acesse:</p>
${BOTOES_CPMM}
${FECHAR_EMAIL_JRS}`;

const ENQUADRAMENTO_NAO_MILITAR = `${abrirEmailJrs('Resultado de Inspeção de Saúde (Benefícios) - JRS/HNRe')}${cabecalho('ENQUADRAMENTO', 'ENQUADRAMENTO LEGAL', VERDE)}
${h3('1. Orientações sobre Retirada do Laudo Pericial')}
<ul style="${UL}">
<li style="${LI}"><strong>Orientamos comparecer à Secretaria da JRS/HNRe <span style="color:#993300">após 30 dias</span> para retirar o Laudo Pericial;</strong></li>
<li style="${LI}">A entrega de Laudo Pericial ocorre de <strong>segunda à quinta de 08:00h às 11:00h</strong>;</li>
<li style="${LI}">Referida retirada deverá ser feita mediante prévio agendamento e portando identidade (original);</li>
<li style="${LI}">O agendamento poderá ser realizado de forma presencial diretamente na Junta ou solicitado por e-mail;</li>
<li style="margin-bottom:0;text-align:justify">Caso o(a) inspecionado(a) não possa comparecer, o referido documento poderá ser entregue a outra pessoa que o(a) represente trazendo uma autorização simples ou procuração/curatela (se houver).
<ul style="margin:8px 0 0;padding-left:20px;line-height:1.6;list-style-type:circle">
<li style="margin-bottom:0;text-align:justify">Trazer também cópias das identidades (do inspecionado e da pessoa que virá retirar o documento)</li>
</ul>
</li>
</ul>

${h3('2. Orientações sobre Solicitações de Documentos Médico-Periciais')}
<p style="${P}">Informamos que o Termo de Inspeção de Saúde poderá ser solicitado ao <strong>Centro de Perícias Médicas da Marinha (CPMM)</strong> através do envio <a href="https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/REQUERIMENTO.ods" target="_blank" style="color:#050f41"><strong>deste requerimento</strong></a> para o e-mail <a href="mailto:cpmm.secom@marinha.mil.br" style="color:#050f41">cpmm.secom@marinha.mil.br</a>.</p>
<p style="${P}">Para mais informações sobre solicitações de documentos Médicos-Periciais ao CPMM acesse:</p>
${BOTOES_CPMM}
${FECHAR_EMAIL_JRS}`;

export const TEMPLATES_RESULTADO_BENEFICIOS: Record<ModeloResultadoBeneficios, string> = {
  nao_enquadramento: NAO_ENQUADRAMENTO,
  enquadramento_militar: ENQUADRAMENTO_MILITAR,
  enquadramento_nao_militar: ENQUADRAMENTO_NAO_MILITAR,
};
