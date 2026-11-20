// Ficheiro: services/examesIS.ts
// Exames da IS: o usuário envia um ou mais PDFs no detalhe da IS; para cada um, a IA (Firebase AI Logic)
// identifica o documento (exame, laudo, parecer…) e transcreve o laudo na íntegra; depois o PDF vai para o
// Storage (inspecoes/{isId}/exames/{exameId}.pdf) e a leitura para o Firestore
// (inspecoes/{isId}/exames/{exameId}). A leitura vem antes do envio: um PDF que a IA não leu não deixa
// documento pela metade. Envio e remoção só enquanto a IS não está finalizada (firestore.rules e storage.rules).
// A IA também classifica o PDF como "exame" (laudo de exame) ou "atestado" (Atestado/Relatório Médico): campo
// opcional "categoria" (ausente = "exame", documentos antigos). A Ficha do inspecionado lista os exames e os
// atestados de todas as IS dele (listarDocumentosDasISDoInspecionado).
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, query, where, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';
import { registrarUsoAcao } from './usoDiario';
import { notificarAcao } from './notificacoesPush';
import { gerarComGemini, lerJsonIA, arquivoParaBase64IA } from './geminiAI';
import { novoId } from '../utils/dados';
import { dataCivilISO } from '../utils/dados';
import {
  categoriaDaLeitura, categoriaDoExame, dataDoDocumento, itensDaLeitura, CATEGORIAS_EXAME, TIPOS_DOCUMENTO,
  type CategoriaExame, type ItemExame, type LeituraExameIA,
} from '../utils/examesIS';

const db = getFirestore(app);

/** Maior PDF aceito (a IA recebe o arquivo inteiro na requisição). */
export const MAX_PDF_EXAME_MB = 15;

export interface ExameISDoc {
  /** Caminho no Storage: inspecoes/{isId}/exames/{id}.pdf */
  caminho: string;
  nomeArquivo: string;
  bytes: number;
  itens: ItemExame[];
  /** A resposta da IA foi cortada (documento muito longo): o texto pode estar incompleto. */
  textoIncompleto: boolean;
  /** "exame" (laudo de exame) ou "atestado" (Atestado/Relatório Médico). Ausente nos antigos = "exame" (categoriaDoExame). */
  categoria?: CategoriaExame;
  enviadoPor: { uid: string; usuario: string };
  enviadoEm: Timestamp | null;
}
export type ExameISRecord = ExameISDoc & { id: string };

const colecao = (isId: string) => collection(db, 'inspecoes', isId, 'exames');

export const observarExamesDaIS = (isId: string, onData: (lista: ExameISRecord[]) => void, onError?: (e: Error) => void) =>
  onSnapshot(
    colecao(isId),
    snap => onData(snap.docs
      .map(d => ({ id: d.id, ...(d.data() as ExameISDoc) }))
      .sort((a, b) => (a.enviadoEm?.toMillis?.() ?? Date.now()) - (b.enviadoEm?.toMillis?.() ?? Date.now()))),
    err => onError?.(err),
  );

const INSTRUCOES = [
  'Você recebe um PDF entregue por um inspecionado numa Inspeção de Saúde da Marinha do Brasil (perícia médica).',
  'Identifique cada documento médico do PDF (via de regra é um só) e devolva, para cada um:',
  '- tipo: exame_imagem (RX, US, TC, RM, cintilografia, densitometria, mamografia…), exame_laboratorial (sangue, urina…),',
  '  exame_funcional (ECG, ecocardiograma, teste ergométrico, Holter, MAPA, EEG, ENMG, espirometria, audiometria, polissonografia…),',
  '  laudo_medico (relatório ou laudo de médico assistente), parecer (parecer de especialista), atestado, receita ou outro.',
  '- titulo: o nome do exame/documento como consta (ex.: "Ressonância magnética do joelho direito", "Hemograma completo",',
  '  "Relatório médico — Psiquiatria").',
  '- data: data de realização ou emissão, no formato AAAA-MM-DD (vazia se não constar).',
  '- emissor: serviço/clínica/laboratório e/ou profissional que assina (vazio se não constar).',
  '- texto: o laudo NA ÍNTEGRA, transcrito fielmente — indicação, técnica, achados/descrição, resultados (com valores, unidades',
  '  e referências), impressão diagnóstica/conclusão, CID quando houver. Mantenha a ordem e as quebras de parágrafo.',
  '  Não resuma, não interprete, não corrija e não acrescente nada. Omita só cabeçalhos e rodapés administrativos',
  '  (endereço, telefone, site, códigos de autenticação, numeração de página).',
  'Laudos com várias páginas do mesmo exame são UM documento. Exames distintos no mesmo PDF são documentos distintos.',
  'Se o PDF não tiver documento médico, devolva a lista vazia.',
  'Classifique também o PDF inteiro em "categoria":',
  '- "atestado": Atestado médico ou Relatório/Laudo Médico de médico assistente (declara diagnóstico, CID, afastamento,',
  '  tratamento ou evolução do paciente), sem ser o resultado de um exame complementar;',
  '- "exame": laudo/resultado de exame complementar (imagem, laboratório, funcional) ou parecer de especialista.',
  'Se o PDF tiver os dois, use a categoria do documento principal (o de mais páginas).',
].join('\n');

export type LeituraExame = { itens: ItemExame[]; textoIncompleto: boolean; categoria: CategoriaExame };

/** A IA lê o PDF e devolve os documentos identificados, com o laudo na íntegra. */
export const lerExameComIA = async (arquivo: File): Promise<LeituraExame> => {
  if (arquivo.size > MAX_PDF_EXAME_MB * 1024 * 1024) throw new Error(`PDF acima de ${MAX_PDF_EXAME_MB} MB.`);
  const r = await gerarComGemini({
    contexto: 'exame da IS (PDF)',
    instrucoes: INSTRUCOES,
    arquivos: [{ base64: await arquivoParaBase64IA(arquivo), mimeType: 'application/pdf' }],
    temperature: 0,
    maxOutputTokens: 32768,
    esquema: Schema => Schema.object({
      properties: {
        categoria: Schema.enumString({ enum: [...CATEGORIAS_EXAME] }),
        documentos: Schema.array({
          items: Schema.object({
            properties: {
              tipo: Schema.enumString({ enum: [...TIPOS_DOCUMENTO] }),
              titulo: Schema.string(), data: Schema.string(), emissor: Schema.string(), texto: Schema.string(),
            },
            optionalProperties: ['data', 'emissor'],
          }),
        }),
      },
    }),
  });
  const leitura = lerJsonIA<LeituraExameIA>(r, 'A IA não conseguiu ler o PDF.');
  const itens = itensDaLeitura(leitura);
  if (!itens.length) throw new Error('Nenhum documento médico encontrado no PDF.');
  registrarUsoAcao('exame_ia');
  return { itens, textoIncompleto: r.cortada, categoria: categoriaDaLeitura(leitura.categoria, itens) };
};

/** Envia o PDF ao Storage e grava a leitura no Firestore. */
export const gravarExameIS = async (
  isId: string, arquivo: File, leitura: { itens: ItemExame[]; textoIncompleto: boolean; categoria?: CategoriaExame }, usuario: { uid: string; usuario: string },
): Promise<string> => {
  const id = novoId();
  const caminho = `inspecoes/${isId}/exames/${id}.pdf`;
  const r = ref(getStorage(app), caminho);
  await uploadBytes(r, arquivo, { contentType: 'application/pdf' });
  try {
    await setDoc(doc(colecao(isId), id), {
      caminho, nomeArquivo: arquivo.name, bytes: arquivo.size, itens: leitura.itens, textoIncompleto: leitura.textoIncompleto,
      categoria: leitura.categoria ?? categoriaDaLeitura('', leitura.itens),
      enviadoPor: usuario, enviadoEm: serverTimestamp(),
    });
  } catch (e) {
    await deleteObject(r).catch(() => { /* fica órfão no Storage; não há o que fazer */ });
    throw e;
  }
  notificarAcao('is.examesEnviados', isId);
  return id;
};

export const urlDoExame = (exame: Pick<ExameISDoc, 'caminho'>): Promise<string> => getDownloadURL(ref(getStorage(app), exame.caminho));

export const apagarExameIS = async (isId: string, exame: ExameISRecord): Promise<void> => {
  await deleteDoc(doc(colecao(isId), exame.id));
  await deleteObject(ref(getStorage(app), exame.caminho)).catch(() => { /* o documento já saiu da lista */ });
};

// ---------------------------------------------------------------------------
// Ficha do inspecionado: exames e atestados de todas as IS dele
// ---------------------------------------------------------------------------

/** Um PDF enviado numa IS do inspecionado (exame ou atestado). */
export interface DocumentoDaIS {
  isId: string;
  isNumero: number;
  finalidade: string;
  exameId: string;
  categoria: CategoriaExame;
  /** Caminho no Storage (inspecoes/{isId}/exames/{exameId}.pdf). */
  caminho: string;
  /** URL de download ('' se não foi possível obter; use urlDoExame({ caminho }) para tentar de novo). */
  url: string;
  nomeArquivo: string;
  /** Título(s) dos documentos identificados no PDF, separados por " · ". */
  titulo: string;
  /** AAAA-MM-DD: data do documento (1º item com data) ou do envio. */
  data: string;
  itens: ItemExame[];
}

/**
 * Exames e atestados de todas as IS do inspecionado (militarId = inspecionadoId = NIP só dígitos), do mais recente
 * para o mais antigo. Leitura única (sem observar); exige perfil da equipe (firestore.rules: inspecoes/{id}/exames).
 * `comUrl` (padrão true) resolve a URL de download de cada PDF.
 */
export const listarDocumentosDasISDoInspecionado = async (
  militarId: string, opcoes: { comUrl?: boolean } = {},
): Promise<{ exames: DocumentoDaIS[]; atestados: DocumentoDaIS[] }> => {
  const comUrl = opcoes.comUrl !== false;
  const inspecoes = await getDocs(query(collection(db, 'inspecoes'), where('inspecionadoId', '==', militarId)));
  const porIS = await Promise.all(inspecoes.docs.map(async is => {
    const dadosIS = is.data() as { is?: number; finalidade?: string };
    const exames = await getDocs(colecao(is.id));
    return Promise.all(exames.docs.map(async d => {
      const e = d.data() as ExameISDoc;
      const itens = Array.isArray(e.itens) ? e.itens : [];
      const enviado = e.enviadoEm?.toDate ? dataCivilISO(e.enviadoEm.toDate()) || '' : '';
      const url = comUrl ? await urlDoExame(e).catch(() => '') : '';
      return {
        isId: is.id, isNumero: Number(dadosIS.is ?? is.id) || 0, finalidade: dadosIS.finalidade || '', exameId: d.id,
        categoria: categoriaDoExame(e), caminho: e.caminho, url, nomeArquivo: e.nomeArquivo || '',
        titulo: itens.map(i => i.titulo).filter(Boolean).join(' · ') || e.nomeArquivo || '',
        data: dataDoDocumento(itens, enviado), itens,
      } satisfies DocumentoDaIS;
    }));
  }));
  const todos = porIS.flat().sort((a, b) => b.data.localeCompare(a.data) || b.isNumero - a.isNumero);
  return { exames: todos.filter(x => x.categoria === 'exame'), atestados: todos.filter(x => x.categoria === 'atestado') };
};
