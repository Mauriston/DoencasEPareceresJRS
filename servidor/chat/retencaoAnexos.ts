// Ficheiro: servidor/chat/retencaoAnexos.ts
// Retenção dos anexos do Chat (docs/retencao-lgpd.md): 7 dias após o envio, o arquivo sai do Storage
// (conversas/{id}/…) e a referência sai da mensagem, que fica com anexoRemovido { motivo: 'expirado' } —
// o app mostra "Anexo expirado". O texto da mensagem fica. Roda no agendador diário (server.ts:
// /api/agendador/aniversariantes, 07h, e a rota própria /api/agendador/chat-anexos), pelo Admin SDK.
import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Bucket } from '../documentos/guiasExames/servico';
import { limiteRetencaoAnexo } from '../../utils/chat';

export const limparAnexosChatVencidos = async (db: Firestore, bucket: Bucket, agora: Date = new Date()): Promise<{ apagados: number }> => {
  const limite = Timestamp.fromMillis(limiteRetencaoAnexo(agora.getTime()));
  const conversas = await db.collection('conversas').get();
  let apagados = 0;
  for (const c of conversas.docs) {
    // Consulta por conversa (índice automático de campo único; sem collectionGroup, que pegaria as
    // "mensagens" das IS e dos concursos).
    const vencidas = await c.ref.collection('mensagens').where('anexo.enviadoEm', '<=', limite).get();
    for (const m of vencidas.docs) {
      const anexo = m.get('anexo') as { caminho?: string; tipo?: string } | undefined;
      const caminho = String(anexo?.caminho || '');
      if (caminho.startsWith(`conversas/${c.id}/`)) {
        await bucket.file(caminho).delete().catch((e: any) => { if (e?.code !== 404) throw e; });
      }
      await m.ref.update({
        anexo: FieldValue.delete(),
        anexoRemovido: { motivo: 'expirado', tipo: anexo?.tipo === 'imagem' ? 'imagem' : 'pdf', em: FieldValue.serverTimestamp() },
      });
      apagados++;
    }
  }
  return { apagados };
};
