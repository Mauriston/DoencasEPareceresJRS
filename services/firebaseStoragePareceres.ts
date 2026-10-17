// Ficheiro: services/firebaseStoragePareceres.ts
// Geração e armazenamento do PDF do Pedido de Parecer: o Apps Script
// standalone (CodeConcursos.gs, ação "gerarPedidoParecer") preenche o template
// do Google Docs e devolve o PDF em base64; o app o envia ao Storage
// (pareceres/{id}.pdf — regra em storage.rules).
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './firebaseAuth';
import { GAS_URL_CONCURSOS } from '../config/endpoints';

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
  const res = await fetch(GAS_URL_CONCURSOS, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'gerarPedidoParecer', ...dados }),
  });
  const json = await res.json();
  if (!json.sucesso) throw new Error(json.erro || 'Erro ao gerar o pedido de parecer.');
  return json.dados.pdfBase64 as string;
};

export const enviarPdfParecer = async (id: string, pdfBase64: string): Promise<string> => {
  if (!getAuth(app).currentUser) throw new Error('Sessão expirada. Faça login novamente.');
  if (Math.ceil((pdfBase64.length * 3) / 4) > MAX_BYTES) throw new Error('O PDF gerado é maior que o permitido.');
  const r = ref(getStorage(app), `pareceres/${id}.pdf`);
  await uploadString(r, pdfBase64, 'base64', { contentType: 'application/pdf' });
  return getDownloadURL(r);
};

export const removerPdfParecer = async (id: string): Promise<void> => {
  try { await deleteObject(ref(getStorage(app), `pareceres/${id}.pdf`)); } catch { /* best-effort */ }
};
