// Ficheiro: services/firestoreLegislacao.ts
// Itens da página Legislação (coleção "legislacao", migrada da aba NORMAS da
// planilha). Id do documento = slug da norma; o PDF fica no Storage em
// `pdfPath` (legislacao/{id}.pdf). Leitura: usuário autenticado; escrita: Admin.
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { app } from './firebaseAuth';

const db = getFirestore(app);

export interface LegislacaoDoc {
  id: string;
  ordem: number;
  /** Identificação curta, ex.: "LEI nº 6.880/1980". */
  legislacao: string;
  titulo: string;
  /** Ementa / providências da norma. */
  providencias: string;
  imageUrl: string;
  /** Caminho do PDF no Firebase Storage; null quando ainda não foi enviado. */
  pdfPath: string | null;
}

export const listarLegislacao = async (): Promise<LegislacaoDoc[]> => {
  const snap = await getDocs(collection(db, 'legislacao'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as LegislacaoDoc))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
};
