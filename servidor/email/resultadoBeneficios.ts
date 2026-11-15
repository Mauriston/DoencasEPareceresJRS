// Ficheiro: servidor/email/resultadoBeneficios.ts
// E-mail "RESULTADO DE IS FIM {finalidade} - {inspecionado sem NIP}" das IS do grupo **Benefícios** (tipo
// 'resultadoBeneficios'), pela Gmail API da conta Google da JRS. Rota POST /api/email/resultado-beneficios
// { isId, modelo, email? } (Admin e Secretaria; auditada). Três modelos (templateResultadoBeneficios.ts):
// não enquadramento, enquadramento de militar (inativo) e de não militar — o app escolhe (Firebase AI Logic, com o
// plano B determinístico modeloSugeridoPorTexto de utils/emailResultadoBeneficios.ts) e o usuário confirma.
//  - Só IS de Benefícios com Nº do TIS preenchido (status Assinaturas Pendentes ou TIS assinado). Não é automático.
//  - PARA: e-mail do cadastro do inspecionado; sem e-mail, o informado no app (gravado no cadastro).
//  - CC: institucionais dos user_secretaria + fixos de config/emails. CCO: fixos. Reply-To: caixa da JRS.
//  - Remetente "JRS-HNRe"; assinatura dinâmica (servidor/email/comum.ts).
//  - Grava emailResultadoBeneficiosEnviadoEm/Modelo na IS e registra no histórico (registrarEmailIS, variante = modelo).
//    Reenvio permitido (ex.: modelo trocado); cada envio fica no histórico.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { CONFIG_EMAIL_RESULTADO, emailValido } from './resultadoIS';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { institucionaisSecretaria, registrarEmailIS } from './registroEmailsIS';
import { TEMPLATES_RESULTADO_BENEFICIOS } from './templateResultadoBeneficios';
import { nomeInspecionado } from '../../utils/emailAgendamentoIS';
import {
  assuntoResultadoBeneficios, dataBr, ehModeloResultadoBeneficios, elegivelResultadoBeneficios, type ModeloResultadoBeneficios,
} from '../../utils/emailResultadoBeneficios';

export const NOME_REMETENTE_RESULTADO_BENEFICIOS = 'JRS-HNRe';

export interface ISParaResultadoBeneficiosEmail {
  is: number | string;
  inspecionado?: string;
  finalidade?: string;
  tis?: string;
  dataLaudo?: string;
}

const LINKS_CPMM = [
  '- Requerimento: https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/REQUERIMENTO.ods',
  '- Orientações: https://www.marinha.mil.br/cpmm/sites/www.marinha.mil.br.cpmm/files/arquivo/orientacoes%20carta%20de%20servico%20cpmm.pdf',
  '- Site oficial do CPMM: https://www.marinha.mil.br/cpmm/carta-usuario-cpmm',
  'E-mail para envio do requerimento: cpmm.secom@marinha.mil.br · Telefone do CPMM: (21) 2126-5398',
];

/** Corpo (texto simples) de cada modelo, depois do bloco de identificação. */
const CORPO_TEXTO: Record<ModeloResultadoBeneficios, string[]> = {
  nao_enquadramento: [
    '1. ORIENTAÇÕES INTERPOSIÇÃO DE RECURSOS',
    'Caso o requerente discorde do laudo, tem o direito de interpor recurso de 1ª instância à Junta Superior Distrital (JSD/COM3ºDN) através de requerimento junto ao Órgão de Pessoal (SVPM, Capitanias dos Portos, CPesFN) em até 45 dias a contar da data deste comunicado.', '',
    '2. SOLICITAÇÃO DE DOCUMENTOS MÉDICO-PERICIAIS',
    'Caso deseje obter o Termo de Inspeção de Saúde (TIS) referente a IS realizada, poderá ser feita solicitação ao Centro de Perícias Médicas da Marinha (CPMM) utilizando os botões de acesso direto abaixo:',
    ...LINKS_CPMM,
  ],
  enquadramento_militar: [
    '1. ORIENTAÇÕES SOBRE AS PRÓXIMAS ETAPAS',
    'Em conformidade com o disposto no item 9.1.6 da DGPM-406 9ª Rev, a IS foi encaminhada para Revisão Ex-Officio pela Junta Superior Distrital (JSD/COM3ºDN), que poderá executar 3 ações diferentes:',
    '- HOMOLOGAÇÃO do Laudo exarado pela JRS/HNRe: Significa que a JSD/COM3ºDN concordou completamente com o laudo exarado pela JRS/HNRe, ratificando-o',
    '- REVISÃO do Laudo exarado pela JRS/HNRe: Significa que a JSD/COM3ºDN discordou total ou parcialmente do laudo exarado pela JRS/HNRe, retificando-o.',
    '- CONVOCAÇÃO DO REQUERENTE (para IS presencial no Hospital Naval de Natal): Significa que a JSD/COM3ºDN não obteve as informações necessárias para exarar seu laudo através da avaliação puramente documental e precisar realizar esclarecimentos presencialmente.', '',
    '2. SOLICITAÇÃO DE DOCUMENTOS MÉDICO-PERICIAIS',
    'Informamos que após a análise pericial da JSD/COM3ºDN, uma cópia do Termo de Inspeção de Saúde poderá ser solicitado ao Centro de Perícias Médicas da Marinha (CPMM) através do envio deste requerimento para o e-mail cpmm.secom@marinha.mil.br.',
    'Para mais informações sobre solicitações de documentos Médicos-Periciais ao CPMM acesse:',
    ...LINKS_CPMM,
  ],
  enquadramento_nao_militar: [
    '1. ORIENTAÇÕES SOBRE RETIRADA DO LAUDO PERICIAL',
    '- Orientamos comparecer à Secretaria da JRS/HNRe após 30 dias para retirar o Laudo Pericial;',
    '- A entrega de Laudo Pericial ocorre de segunda à quinta de 08:00h às 11:00h;',
    '- Referida retirada deverá ser feita mediante prévio agendamento e portando identidade (original);',
    '- O agendamento poderá ser realizado de forma presencial diretamente na Junta ou solicitado por e-mail;',
    '- Caso o(a) inspecionado(a) não possa comparecer, o referido documento poderá ser entregue a outra pessoa que o(a) represente trazendo uma autorização simples ou procuração/curatela (se houver).',
    '  - Trazer também cópias das identidades (do inspecionado e da pessoa que virá retirar o documento)', '',
    '2. ORIENTAÇÕES SOBRE SOLICITAÇÕES DE DOCUMENTOS MÉDICO-PERICIAIS',
    'Informamos que o Termo de Inspeção de Saúde poderá ser solicitado ao Centro de Perícias Médicas da Marinha (CPMM) através do envio deste requerimento para o e-mail cpmm.secom@marinha.mil.br.',
    'Para mais informações sobre solicitações de documentos Médicos-Periciais ao CPMM acesse:',
    ...LINKS_CPMM,
  ],
};

/**
 * Assunto, HTML (sem JavaScript) e texto simples do resultado de Benefícios no `modelo` dado (exportada para os
 * testes, o e-mail de teste e a página Sobre). `nome` = nome do cadastro ("Sr(a). {nome}"); sem ele, o
 * INSPECIONADO sem o NIP.
 */
export const montarEmailResultadoBeneficios = (
  is: ISParaResultadoBeneficiosEmail,
  modelo: ModeloResultadoBeneficios,
  assinatura: DadosAssinatura = assinaturaSemSignatario(),
  nome?: string,
): { assunto: string; html: string; texto: string; modelo: ModeloResultadoBeneficios } => {
  if (!ehModeloResultadoBeneficios(modelo)) throw new ErroContaGoogle('falha', 'Modelo de resultado de Benefícios desconhecido.');
  const semNip = nomeInspecionado(is.inspecionado);
  const inspecionado = String(nome || '').trim() || semNip;
  const finalidade = String(is.finalidade || '').trim();
  const dados = {
    inspecionado, finalidade_is: finalidade, numero_is: String(is.is), numero_tis: String(is.tis || '').trim() || '—',
    data: dataBr(is.dataLaudo) || '—',
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
    ...assinatura,
  };
  const enquadra = modelo !== 'nao_enquadramento';
  const conclusao = enquadra ? 'ENQUADRAMENTO' : 'NÃO ENQUADRAMENTO';
  const texto = [
    'Prezado(a) Senhor(a),', '',
    `Após reunião em Plenário, a JRS/HNRe concluiu pelo ${conclusao} no Benefício requerido.`, '',
    'RESULTADO DE PERÍCIA REALIZADA FIM CONCESSÃO DE BENEFÍCIOS',
    `Inspecionado: Sr(a). ${inspecionado}`,
    `Finalidade IS: ${finalidade}`,
    `IS: ${dados.numero_is}`,
    `TIS: ${dados.numero_tis}`,
    `Data: ${dados.data}`,
    `Conclusão JRS/HNRe: ${enquadra ? 'ENQUADRAMENTO LEGAL' : 'NÃO ENQUADRAMENTO'}`, '',
    ...CORPO_TEXTO[modelo], '',
    assinaturaTexto(assinatura, 'Respeitosamente / Atenciosamente,'), '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  return {
    assunto: assuntoResultadoBeneficios(finalidade, semNip),
    html: renderizarTemplate(TEMPLATES_RESULTADO_BENEFICIOS[modelo], dados),
    texto, modelo,
  };
};

/**
 * Envia o resultado de Benefícios da IS `isId` no `modelo` escolhido. `emailInformado` só vale quando o cadastro
 * não tem e-mail (e então é gravado em militares/{id}.email).
 */
export const enviarResultadoBeneficios = async (
  db: Firestore, isIdBruto: unknown, modeloBruto: unknown, emailInformadoBruto: unknown, uid: string,
): Promise<{ para: string; emailSalvo: boolean; modelo: ModeloResultadoBeneficios }> => {
  const isId = String(isIdBruto ?? '').replace(/\D/g, '');
  if (!isId) throw new ErroContaGoogle('falha', 'Informe a IS.');
  const modelo = String(modeloBruto ?? '') as ModeloResultadoBeneficios;
  if (!ehModeloResultadoBeneficios(modelo)) throw new ErroContaGoogle('falha', 'Escolha o modelo do resultado (não enquadramento ou enquadramento).');
  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroContaGoogle('falha', 'IS não encontrada.');
  const is = snapIs.data() as ISParaResultadoBeneficiosEmail & { status?: string; grupoFinalidade?: string; inspecionadoId?: string };
  if (!elegivelResultadoBeneficios(is)) {
    throw new ErroContaGoogle('falha', 'Só é possível enviar o resultado de IS de Benefícios com o Nº do TIS preenchido (Assinaturas Pendentes ou TIS assinado).');
  }

  const refMilitar = is.inspecionadoId ? db.collection('militares').doc(String(is.inspecionadoId)) : null;
  const militar = refMilitar ? ((await refMilitar.get()).data() as { email?: string; emailPessoal?: string; nome?: string } | undefined) : undefined;
  const cadastrado = String(militar?.email || militar?.emailPessoal || '').trim().toLowerCase();
  const informado = String(emailInformadoBruto ?? '').trim().toLowerCase();
  const para = cadastrado || informado;
  if (!para) throw new ErroContaGoogle('falha', 'O inspecionado não tem e-mail cadastrado. Informe o e-mail.');
  if (!emailValido(para)) throw new ErroContaGoogle('falha', 'E-mail do inspecionado inválido.');

  const fixos = await destinatariosFixos(db, 'resultadoBeneficios');
  const secretaria = (await institucionaisSecretaria(db)).map(u => u.email);
  const { assunto, html, texto } = montarEmailResultadoBeneficios(is, modelo, await assinaturaDe(db, uid, fixos.config), militar?.nome);
  const paraTodos = juntarEmails([para, fixos.para]);
  const cc = juntarEmails([secretaria, fixos.cc], paraTodos);
  const cco = juntarEmails([fixos.cco], [...paraTodos, ...cc]);
  await enviarEmail(db, {
    para: paraTodos.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
    responderPara: fixos.responderPara, assunto, html, texto, nomeRemetente: NOME_REMETENTE_RESULTADO_BENEFICIOS,
  });

  const emailSalvo = !cadastrado && !!refMilitar && !!militar;
  if (emailSalvo) await refMilitar!.update({ email: para, atualizadoEm: FieldValue.serverTimestamp() });
  await refIs.update({ emailResultadoBeneficiosEnviadoEm: FieldValue.serverTimestamp(), emailResultadoBeneficiosModelo: modelo });
  await registrarEmailIS(db, isId, uid, { tipo: 'resultadoBeneficios', assunto, para: paraTodos, cc, variante: modelo });
  return { para, emailSalvo, modelo };
};
