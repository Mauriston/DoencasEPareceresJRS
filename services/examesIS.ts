// Ficheiro: services/examesIS.ts
// Exames da IS: o usuário envia um ou mais PDFs no detalhe da IS; para cada um, a IA (Firebase AI Logic)
// identifica o documento (exame, laudo, parecer…), classifica o PDF (laudo de exame × atestado/relatório
// médico — usado na Ficha do inspecionado) e transcreve o laudo na íntegra; depois o PDF vai para o
// Storage (inspecoes/{isId}/exames/{exameId}.pdf) e a leitura para o Firestore
// (inspecoes/{isId}/exames/{exameId}). Pela Ficha do inspecionado (abas Exames e Atestados e Laudos, "Criar
// novo"), a mesma leitura recebe os exames mínimos da finalidade (a IA tenta enquadrar cada documento) e a aba
// de destino (a classificação gravada é a da aba). Laboratoriais trazem também os analitos (valores) à parte.
// A leitura vem antes do envio: um PDF que a IA não leu não deixa
// documento pela metade. Envio e remoção só enquanto a IS não está finalizada (firestore.rules e storage.rules).
import { avancarParaConclusaoPendente, perfilDoUsuario } from './firestoreInspecoes';
import { statusAposAtoMedico } from '../utils/conclusaoIS';
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp, type Timestamp,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';
import { registrarUsoAcao } from './usoDiario';
import { notificarAcao } from './notificacoesPush';
import { gerarComGemini, lerJsonIA, arquivoParaBase64IA } from './geminiAI';
import { novoId } from '../utils/dados';
import { instrucoesEnvioFicha, type OpcoesLeituraExame } from '../utils/examesFicha';
import { classificarExame, itensDaLeitura, CATEGORIAS_ATESTADO, CLASSES_EXAME, TIPOS_DOCUMENTO, type ClasseExame, type ItemExame, type LeituraExameIA, type OrigemClasseExame } from '../utils/examesIS';
import { exigirLimitePdf } from '../config/limitePdf';

const db = getFirestore(app);


export interface ExameISDoc {
  /** Caminho no Storage: inspecoes/{isId}/exames/{id}.pdf */
  caminho: string;
  nomeArquivo: string;
  bytes: number;
  itens: ItemExame[];
  /** A resposta da IA foi cortada (documento muito longo): o texto pode estar incompleto. */
  textoIncompleto: boolean;
  /** Laudo de exame × atestado/relatório médico (IA na mesma leitura; sem resposta válida, pelos tipos dos itens).
   *  Ausente nos PDFs enviados antes de 15/11/2026 — ler com classeDoExame (utils/examesIS.ts). */
  classificacao?: ClasseExame;
  /** De onde veio a classificação: 'ia', 'tipos' (fallback) ou 'aba' (enviado pela aba Exames/Atestados e Laudos da Ficha). */
  classificacaoOrigem?: OrigemClasseExame;
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
  '- texto: o documento NA ÍNTEGRA, transcrito palavra por palavra — indicação, técnica, achados/descrição, resultados (com',
  '  valores, unidades e referências), impressão diagnóstica/conclusão, CID quando houver, assinatura/carimbo.',
  'REGRA ABSOLUTA DE FIDELIDADE (sem exceção): o conteúdo é transcrito na íntegra, exatamente como está no documento.',
  '  É PROIBIDO alterar, editar, reescrever, resumir, interpretar, corrigir (inclusive ortografia, abreviações e valores),',
  '  completar, acrescentar ou retirar qualquer palavra, número ou trecho. Trecho ilegível: escreva [ilegível] no lugar,',
  '  sem adivinhar. Mantenha a ordem do texto e as quebras de parágrafo.',
  '  A ÚNICA coisa que pode ser desprezada é cabeçalho e rodapé sem conteúdo médico: numeração de página, endereço,',
  '  telefone, e-mail e site da clínica ou do médico, logotipos e códigos de autenticação.',
  'ORDEM DAS PÁGINAS: siga estritamente a ordem das páginas do PDF — a página 1 primeiro, depois a 2, e assim por diante.',
  '  Os documentos da lista aparecem na ordem em que começam no PDF, e o texto de um documento com várias páginas segue a',
  '  sequência das páginas. Nunca reordene por data, por tipo ou por importância.',
  'Laudos com várias páginas do mesmo exame são UM documento. Exames distintos no mesmo PDF são documentos distintos.',
  'Se o PDF não tiver documento médico, devolva a lista vazia.',
  'Classifique também o PDF inteiro em "classificacao":',
  '- laudo_exame: laudo ou resultado de exame complementar (imagem, laboratorial, funcional);',
  '- atestado_relatorio: atestado médico, relatório/laudo do médico assistente ou parecer de especialista.',
  'Se houver dos dois, use o que predomina no PDF.',
  'Em cada documento, devolva também:',
  '- especialidade: a especialidade médica do documento (do emissor ou do conteúdo), ex.: "Ortopedia", "Psiquiatria",',
  '  "Cardiologia", "Clínica Médica" (vazia se não for possível deduzir);',
  '- categoria (só para documentos do médico assistente): atestado (atestado médico), laudo (laudo médico) ou relatorio',
  '  (relatório médico ou parecer de especialista).',
].join('\n');

// Laboratoriais: os analitos à parte, no padrão copiável dos concursos (utils/examesCandidato.ts).
const INSTRUCOES_VALORES = [
  'Em exame_laboratorial, devolva também "valores": um item por analito/parâmetro, na ordem do laudo, com "nome" (como consta,',
  'ex.: "Hemoglobina", "Glicose em jejum") e "valor" (só o resultado, SEM unidade e sem referência, ex.: "15,4"). Nos demais tipos, omita.',
  'Em cada valor, devolva também:',
  '- referencia: os valores de referência do analito EXATAMENTE como impressos no laudo, com unidade (ex.: "13,5 a 17,5 g/dL");',
  '  referenciaOrigem = "laudo". Só se o laudo NÃO trouxer referência para aquele analito, use a referência usual para adulto',
  '  e marque referenciaOrigem = "usual".',
  '- alterado: true quando o resultado está fora da referência considerada ou o laudo o marca como alterado (*, H, L, ↑, ↓,',
  '  "alterado"); false quando está dentro. Na dúvida (resultado qualitativo sem referência clara), false.',
  'Datas: em exame_laboratorial e no exame toxicológico, "data" é a data da COLETA (se não houver, a de emissão); nos',
  'demais exames, a data de realização. Use exatamente a data que consta no laudo, sem estimar.',
  'Estes campos são dados à parte: o "texto" continua sendo a transcrição na íntegra, sem nenhuma alteração.',
].join('\n');

export interface LeituraExame { itens: ItemExame[]; textoIncompleto: boolean; classificacao: ClasseExame; classificacaoOrigem: OrigemClasseExame }

/** A IA lê o PDF e devolve os documentos identificados, com o laudo na íntegra. */
export const lerExameComIA = async (arquivo: File, opcoes: OpcoesLeituraExame = {}): Promise<LeituraExame> => {
  exigirLimitePdf(arquivo.size, arquivo.name || 'O PDF');
  const r = await gerarComGemini({
    contexto: 'exame da IS (PDF)',
    instrucoes: [INSTRUCOES, INSTRUCOES_VALORES, instrucoesEnvioFicha(opcoes)].filter(Boolean).join('\n'),
    arquivos: [{ base64: await arquivoParaBase64IA(arquivo), mimeType: 'application/pdf' }],
    temperature: 0,
    maxOutputTokens: 32768,
    esquema: Schema => Schema.object({
      properties: {
        classificacao: Schema.enumString({ enum: [...CLASSES_EXAME] }),
        documentos: Schema.array({
          items: Schema.object({
            properties: {
              tipo: Schema.enumString({ enum: [...TIPOS_DOCUMENTO] }),
              titulo: Schema.string(), data: Schema.string(), emissor: Schema.string(), texto: Schema.string(),
              exameMinimo: Schema.string(), especialidade: Schema.string(),
              categoria: Schema.enumString({ enum: [...CATEGORIAS_ATESTADO] }),
              valores: Schema.array({ items: Schema.object({
                properties: {
                  nome: Schema.string(), valor: Schema.string(), referencia: Schema.string(),
                  referenciaOrigem: Schema.enumString({ enum: ['laudo', 'usual'] }), alterado: Schema.boolean(),
                },
                optionalProperties: ['referencia', 'referenciaOrigem', 'alterado'],
              }) }),
            },
            optionalProperties: ['data', 'emissor', 'exameMinimo', 'valores', 'especialidade', 'categoria'],
          }),
        }),
      },
      // Opcional: sem ela (ou com valor inválido) a classificação vem dos tipos dos itens — nunca bloqueia o envio.
      optionalProperties: ['classificacao'],
    }),
  });
  const leitura = lerJsonIA<LeituraExameIA>(r, 'A IA não conseguiu ler o PDF.');
  const itens = itensDaLeitura(leitura, opcoes.examesMinimos);
  if (!itens.length) throw new Error('Nenhum documento médico encontrado no PDF.');
  registrarUsoAcao('exame_ia');
  if (opcoes.classeEsperada) return { itens, textoIncompleto: r.cortada, classificacao: opcoes.classeEsperada, classificacaoOrigem: 'aba' };
  const { classe, origem } = classificarExame(leitura?.classificacao, itens);
  return { itens, textoIncompleto: r.cortada, classificacao: classe, classificacaoOrigem: origem };
};

/** Envia o PDF ao Storage e grava a leitura no Firestore. */
export const gravarExameIS = async (
  isId: string, arquivo: File, leitura: { itens: ItemExame[]; textoIncompleto: boolean; classificacao?: ClasseExame; classificacaoOrigem?: OrigemClasseExame }, usuario: { uid: string; usuario: string },
): Promise<string> => {
  const id = novoId();
  const caminho = `inspecoes/${isId}/exames/${id}.pdf`;
  const r = ref(getStorage(app), caminho);
  const classe = classificarExame(leitura.classificacao, leitura.itens);
  await uploadBytes(r, arquivo, { contentType: 'application/pdf' });
  try {
    await setDoc(doc(colecao(isId), id), {
      caminho, nomeArquivo: arquivo.name, bytes: arquivo.size, itens: leitura.itens, textoIncompleto: leitura.textoIncompleto,
      classificacao: classe.classe, classificacaoOrigem: leitura.classificacaoOrigem ?? classe.origem,
      enviadoPor: usuario, enviadoEm: serverTimestamp(),
    });
  } catch (e) {
    await deleteObject(r).catch(() => { /* fica órfão no Storage; não há o que fazer */ });
    throw e;
  }
  notificarAcao('is.examesEnviados', isId);
  // PDF enviado por médico numa IS Agendada → Conclusão pendente.
  void perfilDoUsuario(usuario.uid).then(perfil => avancarParaConclusaoPendente(isId, st => statusAposAtoMedico(st, perfil)));
  return id;
};

export const urlDoExame = (exame: Pick<ExameISDoc, 'caminho'>): Promise<string> => getDownloadURL(ref(getStorage(app), exame.caminho));

export const apagarExameIS = async (isId: string, exame: ExameISRecord): Promise<void> => {
  await deleteDoc(doc(colecao(isId), exame.id));
  await deleteObject(ref(getStorage(app), exame.caminho)).catch(() => { /* o documento já saiu da lista */ });
};

/** Nome do inspecionado (paciente/periciando) que consta no PDF; '' quando a IA não o encontra. */
export const identificarInspecionadoNoPdf = async (arquivo: File): Promise<string> => {
  exigirLimitePdf(arquivo.size, arquivo.name || 'O PDF');
  const r = await gerarComGemini({
    contexto: 'nome do inspecionado no PDF',
    instrucoes: 'Você recebe um PDF médico (exame, atestado, relatório ou laudo). Devolva "nome": o nome completo do PACIENTE a quem o documento se refere, '
      + 'exatamente como consta (sem posto, NIP ou título). Não use o nome do médico, do laboratório ou do solicitante. Se não houver, devolva "".',
    arquivos: [{ base64: await arquivoParaBase64IA(arquivo), mimeType: 'application/pdf' }],
    temperature: 0,
    maxOutputTokens: 256,
    esquema: Schema => Schema.object({ properties: { nome: Schema.string() } }),
  });
  return String(lerJsonIA<{ nome?: string }>(r, 'A IA não conseguiu ler o PDF.')?.nome ?? '').trim();
};
