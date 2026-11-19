// Ficheiro: servidor/pericias/excluir.ts
// Exclusão de uma perícia menor (POST /api/pericias-menores/excluir { id, justificativa }), com o Admin SDK:
// confere quem pode (utils/exclusaoPericia.ts — Admin ou o perito responsável / quem registrou) e a Justificativa
// (obrigatória, ≥ 10 caracteres, fora do Admin), guarda o registro da exclusão em periciasExcluidas/{id} (cópia
// do documento, justificativa, quem e quando — só o Admin lê), apaga o PDF do atestado (periciasMenores/{id}.pdf,
// que as regras do Storage não deixam o app apagar) e, por fim, o documento.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { erroJustificativaExclusao, patchEdicaoPericia, podeExcluirPericia, type CamposEdicaoPericia, type QuemExclui } from '../../utils/exclusaoPericia';

export class ErroExclusaoPericia extends Error {
  constructor(public status: number, message: string) { super(message); }
}

interface BucketMinimo { file: (caminho: string) => { delete: (o?: { ignoreNotFound?: boolean }) => Promise<unknown> } }

export const excluirPericiaMenor = async (
  db: Firestore, bucket: BucketMinimo, idBruto: unknown, justificativaBruta: unknown, quem: QuemExclui,
): Promise<{ militarId: string; pdfApagado: boolean }> => {
  const id = String(idBruto ?? '').trim();
  if (!id || id.includes('/')) throw new ErroExclusaoPericia(400, 'Perícia inválida.');
  const ref = db.collection('periciasMenores').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ErroExclusaoPericia(404, 'A perícia não foi encontrada.');
  const dados = snap.data() as Record<string, unknown>;
  if (!podeExcluirPericia({ peritoUid: String(dados.peritoUid ?? ''), criadoPor: String(dados.criadoPor ?? '') }, quem)) {
    throw new ErroExclusaoPericia(403, 'Só o Admin ou o perito responsável podem excluir esta perícia.');
  }
  const justificativa = String(justificativaBruta ?? '').trim().slice(0, 2000);
  const erro = erroJustificativaExclusao(justificativa, quem.perfil);
  if (erro) throw new ErroExclusaoPericia(400, erro);

  const usuario = ((await db.collection('usuarios').doc(quem.uid).get()).data() || {}) as { usuario?: string; nome?: string };
  // Registro da exclusão ANTES de apagar (se falhar, nada é apagado).
  await db.collection('periciasExcluidas').doc(id).set({
    dados, justificativa,
    excluidaPor: { uid: quem.uid, usuario: String(usuario.usuario || usuario.nome || ''), perfil: quem.perfil },
    excluidaEm: FieldValue.serverTimestamp(),
  });
  let pdfApagado = false;
  try { await bucket.file(`periciasMenores/${id}.pdf`).delete({ ignoreNotFound: true }); pdfApagado = true; } catch { /* segue: o doc é o registro */ }
  await ref.delete();
  return { militarId: String(dados.militarId ?? ''), pdfApagado };
};

/**
 * Edição de uma perícia menor (POST /api/pericias-menores/editar { id, campos, justificativa }): as mesmas regras
 * da exclusão (Admin, ou o perito responsável / quem registrou; Justificativa ≥ 10 caracteres fora do Admin). Só os
 * campos de patchEdicaoPericia mudam (o término é recalculado); o antes/depois e a justificativa ficam em
 * periciasEdicoes (só o Admin lê).
 */
export const editarPericiaMenor = async (
  db: Firestore, idBruto: unknown, campos: unknown, justificativaBruta: unknown, quem: QuemExclui,
): Promise<{ militarId: string }> => {
  const id = String(idBruto ?? '').trim();
  if (!id || id.includes('/')) throw new ErroExclusaoPericia(400, 'Perícia inválida.');
  const ref = db.collection('periciasMenores').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new ErroExclusaoPericia(404, 'A perícia não foi encontrada.');
  const dados = snap.data() as Record<string, unknown>;
  if (!podeExcluirPericia({ peritoUid: String(dados.peritoUid ?? ''), criadoPor: String(dados.criadoPor ?? '') }, quem)) {
    throw new ErroExclusaoPericia(403, 'Só o Admin ou o perito responsável podem editar esta perícia.');
  }
  const justificativa = String(justificativaBruta ?? '').trim().slice(0, 2000);
  const erroJ = erroJustificativaExclusao(justificativa, quem.perfil);
  if (erroJ) throw new ErroExclusaoPericia(400, erroJ);
  const { patch, erro } = patchEdicaoPericia(campos as Partial<CamposEdicaoPericia>, quem.perfil === 'admin');
  if (!patch) throw new ErroExclusaoPericia(400, erro || 'Dados inválidos.');

  const antes = Object.fromEntries(Object.keys(patch).map(k => [k, dados[k] ?? null]));
  const usuario = ((await db.collection('usuarios').doc(quem.uid).get()).data() || {}) as { usuario?: string; nome?: string };
  await db.collection('periciasEdicoes').add({
    periciaId: id, militarId: String(dados.militarId ?? ''), antes, depois: patch, justificativa,
    editadaPor: { uid: quem.uid, usuario: String(usuario.usuario || usuario.nome || ''), perfil: quem.perfil },
    editadaEm: FieldValue.serverTimestamp(),
  });
  await ref.update({ ...patch, editadoEm: FieldValue.serverTimestamp(), editadoPor: quem.uid });
  return { militarId: String(dados.militarId ?? '') };
};
