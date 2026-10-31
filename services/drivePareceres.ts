// Ficheiro: services/drivePareceres.ts
// Geração e armazenamento do PDF do Pedido de Parecer: o Apps Script standalone (CodeConcursos.gs, ação
// "gerarPedidoParecer") preenche o template do Google Docs e devolve o PDF em base64; o app o entrega ao
// mesmo script (ação "salvarPdfParecer"), que o guarda no Google Drive em
// PARECERES > {nome completo do inspecionado} > SOL_PARECER_{especialidade}_{DDMMMAAAA}.PDF, e grava no
// Firestore a URL de visualização ("view") devolvida.
import { chamarScript } from './apiClient';

const MAX_BYTES = 10 * 1024 * 1024;

export interface DadosPedidoParecer {
  inspecionado: string;
  especialidade: string;
  finalidade: string;
  historico: string;
  quesitos: string[];
  nomeUsuario: string;
  postoGraduacao: string;
  cargo: string;
  crmPe: string;
}

export const gerarPdfPedidoParecer = async (dados: DadosPedidoParecer): Promise<string> => {
  const d = await chamarScript<{ pdfBase64: string }>('gerarPedidoParecer', { ...dados });
  return d.pdfBase64;
};

/** Guarda o PDF no Drive (pasta do inspecionado dentro de PARECERES) e devolve a URL de visualização ("view"). */
export const salvarPdfParecerNoDrive = async (params: { nomeInspecionado: string; especialidade: string; pdfBase64: string }): Promise<string> => {
  if (Math.ceil((params.pdfBase64.length * 3) / 4) > MAX_BYTES) throw new Error('O PDF gerado é maior que o permitido.');
  const d = await chamarScript<{ url: string }>('salvarPdfParecer', params);
  return d.url;
};

/**
 * "Enviar para Impressão": o Apps Script manda o PDF do pedido por e-mail para a impressão (Giorginis), a
 * partir da conta dona do script, com o nome de exibição do médico solicitante (ex.: "CT MAURISTON").
 */
export const enviarParecerParaImpressao = async (params: { pdfUrl: string; remetente: string }): Promise<void> => {
  await chamarScript<{ enviado: boolean }>('enviarParecerImpressao', params);
};
