// Ficheiro: services/respostaParecer.ts
// "Resposta de Parecer" (Ficha do inspecionado › Pareceres, ?criar=resposta): o usuário envia o PDF com a
// resposta do especialista; a IA (Firebase AI Logic, como em services/examesIS.ts) transcreve a resposta na
// íntegra; depois o PDF vai para o Storage (pareceres/{id}-resposta.pdf) e a resposta é gravada NO PEDIDO
// (pareceres/{id}.resposta), que passa a CONCLUÍDO (marcarConcluido). A leitura vem antes do envio: um PDF que
// a IA não leu não deixa resposta pela metade. Regras: firestore.rules (pareceres) e storage.rules (pareceres/).
import { avancarParaConclusaoPendente } from './firestoreInspecoes';
import { statusAposRespostaParecer } from '../utils/conclusaoIS';
import { getFirestore, doc, updateDoc, serverTimestamp, getDocs, query, collection, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';
import { registrarUsoAcao } from './usoDiario';
import { registrarEventoInspecionado } from './eventosInspecionado';
import { gerarComGemini, lerJsonIA, arquivoParaBase64IA } from './geminiAI';
import { marcarConcluido, type ParecerRecord } from './firestorePareceres';
import { caminhoRespostaParecer } from '../utils/pareceres';
import { exigirLimitePdf } from '../config/limitePdf';

const db = getFirestore(app);

/** Maior PDF aceito (a IA recebe o arquivo inteiro; storage.rules limita pareceres/ a 10 MB). */

/** É um PDF (pelo tipo ou, sem tipo — ex.: colado —, pela extensão)? */
export const ehPdf = (f: Pick<File, 'type' | 'name'>): boolean => f.type === 'application/pdf' || (!f.type && /\.pdf$/i.test(f.name));

const INSTRUCOES = [
  'Você recebe um PDF com a RESPOSTA de um especialista a um Pedido de Parecer Médico da Junta Regular de Saúde',
  '(Inspeção de Saúde da Marinha do Brasil). Pode ser manuscrita, digitada ou escaneada.',
  'Devolva:',
  '- transcricao: a resposta NA ÍNTEGRA, transcrita fielmente — respostas aos quesitos (mantenha a numeração),',
  '  diagnóstico, CID, conduta, prognóstico, restrições e conclusão. Mantenha a ordem e as quebras de parágrafo.',
  '  Não resuma, não interprete, não corrija e não acrescente nada; trecho ilegível vira "[ilegível]".',
  '  Omita só a cópia do pedido (histórico e quesitos já impressos no formulário), cabeçalhos e rodapés administrativos.',
  '- emissor: especialista e/ou serviço que assina a resposta (vazio se não constar).',
  '- data: data da resposta no formato AAAA-MM-DD (vazia se não constar).',
  'Se o PDF não tiver resposta de parecer (só o pedido em branco, por exemplo), devolva transcricao vazia.',
].join('\n');

export interface LeituraResposta { transcricao: string; emissor: string; data: string; textoIncompleto: boolean }

/** A IA lê o PDF e devolve a transcrição integral da resposta. */
export const lerRespostaComIA = async (arquivo: File): Promise<LeituraResposta> => {
  if (!ehPdf(arquivo)) throw new Error('Envie a resposta em PDF.');
  exigirLimitePdf(arquivo.size, 'O PDF');
  const r = await gerarComGemini({
    contexto: 'resposta de parecer (PDF)',
    instrucoes: INSTRUCOES,
    arquivos: [{ base64: await arquivoParaBase64IA(arquivo), mimeType: 'application/pdf' }],
    temperature: 0,
    maxOutputTokens: 32768,
    esquema: Schema => Schema.object({
      properties: { transcricao: Schema.string(), emissor: Schema.string(), data: Schema.string() },
      optionalProperties: ['emissor', 'data'],
    }),
  });
  const l = lerJsonIA<Partial<LeituraResposta>>(r, 'A IA não conseguiu ler o PDF.');
  const transcricao = String(l?.transcricao ?? '').trim();
  if (!transcricao) throw new Error('Nenhuma resposta de parecer encontrada no PDF.');
  registrarUsoAcao('exame_ia');
  const data = /^\d{4}-\d{2}-\d{2}$/.test(String(l?.data ?? '')) ? String(l?.data) : '';
  return { transcricao, emissor: String(l?.emissor ?? '').trim(), data, textoIncompleto: r.cortada };
};

/** Envia o PDF ao Storage, grava a resposta no pedido e marca o pedido como CONCLUÍDO. */
export const gravarRespostaParecer = async (
  pedido: Pick<ParecerRecord, 'id' | 'militarId' | 'is'> & { isId?: string }, arquivo: File, leitura: LeituraResposta,
  usuario: { uid: string; usuario: string; nome: string },
): Promise<void> => {
  const caminho = caminhoRespostaParecer(pedido.id);
  const r = ref(getStorage(app), caminho);
  await uploadBytes(r, arquivo, { contentType: 'application/pdf' });
  try {
    const pdfUrl = await getDownloadURL(r);
    await updateDoc(doc(db, 'pareceres', pedido.id), {
      resposta: {
        caminho, pdfUrl, nomeArquivo: arquivo.name || 'resposta.pdf', bytes: arquivo.size,
        transcricao: leitura.transcricao, emissor: leitura.emissor, data: leitura.data, textoIncompleto: leitura.textoIncompleto,
        enviadoPor: { uid: usuario.uid, usuario: usuario.usuario }, enviadoEm: serverTimestamp(),
      },
    });
  } catch (e) {
    await deleteObject(r).catch(() => { /* fica órfão no Storage; não há o que fazer */ });
    throw e;
  }
  await marcarConcluido(pedido.id, true, usuario.nome);
  // IS em "Parecer solicitado" sem outro pedido em aberto → Conclusão pendente.
  if (pedido.isId) {
    const isId = pedido.isId;
    const abertos = await getDocs(query(collection(db, 'pareceres'), where('isId', '==', isId)))
      .then(s => s.docs.filter(d => d.id !== pedido.id && d.data().status !== 'concluido').length).catch(() => 1);
    await avancarParaConclusaoPendente(isId, st => statusAposRespostaParecer(st, abertos));
  }
  registrarEventoInspecionado(pedido.militarId, 'parecer.resposta', pedido.is ? `Parecer da IS ${pedido.is}` : 'Resposta de parecer');
};
