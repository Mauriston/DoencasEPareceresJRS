// Ficheiro: services/afastamentosIS.ts
// Afastamentos (LTS ou Restrições) de uma IS finalizada do grupo "Verificações e Términos", calculados pela IA
// (Firebase AI Logic — services/geminiAI.ts; prompt PROMPT_AFASTAMENTOS_IS em config/promptsIA.ts) a partir do
// Laudo e das Restrições. Roda em SEGUNDO PLANO depois da gravação que finaliza a IS (status "tis_assinado" —
// services/firestoreInspecoes.ts → aposFinalizar), sem bloquear a tela; erros só vão para o log seguro.
// Idempotente: o marcador `afastamentosProcessamento` (hash da entrada, situação, tentativas) é reivindicado numa
// transação antes da chamada à IA, e o resultado só é gravado se a IS ainda tiver a mesma entrada (hash).
// Grava em inspecoes/{id}: `afastamentos[]` (utils/afastamentosIS.ts → AfastamentoIS), `afastamentosProcessamento`
// e `afastamentosProcessadosEm`. A Ficha do inspecionado lê pelas IS do inspecionado (afastamentosDasIS).
import { getFirestore, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { gerarComGemini, lerJsonIA } from './geminiAI';
import { PROMPT_AFASTAMENTOS_IS } from '../config/promptsIA';
import { logErroSeguro, descreverErro } from '../utils/logSeguro';
import { carregarCid } from '../utils/corposQuadros';
import { indiceCidAbreviado } from '../utils/periciaMenorLista';
import { hojeISO } from '../utils/dados';
import {
  hashEntradaAfastamentos, marcadorProcessando, normalizarAfastamentosIA, precisaProcessarAfastamentos,
  type AfastamentoIS, type ISParaAfastamentos, type ProcessamentoAfastamentosIS, type RespostaAfastamentosIA,
} from '../utils/afastamentosIS';

const db = getFirestore(app);
const COL = 'inspecoes';

/** Texto enviado à IA: só o necessário (sem nome nem NIP do inspecionado). */
const entradaParaIA = (is: ISParaAfastamentos): string => [
  PROMPT_AFASTAMENTOS_IS,
  '',
  '# DADOS DA IS',
  `FINALIDADE: ${is.finalidade || '—'}`,
  `DATA DO LAUDO: ${is.dataLaudo || '—'}`,
  `CID DA IS: ${is.cid || '—'}`,
  `LAUDO: ${is.laudo || '—'}`,
  `RESTRIÇÕES: ${is.restricoes || '—'}`,
].join('\n');

/** Chama a IA e devolve a resposta estruturada. */
export const interpretarAfastamentosIA = async (is: ISParaAfastamentos): Promise<RespostaAfastamentosIA> => {
  const r = await gerarComGemini({
    contexto: 'afastamentos da IS (laudo/restrições)',
    instrucoes: entradaParaIA(is),
    arquivos: [],
    temperature: 0,
    esquema: Schema => Schema.object({
      properties: {
        afastamentos: Schema.array({
          items: Schema.object({
            properties: {
              tipo: Schema.enumString({ enum: ['lts', 'restricoes'] }),
              quantidade: Schema.number(),
              unidade: Schema.enumString({ enum: ['dias', 'semanas', 'meses', 'anos'] }),
              dataInicio: Schema.string({ description: 'AAAA-MM-DD, só se explícita no laudo' }),
              restricoes: Schema.array({ items: Schema.string() }),
              cidCodigo: Schema.string({ description: 'só se o laudo citar CID diferente do da IS' }),
              trecho: Schema.string(),
            },
            optionalProperties: ['dataInicio', 'restricoes', 'cidCodigo', 'trecho'],
          }),
        }),
        observacao: Schema.string(),
      },
      optionalProperties: ['observacao'],
    }),
  });
  if (r.cortada) throw new Error('Resposta da IA incompleta.');
  return lerJsonIA<RespostaAfastamentosIA>(r, 'Resposta da IA inválida.');
};

type Reivindicacao = { is: ISParaAfastamentos; marcador: ProcessamentoAfastamentosIS } | null;

/**
 * Processa os afastamentos da IS `id`, se precisar (elegível e com entrada ainda não processada).
 * Devolve os afastamentos gravados, ou `null` quando nada foi feito.
 */
export const processarAfastamentosDaIS = async (id: string): Promise<AfastamentoIS[] | null> => {
  const ref = doc(db, COL, id);
  // 1. Reivindica o processamento (outra aba/usuário pode estar fazendo o mesmo).
  const reivindicado: Reivindicacao = await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const is = snap.data() as ISParaAfastamentos;
    const agora = Date.now();
    if (!precisaProcessarAfastamentos(is, agora)) return null;
    const marcador = marcadorProcessando(is, agora);
    tx.update(ref, { afastamentosProcessamento: marcador });
    return { is, marcador };
  });
  if (!reivindicado) return null;
  const { is, marcador } = reivindicado;

  // 2. IA + normalização (fora da transação).
  let afastamentos: AfastamentoIS[] = [];
  let observacao = '';
  let erro = '';
  try {
    const resposta = await interpretarAfastamentosIA(is);
    const cids = await carregarCid().then(indiceCidAbreviado).catch(() => null);
    afastamentos = normalizarAfastamentosIA(resposta, { is, hoje: hojeISO(), cidsAbreviados: cids });
    observacao = String(resposta?.observacao || '').slice(0, 200);
  } catch (e) {
    erro = descreverErro(e).mensagem || 'Falha na IA.';
    logErroSeguro('Afastamentos da IS: IA falhou', e);
  }

  // 3. Grava só se a entrada não mudou nesse meio-tempo (senão a próxima finalização reprocessa).
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return null;
    const atual = snap.data() as ISParaAfastamentos;
    if (hashEntradaAfastamentos(atual) !== marcador.hash || atual.afastamentosProcessamento?.iniciadoEmMs !== marcador.iniciadoEmMs) return null;
    if (erro) {
      tx.update(ref, { afastamentosProcessamento: { ...marcador, situacao: 'erro', erro } });
      return null;
    }
    const final: ProcessamentoAfastamentosIS = {
      ...marcador, situacao: afastamentos.length ? 'concluido' : 'sem_afastamento', ...(observacao ? { observacao } : {}),
    };
    tx.update(ref, { afastamentos, afastamentosProcessamento: final, afastamentosProcessadosEm: serverTimestamp() });
    return afastamentos;
  });
};

/** Dispara o processamento sem esperar (fire-and-forget); erros só no log seguro (sem dados pessoais). */
export const processarAfastamentosEmSegundoPlano = (id: string): void => {
  void processarAfastamentosDaIS(id).catch(e => logErroSeguro('Afastamentos da IS: processamento falhou', e));
};

/**
 * Retoma as IS que ficaram pendentes (aba fechada no meio, erro da IA abaixo do limite de tentativas):
 * pode ser chamada por uma página que já observa as IS (ex.: Ficha do inspecionado ou Inspeções de Saúde).
 */
export const retomarAfastamentosPendentes = (lista: ReadonlyArray<ISParaAfastamentos & { id: string }>, max = 3): number => {
  const agora = Date.now();
  const pendentes = lista.filter(is => precisaProcessarAfastamentos(is, agora)).slice(0, max);
  pendentes.forEach(is => processarAfastamentosEmSegundoPlano(is.id));
  return pendentes.length;
};
