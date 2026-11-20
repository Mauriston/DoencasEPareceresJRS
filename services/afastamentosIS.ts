// Ficheiro: services/afastamentosIS.ts
// Afastamentos (LTS e Restrições) dos inspecionados, lidos das IS de Verificações e Términos finalizadas.
// Ao finalizar a IS (TIS assinado; services/firestoreInspecoes.ts), processarAfastamentosDaIS roda em segundo plano:
// a IA (Firebase AI Logic, services/geminiAI.ts) lê o laudo, as restrições e o CID da IS e devolve os afastamentos
// (tipo e dias); se a IA falhar, o fallback por regex (utils/afastamentosIS.ts) extrai "N dias" e o tipo do texto.
// O 1º afastamento começa na data da IS (dia da entrevista); os encadeados, no dia seguinte ao fim do anterior.
//
// Coleção própria "afastamentosIS" (id = id da IS → reprocessar a mesma IS substitui, nunca duplica). Não usa a
// coleção "afastamentos" (services/afastamentos.ts), que é das férias/afastamentos dos USUÁRIOS da JRS: a página
// Férias lê a coleção inteira para a timeline, só o Admin grava e cada registro gera bloqueio na agenda das IS.
// IS que deixa de ser elegível (reaberta, cancelada, outro grupo) perde o registro no próximo processamento.
import { getFirestore, collection, doc, getDoc, getDocs, query, setDoc, deleteDoc, where, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { app, auth } from './firebaseAuth';
import { gerarComGemini, lerJsonIA } from './geminiAI';
import { logErroSeguro } from '../utils/logSeguro';
import { higienizarParaIA } from '../utils/minimizacaoIA';
import {
  assinaturaFonteAfastamentos, cidsDasIS, dataDaIS, extrairAfastamentosDoTexto, isGeraAfastamentos, montarAfastamentosIS,
  normalizarAfastamentosIA, TIPOS_AFASTAMENTO_IS,
  type AfastamentoIS, type AfastamentoLido, type CidDaIS, type LeituraAfastamentosIA,
} from '../utils/afastamentosIS';
import type { InspecaoDoc } from './firestoreInspecoes';

const db = getFirestore(app);
export const COL_AFASTAMENTOS_IS = 'afastamentosIS';

/** Documento afastamentosIS/{isId}. */
export interface AfastamentosISDoc {
  isId: string;
  isNumero: number;
  /** = inspecionadoId da IS no processamento (NIP só dígitos; id em "militares"). A Ficha busca pelo id da IS. */
  inspecionadoId: string;
  inspecionado: string;
  finalidade: string;
  /** AAAA-MM-DD: início do 1º afastamento. */
  dataIS: string;
  /** CID ("descrição abreviatura"): o da IS; sem ele, o que a IA inferiu do laudo; '' se nenhum. */
  cid: string;
  cidOrigem: 'is' | 'ia' | '';
  afastamentos: AfastamentoIS[];
  /** Quem leu: a IA ou o fallback por regex. */
  origem: 'ia' | 'regex';
  /** Laudo e restrições usados (cópia histórica). */
  laudo: string;
  restricoes: string;
  /** Assinatura de laudo/restrições/CID/data: igual → não reprocessa (utils/afastamentosIS.ts). */
  fonte: string;
  processadoPor: string;
  processadoEm: Timestamp | null;
}
export type AfastamentosISRecord = AfastamentosISDoc & { id: string };

type ISComCid = InspecaoDoc & { cid?: string };

const INSTRUCOES = [
  'Você lê a conclusão de uma Inspeção de Saúde (IS) da Marinha do Brasil, finalidade de Verificação ou Término',
  '(DGPM-406), e identifica os afastamentos que o laudo concede ao inspecionado:',
  '- "lts": Licença para Tratamento de Saúde (ex.: "Incapaz temporariamente para o SAM, necessitando de 30 (trinta) dias',
  '  de licença para tratamento de saúde própria", "LTS por 15 dias", "incapaz ... por 60 dias").',
  '- "restricoes": período apto com restrições (ex.: "Apto para o SAM com restrições por 90 dias").',
  'Para cada afastamento devolva tipo, dias (inteiro; "2 meses" = 60) e aposAnterior = true quando ele começa depois do',
  'anterior (ex.: "30 dias de LTS e, após, restrições por 60 dias" → o 2º tem aposAnterior true).',
  'Laudo sem afastamento (ex.: "Apto para o SAM", "Apto para o SAM sem restrições") → lista vazia.',
  'Não conte prazos de reavaliação/retorno como afastamento, salvo se o laudo disser que o período é de LTS ou com restrições.',
  'cid: se o CID da IS for informado, repita-o; senão, só se o laudo trouxer o diagnóstico ou o código CID-10 escrito,',
  'no formato "descrição abreviatura" (ex.: "Lombalgia M54.5"); senão vazio. Não invente.',
].join('\n');

/** A IA lê laudo/restrições/CID e devolve os afastamentos (sem datas) e o CID. Lança erro se a IA falhar. */
export const lerAfastamentosComIA = async (f: { laudo: string; restricoes: string; cid: string }): Promise<{ lidos: AfastamentoLido[]; cid: string }> => {
  const dados = [
    `LAUDO: ${higienizarParaIA(f.laudo, 4000) || '(vazio)'}`,
    `RESTRIÇÕES: ${higienizarParaIA(f.restricoes, 2000) || '(nenhuma)'}`,
    `CID DA IS: ${higienizarParaIA(f.cid, 300) || '(não informado)'}`,
  ].join('\n');
  const r = await gerarComGemini({
    contexto: 'afastamentos da IS (laudo)',
    instrucoes: `${INSTRUCOES}\n\n${dados}`,
    arquivos: [],
    temperature: 0,
    esquema: Schema => Schema.object({
      properties: {
        afastamentos: Schema.array({
          items: Schema.object({
            properties: {
              tipo: Schema.enumString({ enum: [...TIPOS_AFASTAMENTO_IS] }),
              dias: Schema.integer(),
              aposAnterior: Schema.boolean(),
            },
            optionalProperties: ['aposAnterior'],
          }),
        }),
        cid: Schema.string(),
      },
      optionalProperties: ['cid'],
    }),
  });
  const l = lerJsonIA<LeituraAfastamentosIA>(r, 'A IA não conseguiu ler o laudo.');
  return { lidos: normalizarAfastamentosIA(l), cid: String(l.cid || '').trim() };
};

const refAfastamentos = (isId: string) => doc(db, COL_AFASTAMENTOS_IS, isId);

const removerSeExistir = async (isId: string) => {
  const atual = await getDoc(refAfastamentos(isId));
  if (atual.exists()) await deleteDoc(atual.ref);
};

/**
 * Processa a IS: se for de Verificações e Términos com o TIS assinado, lê os afastamentos (IA; fallback regex) e grava
 * afastamentosIS/{isId} (substitui o anterior). Senão, apaga o registro que houver. Sem mudança no laudo, nas
 * restrições, no CID e na data desde o último processamento, não chama a IA (salvo `forcar`).
 * Devolve o registro gravado/atual, ou null quando a IS não gera afastamentos.
 */
export const processarAfastamentosDaIS = async (isId: string, opcoes: { forcar?: boolean } = {}): Promise<AfastamentosISRecord | null> => {
  const snap = await getDoc(doc(db, 'inspecoes', isId));
  if (!snap.exists()) { await removerSeExistir(isId); return null; }
  const is = snap.data() as ISComCid;
  if (!isGeraAfastamentos(is)) { await removerSeExistir(isId); return null; }

  const laudo = String(is.laudo || '').trim();
  const restricoes = String(is.restricoes || '').trim();
  const cidIS = String(is.cid || '').trim();
  const dataIS = dataDaIS(is);
  const fonte = assinaturaFonteAfastamentos({ laudo, restricoes, cid: cidIS, dataIS });
  if (!opcoes.forcar) {
    const atual = await getDoc(refAfastamentos(isId));
    if (atual.exists() && (atual.data() as AfastamentosISDoc).fonte === fonte) return { id: atual.id, ...(atual.data() as AfastamentosISDoc) };
  }

  let lidos: AfastamentoLido[];
  let cidIA = '';
  let origem: AfastamentosISDoc['origem'] = 'ia';
  const porRegex = extrairAfastamentosDoTexto(laudo, restricoes);
  try {
    const r = await lerAfastamentosComIA({ laudo, restricoes, cid: cidIS });
    lidos = r.lidos; cidIA = r.cid;
    // A IA não achou nada, mas o texto tem "N dias" de LTS/restrições: fica a leitura por regex.
    if (!lidos.length && porRegex.length) { lidos = porRegex; origem = 'regex'; }
  } catch (e) {
    logErroSeguro(`Afastamentos da IS ${isId}: IA falhou, usando o fallback por regex`, e);
    lidos = porRegex; origem = 'regex';
  }
  const cid = cidIS || cidIA;
  const dados: Omit<AfastamentosISDoc, 'processadoEm'> & { processadoEm: ReturnType<typeof serverTimestamp> } = {
    isId, isNumero: Number(is.is ?? isId) || 0, inspecionadoId: is.inspecionadoId || '', inspecionado: is.inspecionado || '',
    finalidade: is.finalidade || '', dataIS, cid, cidOrigem: cidIS ? 'is' : cidIA ? 'ia' : '',
    afastamentos: montarAfastamentosIS(lidos, dataIS, cid, restricoes),
    origem, laudo, restricoes, fonte, processadoPor: auth.currentUser?.uid || '', processadoEm: serverTimestamp(),
  };
  await setDoc(refAfastamentos(isId), dados);
  return { id: isId, ...dados, processadoEm: null };
};

/**
 * Dispara processarAfastamentosDaIS em segundo plano (fire-and-forget): não bloqueia a UI e não lança; o erro vai
 * para o log seguro. Chamado pelo service layer das IS ao mudar o status (services/firestoreInspecoes.ts).
 */
export const dispararProcessamentoAfastamentosIS = (isId: string): void => {
  processarAfastamentosDaIS(isId).catch(e => logErroSeguro(`Afastamentos da IS ${isId}: processamento falhou`, e));
};

// ---------------------------------------------------------------------------
// Ficha do inspecionado
// ---------------------------------------------------------------------------

/** Afastamento de uma IS, com a IS de origem (para a Ficha). */
export type AfastamentoDaIS = AfastamentoIS & { isId: string; isNumero: number; finalidade: string; origem: 'ia' | 'regex' };

/**
 * Afastamentos (LTS/Restrições) e CIDs registrados nas IS do inspecionado (militarId = inspecionadoId = NIP só
 * dígitos). Afastamentos do mais recente para o mais antigo; CIDs: o campo "cid" de cada IS ou, sem ele, o inferido
 * pela IA (utils/afastamentosIS.ts: cidsDasIS). Leitura única; exige perfil da equipe (firestore.rules).
 */
export const listarAfastamentosECidsDoInspecionado = async (militarId: string): Promise<{ afastamentos: AfastamentoDaIS[]; cids: CidDaIS[] }> => {
  // Parte das IS do inspecionado (e não de afastamentosIS.inspecionadoId): se o NIP do militar for corrigido
  // (firestoreMilitares.ts move as IS), os registros continuam achados pelo id da IS.
  const inspecoes = await getDocs(query(collection(db, 'inspecoes'), where('inspecionadoId', '==', militarId)));
  const regs = await Promise.all(inspecoes.docs.map(d => getDoc(refAfastamentos(d.id))));
  const registros = regs.filter(d => d.exists()).map(d => ({ id: d.id, ...(d.data() as AfastamentosISDoc) }));
  const afastamentos = registros
    .flatMap(r => (r.afastamentos || []).map(a => ({ ...a, isId: r.isId || r.id, isNumero: r.isNumero, finalidade: r.finalidade, origem: r.origem })))
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio) || b.isNumero - a.isNumero);
  const inferidos = Object.fromEntries(registros.filter(r => r.cidOrigem === 'ia' && r.cid).map(r => [r.id, r.cid]));
  const cids = cidsDasIS(inspecoes.docs.map(d => ({ id: d.id, ...(d.data() as ISComCid) })), inferidos);
  return { afastamentos, cids };
};
