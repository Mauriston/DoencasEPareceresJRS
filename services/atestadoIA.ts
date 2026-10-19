// Ficheiro: services/atestadoIA.ts
// Leitura do atestado fotografado pelo Gemini (ação "extrair_dados_atestado" do Apps Script).
// Tenta primeiro o projeto standalone (repositório, GAS_URL_CONCURSOS) e, se ele falhar, o projeto
// principal (GAS_URL): o que responder com sucesso vale. Devolve a mensagem do último erro quando
// nenhum dos dois responde.
import { GAS_URL, GAS_URL_CONCURSOS } from '../config/endpoints';

export interface DadosAtestado {
  nomeMilitar?: string;
  dataAtestado?: string;
  tempoAtestado?: string | number;
  cid?: string;
}

const chamar = async (url: string, base64Image: string): Promise<DadosAtestado> => {
  const resp = await fetch(url, { method: 'POST', body: JSON.stringify({ action: 'extrair_dados_atestado', base64Image }) });
  const texto = await resp.text();
  let json: any;
  try { json = JSON.parse(texto); } catch { throw new Error('O servidor devolveu uma resposta inválida (verifique a implantação do Apps Script).'); }
  if (!json.success || !json.data) throw new Error(json.message || 'Não foi possível ler o atestado.');
  return json.data as DadosAtestado;
};

export const extrairDadosAtestado = async (base64Image: string): Promise<DadosAtestado> => {
  let ultimo: unknown;
  for (const url of [GAS_URL_CONCURSOS, GAS_URL]) {
    try { return await chamar(url, base64Image); } catch (e) { ultimo = e; }
  }
  throw new Error(ultimo instanceof Error && ultimo.message !== 'Failed to fetch' ? ultimo.message : 'Sem comunicação com o servidor de leitura do atestado (Apps Script). Tente novamente.');
};
