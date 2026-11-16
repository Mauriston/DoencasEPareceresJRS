// Ficheiro: services/eventosInspecionado.ts
// Registro de eventos POR INSPECIONADO (auditoria v3, seção 9 — MF4): quem mexeu no cadastro, nas IS,
// nos pareceres e nas perícias de uma pessoa, e quem abriu a ficha dela. Grava
//   militares/{nip}/eventos/{autoId} { acao, ref, uid, usuario, em }
// Só metadados: `ref` é um rótulo curto e não sensível ("IS 1312", "Perícia de 12/11/2026") —
// NUNCA laudo, CID, restrições, texto livre ou o nome do inspecionado. "Best effort": falha aqui
// nunca impede a ação (nem lança). Leitura só do Admin; registros imutáveis (firestore.rules).
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, Timestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { obterAtorAuditoria } from './auditoriaIS';
import { logErroSeguro } from '../utils/logSeguro';

const db = getFirestore(app);

export type AcaoInspecionado =
  | 'ficha.abrir'
  | 'cadastro.criar'
  | 'cadastro.editar'
  | 'pericia.registrar'
  | 'is.cadastrar'
  | 'is.agendar'
  | 'parecer.gerar'
  | 'parecer.resposta';

/** Frase do registro na ficha: "<usuário> registrou perícia menor". */
export const ROTULO_ACAO_INSPECIONADO: Record<AcaoInspecionado, string> = {
  'ficha.abrir': 'abriu a ficha',
  'cadastro.criar': 'cadastrou o inspecionado',
  'cadastro.editar': 'editou o cadastro',
  'pericia.registrar': 'registrou perícia menor',
  'is.cadastrar': 'cadastrou a IS',
  'is.agendar': 'agendou a IS',
  'parecer.gerar': 'gerou pedido de parecer',
  'parecer.resposta': 'enviou resposta de parecer',
};

export interface EventoInspecionado {
  id: string;
  acao: AcaoInspecionado | string;
  ref: string;
  uid: string;
  usuario: string;
  em: Date | null;
}

const nipValido = (nip: string | undefined | null): nip is string => !!nip && /^\d{5,12}$/.test(nip);

/** Grava um evento do inspecionado `nip` (NIP só dígitos). Nunca lança; sem NIP ou sem usuário, não faz nada. */
export const registrarEventoInspecionado = (nip: string | undefined | null, acao: AcaoInspecionado, ref = ''): void => {
  const ator = obterAtorAuditoria();
  if (!ator || !nipValido(nip)) return;
  try {
    addDoc(collection(db, 'militares', nip, 'eventos'), {
      acao, ref: String(ref).slice(0, 60), uid: ator.uid, usuario: String(ator.usuario || '').slice(0, 80), em: serverTimestamp(),
    }).catch(e => logErroSeguro('Falha ao registrar evento do inspecionado', e));
  } catch (e) {
    logErroSeguro('Falha ao registrar evento do inspecionado', e);
  }
};

/** Eventos do inspecionado, do mais recente para o mais antigo (só o Admin lê — firestore.rules). */
export const observarEventosInspecionado = (nip: string, onData: (lista: EventoInspecionado[]) => void, onError?: (e: Error) => void, max = 100) =>
  onSnapshot(
    query(collection(db, 'militares', nip, 'eventos'), orderBy('em', 'desc'), limit(max)),
    snap => onData(snap.docs.map(d => {
      const x = d.data() as { acao?: string; ref?: string; uid?: string; usuario?: string; em?: Timestamp | null };
      return { id: d.id, acao: x.acao ?? '', ref: x.ref ?? '', uid: x.uid ?? '', usuario: x.usuario ?? '', em: x.em?.toDate?.() ?? null };
    })),
    err => onError?.(err),
  );
