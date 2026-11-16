// Ficheiro: services/emailDocumentoIS.ts
// "Zimbra SEC-JRS" da Ficha do inspecionado (abas Exames e Atestados e Laudos): POST /api/email/documento-is
// (servidor/email/documentoIS.ts) envia o PDF do documento da IS aos membros da SEC-JRS escolhidos, para
// impressão. A lista da Secretaria é a mesma das guias (services/emailGuiasIS.ts → listarUsuariosSecretaria).
import { ApiError, chamarServidor } from './apiClient';

export { listarUsuariosSecretaria, type UsuarioSecretaria } from './emailGuiasIS';

export interface PedidoEmailDocumento { isId: string; exameId: string; secretariaUids: string[] }

export const enviarDocumentoSecretaria = async (p: PedidoEmailDocumento): Promise<{ paraSecretaria: string[] }> => {
  try {
    const r = await chamarServidor<{ success: boolean; paraSecretaria?: string[] }>('/api/email/documento-is', {
      isId: p.isId, exameId: p.exameId, secretariaUids: p.secretariaUids,
    });
    return { paraSecretaria: r.paraSecretaria ?? [] };
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) {
      throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    }
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError('negocio', 'O servidor ainda não tem o envio de documentos à SEC-JRS. Tente de novo após a próxima publicação.', 404);
    }
    throw e;
  }
};
