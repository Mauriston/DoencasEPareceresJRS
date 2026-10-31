// Ficheiro: services/driveConcursos.ts
// PDFs dos concursos no Google Drive (drive compartilhado, pasta raiz CONCURSOS):
//   CONCURSOS > {ano} > {concurso} > CANDIDATOS > {candidato} (termos, pedidos de parecer e exames)
//                                  > MENSAGENS (PDF das mensagens administrativas)
// Quem cria as pastas e os arquivos é o Apps Script standalone (CodeConcursos.gs); este módulo só o
// chama e devolve as URLs, que o app grava no Firestore. A leitura da mensagem (transcrição + dados) é
// feita pelo Gemini, também por esse script.
import { chamarScript as chamarScriptApi } from './apiClient';
import { removerPdfDoStorage } from './firebaseStorageConcursos';
import { normalizarExamesExtraidos, type ExamesExtraidos } from '@/utils/examesCandidato';

const MAX_PDF_BYTES = 15 * 1024 * 1024;
/**
 * Exames: o PDF vai inteiro no corpo da chamada ao Gemini, em base64 (que
 * cresce ~33%), e a requisição da API não passa de 20 MB. 12 MB de PDF é o
 * maior tamanho que cabe com folga — acima disso é melhor dividir o PDF em
 * dois (cada envio fica guardado, nada é sobrescrito).
 */
const MAX_PDF_EXAMES_BYTES = 12 * 1024 * 1024;

/** Tipos de documento gravados na pasta do candidato (prefixo do nome do arquivo). */
export type TipoDocumentoCandidato = 'termoRecurso' | 'termoCientificacao' | 'solicitacaoParecer' | 'solicitacaoExames';

/** Concurso no Drive: pasta do ano + pasta com o nome do concurso. */
export interface PastaConcurso { nome: string; ano: number | string }

/** Ano da pasta de um concurso já existente: o do cadastro (criadoEm, ISO); sem ele, o ano atual. */
export const anoDoConcurso = (criadoEm?: string): number => {
  const ano = Number((criadoEm || '').slice(0, 4));
  return ano >= 2000 ? ano : new Date().getFullYear();
};

/** Chamada autenticada ao Apps Script (ver services/apiClient.ts: token, timeout e envelope). */
export const chamarScript = <T>(action: string, dados: Record<string, unknown>): Promise<T> =>
  chamarScriptApi<T>(action, dados, { mensagemRede: 'Não foi possível falar com o Google Drive. Verifique sua conexão e tente novamente.' });

const arquivoParaBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
  reader.readAsDataURL(file);
});

const exigirTamanho = (bytes: number) => {
  if (bytes > MAX_PDF_BYTES) {
    throw new Error(`O arquivo tem ${(bytes / (1024 * 1024)).toFixed(1)} MB — acima do limite de ${MAX_PDF_BYTES / (1024 * 1024)} MB. Tente um PDF menor.`);
  }
};

const exigirTamanhoExames = (bytes: number) => {
  if (bytes > MAX_PDF_EXAMES_BYTES) {
    throw new Error(`O PDF tem ${(bytes / (1024 * 1024)).toFixed(1)} MB — acima do limite de ${MAX_PDF_EXAMES_BYTES / (1024 * 1024)} MB para leitura dos exames. Divida os exames em dois PDFs e envie um por vez.`);
  }
};

/** Maior PDF de exames aceito, em MB (usado no texto da tela de envio). */
export const LIMITE_PDF_EXAMES_MB = MAX_PDF_EXAMES_BYTES / (1024 * 1024);

/** Dados da mensagem administrativa lidos pelo Gemini (ver PROMPT_MENSAGEM_CONCURSO em CodeConcursos.gs). */
export interface MensagemExtraida {
  dataHora: string;
  remetente: string;
  destinatario: string;
  info: string;
  assunto: string;
  texto: string;
  nomeConcurso: string;
  mensagemDeAgendamento: boolean;
  periodoJRS: { inicio: string; fim: string } | null;
  candidatos: { matricula: string; nome: string; dataAgendamento: string }[];
}

/** O Gemini lê o PDF (ou imagem) da mensagem e devolve os dados em JSON. */
export const extrairMensagemComGemini = async (file: File): Promise<MensagemExtraida> => {
  exigirTamanho(file.size);
  const d = await chamarScript<Partial<MensagemExtraida>>('extrairMensagemConcurso', {
    pdfBase64: await arquivoParaBase64(file),
    mimeType: file.type || 'application/pdf',
  });
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  return {
    dataHora: texto(d.dataHora).toUpperCase(),
    remetente: texto(d.remetente),
    destinatario: texto(d.destinatario),
    info: texto(d.info),
    assunto: texto(d.assunto),
    texto: texto(d.texto),
    nomeConcurso: texto(d.nomeConcurso),
    mensagemDeAgendamento: d.mensagemDeAgendamento === true,
    periodoJRS: d.periodoJRS && /^\d{4}-\d{2}-\d{2}$/.test(d.periodoJRS.inicio || '') && /^\d{4}-\d{2}-\d{2}$/.test(d.periodoJRS.fim || '')
      ? { inicio: d.periodoJRS.inicio, fim: d.periodoJRS.fim }
      : null,
    candidatos: Array.isArray(d.candidatos)
      ? d.candidatos.map(c => ({
        matricula: texto(c?.matricula),
        nome: texto(c?.nome).toUpperCase(),
        dataAgendamento: /^\d{4}-\d{2}-\d{2}$/.test(texto(c?.dataAgendamento)) ? texto(c?.dataAgendamento) : '',
      }))
      : [],
  };
};

/** Cria (se ainda não existir) ano > concurso > CANDIDATOS e MENSAGENS. Não bloqueia quem chama em caso de falha. */
export const criarEstruturaConcursoNoDrive = async (pasta: PastaConcurso): Promise<void> => {
  try {
    await chamarScript('criarEstruturaConcurso', { ano: pasta.ano, nomeConcurso: pasta.nome });
  } catch {
    // A estrutura também é criada, sob demanda, ao gravar o primeiro arquivo.
  }
};

/** Grava o PDF da mensagem na pasta MENSAGENS do concurso; devolve a URL de visualização. */
export const salvarMensagemNoDrive = async (pasta: PastaConcurso, file: File): Promise<string> => {
  exigirTamanho(file.size);
  const d = await chamarScript<{ url: string }>('salvarMensagemPdf', {
    ano: pasta.ano,
    nomeConcurso: pasta.nome,
    nomeArquivo: file.name,
    pdfBase64: await arquivoParaBase64(file),
  });
  return d.url;
};

/** Grava um PDF (base64) na pasta do candidato; devolve a URL de download direto. */
export const salvarPdfCandidatoNoDrive = async (params: {
  pasta: PastaConcurso;
  candidatoId: string;
  candidatoNome: string;
  tipo: TipoDocumentoCandidato;
  pdfBase64: string;
}): Promise<string> => {
  exigirTamanho(Math.ceil((params.pdfBase64.length * 3) / 4));
  const d = await chamarScript<{ url: string }>('salvarPdfCandidato', {
    ano: params.pasta.ano,
    nomeConcurso: params.pasta.nome,
    candidatoId: params.candidatoId,
    candidatoNome: params.candidatoNome,
    tipoDocumento: params.tipo,
    pdfBase64: params.pdfBase64,
  });
  return d.url;
};

/** Resultado do envio do PDF de exames: o arquivo já está no Drive mesmo quando a leitura do Gemini falha. */
export interface EnvioExamesResultado {
  url: string;
  fileId: string;
  nomeArquivo: string;
  dados: ExamesExtraidos | null;
  /** Motivo da falha da transcrição (vazio quando deu tudo certo). */
  erroExtracao: string;
}

/**
 * Grava o PDF dos exames na pasta do candidato (CONCURSOS > ano > concurso >
 * CANDIDATOS > candidato, a mesma lógica dos termos e das solicitações) com o
 * nome EXAMES_NOME_DO_CANDIDATO.pdf e devolve, no mesmo passo, a transcrição
 * dos laudos feita pelo Gemini. A leitura do PDF é demorada (é um documento
 * escaneado com vários laudos), por isso tudo vai numa única chamada: o PDF
 * sobe uma vez só.
 */
export const enviarExamesCandidatoParaDrive = async (params: {
  pasta: PastaConcurso;
  candidatoId: string;
  candidatoNome: string;
  file: File;
}): Promise<EnvioExamesResultado> => {
  exigirTamanhoExames(params.file.size);
  const d = await chamarScript<{ url: string; fileId: string; nomeArquivo: string; dados: unknown; erroExtracao?: string }>('salvarExamesCandidato', {
    ano: params.pasta.ano,
    nomeConcurso: params.pasta.nome,
    candidatoId: params.candidatoId,
    candidatoNome: params.candidatoNome,
    pdfBase64: await arquivoParaBase64(params.file),
    mimeType: params.file.type || 'application/pdf',
  });
  return {
    url: d.url || '',
    fileId: d.fileId || '',
    nomeArquivo: d.nomeArquivo || '',
    dados: d.dados ? normalizarExamesExtraidos(d.dados) : null,
    erroExtracao: typeof d.erroExtracao === 'string' ? d.erroExtracao : '',
  };
};

const idDoArquivoDrive = (url: string): string | null => {
  if (!/^https:\/\/drive\.google\.com\//.test(url)) return null;
  return url.match(/[?&]id=([\w-]+)/)?.[1] ?? url.match(/\/d\/([\w-]+)/)?.[1] ?? null;
};

/**
 * Apaga um PDF a partir da URL gravada no Firestore (best-effort): arquivo do Drive vai para a lixeira;
 * URL do Firebase Storage (documentos antigos) é apagada do Storage.
 */
export const removerPdfPorUrl = async (url: string): Promise<void> => {
  if (!url) return;
  const fileId = idDoArquivoDrive(url);
  try {
    if (fileId) await chamarScript('removerArquivoDrive', { fileId });
    else await removerPdfDoStorage(url);
  } catch {
    // silencioso: o link no Firestore é limpo de qualquer forma
  }
};

/** Converte uma URL de download direto do Drive (uc?export=download&id=…) em URL de visualização; as demais ficam como estão. */
export const urlVisualizacao = (url: string): string => {
  const id = url.match(/^https:\/\/drive\.google\.com\/uc\?(?:[^#]*&)?id=([\w-]+)/)?.[1];
  return id ? `https://drive.google.com/file/d/${id}/view` : url;
};

/** Converte uma URL do Drive na de download direto (uc?export=download); as demais ficam como estão. */
export const urlDownload = (url: string): string => {
  const id = idDoArquivoDrive(url);
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
};

/** Abre o PDF numa nova janela (URL "view" do Drive; PDFs antigos do Storage abrem como estão). */
export const abrirPdf = (url: string): void => {
  window.open(urlVisualizacao(url), '_blank', 'noopener,noreferrer');
};

/**
 * Envio automático (sem confirmação) do Termo de Recurso + Cientificação recém-gerado para a impressão
 * (Giorginis, com cópia para a Secretaria), com o nome de exibição e a assinatura do médico que gerou o termo.
 */
export const enviarTermoRecursoParaImpressao = async (params: {
  pdfUrl: string; candidatoId: string; candidatoNome: string; nomeConcurso: string; remetente: string;
}): Promise<void> => {
  await chamarScript<{ enviado: boolean }>('enviarTermoRecursoImpressao', params);
};

/** Envio automático (sem confirmação) de uma Solicitação de Parecer ou de Exames recém-gerada para a impressão. */
export const enviarSolicitacaoParaImpressao = async (params: { pdfUrl: string; tipo: 'parecer' | 'exames'; remetente: string }): Promise<void> => {
  await chamarScript<{ enviado: boolean }>('enviarSolicitacaoConcursoImpressao', params);
};
