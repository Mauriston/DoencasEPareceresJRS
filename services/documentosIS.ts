// Ficheiro: services/documentosIS.ts
// Documentos gerados a partir de uma IS ("Gerar Documento ▾" da Ficha): POST /api/inspecoes/documentos/gerar
// (servidor/documentos/is/) e a leitura dos registros em inspecoes/{isId}/documentos (aba Outros da Ficha).
import { getFirestore, collection, collectionGroup, query, where, orderBy, limit, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseAuth';
import { chamarServidor } from './apiClient';
import { SUBCOL_DOCUMENTOS_IS, type TipoDocumentoIS } from '../utils/documentosIS';

const db = getFirestore(app);

export interface PedidoDocumentoIS {
  isId: string;
  tipo: TipoDocumentoIS;
  /** Campos do formulário do tipo (validados no servidor pelo gerador). */
  dados: Record<string, unknown>;
  enviarEmail: boolean;
  /** Só Admin: IS fictícia, PDF em testes/ (apagado em 30 min), sem registro nem e-mail. */
  teste?: boolean;
}

export interface DocumentoISGerado {
  id: string;
  tipo: TipoDocumentoIS;
  titulo: string;
  caminho: string;
  pdfUrl: string;
  assinante: { uid: string; nome: string; origem: 'gerador' | 'presidente' };
  emailEnviado: boolean;
  emailPara?: string[];
  erroEmail?: string;
}

export const gerarDocumentoIS = async (p: PedidoDocumentoIS): Promise<DocumentoISGerado> => {
  const r = await chamarServidor<{ success: boolean } & DocumentoISGerado>('/api/inspecoes/documentos/gerar', p);
  const { success: _ok, ...doc } = r;
  return doc;
};

/** Registro de um documento gerado (inspecoes/{isId}/documentos/{id}). */
export interface RegistroDocumentoIS {
  id: string;
  isId: string;
  is: number | string;
  tipo: TipoDocumentoIS;
  titulo: string;
  resumo: string;
  pdfUrl: string;
  assinanteNome: string;
  emailEnviado: boolean;
  criadoEmMs: number;
}

export const observarDocumentosDaIS = (isId: string, cb: (l: RegistroDocumentoIS[]) => void, onErro?: (e: Error) => void) =>
  onSnapshot(collection(db, 'inspecoes', isId, SUBCOL_DOCUMENTOS_IS), snap => cb(snap.docs.map(s => {
    const x = s.data();
    return {
      id: s.id, isId, is: x.is ?? isId, tipo: x.tipo, titulo: String(x.titulo || 'Documento'), resumo: String(x.resumo || ''),
      pdfUrl: String(x.pdfUrl || ''), assinanteNome: String(x.assinante?.nome || ''), emailEnviado: !!x.emailEnviado,
      criadoEmMs: Number(x.criadoEmMs) || 0,
    };
  }).sort((a, b) => b.criadoEmMs - a.criadoEmMs)), e => onErro?.(e));

/** Janela dos documentos de IS na Início da Secretaria (mesma validade da fila de impressão: 24 h). */
export const HORAS_RECENTES_DOCUMENTOS_IS = 24;

/** Documentos gerados em TODAS as IS nas últimas 24 h (collectionGroup; índice em firestore.indexes.json), mais recentes primeiro. */
export const observarDocumentosISRecentes = (cb: (l: RegistroDocumentoIS[]) => void, max = 50, onErro?: (e: Error) => void) =>
  onSnapshot(
    query(collectionGroup(db, SUBCOL_DOCUMENTOS_IS),
      where('criadoEmMs', '>=', Date.now() - HORAS_RECENTES_DOCUMENTOS_IS * 3600 * 1000), orderBy('criadoEmMs', 'desc'), limit(max)),
    snap => cb(snap.docs.filter(s => s.ref.parent.parent?.parent.id === 'inspecoes').map(s => {
      const x = s.data();
      const isId = s.ref.parent.parent!.id;
      return {
        id: s.id, isId, is: x.is ?? isId, tipo: x.tipo, titulo: String(x.titulo || 'Documento'), resumo: String(x.resumo || ''),
        pdfUrl: String(x.pdfUrl || ''), assinanteNome: String(x.assinante?.nome || ''), emailEnviado: !!x.emailEnviado,
        criadoEmMs: Number(x.criadoEmMs) || 0,
      };
    })),
    e => { console.error('Falha ao ler documentos das IS:', e); onErro?.(e); },
  );

/** Abre o PDF em NOVA aba do navegador. */
export const abrirPdfNovaAba = (url: string) => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); };

// ── Administração › Templates de documentos: ajustes em config/documentosIS.{tipo} (utils/ajustesDocumentosIS.ts).
export const observarAjustesDocumentosIS = (cb: (cru: Record<string, Record<string, unknown>>) => void, onErro?: (e: Error) => void) =>
  onSnapshot(doc(db, 'config', 'documentosIS'), s => cb((s.data() || {}) as Record<string, Record<string, unknown>>), e => onErro?.(e));

/** Grava os ajustes de UM tipo (merge; os outros tipos ficam). */
export const salvarAjustesDocumentoIS = (tipo: TipoDocumentoIS, ajustes: Record<string, string>, usuario: string) =>
  setDoc(doc(db, 'config', 'documentosIS'), { [tipo]: { ...ajustes, alteradoPor: usuario, alteradoEm: serverTimestamp() } }, { merge: true });

/** Gera o PDF de teste (só Admin; dados fictícios; apagado em 30 min). */
export const gerarDocumentoISTeste = (tipo: TipoDocumentoIS) => gerarDocumentoIS({ isId: '', tipo, dados: {}, enviarEmail: false, teste: true });
