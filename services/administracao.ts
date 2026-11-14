// Ficheiro: services/administracao.ts
// Consultas de apoio da Administração (só Admin): impacto de desativar/excluir um perito — quantas IS estão
// marcadas com ele nos próximos dias. Consulta só por peritoUid (índice de campo único) e filtra no cliente;
// devolve só a contagem (nenhum dado do inspecionado sai daqui).
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { hojeISO, somarDias } from '../utils/inspecoes';

const db = getFirestore(app);
const ENCERRADAS = new Set(['cancelada', 'tis_assinado']);

/** IS ainda abertas com entrevista marcada com o perito entre hoje e hoje + `dias`. */
export const contarISAgendadasDoPerito = async (uid: string, dias = 7): Promise<number> => {
  const snap = await getDocs(query(collection(db, 'inspecoes'), where('peritoUid', '==', uid)));
  const inicio = hojeISO();
  const fim = somarDias(inicio, dias);
  return snap.docs.filter(d => {
    const x = d.data() as { dataEntrevista?: string; status?: string };
    const data = String(x.dataEntrevista || '').slice(0, 10);
    return data >= inicio && data <= fim && !ENCERRADAS.has(String(x.status || ''));
  }).length;
};
