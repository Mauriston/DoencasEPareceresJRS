// Ficheiro: services/assessorIA.ts
// Assessor IA (Ficha do inspecionado): conversa com o servidor (POST /api/assessor/conversar — servidor/assessor/)
// e "Inserir na IS" de cada campo gerado. As regras do que é gravado (status, Data do laudo, CID) são as de
// utils/assessorIA.ts; a gravação é direta no Firestore (firestore.rules: a equipe atualiza a IS), lendo o estado
// mais recente da IS no momento do clique.
import { getDoc, doc, getFirestore } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { chamarServidor } from './apiClient';
import { atualizarInspecao, type InspecaoDoc } from './firestoreInspecoes';
import { patchInserirCid, patchInserirLaudo, patchInserirRedacao, type CampoRedacao } from '../utils/assessorIA';
import { laudoComposto, laudosDaIS } from '../utils/finalidadesMultiplas';
import { patchConclusao, type EstadoConclusao } from '../utils/conclusaoIS';
import { hojeISO } from '../utils/dados';

const db = getFirestore(app);

export interface MensagemAssessor { papel: 'usuario' | 'assessor'; texto: string }
export interface RespostaAssessorIA {
  mensagem: string;
  entrevista: string;
  exameClinico: string;
  conclusao: string;
  laudos: { finalidade: string; laudo: string }[];
  cid: { codigo: string; subcat: string; descrAbrev: string; descricao: string } | null;
  avisos: string[];
  modelo: string;
}

/** A IA pode levar mais de um minuto em IS com muitos documentos. */
const TIMEOUT_ASSESSOR_MS = 240_000;

export const conversarComAssessor = async (isId: string, conversa: MensagemAssessor[]): Promise<RespostaAssessorIA> => {
  const r = await chamarServidor<{ resposta: RespostaAssessorIA }>('/api/assessor/conversar', { isId, conversa }, { timeoutMs: TIMEOUT_ASSESSOR_MS });
  return r.resposta;
};

/** Texto de uma resposta do Assessor para reenviar no histórico da conversa. */
export const textoDaResposta = (r: RespostaAssessorIA): string => [
  r.mensagem,
  r.entrevista ? `ENTREVISTA\n${r.entrevista}` : '',
  r.exameClinico ? `EXAME CLÍNICO\n${r.exameClinico}` : '',
  r.conclusao ? `CONCLUSÃO\n${r.conclusao}` : '',
  ...r.laudos.map(l => `LAUDO (${l.finalidade})\n${l.laudo}`),
  r.cid ? `CID\n${r.cid.descrAbrev}` : '',
].filter(Boolean).join('\n\n');

const lerIS = async (isId: string): Promise<InspecaoDoc> => {
  const s = await getDoc(doc(db, 'inspecoes', isId));
  if (!s.exists()) throw new Error('IS não encontrada.');
  const is = s.data() as InspecaoDoc;
  if (is.situacao === 'finalizada') throw new Error('A IS já foi finalizada: nada pode ser inserido.');
  return is;
};

const estado = (i: InspecaoDoc): EstadoConclusao => ({
  status: i.status, dataEntrevista: i.dataEntrevista || '', finalidade: i.finalidade || '', grupoFinalidade: i.grupoFinalidade || '',
  dataLaudo: i.dataLaudo || '', laudo: i.laudo || '', restricoes: i.restricoes || '', tis: i.tis || '', ds1a: i.ds1a || '', observacoes: i.observacoes || '',
  cid: i.cid || '',
});

export const inserirRedacaoNaIS = async (isId: string, campo: CampoRedacao, texto: string): Promise<void> => {
  const is = await lerIS(isId);
  await atualizarInspecao(isId, patchInserirRedacao(is.status, campo, texto) as Partial<InspecaoDoc>);
};

/** Laudo de uma finalidade. Com mais de uma finalidade, grava a lista e o `laudo` composto (como o detalhe da IS). */
export const inserirLaudoNaIS = async (isId: string, finalidade: string, laudo: string, perfil?: string): Promise<void> => {
  const is = await lerIS(isId);
  const lista = laudosDaIS(is);
  if (lista.length > 1) {
    const nova = lista.map(l => (l.finalidade === finalidade ? { ...l, laudo: laudo.trim() } : l));
    if (!nova.some(l => l.finalidade === finalidade)) throw new Error(`A finalidade "${finalidade}" não é desta IS.`);
    const r = patchConclusao(estado(is), 'laudo', laudoComposto(nova), hojeISO(), perfil);
    await atualizarInspecao(isId, { ...r.patch, laudosFinalidades: nova } as Partial<InspecaoDoc>);
    return;
  }
  const patch = patchInserirLaudo(estado(is), laudo, hojeISO(), perfil);
  if (Object.keys(patch).length) await atualizarInspecao(isId, patch as Partial<InspecaoDoc>);
};

export const inserirCidNaIS = async (isId: string, cid: { descrAbrev: string; subcat: string }): Promise<void> => {
  const is = await lerIS(isId);
  const patch = patchInserirCid(is.cid, cid);
  if (Object.keys(patch).length) await atualizarInspecao(isId, patch as Partial<InspecaoDoc>);
};
