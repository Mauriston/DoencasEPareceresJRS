// Ficheiro: services/firestoreLegislacao.ts
// Itens da página Legislação (coleção "legislacao", migrada da aba NORMAS da
// planilha). Id do documento = slug da norma; o PDF fica no Storage em
// `pdfPath` (legislacao/{id}.pdf). Leitura: usuário autenticado; escrita: Admin.
import { getFirestore, collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes } from 'firebase/storage';
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

export const IMAGEM_PADRAO_LEGISLACAO =
  'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biblioteca-da-pr/simbolos-nacionais/brasao-da-republica/brasaooficialcolorido.png';

/** Slug do id a partir da identificação (ex.: "LEI nº 6.880/1980" → "lei-n-6880-1980"). */
export const slugLegislacao = (texto: string) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[º°]/g, '').replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export interface NovaLegislacao {
  legislacao: string;
  titulo: string;
  providencias: string;
  imageUrl?: string;
}

/** Envia o PDF ao Storage (legislacao/{id}.pdf) e cria o documento no fim da lista. */
export const criarLegislacao = async (dados: NovaLegislacao, arquivo: File, ordem: number): Promise<string> => {
  const id = slugLegislacao(dados.legislacao);
  if (!id) throw new Error('Identificação inválida.');
  if ((await getDoc(doc(db, 'legislacao', id))).exists()) throw new Error('Já existe uma legislação com esta identificação.');
  const pdfPath = `legislacao/${id}.pdf`;
  await uploadBytes(ref(getStorage(app), pdfPath), arquivo, { contentType: 'application/pdf' });
  await setDoc(doc(db, 'legislacao', id), {
    ordem,
    legislacao: dados.legislacao.trim(),
    titulo: dados.titulo.trim(),
    providencias: dados.providencias.trim(),
    imageUrl: dados.imageUrl?.trim() || IMAGEM_PADRAO_LEGISLACAO,
    pdfPath,
  });
  return id;
};
