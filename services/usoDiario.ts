// Ficheiro: services/usoDiario.ts
// Medição do uso do app (seção "Uso do app" do Painel, só o Admin lê). Um documento agregado por dia:
//   uso_diario/{AAAA-MM-DD} {
//     paginas:           { [NavItem]: n }            acessos às páginas (uma navegação = +1)
//     acessosPorUsuario: { [uid]: n }                acessos de cada usuário
//     acoesPorUsuario:   { [uid]: { [tipo]: n } }    ações principais por usuário e tipo (TipoAcaoUso)
//     ultimo:            { [uid]: timestamp }        último acesso do usuário no dia
//   }
// Gravado só com increment() (e serverTimestamp no "ultimo"); firestore.rules só deixa cada usuário mexer nas
// PRÓPRIAS chaves e numa página por gravação. Privacidade (mesma regra do auditoriaAcoes): só contagens, a
// página e o uid — NUNCA nome de inspecionado, NIP, CID, URL ou conteúdo.
// Retenção de 12 meses: os dias mais antigos são apagados quando o Admin abre o Uso do app no Painel
// (podarUsoAntigo); não há Cloud Function. Tudo "best effort": falha aqui nunca impede a navegação ou a ação.
// ultimoAcesso também vai para o documento do usuário (usuarios/{uid}), uma vez por sessão.
import {
  getFirestore, collection, doc, setDoc, updateDoc, getDocs, deleteDoc, query, where, documentId, increment,
  serverTimestamp, limit, Timestamp,
} from 'firebase/firestore';
import { app } from './firebaseAuth';
import { obterAtorAuditoria } from './auditoriaIS';
import { hojeISO } from '../utils/inspecoes';
import { limiteRetencaoUso, type TipoAcaoUso, type UsoDia } from '../utils/painel';
import type { AcaoSensivel } from './auditoriaAcoes';

const db = getFirestore(app);
const COL = 'uso_diario';

/** +1 acesso à página no dia (uma gravação por navegação). */
export const registrarUsoPagina = (uid: string, pagina: string): Promise<void> =>
  setDoc(doc(db, COL, hojeISO()), {
    paginas: { [pagina]: increment(1) },
    acessosPorUsuario: { [uid]: increment(1) },
    ultimo: { [uid]: serverTimestamp() },
  }, { merge: true });

/** +1 ação do tipo para o usuário logado (ator da auditoria). Nunca lança. */
export const registrarUsoAcao = (tipo: TipoAcaoUso): void => {
  const ator = obterAtorAuditoria();
  if (!ator) return;
  setDoc(doc(db, COL, hojeISO()), { acoesPorUsuario: { [ator.uid]: { [tipo]: increment(1) } } }, { merge: true }).catch(() => { /* best effort */ });
};

/** Ações sensíveis (auditoriaAcoes) → tipo de ação contado no uso. */
export const TIPO_DA_ACAO_SENSIVEL: Record<AcaoSensivel, TipoAcaoUso> = {
  'militar.excluir': 'exclusao',
  'inspecao.excluir': 'exclusao',
  'afastamento.apagar': 'exclusao',
  'militar.importarCsv': 'importacao',
  'documento.gerar': 'documento_gerar',
  'config.alterar': 'config',
  'afastamento.criar': 'afastamento',
  'afastamento.alterar': 'afastamento',
};

/** ultimoAcesso no documento do usuário (firestore.rules só aceita request.time). */
export const registrarUltimoAcesso = (uid: string): Promise<void> =>
  updateDoc(doc(db, 'usuarios', uid), { ultimoAcesso: serverTimestamp() });

const msDe = (v: unknown): number | null => (v instanceof Timestamp ? v.toMillis() : null);

/** Dias do intervalo [inicio, fim] (ids AAAA-MM-DD). Só o Admin lê. */
export const listarUsoDiario = async (inicio: string, fim: string): Promise<UsoDia[]> => {
  const snap = await getDocs(query(collection(db, COL), where(documentId(), '>=', inicio), where(documentId(), '<=', fim)));
  return snap.docs.map(d => {
    const x = d.data() as Record<string, any>;
    const ultimo: Record<string, number> = {};
    Object.entries(x.ultimo ?? {}).forEach(([uid, v]) => { const ms = msDe(v); if (ms !== null) ultimo[uid] = ms; });
    return { dia: d.id, paginas: x.paginas ?? {}, acessosPorUsuario: x.acessosPorUsuario ?? {}, acoesPorUsuario: x.acoesPorUsuario ?? {}, ultimo };
  });
};

/** Retenção de 12 meses: apaga (até 60 por vez) os dias anteriores a hoje − 365 dias. Só o Admin apaga. */
export const podarUsoAntigo = async (): Promise<number> => {
  const snap = await getDocs(query(collection(db, COL), where(documentId(), '<', limiteRetencaoUso(hojeISO())), limit(60)));
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  return snap.size;
};
