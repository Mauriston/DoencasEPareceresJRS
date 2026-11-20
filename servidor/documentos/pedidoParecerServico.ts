// Ficheiro: servidor/documentos/pedidoParecerServico.ts
// Pedido de Parecer gerado e guardado pelo servidor (Admin SDK), sem o Apps Script nem o Google Drive:
//  - a assinatura é resolvida aqui, a partir do Firestore (não confia no cliente): a do médico para quem a IS
//    está agendada (inspecoes/{isId}.peritoUid → usuarios/{uid}); se quem gera for médico, a de quem gera
//    (utils/pareceres.ts → assinanteDoPedido);
//  - o PDF (pedidoParecer.ts → Chromium) vai para o Storage em pareceres/{id}.pdf, com token de download, e a
//    rota devolve o id do pedido, o caminho e a URL — o app grava o pedido no Firestore (services/firestorePareceres.ts).
// Rota em server.ts: POST /api/pareceres/pedido (perfis médicos).
import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type { Bucket } from './guiasExames/servico';
import { contentDisposition, nomeArquivoDocumento } from '../../utils/nomeArquivoDocumento';
import { assinanteDoPedido, caminhoPedidoParecer, urlDownloadStorage, type DadosAssinante } from '../../utils/pareceres';

/** Erro de validação: vira 400/404 na rota, com a mensagem para o usuário. */
export class ErroPedidoParecer extends Error {
  constructor(public status: 400 | 404, message: string) { super(message); }
}

export interface CorpoPedidoParecer {
  inspecionado: string;
  especialidade: string;
  finalidade: string;
  historico: string;
  quesitos: string[];
  /** IS de onde o pedido sai (opcional): dá o perito para a assinatura. */
  isId?: string;
}

export interface PedidoParecerSalvo {
  id: string;
  caminho: string;
  pdfUrl: string;
  assinante: { uid: string; nome: string; origem: 'gerador' | 'perito' };
}

const idDaIs = (v: unknown) => String(v ?? '').replace(/\D/g, '').replace(/^0+(?=\d)/, '');

const lerUsuario = async (db: Firestore, uid: string): Promise<DadosAssinante | null> => {
  if (!uid) return null;
  const s = await db.collection('usuarios').doc(uid).get();
  if (!s.exists) return null;
  const u = s.data() as Record<string, unknown>;
  const t = (k: string) => String(u[k] ?? '').trim();
  return { uid, perfil: t('perfil'), nome: t('nome'), postoGraduacao: t('postoGraduacao'), cargo: t('cargo'), crmPe: t('crmPe'), rqe: t('rqe') };
};

export const gerarPedidoParecer = async (
  db: Firestore, bucket: Bucket, nomeBucket: string, uid: string, corpo: CorpoPedidoParecer,
): Promise<PedidoParecerSalvo> => {
  const gerador = await lerUsuario(db, uid);
  if (!gerador) throw new ErroPedidoParecer(404, 'Usuário não encontrado.');

  let perito: DadosAssinante | null = null;
  let snapIsNumero: unknown = '';
  const isId = idDaIs(corpo.isId);
  if (isId) {
    const snapIs = await db.collection('inspecoes').doc(isId).get();
    if (!snapIs.exists) throw new ErroPedidoParecer(404, 'IS não encontrada.');
    perito = await lerUsuario(db, String((snapIs.data() as { peritoUid?: string }).peritoUid ?? ''));
    snapIsNumero = (snapIs.data() as { is?: unknown }).is ?? '';
  }
  const { assinante, origem } = assinanteDoPedido(gerador, perito);

  const { docPedidoParecer } = await import('./pedidoParecer');
  const { htmlParaPdf } = await import('./gerarPdf');
  const pdf = await htmlParaPdf(docPedidoParecer({
    inspecionado: corpo.inspecionado, especialidade: corpo.especialidade, finalidade: corpo.finalidade,
    historico: corpo.historico, quesitos: corpo.quesitos,
    nomeUsuario: assinante.nome ?? '', postoGraduacao: assinante.postoGraduacao ?? '', cargo: assinante.cargo ?? '',
    crmPe: assinante.crmPe ?? '', rqe: assinante.rqe ?? '',
  }));

  const id = randomUUID();
  const caminho = caminhoPedidoParecer(id);
  const token = randomUUID();
  await bucket.file(caminho).save(pdf, {
    contentType: 'application/pdf', resumable: false,
    metadata: {
      contentType: 'application/pdf',
      contentDisposition: contentDisposition(nomeArquivoDocumento({ tipo: 'PEDIDO_DE_PARECER', nome: corpo.inspecionado, is: snapIsNumero, carimbo: true })),
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  return { id, caminho, pdfUrl: urlDownloadStorage(nomeBucket, caminho, token), assinante: { uid: assinante.uid, nome: assinante.nome ?? '', origem } };
};
