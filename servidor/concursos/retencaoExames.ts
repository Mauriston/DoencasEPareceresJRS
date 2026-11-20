// Ficheiro: servidor/concursos/retencaoExames.ts
// Retenção dos PDFs de exames entregues pelos candidatos (docs/retencao-lgpd.md): nos concursos com os PDFs no
// Firebase Storage (armazenamento = 'storage'), o PDF é apagado 1 ano depois da ÚLTIMA data de agendamento do
// concurso ou, sem nenhuma, da data em que o Admin encerrou o concurso (encerradoEm). Só o PDF sai: a
// transcrição (subcoleção "exames") nunca é apagada — o documento fica com pdfUrl vazio e pdfApagadoEm.
// Roda no agendador diário (server.ts, /api/agendador/agenda-is), pelo Admin SDK.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Bucket } from '../documentos/guiasExames/servico';

/** Data-base (AAAA-MM-DD) da retenção: a última data de agendamento; sem ela, o dia do encerramento. */
export const dataBaseRetencao = (datasAgendamento: string[], encerradoEm: Date | null): string | null => {
  const datas = datasAgendamento.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (datas.length) return datas[datas.length - 1];
  return encerradoEm ? encerradoEm.toISOString().slice(0, 10) : null;
};

/** Dia (AAAA-MM-DD) a partir do qual o PDF pode ser apagado: a data-base + 1 ano. */
export const dataDescarteExames = (base: string): string => `${Number(base.slice(0, 4)) + 1}${base.slice(4)}`;

/** Caminho do objeto no bucket a partir da URL de download do Storage; null se não for do Storage/concursos. */
export const caminhoDaUrlStorage = (url: string): string | null => {
  const m = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/([^?#]+)/.exec(url || '');
  if (!m) return null;
  const caminho = decodeURIComponent(m[1]);
  return caminho.startsWith('concursos/') ? caminho : null;
};

const hojeRecife = (agora: Date) => new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const limparPdfsExamesVencidos = async (db: Firestore, bucket: Bucket, agora: Date = new Date()): Promise<{ apagados: number }> => {
  const hoje = hojeRecife(agora);
  const concursos = await db.collection('concursos').where('armazenamento', '==', 'storage').get();
  let apagados = 0;
  for (const c of concursos.docs) {
    const dados = c.data() as { encerradoEm?: Timestamp };
    const candidatos = await c.ref.collection('candidatos').get();
    const base = dataBaseRetencao(
      candidatos.docs.map(d => String(d.get('dataAgendamento') || '')),
      dados.encerradoEm instanceof Timestamp ? dados.encerradoEm.toDate() : null,
    );
    if (!base || dataDescarteExames(base) > hoje) continue;
    for (const cand of candidatos.docs) {
      const exames = await cand.ref.collection('exames').get();
      const removidas: string[] = [];
      for (const e of exames.docs) {
        const url = String(e.get('pdfUrl') || '');
        const caminho = caminhoDaUrlStorage(url);
        if (!caminho) continue;
        await bucket.file(caminho).delete({ ignoreNotFound: true });
        await e.ref.update({ pdfUrl: '', pdfApagadoEm: FieldValue.serverTimestamp() });
        removidas.push(url);
        apagados++;
      }
      if (removidas.length) await cand.ref.update({ examesPdfUrls: FieldValue.arrayRemove(...removidas) });
    }
  }
  return { apagados };
};
