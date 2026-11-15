// Ficheiro: servidor/documentos/guiasExames/servico.ts
// Guias de exames da IS no servidor (Admin SDK):
//  - gerarGuiasExames: recalcula os exames (utils/guiasExames.ts — não confia em lista do cliente) pela
//    finalidade da IS e pelo sexo/idade do inspecionado, gera o PDF único (documento.ts → Chromium), grava
//    no Storage em inspecoes/{isId}/guias/guias-exames.pdf e o resumo em inspecoes/{isId}.guiasExames;
//    conta uso_diario.guiasGeradas. Sexo e data de nascimento vêm do cadastro (militares/{id}); os
//    informados no formulário da IS têm preferência e a data é gravada no cadastro quando ele não tem;
//  - apagarGuiasExames: apaga o PDF e zera guiasExames (o app chama ao apagar a IS);
//  - limparGuiasVencidas: apaga as guias das IS finalizadas há mais de 15 dias (agendador diário).
// Rotas em server.ts (marcador "pacote A"); contrato em .especificacao/BRIEFING_COMUM.md.
import type { Firestore, Timestamp } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { getStorage } from 'firebase-admin/storage';
import { ehFinalidadeAnexoO, examesDasGuias, finalidadeTemExamesMinimos, idadeEm, paginasDasGuias, type GrupoExamesGuia, type SexoGuia } from '../../../utils/guiasExames';
import { registrarUsoServidor } from '../../email/registroEmailsIS';

/** Erro de validação: vira 400/404 na rota, com a mensagem para o usuário. */
export class ErroGuias extends Error {
  constructor(public status: 400 | 404, message: string) { super(message); }
}

/** Dias depois da finalização da IS em que as guias são apagadas. */
export const DIAS_GUARDA_GUIAS = 15;

export const caminhoGuias = (isId: string) => `inspecoes/${isId}/guias/guias-exames.pdf`;

/** Resposta da rota (GuiasExamesIS sem o Timestamp). */
export interface GuiasGeradas { caminho: string; grupos: GrupoExamesGuia[]; paginas: number; geradoPor: string }

/** Bucket do Admin SDK (tipo derivado do firebase-admin, como em servidor/entrevistas/fluxo.ts). */
export type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

const idDaIs = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');

/** 'M'/'F', 'Masculino'/'Feminino' (qualquer caixa) → SexoGuia; outro valor → null. */
export const sexoGuia = (v: unknown): SexoGuia | null => {
  const s = String(v ?? '').trim().toUpperCase();
  if (s === 'M' || s === 'MASCULINO') return 'Masculino';
  if (s === 'F' || s === 'FEMININO') return 'Feminino';
  return null;
};

const dataValida = (v: unknown): string => {
  const s = String(v ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(idadeEm(s)) ? s : '';
};

export const gerarGuiasExames = async (
  db: Firestore, bucket: Bucket, uid: string,
  corpo: { isId?: unknown; sexo?: unknown; dataNascimento?: unknown; finalidadeAnexoO?: unknown },
): Promise<{ gerado: boolean; guias?: GuiasGeradas; motivo?: string }> => {
  const isId = idDaIs(corpo.isId);
  if (!isId) throw new ErroGuias(400, 'Informe a IS.');
  const refIs = db.collection('inspecoes').doc(isId);
  const snapIs = await refIs.get();
  if (!snapIs.exists) throw new ErroGuias(404, 'IS não encontrada.');
  const is = snapIs.data() as { is?: number; finalidade?: string; inspecionado?: string; inspecionadoId?: string };
  // Para as regras vale a finalidade do Anexo O que o app identificou (IA) quando é uma da lista; senão, a da IS.
  const finalidade = ehFinalidadeAnexoO(corpo.finalidadeAnexoO) ? String(corpo.finalidadeAnexoO) : String(is.finalidade || '').trim();
  if (!finalidadeTemExamesMinimos(finalidade)) {
    return { gerado: false, motivo: 'A finalidade desta IS não tem exames mínimos que gerem guias.' };
  }

  // Sexo e data de nascimento: o informado no formulário vale; senão, o do cadastro.
  const refMilitar = is.inspecionadoId ? db.collection('militares').doc(String(is.inspecionadoId)) : null;
  const snapMilitar = refMilitar ? await refMilitar.get() : null;
  const militar = (snapMilitar?.exists ? snapMilitar.data() : undefined) as { sexo?: string; dataNascimento?: string } | undefined;
  const sexo = sexoGuia(corpo.sexo) ?? sexoGuia(militar?.sexo);
  const nascInformado = dataValida(corpo.dataNascimento);
  const dataNascimento = nascInformado || dataValida(militar?.dataNascimento);
  if (!sexo) throw new ErroGuias(400, 'Informe o sexo do inspecionado para gerar as guias.');
  if (!dataNascimento) throw new ErroGuias(400, 'Informe a data de nascimento do inspecionado para gerar as guias.');
  if (nascInformado && refMilitar && militar && !dataValida(militar.dataNascimento)) {
    await refMilitar.update({ dataNascimento: nascInformado, atualizadoEm: FieldValue.serverTimestamp() });
  }

  const grupos = examesDasGuias(finalidade, sexo, idadeEm(dataNascimento));
  const paginas = paginasDasGuias(grupos);
  if (!paginas.length) return { gerado: false, motivo: 'Não há exames mínimos para o sexo e a idade do inspecionado nesta finalidade.' };

  const { lerConfigEmails } = await import('../../email/comum');
  const { assinatura } = await lerConfigEmails(db);
  const { htmlGuiasExames } = await import('./documento');
  const { htmlParaPdf } = await import('../gerarPdf');
  const pdf = await htmlParaPdf(htmlGuiasExames({
    numeroIS: is.is ?? isId, inspecionado: String(is.inspecionado || ''), finalidade: String(is.finalidade || '').trim() || finalidade, paginas,
    presidenteNome: assinatura.presidenteNome, presidentePosto: assinatura.presidentePosto,
  }));

  const caminho = caminhoGuias(isId);
  await bucket.file(caminho).save(pdf, { contentType: 'application/pdf', resumable: false, metadata: { cacheControl: 'private, max-age=0, no-store' } });
  const guias: GuiasGeradas = { caminho, grupos, paginas: paginas.length, geradoPor: uid };
  await refIs.update({ guiasExames: { ...guias, geradoEm: FieldValue.serverTimestamp() } });
  await registrarUsoServidor(db, uid, { guias: true });
  return { gerado: true, guias };
};

/** Apaga o PDF das guias (se existir) e zera guiasExames na IS (se ela ainda existir). */
export const apagarGuiasExames = async (db: Firestore, bucket: Bucket, isIdBruto: unknown): Promise<{ apagado: boolean }> => {
  const isId = idDaIs(isIdBruto);
  if (!isId) throw new ErroGuias(400, 'Informe a IS.');
  await bucket.file(caminhoGuias(isId)).delete({ ignoreNotFound: true });
  const ref = db.collection('inspecoes').doc(isId);
  if ((await ref.get()).exists) await ref.update({ guiasExames: null });
  return { apagado: true };
};

const ms = (t: unknown): number | null =>
  t && typeof (t as Timestamp).toMillis === 'function' ? (t as Timestamp).toMillis() : null;

/**
 * Apaga as guias das IS finalizadas há mais de 15 dias (data de finalizadaEm; IS antigas sem ela: atualizadoEm).
 * Consulta só as IS com guias (campo guiasExames.caminho), sem índice composto. Devolve quantas apagou.
 */
export const limparGuiasVencidas = async (db: Firestore, bucket: Bucket, agora: Date = new Date()): Promise<{ apagadas: number }> => {
  const limite = agora.getTime() - DIAS_GUARDA_GUIAS * 24 * 60 * 60 * 1000;
  const snap = await db.collection('inspecoes').where('guiasExames.caminho', '>=', 'inspecoes/').get();
  let apagadas = 0;
  for (const d of snap.docs) {
    const is = d.data() as { situacao?: string; finalizadaEm?: unknown; atualizadoEm?: unknown };
    if (is.situacao !== 'finalizada') continue;
    const quando = ms(is.finalizadaEm) ?? ms(is.atualizadoEm);
    if (quando === null || quando > limite) continue;
    await bucket.file(caminhoGuias(d.id)).delete({ ignoreNotFound: true });
    await d.ref.update({ guiasExames: null });
    apagadas++;
  }
  return { apagadas };
};
