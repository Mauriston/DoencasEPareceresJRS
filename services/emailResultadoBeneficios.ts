// Ficheiro: services/emailResultadoBeneficios.ts
// E-mail "RESULTADO DE IS FIM {finalidade} - {inspecionado}" do grupo Benefícios (servidor/email/resultadoBeneficios.ts;
// rota POST /api/email/resultado-beneficios — pacote B2): o app manda o modelo escolhido (sugerido pela IA e
// confirmado pelo usuário no dialog). `email` só quando o cadastro não tem e-mail (o servidor grava no cadastro).
import { ApiError, chamarServidor } from './apiClient';
import { registrarUsoAcao } from './usoDiario';
import { notificarAcao } from './notificacoesPush';
import type { ModeloResultadoBeneficios } from '../utils/resultadoBeneficiosIS';

export const enviarResultadoBeneficiosPorEmail = async (
  isId: string, modelo: ModeloResultadoBeneficios, email?: string,
): Promise<{ para: string; emailSalvo: boolean }> => {
  try {
    const r = await chamarServidor<{ para: string; emailSalvo: boolean }>('/api/email/resultado-beneficios', {
      isId, modelo, ...(email ? { email: email.trim() } : {}),
    });
    registrarUsoAcao('email_enviar');
    notificarAcao('is.emailResultado', isId);
    return { para: r.para, emailSalvo: !!r.emailSalvo };
  } catch (e) {
    if (e instanceof ApiError && e.status === 503) {
      throw new ApiError('negocio', 'A conta Google da JRS não está autorizada no servidor. Peça ao Admin para autorizá-la em Usuários.', 503);
    }
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError('negocio', 'O servidor ainda não tem o envio do resultado de Benefícios. Tente de novo após a próxima publicação.', 404);
    }
    throw e;
  }
};
