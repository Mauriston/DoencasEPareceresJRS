// Ficheiro: services/resultadoBeneficiosIA.ts
// Sugestão, por IA (Gemini via Firebase AI Logic — services/geminiAI.ts), do modelo do e-mail de resultado de
// Benefícios: lê o laudo/conclusão registrados na IS (várias finalidades numa IS; basta uma de enquadramento)
// e o tipo do inspecionado no cadastro (militar inativo × dependente/pensionista/servidor civil).
// A resposta é um enum (nao_enquadramento | enquadramento_militar | enquadramento_nao_militar) com justificativa
// curta; militar × não militar é confirmado pelo cadastro (ajustarModeloPeloCadastro). O usuário pode trocar o
// modelo no dialog antes de enviar. Minimização (LGPD): sem nome, NIP nem OM (utils/resultadoBeneficiosIS.ts).
import { gerarComGemini, lerJsonIA } from './geminiAI';
import { postoDoInspecionado } from './destinatariosIA';
import type { InspecaoRecord } from './firestoreInspecoes';
import type { MilitarRecord } from './firestoreMilitares';
import {
  MODELOS_RESULTADO_BENEFICIOS, ajustarModeloPeloCadastro, categoriaDoInspecionado, descricaoCategoria, ehModeloResultadoBeneficios,
  instrucoesModeloBeneficios, type ModeloResultadoBeneficios,
} from '../utils/resultadoBeneficiosIS';

export interface SugestaoModeloBeneficios { modelo: ModeloResultadoBeneficios; justificativa: string }

export const sugerirModeloResultadoBeneficios = async (
  is: Pick<InspecaoRecord, 'finalidade' | 'laudo' | 'restricoes' | 'observacoes' | 'inspecionado'>,
  militar?: Pick<MilitarRecord, 'tipo' | 'pgq' | 'rm1' | 'refo'> | null,
): Promise<SugestaoModeloBeneficios> => {
  const r = await gerarComGemini({
    contexto: 'modelo do e-mail de resultado de Benefícios',
    instrucoes: instrucoesModeloBeneficios({
      finalidade: is.finalidade, laudo: is.laudo || '', restricoes: is.restricoes, observacoes: is.observacoes,
      inspecionado: descricaoCategoria(militar), posto: militar?.pgq || postoDoInspecionado(is.inspecionado || ''),
    }),
    arquivos: [],
    temperature: 0,
    esquema: S => S.object({
      properties: {
        modelo: S.enumString({ enum: [...MODELOS_RESULTADO_BENEFICIOS] }),
        justificativa: S.string(),
      },
    }),
  });
  const j = lerJsonIA<{ modelo?: string; justificativa?: string }>(r, 'A IA devolveu uma resposta inválida. Escolha o modelo.');
  if (!ehModeloResultadoBeneficios(j.modelo)) throw new Error('A IA não sugeriu um modelo. Escolha o modelo.');
  return {
    modelo: ajustarModeloPeloCadastro(j.modelo, categoriaDoInspecionado(militar)),
    justificativa: String(j.justificativa || '').trim().slice(0, 240),
  };
};
