// Ficheiro: services/emailGuiasIS.ts
// Envio das guias de exames por e-mail (servidor/email/guiasIS.ts — pacote B1), pelo dialog
// components/inspecoes/guias/EnviarGuiasDialog:
//  - listarUsuariosSecretaria: POST /api/secretaria/usuarios → user_secretaria ativos com e-mail institucional
//    (as caixas do dialog mostram o `usuario`, nunca o e-mail);
//  - enviarGuiasPorEmail: POST /api/email/guias-is → ao inspecionado (PDF anexo) e/ou aos membros da SEC-JRS
//    escolhidos. Enviado ao inspecionado, o servidor marca a entrega (via e-mail) e Aberta → Realizando Exames.
import { ApiError, chamarServidor } from './apiClient';
import { extrairUsuariosSecretaria, type UsuarioSecretaria } from '../utils/guiasExamesIS';

export type { UsuarioSecretaria };

const erroServidor = (e: unknown, oQue: string): never => {
  if (e instanceof ApiError && e.status === 503) {
    throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
  }
  if (e instanceof ApiError && e.status === 404) {
    throw new ApiError('negocio', `O servidor ainda não tem ${oQue}. Tente de novo após a próxima publicação.`, 404);
  }
  throw e;
};

let cacheSecretaria: Promise<UsuarioSecretaria[]> | null = null;
export const listarUsuariosSecretaria = (): Promise<UsuarioSecretaria[]> => {
  if (!cacheSecretaria) {
    cacheSecretaria = chamarServidor<Record<string, unknown>>('/api/secretaria/usuarios', {})
      .then(extrairUsuariosSecretaria)
      .catch(e => { cacheSecretaria = null; return erroServidor(e, 'a lista da Secretaria'); });
  }
  return cacheSecretaria;
};

export interface PedidoEmailGuias {
  isId: string;
  inspecionado: boolean;
  /** Só quando o cadastro não tem e-mail (o servidor grava no cadastro). */
  email?: string;
  secretariaUids: string[];
}

export interface RespostaEmailGuias { paraInspecionado?: string; paraSecretaria: string[]; emailSalvo: boolean }

export const enviarGuiasPorEmail = async (p: PedidoEmailGuias): Promise<RespostaEmailGuias> => {
  try {
    const r = await chamarServidor<RespostaEmailGuias & { success: boolean }>('/api/email/guias-is', {
      isId: p.isId, inspecionado: p.inspecionado, secretariaUids: p.secretariaUids,
      ...(p.inspecionado && p.email ? { email: p.email.trim() } : {}),
    });
    return { paraInspecionado: r.paraInspecionado, paraSecretaria: r.paraSecretaria ?? [], emailSalvo: !!r.emailSalvo };
  } catch (e) {
    return erroServidor(e, 'o envio das guias por e-mail');
  }
};
