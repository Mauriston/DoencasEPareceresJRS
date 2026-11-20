// Ficheiro: servidor/documentos/is/servico.ts
// Geração de um documento da IS (Admin SDK) — rota POST /api/inspecoes/documentos/gerar
// { isId, tipo, dados, enviarEmail }:
//  1. lê a IS e o cadastro do inspecionado; confere perfil (utils/documentosIS.ts → PERFIS_DOCUMENTO_IS), a regra
//     de habilitação do tipo (motivoDocumentoISIndisponivel) e a validação do gerador (registro.ts → {tipo}.ts);
//  2. resolve o assinante (comum.ts → resolverAssinante: quem gerou, rubrica se Admin; ou o Presidente);
//  3. gera o PDF (Chromium), grava no Storage em inspecoes/{isId}/documentos/{tipo}-{id}.pdf (permanente: sem regra
//     de ciclo de vida nem limpeza; só sai ao excluir a IS) e o registro em inspecoes/{isId}/documentos/{id};
//  Modo teste (corpo.teste, só Admin): IS fictícia, dados de gerador.dadosTeste, PDF em testes/documentosIS/ (apagado
//  30 min depois por limparTestesDocumentosIS), sem registro nem e-mail. Ajustes do template: config/documentosIS.{tipo}.
//  4. com enviarEmail, envia ao inspecionado (email.ts; falha no e-mail não desfaz o documento: volta em erroEmail).
import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { Bucket } from '../guiasExames/servico';
import { urlDownloadStorage } from '../../../utils/pareceres';
import {
  caminhoDocumentoIS, ehTipoDocumentoIS, motivoDocumentoISIndisponivel, PERFIS_DOCUMENTO_IS, ROTULO_DOCUMENTO_IS, SUBCOL_DOCUMENTOS_IS,
} from '../../../utils/documentosIS';
import { registrarUsoServidor } from '../../email/registroEmailsIS';
import { geradorDoTipo } from './registro';
import { resolverAssinante } from './comum';
import { ErroDocumentoIS, type ContextoDocumentoIS, type DocumentoISSalvo, type ISDocumento, type MilitarDocumento } from './tipos';

const idDaIs = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');
const s = (v: unknown) => String(v ?? '').trim();

export const lerISDocumento = async (db: Firestore, isId: string): Promise<ISDocumento> => {
  const snap = await db.collection('inspecoes').doc(isId).get();
  if (!snap.exists) throw new ErroDocumentoIS(404, 'IS não encontrada.');
  const x = (snap.data() || {}) as Record<string, unknown>;
  return {
    id: isId, is: (x.is as number) ?? isId, inspecionado: s(x.inspecionado), inspecionadoId: s(x.inspecionadoId),
    finalidade: s(x.finalidade), grupoFinalidade: s(x.grupoFinalidade), situacao: s(x.situacao), status: s(x.status),
    dataEntrevista: s(x.dataEntrevista), dataLaudo: s(x.dataLaudo), laudo: s(x.laudo), peritoUid: s(x.peritoUid), bruto: x,
  };
};

/** Prefixo dos PDFs de teste (Admin › ajustes): apagados 30 min depois (limparTestesDocumentosIS). */
export const PREFIXO_TESTES_DOCUMENTOS_IS = 'testes/documentosIS/';
export const MINUTOS_VALIDADE_TESTE = 30;

/** Apaga os PDFs de teste com mais de 30 min (chamada a cada geração de teste e pelo agendador). */
export const limparTestesDocumentosIS = async (bucket: Bucket, agora = Date.now()): Promise<number> => {
  const [arquivos] = await bucket.getFiles({ prefix: PREFIXO_TESTES_DOCUMENTOS_IS });
  const velhos = arquivos.filter(f => agora - new Date(String(f.metadata?.timeCreated ?? 0)).getTime() > MINUTOS_VALIDADE_TESTE * 60_000);
  await Promise.all(velhos.map(f => f.delete({ ignoreNotFound: true }).catch(() => undefined)));
  return velhos.length;
};

/** Ajustes do template do tipo (config/documentosIS.{tipo}); {} se não houver. */
export const lerAjustesDocumentoIS = async (db: Firestore, tipo: string): Promise<Record<string, unknown>> => {
  try {
    const x = (await db.collection('config').doc('documentosIS').get()).data() as Record<string, unknown> | undefined;
    const a = x?.[tipo];
    return a && typeof a === 'object' ? a as Record<string, unknown> : {};
  } catch { return {}; }
};

/** IS e inspecionado fictícios do modo teste. */
export const IS_FICTICIA = (tipo: string): ISDocumento => ({
  id: '0', is: 1234567, inspecionado: 'CT (Md) 12.3456.78 FULANO DE TAL DA SILVA', inspecionadoId: '12345678',
  finalidade: tipo === 'laudoPericial' ? 'Isenção de Imposto de Renda' : tipo === 'papeletaDispensa' ? 'Verificação de Deficiência Funcional' : 'Controle Periódico de Saúde',
  grupoFinalidade: tipo === 'laudoPericial' || tipo === 'termoRecurso' ? 'Benefícios' : 'Verificações e Términos',
  situacao: 'finalizada', status: 'finalizada', dataEntrevista: '2026-11-20T09:00', dataLaudo: '2026-11-20',
  laudo: 'Tem histórico médico de Neoplasia Maligna (C50.9), doença especificada na Lei nº 7.713/1988, a partir de 01/01/2025.',
  peritoUid: '', bruto: {},
});
const MILITAR_FICTICIO: MilitarDocumento = { nome: 'FULANO DE TAL DA SILVA', cpf: '000.000.000-00', om: 'HNRe', sexo: 'Masculino', email: '' };

export const gerarDocumentoIS = async (
  db: Firestore, bucket: Bucket, nomeBucket: string, quem: { uid: string; perfil: string },
  corpo: { isId?: unknown; tipo?: unknown; dados?: unknown; enviarEmail?: unknown; teste?: unknown },
): Promise<DocumentoISSalvo> => {
  if (!ehTipoDocumentoIS(corpo.tipo)) throw new ErroDocumentoIS(400, 'Tipo de documento inválido.');
  const tipo = corpo.tipo;
  const gerador = geradorDoTipo(tipo);
  const teste = corpo.teste === true;
  if (teste && quem.perfil !== 'admin') throw new ErroDocumentoIS(403, 'Só o Admin gera documentos de teste.');
  if (!teste && (!PERFIS_DOCUMENTO_IS[tipo].includes(quem.perfil) || !gerador.perfis.includes(quem.perfil))) {
    throw new ErroDocumentoIS(403, 'Seu perfil não pode gerar este documento.');
  }
  let is: ISDocumento;
  let militar: MilitarDocumento;
  if (teste) {
    is = IS_FICTICIA(tipo);
    militar = MILITAR_FICTICIO;
  } else {
    const isId = idDaIs(corpo.isId);
    if (!isId) throw new ErroDocumentoIS(400, 'Informe a IS.');
    is = await lerISDocumento(db, isId);
    const motivo = motivoDocumentoISIndisponivel(tipo, is);
    if (motivo) throw new ErroDocumentoIS(400, `${ROTULO_DOCUMENTO_IS[tipo]} indisponível: ${motivo}.`);
    const snapMil = is.inspecionadoId ? await db.collection('militares').doc(is.inspecionadoId).get() : null;
    militar = snapMil?.exists ? (snapMil.data() as MilitarDocumento) : null;
  }

  const base = { db, uid: quem.uid, perfil: quem.perfil, is, militar, agora: new Date(), teste, ajustes: await lerAjustesDocumentoIS(db, tipo) };
  const dadosBrutos = (corpo.dados && typeof corpo.dados === 'object' ? corpo.dados : {}) as Record<string, unknown>;
  const dados = teste && gerador.dadosTeste ? gerador.dadosTeste(base) : await gerador.validar(dadosBrutos, base);
  const ctx: ContextoDocumentoIS = { ...base, assinante: await resolverAssinante(db, quem.uid, gerador.assinante) };

  const { htmlParaPdf } = await import('../gerarPdf');
  const pdf = await htmlParaPdf(await gerador.gerarHtml(dados, ctx));

  const id = randomUUID();
  const caminho = teste ? `${PREFIXO_TESTES_DOCUMENTOS_IS}${tipo}-${id}.pdf` : caminhoDocumentoIS(is.id, tipo, id);
  const token = randomUUID();
  await bucket.file(caminho).save(pdf, {
    contentType: 'application/pdf', resumable: false,
    metadata: { contentType: 'application/pdf', metadata: { firebaseStorageDownloadTokens: token } },
  });
  const salvo: DocumentoISSalvo = {
    id, tipo, titulo: gerador.titulo, caminho, pdfUrl: urlDownloadStorage(nomeBucket, caminho, token),
    assinante: { uid: ctx.assinante.uid, nome: ctx.assinante.nome, origem: ctx.assinante.origem }, emailEnviado: false,
  };
  if (teste) {
    void limparTestesDocumentosIS(bucket).catch(() => undefined);
    return salvo;
  }

  if (corpo.enviarEmail === true) {
    try {
      const { enviarDocumentoAoInspecionado } = await import('./email');
      const ajuste = gerador.email ? await gerador.email(dados, ctx) : {};
      salvo.emailPara = await enviarDocumentoAoInspecionado(ctx, gerador.titulo, pdf, ajuste);
      salvo.emailEnviado = true;
    } catch (e: any) {
      salvo.erroEmail = e?.message ? String(e.message) : 'Falha ao enviar o e-mail.';
    }
  }

  await db.collection('inspecoes').doc(is.id).collection(SUBCOL_DOCUMENTOS_IS).doc(id).set({
    tipo, titulo: gerador.titulo, caminho, pdfUrl: salvo.pdfUrl, resumo: gerador.resumo ? gerador.resumo(dados, ctx) : '',
    assinante: salvo.assinante, geradoPorUid: quem.uid, emailEnviado: salvo.emailEnviado, emailPara: salvo.emailPara ?? [],
    is: is.is, inspecionadoId: is.inspecionadoId, criadoEm: FieldValue.serverTimestamp(), criadoEmMs: Date.now(),
  });
  if (gerador.aposGerar) {
    try { await gerador.aposGerar(dados, ctx, salvo); } catch { /* best effort */ }
  }
  await registrarUsoServidor(db, quem.uid, {});
  return salvo;
};
