// Ficheiro: services/documentosGerados.ts
// Fila de impressão da Secretaria: cada documento enviado por e-mail para a
// impressão (Termo de Recurso e Solicitações de Parecer/Exames dos concursos,
// Pedido de Parecer da página Pareceres) e cada Termo de Cientificação de
// Resultado dos concursos (que não vai por e-mail) é registrado em
//   documentos_gerados/{autoId}  { tipo, titulo, detalhe, pdfUrl, remetente,
//                                  criadoPorUid, criadoEm, aberto }
// A Início da Secretaria lista os ainda não abertos; abrir o PDF pressupõe
// que foi impresso e o tira da lista (aberto = true). O registro é
// best-effort: uma falha aqui nunca atrapalha a geração do documento.
import {
  getFirestore, collection, doc, addDoc, updateDoc, onSnapshot, query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { app, auth } from './firebaseAuth';
import { camposIdDrive } from '../utils/googleDrive';
import { registrarAcaoSensivel } from './auditoriaAcoes';

const db = getFirestore(app);
const COL = 'documentos_gerados';

export type TipoDocumentoGerado = 'termo-recurso' | 'termo-cientificacao' | 'solicitacao-parecer' | 'solicitacao-exames' | 'pedido-parecer';

export interface DocumentoGerado {
  id: string;
  tipo: TipoDocumentoGerado;
  /** Ex.: "Termo de Recurso" · "Pedido de Parecer". */
  titulo: string;
  /** Ex.: nome do candidato/inspecionado e o concurso. */
  detalhe: string;
  pdfUrl: string;
  remetente: string;
  criadoEm: Date | null;
}

export const registrarDocumentoGerado = async (d: Omit<DocumentoGerado, 'id' | 'criadoEm'>): Promise<void> => {
  const uid = auth.currentUser?.uid;
  if (!uid || !d.pdfUrl) return;
  try {
    await addDoc(collection(db, COL), { ...d, ...camposIdDrive(d.pdfUrl), criadoPorUid: uid, criadoEm: serverTimestamp(), aberto: false });
  } catch (e) {
    console.error('Falha ao registrar documento gerado:', e);
  }
  // Auditoria sem conteúdo: só o tipo do documento (nunca nome/detalhe do inspecionado).
  void registrarAcaoSensivel('documento.gerar', d.tipo);
};

/** Documentos ainda não abertos, do mais recente para o mais antigo (tempo real). */
export const observarDocumentosPendentes = (cb: (lista: DocumentoGerado[]) => void): (() => void) =>
  onSnapshot(
    query(collection(db, COL), where('aberto', '==', false)),
    snap => cb(snap.docs
      .map(s => {
        const x = s.data();
        return {
          id: s.id,
          tipo: x.tipo as TipoDocumentoGerado,
          titulo: String(x.titulo || 'Documento'),
          detalhe: String(x.detalhe || ''),
          pdfUrl: String(x.pdfUrl || ''),
          remetente: String(x.remetente || ''),
          criadoEm: x.criadoEm instanceof Timestamp ? x.criadoEm.toDate() : null,
        };
      })
      // Recém-criado ainda sem o horário do servidor fica no topo.
      .sort((a, b) => (b.criadoEm?.getTime() ?? Infinity) - (a.criadoEm?.getTime() ?? Infinity))),
    e => console.error('Falha ao ler documentos gerados:', e),
  );

export const marcarDocumentoAberto = (id: string, usuario: string) =>
  updateDoc(doc(db, COL, id), { aberto: true, abertoEm: serverTimestamp(), abertoPor: usuario })
    .catch(e => console.error('Falha ao marcar documento como aberto:', e));
