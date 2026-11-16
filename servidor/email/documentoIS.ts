// Ficheiro: servidor/email/documentoIS.ts
// "Zimbra SEC-JRS" da Ficha do inspecionado (abas Exames e Atestados e Laudos): envia o PDF de um exame ou
// atestado/laudo da IS (Storage inspecoes/{isId}/exames/{exameId}.pdf; services/examesIS.ts) aos e-mails
// institucionais dos membros da SEC-JRS escolhidos, para impressão. Rota POST /api/email/documento-is
// { isId, exameId, secretariaUids: string[] } (equipe: Admin, médicos JRS/MPI e Secretaria; no app, a função
// "ficha.zimbraSecretaria"). Mesmo padrão do e-mail das guias à SEC-JRS (servidor/email/guiasIS.ts):
// remetente = nome de quem disparou; PARA = institucionais escolhidos (+ fixos de config/emails, tipo
// documentoSecretaria); Reply-To = institucional de quem disparou; só a assinatura dele. Registra o envio no
// histórico da IS (registrarEmailIS). Assunto e nome do anexo: utils/examesFicha.ts.
import type { Firestore } from 'firebase-admin/firestore';
import { ErroContaGoogle } from '../google/contaGoogle';
import { enviarEmail } from '../google/impressao';
import { renderizarTemplate } from './template';
import { CONFIG_EMAIL_RESULTADO } from './resultadoIS';
import { destinatariosFixos, juntarEmails } from './comum';
import { institucionaisSecretaria, registrarEmailIS } from './registroEmailsIS';
import { MOLDURA_FIM, MOLDURA_INICIO } from './templateGuiasIS';
import { FECHO_GUIAS, type BucketLeitura, type RemetenteGuias } from './guiasIS';
import { cargoSemJrs } from '../../config/emails';
import { ehInstitucional } from '../../utils/emailAgendaIS';
import { inspecionadoSemNip } from '../../utils/emailGuiasIS';
import { assuntoDocumentoSecretaria, nomeAnexoDocumento, nomeDoItem } from '../../utils/examesFicha';
import { classeDoExame, ROTULO_CLASSE, type ClasseExame, type ItemExame } from '../../utils/examesIS';

/** "{rótulo}: {documento}" à SEC-JRS: o texto, o documento e só a assinatura de quem enviou. */
export const TEMPLATE_DOCUMENTO_SECRETARIA = `${MOLDURA_INICIO}
<p style="margin:0 0 18px 0;text-align:justify">Segue, para impressão, o PDF em anexo da IS fim <strong>{{finalidade}}</strong> de <strong>{{inspecionado}}</strong>:</p>
<p style="margin:0 0 25px 0;padding:12px 16px;background:#f4f6f9;border-left:4px solid #FAB932;font-weight:700">{{rotulo}}: {{documento}}</p>

<table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%">
<tbody><tr><td style="padding:15px 0 10px 0;color:#050F41">
<p style="margin:0 0 18px 0;font-size:16px;font-weight:700">{{fecho}}</p>
<p style="margin:0;font-size:18px;font-weight:700">{{remetente_nome}}</p>
{{#remetente_posto}}
<p style="margin:0;font-size:14px;font-weight:700;color:#555555">{{remetente_posto}}</p>
{{/remetente_posto}}
{{#remetente_cargo}}
<p style="margin:0;font-size:14px;color:#555555">{{remetente_cargo}}</p>
{{/remetente_cargo}}
</td></tr></tbody>
</table>
${MOLDURA_FIM}`;

export interface DadosEmailDocumento {
  numeroIs: number | string;
  /** "POSTO (QUADRO) NIP NOME" (texto da IS). */
  inspecionado: string;
  finalidade: string;
  classe: ClasseExame;
  /** Nome do(s) documento(s) do PDF ("RM DO JOELHO · HEMOGRAMA COMPLETO"). */
  documento: string;
}

/** E-mail à SEC-JRS: assunto, HTML (sem JavaScript), texto simples e nome do anexo. Exportada para os testes. */
export const montarEmailDocumentoSecretaria = (d: DadosEmailDocumento, remetente: RemetenteGuias) => {
  const finalidade = String(d.finalidade || '').trim();
  const inspecionado = String(d.inspecionado || '').trim();
  const rotulo = ROTULO_CLASSE[d.classe];
  const html = renderizarTemplate(TEMPLATE_DOCUMENTO_SECRETARIA, {
    titulo: `${rotulo} para impressão - JRS/HNRe`,
    finalidade, inspecionado, rotulo, documento: d.documento, fecho: FECHO_GUIAS,
    remetente_nome: remetente.nome, remetente_posto: remetente.posto || '', remetente_cargo: remetente.cargo || '',
    banner_url: CONFIG_EMAIL_RESULTADO.bannerUrl, logo_rodape_url: CONFIG_EMAIL_RESULTADO.logoRodapeUrl,
  });
  const texto = [
    `Segue, para impressão, o PDF em anexo da IS fim ${finalidade} de ${inspecionado}:`, '',
    `${rotulo}: ${d.documento}`, '',
    FECHO_GUIAS, '',
    ...[remetente.nome, remetente.posto, remetente.cargo].filter(Boolean) as string[], '',
    'Hospital Naval de Recife - Junta Regular de Saúde',
    `(81) 3036-9073 / ${CONFIG_EMAIL_RESULTADO.emailJrs}`,
    'Avenida Cruz Cabugá 1200, Santo Amaro, Recife/PE',
  ].join('\n');
  return {
    assunto: assuntoDocumentoSecretaria(d.classe, inspecionadoSemNip(inspecionado)), html, texto,
    anexoNome: nomeAnexoDocumento(d.documento, d.numeroIs),
  };
};

/** Dados fictícios (e-mail de teste em Administração › E-mails automáticos). */
export const DADOS_FICTICIOS_DOCUMENTO: DadosEmailDocumento = {
  numeroIs: '1234567', inspecionado: 'CT (Md) 12.3456.78 FULANO DE TAL DA SILVA', finalidade: 'Controle Periódico de Saúde',
  classe: 'laudo_exame', documento: 'RM DO JOELHO DIREITO',
};

export interface ResultadoEnvioDocumento { paraSecretaria: string[] }

interface UsuarioDoc { usuario?: string; nome?: string; email?: string; postoGraduacao?: string; cargo?: string }
const idSeguro = (v: unknown) => String(v ?? '').trim().replace(/[^A-Za-z0-9_-]/g, '');

/** Envia o PDF `exameId` da IS `isId` aos membros da SEC-JRS escolhidos. Valida tudo antes do envio. */
export const enviarDocumentoSecretaria = async (db: Firestore, bucket: BucketLeitura, b: Record<string, unknown>, uid: string): Promise<ResultadoEnvioDocumento> => {
  const isId = idSeguro(b.isId);
  const exameId = idSeguro(b.exameId);
  if (!isId || !exameId) throw new ErroContaGoogle('falha', 'Informe a IS e o documento.');
  const uids = Array.from(new Set((Array.isArray(b.secretariaUids) ? b.secretariaUids : []).map(v => String(v ?? '').trim()).filter(v => v && !v.includes('/'))));
  if (!uids.length) throw new ErroContaGoogle('falha', 'Escolha ao menos um membro da SEC-JRS.');

  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroContaGoogle('falha', 'IS não encontrada.');
  const is = snapIs.data() as { is?: number; inspecionado?: string; finalidade?: string };
  const snapEx = await refIs.collection('exames').doc(exameId).get();
  if (!snapEx.exists) throw new ErroContaGoogle('falha', 'Documento não encontrado.');
  const exame = snapEx.data() as { caminho?: string; nomeArquivo?: string; itens?: ItemExame[]; classificacao?: unknown };
  const caminho = String(exame.caminho || `inspecoes/${isId}/exames/${exameId}.pdf`);
  if (!caminho.startsWith(`inspecoes/${isId}/exames/`)) throw new ErroContaGoogle('falha', 'Documento inválido.');

  const secretaria = await institucionaisSecretaria(db, uids);
  if (!secretaria.length) throw new ErroContaGoogle('falha', 'Nenhum dos membros da SEC-JRS escolhidos tem e-mail institucional cadastrado.');

  let bytes: Buffer;
  try { [bytes] = await bucket.file(caminho).download(); } catch {
    throw new ErroContaGoogle('falha', 'O PDF do documento não foi encontrado.');
  }

  const quem = ((await db.collection('usuarios').doc(uid).get()).data() || {}) as UsuarioDoc;
  const institucionalQuem = ehInstitucional(String(quem.email || '')) ? String(quem.email).trim().toLowerCase() : '';
  const remetente: RemetenteGuias = {
    nome: String(quem.nome || quem.usuario || 'JRS/HNRe').trim(), posto: String(quem.postoGraduacao || '').trim(), cargo: cargoSemJrs(quem.cargo || ''),
  };
  const itens = Array.isArray(exame.itens) ? exame.itens : [];
  const documento = itens.map(i => nomeDoItem(i)).filter(Boolean).join(' · ') || String(exame.nomeArquivo || 'Documento');
  const { assunto, html, texto, anexoNome } = montarEmailDocumentoSecretaria({
    numeroIs: is.is ?? isId, inspecionado: String(is.inspecionado || ''), finalidade: String(is.finalidade || ''),
    classe: classeDoExame({ classificacao: exame.classificacao, itens }), documento,
  }, remetente);

  const fixos = await destinatariosFixos(db, 'documentoSecretaria');
  const para = juntarEmails([secretaria.map(s => s.email), fixos.para]);
  const cc = juntarEmails([fixos.cc], para);
  const cco = juntarEmails([fixos.cco], [...para, ...cc]);
  await enviarEmail(db, {
    para: para.join(', '), cc: cc.length ? cc.join(', ') : undefined, cco: cco.length ? cco.join(', ') : undefined,
    responderPara: institucionalQuem || fixos.responderPara, assunto, html, texto, nomeRemetente: remetente.nome,
    anexo: { nome: anexoNome, bytes },
  });
  await registrarEmailIS(db, isId, uid, { tipo: 'documentoSecretaria', assunto, para, cc });
  return { paraSecretaria: para };
};
