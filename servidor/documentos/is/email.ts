// Ficheiro: servidor/documentos/is/email.ts
// E-mail de um documento da IS ao inspecionado (tipo documentoIS em config/emails), com o PDF anexado, pela
// Gmail API da conta Google da JRS (servidor/google/impressao.ts → enviarEmail). PARA = e-mail do cadastro
// (militares/{id}.email ou emailPessoal) + fixos; CC = fixos + o que o gerador do tipo pedir (AjusteEmailDocumento);
// Reply-To = caixa da JRS; assinatura dinâmica ("Por ordem de:" quem disparou + Presidente), como nas guias.
// Registra o envio no histórico da IS (registrarEmailIS → aba E-mails da Ficha).
import { enviarEmail } from '../../google/impressao';
import { renderizarTemplate } from '../../email/template';
import { CONFIG_EMAIL_RESULTADO, emailValido } from '../../email/resultadoIS';
import { assinaturaDe, assinaturaTexto, destinatariosFixos, juntarEmails, type DadosAssinatura } from '../../email/comum';
import { registrarEmailIS } from '../../email/registroEmailsIS';
import { ASSINATURA_DUPLA, MOLDURA_FIM, MOLDURA_INICIO } from '../../email/templateGuiasIS';
import { FECHO_GUIAS } from '../../email/guiasIS';
import { inspecionadoSemNip, vocativoInspecionado } from '../../../utils/emailGuiasIS';
import type { AjusteEmailDocumento, ContextoDocumentoIS } from './tipos';

export const TEMPLATE_DOCUMENTO_IS = `${MOLDURA_INICIO}
<p style="margin:0 0 25px 0;font-size:17px;font-weight:700">{{vocativo}},</p>
{{#paragrafos}}
<p style="margin:0 0 18px 0;text-align:justify">{{texto}}</p>
{{/paragrafos}}
${ASSINATURA_DUPLA}${MOLDURA_FIM}`;

/** Nome do anexo: "{TÍTULO} - IS {n}.pdf". */
export const nomeAnexoDocumentoIS = (titulo: string, numeroIs: string | number) =>
  `${titulo.toUpperCase().replace(/[\\/:*?"<>|]+/g, ' ').trim()} - IS ${numeroIs}.pdf`;

export interface DadosEmailDocumentoIS {
  titulo: string; numeroIs: string | number; inspecionado: string; finalidade: string; sexo?: string;
  paragrafos?: string[]; assunto?: string;
}

/** Assunto, HTML, texto simples e nome do anexo (puro; usado também no e-mail de teste). */
export const montarEmailDocumentoIS = (d: DadosEmailDocumentoIS, assinatura: DadosAssinatura) => {
  const vocativo = vocativoInspecionado(d.inspecionado, d.sexo);
  const paragrafos = d.paragrafos?.length ? d.paragrafos
    : [`Segue em anexo o documento "${d.titulo}" referente à IS nº ${d.numeroIs} fim ${d.finalidade}.`];
  const assunto = d.assunto || `${d.titulo.toUpperCase()} - IS ${d.numeroIs} - ${inspecionadoSemNip(d.inspecionado)}`;
  const html = renderizarTemplate(TEMPLATE_DOCUMENTO_IS, {
    titulo: `${d.titulo} - JRS/HNRe`, vocativo, paragrafos: paragrafos.map(t => ({ texto: t })) as unknown as Record<string, unknown>[],
    fecho: FECHO_GUIAS, ...assinatura,
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
  });
  const texto = [`${vocativo},`, '', ...paragrafos.flatMap(p => [p, '']), assinaturaTexto(assinatura, FECHO_GUIAS), '',
    'Hospital Naval de Recife - Junta Regular de Saúde', `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`].join('\n');
  return { assunto, html, texto, anexoNome: nomeAnexoDocumentoIS(d.titulo, d.numeroIs) };
};

/** Envia o PDF ao inspecionado. Lança Error com mensagem amigável se não houver e-mail. Devolve os destinatários. */
export const enviarDocumentoAoInspecionado = async (
  ctx: ContextoDocumentoIS, titulo: string, pdf: Buffer, ajuste: AjusteEmailDocumento = {},
): Promise<string[]> => {
  const { db, is, militar, uid } = ctx;
  const emailInspecionado = String(militar?.email || militar?.emailPessoal || '').trim().toLowerCase();
  if (!emailInspecionado || !emailValido(emailInspecionado)) throw new Error('O inspecionado não tem e-mail válido cadastrado.');

  const fixos = await destinatariosFixos(db, 'documentoIS');
  const assinatura = await assinaturaDe(db, uid, fixos.config);
  const { assunto, html, texto, anexoNome } = montarEmailDocumentoIS({
    titulo, numeroIs: is.is, inspecionado: is.inspecionado, finalidade: is.finalidade, sexo: militar?.sexo as string | undefined,
    paragrafos: ajuste.paragrafos, assunto: ajuste.assunto,
  }, assinatura);
  const para = juntarEmails([emailInspecionado, ajuste.para, fixos.para]);
  const cc = juntarEmails([ajuste.cc, fixos.cc], para);
  const cco = juntarEmails([fixos.cco], [...para, ...cc]);
  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
    responderPara: fixos.responderPara, assunto, html, texto, nomeRemetente: 'JRS-HNRe',
    anexo: { nome: anexoNome, bytes: pdf },
  });
  await registrarEmailIS(db, is.id, uid, { tipo: 'documentoIS', assunto, para, cc, html, texto, anexo: anexoNome, variante: titulo });
  return para;
};
