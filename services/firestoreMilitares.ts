// Ficheiro: services/firestoreMilitares.ts
// Base de INSPECIONADOS (coleção "militares", migrada da aba "Militares" da
// planilha): militares da ativa, servidores civis, dependentes e pensionistas
// (campo "tipo"; ausente = militar). Id do documento = NIP só com dígitos.
// Leitura: qualquer usuário autenticado; escrita: ver firestore.rules.
import { getFirestore, collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, writeBatch, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { normalizarNip } from '../utils/dados';
import { registrarAcaoSensivel } from './auditoriaAcoes';
import type { VinculoFinalidade } from '../utils/corposQuadros';

const db = getFirestore(app);
const COL = 'militares';

/** Tipo de inspecionado; documentos antigos não têm o campo e valem como 'militar'. */
export type TipoInspecionado = 'militar' | 'dependente' | 'pensionista';

export const tipoDoInspecionado = (m: { tipo?: TipoInspecionado }): TipoInspecionado => m.tipo ?? 'militar';

export interface MilitarDoc {
  /** Militar (padrão), dependente (liga-se a um titular) ou pensionista. */
  tipo?: TipoInspecionado;
  /** Só dependente: id (NIP só dígitos) do militar titular, seu nome e posto/graduação (usados no INSPECIONADO "DEP-…"). */
  titularId?: string;
  titularNome?: string;
  titularPosto?: string;
  om: string;
  temporario: boolean;
  /** Posto/graduação/quadro, ex.: "CT (Md)", "1SG-EF". */
  pgq: string;
  nip: string;
  nome: string;
  /** `${pgq} ${nip} ${nome}` */
  inspecionado: string;
  email: string;
  ativo: boolean;
  /** Carreira: já foi para a Reserva da Marinha de 1ª Classe (RM1). */
  rm1?: boolean;
  /** Carreira: reformado por idade-limite ou invalidez (Refº). */
  refo?: boolean;
  /** Só HNRe: setor onde serve, "Nome (HNRe-00.0)". */
  servico_label?: string;
  /** Só oficiais médicos do HNRe: */
  nomeGuerra?: string;
  especialidade?: string;
  emailPessoal?: string;
  /** Celular e data de nascimento (AAAA-MM-DD) agora são campos do cadastro, não da seção "+ informações". */
  celular?: string;
  dataNascimento?: string;
  cpf?: string;
  identidadeMilitar?: string;
  crm?: string;
  rqe?: string;
  fotoUrl?: string;
}
export type MilitarRecord = MilitarDoc & { id: string };

export const idDoNip = (nip: string): string => normalizarNip(nip);

export const observarMilitares = (
  onData: (lista: MilitarRecord[]) => void,
  onError?: (e: Error) => void,
) => onSnapshot(
  collection(db, COL),
  snap => onData(snap.docs.map(d => ({ id: d.id, ...(d.data() as MilitarDoc) })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))),
  err => onError?.(err),
);

export const criarMilitar = async (dados: MilitarDoc): Promise<string> => {
  const id = idDoNip(dados.nip);
  if (id.length !== 8) throw new Error('NIP inválido.');
  const ref = doc(db, COL, id);
  if ((await getDoc(ref)).exists()) throw new Error('Já existe um militar cadastrado com este NIP.');
  await setDoc(ref, { ...dados, criadoEm: serverTimestamp(), atualizadoEm: serverTimestamp() });
  return id;
};

/** Apaga o cadastro (definitivo). Para só tirar o acesso, prefira inativar. */
export const apagarMilitar = async (id: string) => {
  await deleteDoc(doc(db, COL, id));
  void registrarAcaoSensivel('militar.excluir', 'militares');
};

export const atualizarMilitar = (id: string, patch: Partial<MilitarDoc>) =>
  updateDoc(doc(db, COL, id), { ...patch, atualizadoEm: serverTimestamp() } as Record<string, unknown>);

/**
 * Troca o NIP de um cadastro: o id do documento é o NIP só com dígitos, então mudar o NIP exige mover o
 * documento (gravar com o id novo, apagar o antigo) e religar os pareceres ("militarId") e as IS ("inspecionadoId") que apontavam para o id antigo
 *. Tudo numa única gravação em lote; recusa se já existir cadastro com o id novo.
 */
export const renomearMilitar = async (idAntigo: string, idNovo: string, patch: Partial<MilitarDoc>): Promise<void> => {
  if (!idNovo) throw new Error('NIP inválido.');
  const [antigo, novo] = await Promise.all([getDoc(doc(db, COL, idAntigo)), getDoc(doc(db, COL, idNovo))]);
  if (!antigo.exists()) throw new Error('Cadastro não encontrado.');
  if (novo.exists()) throw new Error('Já existe um cadastro com esse NIP.');
  const pareceres = await getDocs(query(collection(db, 'pareceres'), where('militarId', '==', idAntigo)));
  const inspecoes = await getDocs(query(collection(db, 'inspecoes'), where('inspecionadoId', '==', idAntigo)));

  const lote = writeBatch(db);
  lote.set(doc(db, COL, idNovo), { ...antigo.data(), ...patch, atualizadoEm: serverTimestamp() });
  pareceres.forEach(p => lote.update(p.ref, { militarId: idNovo }));
  inspecoes.forEach(i => lote.update(i.ref, { inspecionadoId: idNovo }));
  lote.delete(antigo.ref);
  await lote.commit();
};

/** Atualiza vários cadastros de uma vez (ex.: promoção em lote). Lotes de até 400 gravações. */
export const atualizarMilitaresEmLote = async (itens: { id: string; patch: Partial<MilitarDoc> }[]): Promise<void> => {
  for (let i = 0; i < itens.length; i += 400) {
    const lote = writeBatch(db);
    itens.slice(i, i + 400).forEach(({ id, patch }) =>
      lote.update(doc(db, COL, id), { ...patch, atualizadoEm: serverTimestamp() } as Record<string, unknown>));
    await lote.commit();
  }
};

/** Vínculo do inspecionado para filtrar as finalidades de IS (public/finalidadesIS.json). */
export const vinculoDoInspecionado = (m: Pick<MilitarDoc, 'tipo' | 'temporario' | 'rm1' | 'refo'>): VinculoFinalidade => {
  const tipo = tipoDoInspecionado(m);
  if (tipo === 'dependente') return 'Dependente';
  if (tipo === 'pensionista') return 'Pensionista';
  return m.temporario ? 'Temporário' : (m.rm1 || m.refo) ? 'Inativo' : 'Carreira';
};
