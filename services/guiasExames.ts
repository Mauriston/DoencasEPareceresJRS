// Ficheiro: services/guiasExames.ts
// Guias de exames da IS geradas no servidor (servidor/documentos/guiasExames/ — pacote A):
//  - gerarGuiasExames: POST /api/documentos/guias-exames → PDF único em Storage
//    inspecoes/{isId}/guias/guias-exames.pdf e o campo `guiasExames` na IS (o servidor recalcula os exames);
//  - apagarGuiasExames: POST /api/documentos/guias-exames/apagar (ao apagar a IS; só Admin; best effort);
//  - entrega das guias (caixa "Guias entregues ao inspecionado?") fica em services/firestoreInspecoes.ts.
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { app } from './firebaseAuth';
import { ApiError, chamarServidor } from './apiClient';
import type { SexoInspecionado } from './firestoreMilitares';
import type { GuiasExamesIS } from './firestoreInspecoes';

/** Caminho do PDF das guias no Storage. */
export const caminhoGuiasExames = (isId: string): string => `inspecoes/${isId}/guias/guias-exames.pdf`;

/** URL do PDF das guias (sem cache: o PDF pode ser gerado de novo). A equipe lê (storage.rules). */
export const urlDasGuias = (caminho: string): Promise<string> => getDownloadURL(ref(getStorage(app), caminho));

export interface ResultadoGuias {
  gerado: boolean;
  /** Metadados gravados na IS (sem Timestamp). */
  guias?: Omit<GuiasExamesIS, 'geradoEm'> & { geradoEm?: unknown };
  /** Por que não gerou (finalidade sem exames mínimos, só Biometria/Oftalmologia geral…). */
  motivo?: string;
}

export interface PedidoGuias {
  isId: string;
  sexo?: SexoInspecionado;
  /** AAAA-MM-DD */
  dataNascimento?: string;
  /** Finalidade do Anexo O equivalente (quando o nome da finalidade da IS não é o do Anexo O; ver guiasExamesIA). */
  finalidadeAnexoO?: string;
}

/** Gera (ou gera de novo) as guias da IS. A geração com imagens pode levar alguns segundos. */
export const gerarGuiasExames = async (p: PedidoGuias): Promise<ResultadoGuias> => {
  try {
    const r = await chamarServidor<ResultadoGuias & { success: boolean }>('/api/documentos/guias-exames', {
      isId: p.isId,
      ...(p.sexo ? { sexo: p.sexo } : {}),
      ...(p.dataNascimento ? { dataNascimento: p.dataNascimento } : {}),
      ...(p.finalidadeAnexoO ? { finalidadeAnexoO: p.finalidadeAnexoO } : {}),
    }, { timeoutMs: 90_000 });
    return { gerado: !!r.gerado, guias: r.guias, motivo: r.motivo };
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError('negocio', 'O servidor ainda não gera as guias. Tente de novo após a próxima publicação.', 404);
    }
    throw e;
  }
};

/** Apaga o PDF e zera `guiasExames` (ao apagar a IS). Nunca lança. */
export const apagarGuiasExames = async (isId: string): Promise<void> => {
  try { await chamarServidor('/api/documentos/guias-exames/apagar', { isId }, { timeoutMs: 15_000 }); } catch { /* best effort */ }
};
