// Ficheiro: services/auditoriaIS.ts
// Registro de eventos (log de auditoria) de cada Inspeção de Saúde (IS) das
// planilhas de Concursos. Cada ação realizada na IS grava um documento em
//   concursos/{concursoId}/candidatos/{matricula}/eventos/{autoId}
// com a data/hora do servidor e o usuário que a executou. A gravação é
// "best effort": uma falha no log nunca impede a ação do usuário. A leitura é
// restrita ao Admin (ver firestore.rules).
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';

const db = getFirestore(app);

export interface AtorAuditoria {
  uid: string;
  usuario: string;
  nome: string;
}

let ator: AtorAuditoria | null = null;

/** Chamado pelo App ao carregar/limpar o usuário logado. */
export const definirAtorAuditoria = (novo: AtorAuditoria | null) => { ator = novo; };

export interface EventoIS {
  id: string;
  acao: string;
  detalhe: string;
  usuario: string;
  nome: string;
  em: Date | null;
}

const eventosCol = (concursoId: string, candidatoId: string) =>
  collection(db, 'concursos', concursoId, 'candidatos', candidatoId, 'eventos');

export const registrarEvento = async (concursoId: string, candidatoId: string, acao: string, detalhe: string = ''): Promise<void> => {
  if (!ator) return;
  try {
    await addDoc(eventosCol(concursoId, candidatoId), {
      acao, detalhe, uid: ator.uid, usuario: ator.usuario, nome: ator.nome, em: serverTimestamp(),
    });
  } catch (e) {
    console.error('Falha ao registrar evento da IS:', e);
  }
};

/** Eventos de uma IS, do mais recente para o mais antigo (Admin). */
export const listarEventos = async (concursoId: string, candidatoId: string): Promise<EventoIS[]> => {
  const snap = await getDocs(query(eventosCol(concursoId, candidatoId), orderBy('em', 'desc')));
  return snap.docs.map(d => {
    const x = d.data();
    return {
      id: d.id,
      acao: String(x.acao || ''),
      detalhe: String(x.detalhe || ''),
      usuario: String(x.usuario || ''),
      nome: String(x.nome || ''),
      em: x.em instanceof Timestamp ? x.em.toDate() : null,
    };
  });
};
