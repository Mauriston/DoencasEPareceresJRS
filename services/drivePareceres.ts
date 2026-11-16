// Ficheiro: services/drivePareceres.ts
// Geração e armazenamento do PDF do Pedido de Parecer: o servidor do app gera o PDF em HTML + CSS
// (servidor/documentos/pedidoParecer.ts) e o guarda no Firebase Storage em pareceres/{id}.pdf
// (POST /api/pareceres/pedido; servidor/documentos/pedidoParecerServico.ts), já com a assinatura certa — a do
// médico para quem a IS está agendada ou a de quem gera, se for médico (utils/pareceres.ts). Sem Apps Script nem
// Google Drive. O app grava o pedido no Firestore com o id e a URL devolvidos (services/firestorePareceres.ts).
// Pedidos antigos continuam com a URL do Drive.
import { chamarServidor } from './apiClient';
import { chamarGoogle } from './googleServidor';

export interface DadosPedidoParecer {
  inspecionado: string;
  especialidade: string;
  finalidade: string;
  historico: string;
  quesitos: string[];
  /** IS de onde o pedido sai (o perito dela pode assinar). */
  isId?: string;
}

export interface PedidoParecerGerado {
  id: string;
  caminho: string;
  pdfUrl: string;
  assinante: { uid: string; nome: string; origem: 'gerador' | 'perito' };
}

/** O servidor gera o PDF e o guarda no Storage; devolve o id do pedido, o caminho, a URL e quem assinou. */
export const gerarPedidoParecerNoServidor = async (dados: DadosPedidoParecer): Promise<PedidoParecerGerado> => {
  const d = await chamarServidor<PedidoParecerGerado & { success: boolean }>('/api/pareceres/pedido', { ...dados }, { timeoutMs: 90_000 });
  return { id: d.id, caminho: d.caminho, pdfUrl: d.pdfUrl, assinante: d.assinante };
};

/**
 * "Enviar para Impressão": o servidor (ou, sem a conta Google autorizada, o Apps Script) manda o PDF do pedido por e-mail para a impressão (Giorginis), a
 * partir da conta dona do script, com o nome de exibição do médico solicitante (ex.: "CT MAURISTON").
 */
export const enviarParecerParaImpressao = async (params: { pdfUrl: string; remetente: string }): Promise<void> => {
  await chamarGoogle<{ enviado: boolean }>('/api/impressao/parecer', 'enviarParecerImpressao', params);
};
