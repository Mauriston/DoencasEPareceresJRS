// Ficheiro: servidor/inspecoes/excluir.ts
// Exclusão COMPLETA de uma IS (rota POST /api/inspecoes/excluir em server.ts; Admin SDK, ignora as regras):
// apaga, nesta ordem e sem parar no primeiro erro (best effort por etapa — a IS em si só sai no fim):
//  1. o evento do Google Agenda (se a conta Google do servidor estiver autorizada; o app já tenta antes);
//  2. os pedidos de parecer vinculados (pareceres com isId) e os PDFs deles no Storage (pareceres/{id}.pdf;
//     os PDFs no Drive ficam: a conta do servidor só lê o Drive);
//  3. as mensagens registradas (mensagensIS com isId) e os horários da agenda (agendaSlots com inspecaoId);
//  4. os arquivos no Storage (inspecoes/{id}/… — exames e guias — e entrevistas/{id}/… — áudio);
//  5. o documento da IS com TODAS as subcoleções (recursiveDelete: exames, entrevistas, emails, mensagens…).
// Quem pode (função inspecoes.excluir; IS não finalizada, salvo o Admin) é conferido pela rota (utils/exclusaoIS.ts).
import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import type { getStorage } from 'firebase-admin/storage';
import { caminhoPdfParecer, motivoNaoExcluir, prefixosStorageIS } from '../../utils/exclusaoIS';
import { logErroSeguro } from '../../utils/logSeguro';

export type Bucket = ReturnType<ReturnType<typeof getStorage>['bucket']>;

/** Erro de validação/permissão: vira 400/403/404 na rota, com a mensagem para o usuário. */
export class ErroExclusaoIS extends Error {
  constructor(public status: 400 | 403 | 404, message: string) { super(message); }
}

export interface ResultadoExclusao { documentos: number; arquivos: number; pareceres: number; agendaRemovida: boolean }

const idDaIs = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');

/** Apaga, em lotes de até 400, os documentos de uma consulta. Devolve quantos apagou. */
const apagarConsulta = async (db: Firestore, docs: { ref: DocumentReference }[]): Promise<number> => {
  for (let i = 0; i < docs.length; i += 400) {
    const lote = db.batch();
    docs.slice(i, i + 400).forEach(d => lote.delete(d.ref));
    await lote.commit();
  }
  return docs.length;
};

export const excluirInspecao = async (
  db: Firestore, bucket: Bucket, isIdBruto: unknown, quem: { perfil: string; temFuncao: boolean },
  removerEventoAgenda: (eventoId: string) => Promise<void>,
): Promise<ResultadoExclusao> => {
  const isId = idDaIs(isIdBruto);
  if (!isId) throw new ErroExclusaoIS(400, 'Informe a IS.');
  const ref = db.collection('inspecoes').doc(isId);
  const snap = await ref.get();
  if (!snap.exists) throw new ErroExclusaoIS(404, 'IS não encontrada.');
  const is = snap.data() as { situacao?: string; eventoAgendaId?: string };
  const motivo = motivoNaoExcluir({ perfil: quem.perfil, temFuncao: quem.temFuncao, situacao: is.situacao });
  if (motivo) throw new ErroExclusaoIS(motivo.includes('permissão') ? 403 : 400, motivo);

  const r: ResultadoExclusao = { documentos: 0, arquivos: 0, pareceres: 0, agendaRemovida: !is.eventoAgendaId };
  const etapa = async (nome: string, f: () => Promise<void>) => {
    try { await f(); } catch (e) { logErroSeguro(`Exclusão da IS: ${nome}`, e); }
  };

  await etapa('agenda', async () => {
    if (is.eventoAgendaId) { await removerEventoAgenda(is.eventoAgendaId); r.agendaRemovida = true; }
  });
  await etapa('pareceres', async () => {
    const pareceres = (await db.collection('pareceres').where('isId', '==', isId).get()).docs;
    await Promise.all(pareceres.map(p => bucket.file(caminhoPdfParecer(p.id)).delete({ ignoreNotFound: true }).catch(() => undefined)));
    r.pareceres = await apagarConsulta(db, pareceres);
  });
  await etapa('mensagens', async () => {
    r.documentos += await apagarConsulta(db, (await db.collection('mensagensIS').where('isId', '==', isId).get()).docs);
  });
  await etapa('slots', async () => {
    r.documentos += await apagarConsulta(db, (await db.collection('agendaSlots').where('inspecaoId', '==', isId).get()).docs);
  });
  for (const prefixo of prefixosStorageIS(isId)) {
    await etapa(`storage ${prefixo.split('/')[0]}`, async () => {
      const [arquivos] = await bucket.getFiles({ prefix: prefixo });
      await Promise.all(arquivos.map(a => a.delete({ ignoreNotFound: true })));
      r.arquivos += arquivos.length;
    });
  }
  // Por último o documento e as subcoleções: se falhar aqui, a rota responde erro e a IS continua visível.
  await db.recursiveDelete(ref);
  r.documentos += 1;
  return r;
};
