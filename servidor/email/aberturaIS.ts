// Ficheiro: servidor/email/aberturaIS.ts
// E-mail "ABERTURA DE IS FIM {finalidade} - {inspecionado}" ao inspecionado (tipo aberturaIS), pela Gmail API da conta
// Google da JRS. Rota POST /api/email/abertura-is { isId, email? } (Admin e Secretaria; o app confirma antes).
//  - PARA: e-mail do cadastro (sem e-mail: o informado, gravado em militares/{id}.email).
//  - CC: fixos de config/emails + institucionais de todos os user_secretaria + cópias pela OM do inspecionado
//    (copiasPorOM: HNRe → Divisão de Pessoal; EAMPE). Reply-To: caixa da JRS. Remetente "JRS-HNRe".
//  - Texto (utils/emailAberturaIS.ts): data de abertura escrita, prazo conforme a variante (com exames mínimos →
//    comparecer em 7 dias úteis para obter as guias; sem → agendar em 7 dias úteis; Benefícios → agendar em 60 dias),
//    DGPM-406 item 2.1.2 b/c e 2.3.3 e, e o card do cancelamento/contravenção. Assinatura "Por ordem de:" + Presidente.
//  - Grava emailAberturaPara/EmailAberturaEnviadoEm e registra no histórico da IS (registrarEmailIS).
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { CONFIG_EMAIL_RESULTADO, emailValido } from './resultadoIS';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { institucionaisSecretaria, registrarEmailIS } from './registroEmailsIS';
import { TEMPLATE_ABERTURA_IS } from './templateAberturaIS';
import { finalidadeTemExamesMinimos } from '../../utils/guiasExames';
import { copiasPorOM } from '../../config/emails';
import { CITACAO_2_3_3_E, assuntoAbertura, textosAbertura, varianteAbertura, type VarianteAbertura } from '../../utils/emailAberturaIS';
import { vocativoInspecionado, type SexoCadastro } from '../../utils/emailGuiasIS';
import { GRUPO_BENEFICIOS } from '../../utils/inspecoes';

export const FECHO_ABERTURA = 'ATT/RPT,';

export interface DadosEmailAbertura {
  /** "POSTO (QUADRO) NIP NOME" (texto da IS). */
  inspecionado: string;
  finalidade: string;
  grupoFinalidade?: string;
  /** AAAA-MM-DD (data de apresentação). */
  dataAbertura: string;
  sexo?: SexoCadastro;
  /** finalidadeTemExamesMinimos(finalidade) — utils/guiasExames.ts. */
  temExamesMinimos: boolean;
}

/** Assunto, HTML (sem JavaScript), texto simples e a variante. Exportada para os testes. */
export const montarEmailAbertura = (d: DadosEmailAbertura, assinatura: DadosAssinatura = assinaturaSemSignatario()) => {
  const variante = varianteAbertura(d.grupoFinalidade, d.temExamesMinimos);
  const t = textosAbertura({ finalidade: d.finalidade, dataAbertura: d.dataAbertura, variante, sexo: d.sexo });
  const vocativo = vocativoInspecionado(d.inspecionado, d.sexo);
  const html = renderizarTemplate(TEMPLATE_ABERTURA_IS, {
    titulo: 'Abertura de Inspeção de Saúde - JRS/HNRe',
    vocativo, abertura: t.abertura, titulo_prazo: t.tituloPrazo, prazo_texto: t.prazoTexto, arquivamento: t.arquivamento,
    citacao_233e: CITACAO_2_3_3_E, destaque: t.destaque, fecho: FECHO_ABERTURA, ...assinatura,
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
  });
  const texto = [
    `${vocativo},`, '',
    t.abertura, '',
    t.tituloPrazo.toLocaleUpperCase('pt-BR'),
    t.prazoTexto, '',
    t.arquivamento, '',
    `"${CITACAO_2_3_3_E}" (alínea e do item 2.3.3 da DGPM-406 9ª Rev)`, '',
    `ATENÇÃO: ${t.destaque}`, '',
    assinaturaTexto(assinatura, FECHO_ABERTURA), '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  return { assunto: assuntoAbertura(d.finalidade, d.inspecionado), html, texto, variante };
};

// ---------------------------------------------------------------- Dados fictícios (e-mail de teste e página Sobre)

const FICTICIOS_ABERTURA: Record<VarianteAbertura, DadosEmailAbertura> = {
  exames: { inspecionado: 'CT (Md) 12.3456.78 FULANO DE TAL DA SILVA', finalidade: 'Controle anual de praça de máquinas', grupoFinalidade: 'Controle Periódico', dataAbertura: '2026-11-16', sexo: 'Masculino', temExamesMinimos: true },
  agendamento: { inspecionado: '2SG-ES 09.8765.43 BELTRANA DE SOUZA', finalidade: 'Verificação de Deficiência Funcional', grupoFinalidade: 'Verificações e Términos', dataAbertura: '2026-11-16', sexo: 'Feminino', temExamesMinimos: false },
  beneficios: { inspecionado: 'PENS-CMG 01.2345.67 CICRANA DE ALBUQUERQUE', finalidade: 'Pensão militar para beneficiário inválido', grupoFinalidade: GRUPO_BENEFICIOS, dataAbertura: '2026-11-16', temExamesMinimos: false },
};

/** E-mail de abertura com dados fictícios de cada variante (e-mail de teste e página Sobre). */
export const montarEmailAberturaFicticio = (variante: VarianteAbertura = 'exames', assinatura: DadosAssinatura = assinaturaSemSignatario()) =>
  montarEmailAbertura(FICTICIOS_ABERTURA[variante], assinatura);

// ---------------------------------------------------------------- Envio

export const enviarAberturaIS = async (db: Firestore, isIdBruto: unknown, emailInformadoBruto: unknown, uid: string): Promise<{ para: string; emailSalvo: boolean }> => {
  const isId = String(isIdBruto ?? '').replace(/\D/g, '');
  if (!isId) throw new ErroContaGoogle('falha', 'Informe a IS.');
  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroContaGoogle('falha', 'IS não encontrada.');
  const is = snapIs.data() as { inspecionado?: string; finalidade?: string; grupoFinalidade?: string; dataAbertura?: string; status?: string; inspecionadoId?: string };
  if (is.status === 'cancelada') throw new ErroContaGoogle('falha', 'A IS está cancelada.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(is.dataAbertura || ''))) throw new ErroContaGoogle('falha', 'A IS não tem data de abertura.');

  const refMilitar = is.inspecionadoId ? db.collection('militares').doc(String(is.inspecionadoId)) : null;
  const militar = refMilitar ? ((await refMilitar.get()).data() as { email?: string; emailPessoal?: string; om?: string; sexo?: string } | undefined) : undefined;
  const cadastrado = String(militar?.email || militar?.emailPessoal || '').trim().toLowerCase();
  const informado = String(emailInformadoBruto ?? '').trim().toLowerCase();
  const emailInspecionado = cadastrado || informado;
  if (!emailInspecionado) throw new ErroContaGoogle('falha', 'O inspecionado não tem e-mail cadastrado. Informe o e-mail.');
  if (!emailValido(emailInspecionado)) throw new ErroContaGoogle('falha', 'E-mail do inspecionado inválido.');

  const fixos = await destinatariosFixos(db, 'aberturaIS');
  const secretaria = (await institucionaisSecretaria(db)).map(s => s.email);
  const { assunto, html, texto, variante } = montarEmailAbertura({
    inspecionado: String(is.inspecionado || ''), finalidade: String(is.finalidade || ''), grupoFinalidade: is.grupoFinalidade,
    dataAbertura: String(is.dataAbertura), sexo: militar?.sexo, temExamesMinimos: finalidadeTemExamesMinimos(String(is.finalidade || '')),
  }, await assinaturaDe(db, uid, fixos.config));
  const para = juntarEmails([emailInspecionado, fixos.para]);
  const cc = juntarEmails([fixos.cc, secretaria, copiasPorOM(militar?.om)], para);
  const cco = juntarEmails([fixos.cco], [...para, ...cc]);
  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
    responderPara: fixos.responderPara, assunto, html, texto, nomeRemetente: CONFIG_EMAIL_RESULTADO.nomeRemetente,
  });

  const emailSalvo = !cadastrado && !!refMilitar && !!militar;
  if (emailSalvo) await refMilitar!.update({ email: emailInspecionado, atualizadoEm: FieldValue.serverTimestamp() });
  await refIs.update({ emailAberturaPara: emailInspecionado, emailAberturaEnviadoEm: FieldValue.serverTimestamp() });
  await registrarEmailIS(db, isId, uid, { tipo: 'aberturaIS', assunto, para, cc, variante });
  return { para: emailInspecionado, emailSalvo };
};
