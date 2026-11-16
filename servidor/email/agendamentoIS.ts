// Ficheiro: servidor/email/agendamentoIS.ts
// E-mails de AGENDAMENTO (e de REAGENDAMENTO) de IS ao inspecionado, pela Gmail API da conta Google da JRS. Rota
// POST /api/email/agendamento-is { isId, email? }, para TODOS os grupos de finalidade; o modelo sai do grupo
// (utils/emailAgendamentoIS.ts → tipoEmailAgendamento):
//  - Verificações e Términos → 'agendamentoIS' (templateAgendamentoVerificacoes.ts);
//  - Benefícios              → 'agendamentoBeneficios' (templateAgendamentoBeneficios.ts);
//  - demais grupos           → 'agendamentoGeral' (templateAgendamentoGeral.ts).
// Variante 'reagendamento' (mesmo modelo, "Reagendamento" / "foi reagendada para") quando a IS já teve e-mail para
// outra data/hora ou o status é "reagendada". Assunto: "AGENDAMENTO DE IS FIM {finalidade} - {inspecionado sem NIP}".
//  - PARA: e-mail do cadastro do inspecionado; sem e-mail, o informado no app (gravado no cadastro).
//  - CC: institucionais dos user_secretaria + cópias pela OM do inspecionado (copiasPorOM; não em Benefícios)
//    + fixos de config/emails. CCO: fixos.
//  - Remetente "JRS-HNRe", Reply-To = caixa da JRS (configuração), assinatura dinâmica (servidor/email/comum.ts).
//  - Um envio por data/hora de entrevista (emailAgendamentoDataEntrevista); registra no histórico da IS
//    (registrarEmailIS, com a variante).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { CONFIG_EMAIL_RESULTADO, emailValido } from './resultadoIS';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { institucionaisSecretaria, registrarEmailIS } from './registroEmailsIS';
import { TEMPLATE_AGENDAMENTO_VERIFICACOES } from './templateAgendamentoVerificacoes';
import { TEMPLATE_AGENDAMENTO_GERAL } from './templateAgendamentoGeral';
import { TEMPLATE_AGENDAMENTO_BENEFICIOS } from './templateAgendamentoBeneficios';
import { copiasPorOM } from '../../config/emails';
import {
  agendamentoJaEnviado, assuntoAgendamento, dataHoraDoAgendamento, ehElegivelAgendamento, nomeInspecionado, tipoEmailAgendamento,
  varianteAgendamento, vocativoPorSexo, type TipoEmailAgendamento, type VarianteAgendamento,
} from '../../utils/emailAgendamentoIS';

export const NOME_REMETENTE_AGENDAMENTO = 'JRS-HNRe';

export interface ISParaAgendamentoEmail {
  is: number | string;
  inspecionado?: string;
  finalidade?: string;
  grupoFinalidade?: string;
  dataEntrevista?: string;
}

/** Dados do cadastro usados no corpo: sexo (vocativo do modelo geral) e nome (Benefícios: "Sr(a). {nome}"). */
export interface CadastroParaAgendamento { sexo?: string; nome?: string }

const RODAPE_TEXTO = () => [
  'Hospital Naval de Recife - Junta Regular de Saúde',
  `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
  'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
];

/**
 * Assunto, HTML (sem JavaScript) e texto simples do e-mail de agendamento — o modelo sai do grupo da IS
 * (exportada para os testes, o e-mail de teste e a página Sobre). `variante` = 'reagendamento' ajusta o título/frase.
 */
export const montarEmailAgendamento = (
  is: ISParaAgendamentoEmail,
  assinatura: DadosAssinatura = assinaturaSemSignatario(),
  variante: VarianteAgendamento = 'agendamento',
  cadastro: CadastroParaAgendamento = {},
): { assunto: string; html: string; texto: string; tipo: TipoEmailAgendamento; variante: VarianteAgendamento } => {
  const tipo = tipoEmailAgendamento(is.grupoFinalidade);
  const { data, hora } = dataHoraDoAgendamento(String(is.dataEntrevista || ''));
  if (!data) throw new ErroContaGoogle('falha', 'A IS não tem data de entrevista.');
  const re = variante === 'reagendamento';
  const inspecionado = String(is.inspecionado || '').trim();
  const semNip = nomeInspecionado(inspecionado);
  const finalidade = String(is.finalidade || '').trim();
  const acaoTitulo = re ? 'Reagendamento' : 'Agendamento';
  const comuns = {
    finalidade_is: finalidade, data, hora, acao_titulo: acaoTitulo, acao: re ? 'reagendada' : 'agendada',
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
    ...assinatura,
  };
  const fecho = assinaturaTexto(assinatura, 'Respeitosamente / Atenciosamente,');
  const assunto = assuntoAgendamento(finalidade, inspecionado);

  if (tipo === 'agendamentoGeral') {
    const vocativo = vocativoPorSexo(cadastro.sexo);
    const html = renderizarTemplate(TEMPLATE_AGENDAMENTO_GERAL, { ...comuns, vocativo, inspecionado: semNip });
    const texto = [
      `${vocativo} ${semNip},`, '',
      `Informo que a IS fim ${finalidade} foi ${comuns.acao} para ${data} às ${hora}, na JRS/HNRe.`, '',
      fecho, '', ...RODAPE_TEXTO(),
    ].join('\n');
    return { assunto, html, texto, tipo, variante };
  }

  if (tipo === 'agendamentoBeneficios') {
    const nome = String(cadastro.nome || '').trim() || semNip;
    const html = renderizarTemplate(TEMPLATE_AGENDAMENTO_BENEFICIOS, { ...comuns, inspecionado: nome });
    const texto = [
      'Prezado(a) Senhor(a),', '',
      `CONFIRMAÇÃO DE ${acaoTitulo.toUpperCase()} DE INSPEÇÃO DE SAÚDE`,
      `Inspecionado: Sr(a). ${nome}`,
      `Finalidade IS: ${finalidade}`,
      `Data: ${data}`,
      `Hora: ${hora}h`, '',
      '1. ORIENTAÇÕES GERAIS SOBRE A DOCUMENTAÇÃO',
      'Para a realização da Inspeção de Saúde (IS), os periciados deverão apresentar obrigatoriamente no dia agendado laudo ou relatório médico atualizado (data, nome completo do profissional, CRM, carimbo legível, assinatura e CID com a data do diagnóstico), além dos exames complementares de acordo com a doença. Formatos aceitos: digitais (preferenciais, com assinatura eletrónica ou digital certificada) ou manuscritos legíveis.',
      'ATENÇÃO: a não apresentação ou a entrega incompleta dos documentos poderá comprometer a realização da perícia ou ensejar a conclusão imediata da inspeção por INSUFICIÊNCIA DOCUMENTAL. Neste cenário, o Inspecionado ou seu representante legal deverá reiniciar a solicitação da Inspeção de Saúde para Benefício junto à OM responsável (CPPE, CPPB, CPAL, SVPM, CPesFN...).', '',
      '2. DOCUMENTOS MÉDICOS ESPECÍFICOS POR DOENÇA (PREVISTAS EM LEI)',
      'Lista de documentos médicos mínimos exigidos prevista no Anexo V da DGPM-406 9ª Rev MOD 3 (veja a versão em HTML deste e-mail): https://assets.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/doencas_graves_0.pdf', '',
      '3. ORIENTAÇÕES PARA O DIA DA INSPEÇÃO DE SAÚDE',
      '- Comparecer com 30 minutos de antecedência;',
      '- Trazer documento de identidade original, além de todos os laudos/relatórios/exames descritos na secção anterior;',
      '- Não é necessário autenticar as cópias dos laudos dos exames em cartório;',
      '- Todos os documentos originais apresentados para conferência serão integralmente devolvidos ao fim da inspeção;',
      '- Caso o periciado seja curatelado, é obrigatório trazer também o termo ou documento de curatela;',
      '- Impossibilidade de presença: informar formalmente à secretaria com uma antecedência mínima de cinco dias úteis para o devido reagendamento;',
      '- Local: Junta Regular de Saúde do Hospital Naval de Recife (JRS/HNRe) — Avenida Cruz Cabugá 1200, Santo Amaro, Recife-PE. CEP:50040-000 (https://maps.app.goo.gl/PL26ws4934FDGdUz6);',
      '- Estacionamento: há estacionamento disponível para os Inspecionados e acompanhantes com acesso direto à Junta Regular (Estacionamento do Ambulatório).', '',
      fecho, '', ...RODAPE_TEXTO(),
    ].join('\n');
    return { assunto, html, texto, tipo, variante };
  }

  // Verificações e Términos: texto do template atual (inspecionado completo, como antes).
  const html = renderizarTemplate(TEMPLATE_AGENDAMENTO_VERIFICACOES, { ...comuns, inspecionado });
  const texto = [
    'Prezado(a) Senhor(a),', '',
    `CONFIRMAÇÃO DE ${acaoTitulo.toUpperCase()} DE INSPEÇÃO DE SAÚDE`,
    `Inspecionado: ${inspecionado}`,
    `Finalidade IS: ${finalidade}`,
    `Data: ${data}`,
    `Hora: ${hora}`, '',
    'Traga documento de identidade, PMI ou Guia Sanitária, cartão de vacinas e todos os relatórios, atestados e exames relacionados à sua condição atual. Militares da ativa devem estar fardados. O não comparecimento à IS agendada pode ser caracterizado como contravenção disciplinar (alínea e do item 2.3.3 da DGPM-406).',
    'Impossibilidade de presença: informe a secretaria com antecedência mínima de cinco dias úteis.', '',
    'Local: Junta Regular de Saúde do Hospital Naval de Recife (JRS/HNRe) — Avenida Cruz Cabugá 1200, Santo Amaro, Recife-PE.', '',
    fecho, '', ...RODAPE_TEXTO().slice(0, 2),
  ].join('\n');
  return { assunto, html, texto, tipo, variante };
};

/** CC dinâmico: institucionais da Secretaria + cópias pela OM (exceto Benefícios). Pura; exportada para os testes. */
export const ccAgendamento = (tipo: TipoEmailAgendamento, secretaria: string[], om: string | undefined): string[] =>
  juntarEmails([secretaria, tipo === 'agendamentoBeneficios' ? [] : copiasPorOM(om)]);

/**
 * Envia o e-mail de agendamento (ou reagendamento) da IS `isId`. `emailInformado` só vale quando o cadastro não tem
 * e-mail (e então é gravado em militares/{id}.email). Registra na IS o destinatário e a data/hora do envio.
 */
export const enviarAgendamentoIS = async (
  db: Firestore, isIdBruto: unknown, emailInformadoBruto: unknown, uid: string,
): Promise<{ para: string; emailSalvo: boolean; tipo: TipoEmailAgendamento; variante: VarianteAgendamento }> => {
  const isId = String(isIdBruto ?? '').replace(/\D/g, '');
  if (!isId) throw new ErroContaGoogle('falha', 'Informe a IS.');
  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroContaGoogle('falha', 'IS não encontrada.');
  const is = snapIs.data() as ISParaAgendamentoEmail & { status?: string; inspecionadoId?: string; emailAgendamentoDataEntrevista?: string; emailAgendamentoPara?: string };
  if (!ehElegivelAgendamento(is)) throw new ErroContaGoogle('falha', 'A IS precisa estar agendada (com data e hora da entrevista) e não cancelada.');
  if (agendamentoJaEnviado(is)) throw new ErroContaGoogle('falha', `O e-mail deste agendamento já foi enviado para ${is.emailAgendamentoPara || 'o inspecionado'}.`);

  const refMilitar = is.inspecionadoId ? db.collection('militares').doc(String(is.inspecionadoId)) : null;
  const militar = refMilitar ? ((await refMilitar.get()).data() as { email?: string; emailPessoal?: string; om?: string; sexo?: string; nome?: string } | undefined) : undefined;
  const cadastrado = String(militar?.email || militar?.emailPessoal || '').trim().toLowerCase();
  const informado = String(emailInformadoBruto ?? '').trim().toLowerCase();
  const para = cadastrado || informado;
  if (!para) throw new ErroContaGoogle('falha', 'O inspecionado não tem e-mail cadastrado. Informe o e-mail.');
  if (!emailValido(para)) throw new ErroContaGoogle('falha', 'E-mail do inspecionado inválido.');

  const tipo = tipoEmailAgendamento(is.grupoFinalidade);
  const variante = varianteAgendamento(is);
  const fixos = await destinatariosFixos(db, tipo);
  const secretaria = (await institucionaisSecretaria(db)).map(u => u.email);
  const { assunto, html, texto } = montarEmailAgendamento(is, await assinaturaDe(db, uid, fixos.config), variante, { sexo: militar?.sexo, nome: militar?.nome });
  const paraTodos = juntarEmails([para, fixos.para]);
  const cc = juntarEmails([ccAgendamento(tipo, secretaria, militar?.om), fixos.cc], paraTodos);
  const cco = juntarEmails([fixos.cco], [...paraTodos, ...cc]);
  await enviarEmail(db, {
    para: paraTodos.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
    responderPara: fixos.responderPara, assunto, html, texto, nomeRemetente: NOME_REMETENTE_AGENDAMENTO,
  });

  const emailSalvo = !cadastrado && !!refMilitar && !!militar;
  if (emailSalvo) await refMilitar!.update({ email: para, atualizadoEm: FieldValue.serverTimestamp() });
  await refIs.update({
    emailAgendamentoPara: para, emailAgendamentoDataEntrevista: String(is.dataEntrevista), emailAgendamentoEnviadoEm: FieldValue.serverTimestamp(),
  });
  await registrarEmailIS(db, isId, uid, { tipo, assunto, para: paraTodos, cc, variante, html, texto });
  return { para, emailSalvo, tipo, variante };
};
