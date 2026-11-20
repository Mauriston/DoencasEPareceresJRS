// Ficheiro: servidor/documentos/nomeArquivo.ts
// Nome do PDF no download do servidor (POST /api/arquivos/baixar): o do metadado contentDisposition do objeto
// (gravado na geração); nos PDFs antigos, sem o metadado, monta pelo registro da IS (guias e documentos da IS).
import type { Firestore } from 'firebase-admin/firestore';
import { nomeArquivoDocumento, nomeDoContentDisposition, TIPO_ARQUIVO_DOCUMENTO_IS, TIPOS_COM_CARIMBO } from '../../utils/nomeArquivoDocumento';

export const nomeArquivoDoObjeto = async (
  db: Firestore | null, caminho: string, meta: { contentDisposition?: string; timeCreated?: string },
): Promise<string> => {
  const doMeta = nomeDoContentDisposition(meta.contentDisposition);
  if (doMeta) return doMeta;
  if (!db) return '';
  try {
    const guias = /^inspecoes\/([^/]+)\/guias\/guias-exames\.pdf$/.exec(caminho);
    const doc = /^inspecoes\/([^/]+)\/documentos\/([A-Za-z]+)-[^/]+\.pdf$/.exec(caminho);
    const isId = guias?.[1] ?? doc?.[1];
    if (!isId) return '';
    const is = (await db.collection('inspecoes').doc(isId).get()).data() as { is?: unknown; inspecionado?: unknown } | undefined;
    if (!is) return '';
    const tipo = guias ? 'GUIA_DE_EXAMES' : TIPO_ARQUIVO_DOCUMENTO_IS[doc![2]];
    if (!tipo) return '';
    const criado = meta.timeCreated ? new Date(meta.timeCreated) : null;
    const carimbo = TIPOS_COM_CARIMBO.includes(tipo) ? (criado && !isNaN(+criado) ? criado : true) : false;
    return nomeArquivoDocumento({ tipo, nome: is.inspecionado, is: is.is ?? isId, carimbo });
  } catch {
    return '';
  }
};
