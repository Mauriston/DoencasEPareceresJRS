// Ficheiro: servidor/email/agendamentoIS.ts
// E-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE" ao inspecionado, para as finalidades dos grupos Benefícios
// (documentos das Doenças Previstas em Lei) e Verificações e Términos (VDF, Término de Incapacidade e de
// Restrições), pela Gmail API da conta Google da JRS. Rota POST /api/email/agendamento-is { isId, email? }.
//  - PARA: e-mail do cadastro do inspecionado; sem e-mail, o informado no app (gravado no cadastro).
//  - CC: fixos de config/emails + e-mail institucional (@marinha.mil.br) do médico da IS. CCO: fixos.
//  - Remetente "JRS/HNRe", Reply-To = caixa da JRS (configuração), assinatura dinâmica (servidor/email/comum.ts).
//  - Um envio por data/hora de entrevista: reagendada, pode enviar de novo (emailAgendamentoDataEntrevista).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { CONFIG_EMAIL_RESULTADO, emailValido } from './resultadoIS';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { TEMPLATE_AGENDAMENTO_BENEFICIOS } from './templateAgendamentoBeneficios';
import { TEMPLATE_AGENDAMENTO_VERIFICACOES } from './templateAgendamentoVerificacoes';
import {
  ASSUNTO_AGENDAMENTO_IS, agendamentoJaEnviado, dataHoraDoAgendamento, ehElegivelAgendamento, modeloDoGrupo,
} from '../../utils/emailAgendamentoIS';
import { ehInstitucional } from '../../utils/emailAgendaIS';

export const NOME_REMETENTE_AGENDAMENTO = 'JRS/HNRe';

export interface ISParaAgendamentoEmail {
  is: number | string;
  inspecionado?: string;
  finalidade?: string;
  grupoFinalidade?: string;
  dataEntrevista?: string;
}

/** Assunto, HTML (sem JavaScript) e texto simples, pelo grupo da finalidade. Exportada para os testes. */
export const montarEmailAgendamento = (is: ISParaAgendamentoEmail, assinatura: DadosAssinatura = assinaturaSemSignatario()) => {
  const modelo = modeloDoGrupo(is.grupoFinalidade);
  if (!modelo) throw new ErroContaGoogle('falha', 'A finalidade desta IS não tem e-mail de agendamento (só Benefícios e Verificações e Términos).');
  const { data, hora } = dataHoraDoAgendamento(String(is.dataEntrevista || ''));
  if (!data) throw new ErroContaGoogle('falha', 'A IS não tem data de entrevista.');
  const inspecionado = String(is.inspecionado || '').trim();
  const finalidade = String(is.finalidade || '').trim();
  const html = renderizarTemplate(modelo === 'beneficios' ? TEMPLATE_AGENDAMENTO_BENEFICIOS : TEMPLATE_AGENDAMENTO_VERIFICACOES, {
    inspecionado, finalidade_is: finalidade, data, hora,
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
    ...assinatura,
  });
  const texto = [
    'Prezado(a) Senhor(a),', '',
    'CONFIRMAÇÃO DE AGENDAMENTO DE INSPEÇÃO DE SAÚDE',
    `Inspecionado: ${modelo === 'beneficios' ? 'Sr(a). ' : ''}${inspecionado}`,
    `Finalidade IS: ${finalidade}`,
    `Data: ${data}`,
    `Hora: ${hora}`, '',
    modelo === 'beneficios'
      ? 'Apresente no dia agendado o laudo ou relatório médico atualizado (data, nome completo, CRM, carimbo legível, assinatura e CID com a data do diagnóstico) e os exames exigidos para a doença (Anexo V da DGPM-406). A falta de documentos pode encerrar a IS por INSUFICIÊNCIA DOCUMENTAL. Compareça com 30 minutos de antecedência.'
      : 'Traga documento de identidade, PMI ou Guia Sanitária, cartão de vacinas e todos os relatórios, atestados e exames relacionados à sua condição atual. Militares da ativa devem estar fardados. O não comparecimento à IS agendada pode ser caracterizado como contravenção disciplinar (alínea e do item 2.3.3 da DGPM-406).',
    'Impossibilidade de presença: informe a secretaria com antecedência mínima de cinco dias úteis.', '',
    'Local: Junta Regular de Saúde do Hospital Naval de Recife (JRS/HNRe) — Avenida Cruz Cabugá 1200, Santo Amaro, Recife-PE.', '',
    assinaturaTexto(assinatura, 'Respeitosamente / Atenciosamente,'), '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
  ].join('\n');
  return { assunto: ASSUNTO_AGENDAMENTO_IS, html, texto, modelo };
};

/**
 * Envia o e-mail de agendamento da IS `isId`. `emailInformado` só vale quando o cadastro não tem e-mail (e então
 * é gravado em militares/{id}.email). Registra na IS o destinatário e a data/hora a que o envio se refere.
 */
export const enviarAgendamentoIS = async (db: Firestore, isIdBruto: unknown, emailInformadoBruto: unknown, uid: string): Promise<{ para: string; emailSalvo: boolean }> => {
  const isId = String(isIdBruto ?? '').replace(/\D/g, '');
  if (!isId) throw new ErroContaGoogle('falha', 'Informe a IS.');
  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroContaGoogle('falha', 'IS não encontrada.');
  const is = snapIs.data() as ISParaAgendamentoEmail & { status?: string; inspecionadoId?: string; peritoUid?: string; emailAgendamentoDataEntrevista?: string; emailAgendamentoPara?: string };
  if (!modeloDoGrupo(is.grupoFinalidade)) throw new ErroContaGoogle('falha', 'A finalidade desta IS não tem e-mail de agendamento (só Benefícios e Verificações e Términos).');
  if (!ehElegivelAgendamento(is)) throw new ErroContaGoogle('falha', 'A IS precisa estar agendada (com data e hora da entrevista) e não cancelada.');
  if (agendamentoJaEnviado(is)) throw new ErroContaGoogle('falha', `O e-mail deste agendamento já foi enviado para ${is.emailAgendamentoPara || 'o inspecionado'}.`);

  const refMilitar = is.inspecionadoId ? db.collection('militares').doc(String(is.inspecionadoId)) : null;
  const militar = refMilitar ? ((await refMilitar.get()).data() as { email?: string; emailPessoal?: string } | undefined) : undefined;
  const cadastrado = String(militar?.email || militar?.emailPessoal || '').trim().toLowerCase();
  const informado = String(emailInformadoBruto ?? '').trim().toLowerCase();
  const para = cadastrado || informado;
  if (!para) throw new ErroContaGoogle('falha', 'O inspecionado não tem e-mail cadastrado. Informe o e-mail.');
  if (!emailValido(para)) throw new ErroContaGoogle('falha', 'E-mail do inspecionado inválido.');

  // E-mail institucional do médico (perito) da IS, em cópia.
  const perito = is.peritoUid ? ((await db.collection('usuarios').doc(String(is.peritoUid)).get()).data() as { email?: string } | undefined) : undefined;
  const emailMedico = ehInstitucional(String(perito?.email || '')) ? String(perito?.email).trim().toLowerCase() : '';

  const fixos = await destinatariosFixos(db, 'agendamentoIS');
  const { assunto, html, texto } = montarEmailAgendamento(is, await assinaturaDe(db, uid, fixos.config));
  const paraTodos = juntarEmails([para, fixos.para]);
  const cc = juntarEmails([fixos.cc, emailMedico], paraTodos);
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
  return { para, emailSalvo };
};
