// Ficheiro: services/atestadoIA.ts
// Leitura do atestado fotografado pelo Gemini (ação "extrair_dados_atestado" do Apps Script).
import { ApiError, chamarScript } from './apiClient';

export interface DadosAtestado {
  nomeMilitar?: string;
  dataAtestado?: string;
  tempoAtestado?: string | number;
  cid?: string;
}

export const extrairDadosAtestado = async (base64Image: string): Promise<DadosAtestado> => {
  try {
    const dados = await chamarScript<DadosAtestado | undefined>('extrair_dados_atestado', { base64Image }, {
      mensagemRede: 'Sem comunicação com o servidor de leitura do atestado (Apps Script). Tente novamente.',
    });
    if (!dados) throw new ApiError('negocio', 'Não foi possível ler o atestado.');
    return dados;
  } catch (e) {
    if (e instanceof ApiError && e.codigo === 'timeout') throw new Error('A leitura do atestado demorou demais. Tente novamente.');
    throw e;
  }
};
