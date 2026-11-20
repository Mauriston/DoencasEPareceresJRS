// Ficheiro: servidor/email/guiasIS.ts
// E-mails das GUIAS DE EXAMES da IS, com o PDF das guias anexado (Storage inspecoes/{isId}/guias/guias-exames.pdf,
// gerado por POST /api/documentos/guias-exames), pela Gmail API da conta Google da JRS. Rota POST /api/email/guias-is
// { isId, inspecionado: boolean, email?, secretariaUids: string[] } (Admin e Secretaria). Templates em
// servidor/email/templateGuiasIS.ts; regras puras em utils/emailGuiasIS.ts.
//  - Ao inspecionado (tipo guiasInspecionado): "GUIA DOS EXAMES PARA INSPEÇÃO DE SAÚDE"; remetente "JRS-HNRe";
//    PARA = e-mail do cadastro (sem e-mail: o informado, gravado em militares/{id}.email); CC = institucional de quem
//    disparou; Reply-To = caixa da JRS; assinatura dinâmica ("Por ordem de:" quem disparou + Presidente). Registra a
//    entrega das guias (guiasEntregues*, via 'email') e passa a IS de Aberta para Realizando Exames.
//  - À SEC-JRS (tipo guiasSecretaria): "EXAMES DE {inspecionado}"; remetente = nome de quem disparou; PARA =
//    institucionais dos user_secretaria escolhidos; Reply-To = institucional de quem disparou; só a assinatura dele.
//  - Grava emailGuiasEnviadoEm e registra cada envio no histórico da IS (registrarEmailIS).
// POST /api/secretaria/usuarios: listarUsuariosSecretaria (caixas de seleção do dialog; rótulo = usuario).
import { nomeArquivoDocumento } from '../../utils/nomeArquivoDocumento';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { CONFIG_EMAIL_RESULTADO, emailValido } from './resultadoIS';
import { assinaturaDe, assinaturaSemSignatario, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from './comum';
import { hojeRecife, institucionaisSecretaria, registrarEmailIS } from './registroEmailsIS';
import { TEMPLATE_GUIAS_INSPECIONADO, TEMPLATE_GUIAS_SECRETARIA } from './templateGuiasIS';
import { cargoSemJrs } from '../../config/emails';
import { ehInstitucional } from '../../utils/emailAgendaIS';
import {
  ASSUNTO_GUIAS_INSPECIONADO, assuntoGuiasSecretaria, caminhoGuiasExames, inspecionadoSemNip, linhasExamesGuias,
  vocativoInspecionado, type GrupoGuia, type SexoCadastro,
} from '../../utils/emailGuiasIS';

export const FECHO_GUIAS = 'ATT/RPT,';

/** Bucket do Storage (Admin SDK): só a leitura do PDF das guias. */
export interface BucketLeitura { file(caminho: string): { download(): Promise<[Buffer]> } }

export interface DadosEmailGuias {
  numeroIs: number | string;
  /** "POSTO (QUADRO) NIP NOME" (texto da IS). */
  inspecionado: string;
  finalidade: string;
  sexo?: SexoCadastro;
  /** is.guiasExames.grupos (ordem das páginas). */
  grupos: GrupoGuia[];
}

/** Quem enviou o e-mail à SEC-JRS (assinatura única). */
export interface RemetenteGuias { nome: string; posto?: string; cargo?: string }

const rodapeTexto = () => [
  'Hospital Naval de Recife - Junta Regular de Saúde',
  `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
  'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
];

/** E-mail ao inspecionado: assunto, HTML (sem JavaScript), texto simples e nome do anexo. Exportada para os testes. */
export const montarEmailGuiasInspecionado = (d: DadosEmailGuias, assinatura: DadosAssinatura = assinaturaSemSignatario()) => {
  const finalidade = String(d.finalidade || '').trim();
  const vocativo = vocativoInspecionado(d.inspecionado, d.sexo);
  const linhas = linhasExamesGuias(d.grupos);
  const html = renderizarTemplate(TEMPLATE_GUIAS_INSPECIONADO, {
    titulo: 'Guia dos exames para Inspeção de Saúde - JRS/HNRe',
    vocativo, finalidade, exames_linhas: linhas as unknown as Record<string, unknown>[], fecho: FECHO_GUIAS, ...assinatura,
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
  });
  const texto = [
    `${vocativo},`, '',
    `participo em anexo as guias dos exames necessários para a realização da IS fim ${finalidade}, a saber:`, '',
    ...linhas.map(l => `${l.tipo}: ${l.exame}`), '',
    assinaturaTexto(assinatura, FECHO_GUIAS), '',
    ...rodapeTexto(),
  ].join('\n');
  return { assunto: ASSUNTO_GUIAS_INSPECIONADO, html, texto, anexoNome: nomeArquivoDocumento({ tipo: 'GUIA_DE_EXAMES', nome: d.inspecionado, is: d.numeroIs }) };
};

/** E-mail à SEC-JRS: assunto, HTML, texto simples e nome do anexo. Exportada para os testes. */
export const montarEmailGuiasSecretaria = (d: DadosEmailGuias, remetente: RemetenteGuias) => {
  const finalidade = String(d.finalidade || '').trim();
  const inspecionado = String(d.inspecionado || '').trim();
  const html = renderizarTemplate(TEMPLATE_GUIAS_SECRETARIA, {
    titulo: 'Exames da IS - JRS/HNRe',
    finalidade, inspecionado, fecho: FECHO_GUIAS,
    remetente_nome: remetente.nome, remetente_posto: remetente.posto || '', remetente_cargo: remetente.cargo || '',
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
  });
  const texto = [
    `Seguem as guias dos exames da IS fim ${finalidade} de ${inspecionado}.`, '',
    FECHO_GUIAS, '',
    ...[remetente.nome, remetente.posto, remetente.cargo].filter(Boolean) as string[], '',
    ...rodapeTexto(),
  ].join('\n');
  return { assunto: assuntoGuiasSecretaria(inspecionadoSemNip(inspecionado)), html, texto, anexoNome: nomeArquivoDocumento({ tipo: 'GUIA_DE_EXAMES', nome: d.inspecionado, is: d.numeroIs }) };
};

// ---------------------------------------------------------------- Dados fictícios (e-mail de teste e página Sobre)

export const DADOS_FICTICIOS_GUIAS: DadosEmailGuias = {
  numeroIs: '1234567',
  inspecionado: 'CT (Md) 12.3456.78 FULANO DE TAL DA SILVA',
  finalidade: 'Controle anual de praça de máquinas',
  sexo: 'Masculino',
  grupos: [
    { grupo: 'Exames laboratoriais', exames: ['Anti-HIV', 'Colesterol total e frações', 'Glicemia de jejum', 'Hemograma completo', 'Triglicerídeos', 'Ureia e creatinina'] },
    { grupo: 'Avaliações', exames: ['Audiometria', 'Exame odontológico geral'] },
    { grupo: 'Exames de imagem', exames: ['Radiografia de tórax'] },
    { grupo: 'Outros exames', exames: ['Eletrocardiograma'] },
  ],
};
export const REMETENTE_FICTICIO_GUIAS: RemetenteGuias = { nome: 'BELTRANO DE SOUZA', posto: '1SG-ES', cargo: 'Secretário' };

/** E-mail das guias ao inspecionado com dados fictícios (e-mail de teste e página Sobre). */
export const montarEmailGuiasInspecionadoFicticio = (assinatura: DadosAssinatura = assinaturaSemSignatario()) =>
  montarEmailGuiasInspecionado(DADOS_FICTICIOS_GUIAS, assinatura);
/** E-mail das guias à SEC-JRS com dados fictícios. */
export const montarEmailGuiasSecretariaFicticio = (remetente: RemetenteGuias = REMETENTE_FICTICIO_GUIAS) =>
  montarEmailGuiasSecretaria(DADOS_FICTICIOS_GUIAS, remetente);

// ---------------------------------------------------------------- Envio

interface UsuarioDoc { usuario?: string; nome?: string; email?: string; postoGraduacao?: string; cargo?: string }

/** user_secretaria ativos com institucional, para as caixas do dialog (rótulo = usuario). */
export const listarUsuariosSecretaria = async (db: Firestore): Promise<{ uid: string; usuario: string; nome: string }[]> =>
  (await institucionaisSecretaria(db))
    .map(u => ({ uid: u.uid, usuario: u.usuario || u.nome || u.email, nome: u.nome }))
    .sort((a, b) => a.usuario.localeCompare(b.usuario, 'pt-BR'));

export interface ResultadoEnvioGuias { paraInspecionado?: string; paraSecretaria: string[]; emailSalvo: boolean }

/**
 * Envia as guias da IS `isId` ao inspecionado e/ou aos membros da SEC-JRS escolhidos. Valida tudo antes do
 * primeiro envio (e-mail do inspecionado, destinatários da Secretaria, PDF) para não sair só metade.
 */
export const enviarGuiasIS = async (db: Firestore, bucket: BucketLeitura, b: Record<string, unknown>, uid: string): Promise<ResultadoEnvioGuias> => {
  const isId = String(b.isId ?? '').replace(/\D/g, '');
  if (!isId) throw new ErroContaGoogle('falha', 'Informe a IS.');
  const paraInspecionado = b.inspecionado === true;
  const uidsSecretaria = Array.from(new Set((Array.isArray(b.secretariaUids) ? b.secretariaUids : []).map(v => String(v ?? '').trim()).filter(v => v && !v.includes('/'))));
  if (!paraInspecionado && !uidsSecretaria.length) throw new ErroContaGoogle('falha', 'Escolha o inspecionado e/ou ao menos um membro da SEC-JRS.');

  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroContaGoogle('falha', 'IS não encontrada.');
  const is = snapIs.data() as { is?: number; inspecionado?: string; finalidade?: string; status?: string; inspecionadoId?: string; guiasExames?: { caminho?: string; grupos?: GrupoGuia[] } | null };
  if (is.status === 'cancelada') throw new ErroContaGoogle('falha', 'A IS está cancelada.');
  if (!is.guiasExames) throw new ErroContaGoogle('falha', 'Esta IS não tem guias de exames geradas.');
  const caminho = String(is.guiasExames.caminho || caminhoGuiasExames(isId));

  const refMilitar = is.inspecionadoId ? db.collection('militares').doc(String(is.inspecionadoId)) : null;
  const militar = refMilitar ? ((await refMilitar.get()).data() as { email?: string; emailPessoal?: string; sexo?: string } | undefined) : undefined;
  const cadastrado = String(militar?.email || militar?.emailPessoal || '').trim().toLowerCase();
  const informado = String(b.email ?? '').trim().toLowerCase();
  const emailInspecionado = cadastrado || informado;
  if (paraInspecionado) {
    if (!emailInspecionado) throw new ErroContaGoogle('falha', 'O inspecionado não tem e-mail cadastrado. Informe o e-mail.');
    if (!emailValido(emailInspecionado)) throw new ErroContaGoogle('falha', 'E-mail do inspecionado inválido.');
  }
  const secretaria = uidsSecretaria.length ? await institucionaisSecretaria(db, uidsSecretaria) : [];
  if (uidsSecretaria.length && !secretaria.length) throw new ErroContaGoogle('falha', 'Nenhum dos membros da SEC-JRS escolhidos tem e-mail institucional cadastrado.');

  const quem = ((await db.collection('usuarios').doc(uid).get()).data() || {}) as UsuarioDoc;
  const institucionalQuem = ehInstitucional(String(quem.email || '')) ? String(quem.email).trim().toLowerCase() : '';

  let bytes: Buffer;
  try { [bytes] = await bucket.file(caminho).download(); } catch {
    throw new ErroContaGoogle('falha', 'O PDF das guias não foi encontrado. Gere as guias de novo.');
  }
  const dados: DadosEmailGuias = {
    numeroIs: is.is ?? isId, inspecionado: String(is.inspecionado || ''), finalidade: String(is.finalidade || ''),
    sexo: militar?.sexo, grupos: is.guiasExames.grupos ?? [],
  };
  const resultado: ResultadoEnvioGuias = { paraSecretaria: [], emailSalvo: false };

  if (paraInspecionado) {
    const fixos = await destinatariosFixos(db, 'guiasInspecionado');
    const { assunto, html, texto, anexoNome } = montarEmailGuiasInspecionado(dados, await assinaturaDe(db, uid, fixos.config));
    const para = juntarEmails([emailInspecionado, fixos.para]);
    const cc = juntarEmails([fixos.cc, institucionalQuem], para);
    const cco = juntarEmails([fixos.cco], [...para, ...cc]);
    await enviarEmail(db, {
      para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
      responderPara: fixos.responderPara, assunto, html, texto, nomeRemetente: CONFIG_EMAIL_RESULTADO.nomeRemetente,
      anexo: { nome: anexoNome, bytes },
    });
    resultado.emailSalvo = !cadastrado && !!refMilitar && !!militar;
    if (resultado.emailSalvo) await refMilitar!.update({ email: emailInspecionado, atualizadoEm: FieldValue.serverTimestamp() });
    // Entrega das guias por e-mail: Aberta → Realizando Exames (a situação continua "aberta").
    await refIs.update({
      guiasEntregues: true, guiasEntreguesVia: 'email', guiasEntreguesEm: hojeRecife(), guiasEntreguesPor: String(quem.usuario || uid),
      ...(is.status === 'aberta' ? { status: 'realizando_exames' } : {}),
      emailGuiasEnviadoEm: FieldValue.serverTimestamp(),
      // Marca própria do envio AO INSPECIONADO (Ficha › Guias: o item "Para o Inspecionado" fica com ✓ e desabilitado).
      emailGuiasInspecionadoEm: FieldValue.serverTimestamp(),
    });
    await registrarEmailIS(db, isId, uid, { tipo: 'guiasInspecionado', assunto, para, cc, html, texto, anexo: anexoNome });
    resultado.paraInspecionado = emailInspecionado;
  }

  if (secretaria.length) {
    const fixos = await destinatariosFixos(db, 'guiasSecretaria');
    const remetente: RemetenteGuias = {
      nome: String(quem.nome || quem.usuario || 'JRS/HNRe').trim(), posto: String(quem.postoGraduacao || '').trim(), cargo: cargoSemJrs(quem.cargo || ''),
    };
    const { assunto, html, texto, anexoNome } = montarEmailGuiasSecretaria(dados, remetente);
    const para = juntarEmails([secretaria.map(s => s.email), fixos.para]);
    const cc = juntarEmails([fixos.cc], para);
    const cco = juntarEmails([fixos.cco], [...para, ...cc]);
    await enviarEmail(db, {
      para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
      responderPara: institucionalQuem || fixos.responderPara, assunto, html, texto, nomeRemetente: remetente.nome,
      anexo: { nome: anexoNome, bytes },
    });
    if (!paraInspecionado) await refIs.update({ emailGuiasEnviadoEm: FieldValue.serverTimestamp() });
    await registrarEmailIS(db, isId, uid, { tipo: 'guiasSecretaria', assunto, para, cc, html, texto, anexo: anexoNome });
    resultado.paraSecretaria = para;
  }
  return resultado;
};
