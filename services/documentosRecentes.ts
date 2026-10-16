// Ficheiro: services/documentosRecentes.ts
// "Últimos documentos gerados" da Página Inicial: junta os pareceres e as
// perícias menores mais recentes (listas já expostas pelo Apps Script) — só dos
// tipos a que o perfil tem acesso (a checagem de permissão é de quem chama).
import { GAS_URL } from '../config/endpoints';
import { extrairNomeInspecionado } from '../utils/format';

export interface DocumentoRecente {
  tipo: 'parecer' | 'pericia-menor';
  /** Nome do inspecionado. */
  titulo: string;
  /** Especialidade (parecer) ou CID (perícia menor). */
  detalhe: string;
  /** DD/MM/AAAA, como vem da planilha. */
  data: string;
  ts: number;
  link: string;
}

const parseDataBR = (s: string): number => {
  const [d, m, a] = String(s).split('/').map(Number);
  return d && m && a ? new Date(a, m - 1, d).getTime() : 0;
};

const lerLista = async (action: string): Promise<any[]> => {
  const resp = await fetch(`${GAS_URL}?action=${action}`);
  const json = await resp.json();
  return json.success && Array.isArray(json.data) ? json.data : [];
};

export const buscarDocumentosRecentes = async (tipos: { pareceres: boolean; periciaMenor: boolean }, limite = 6): Promise<DocumentoRecente[]> => {
  const [pareceres, pericias] = await Promise.all([
    tipos.pareceres ? lerLista('getPareceresList').catch(() => []) : Promise.resolve([]),
    tipos.periciaMenor ? lerLista('getPericiaMenorList').catch(() => []) : Promise.resolve([]),
  ]);
  const docs: DocumentoRecente[] = [
    ...pareceres.map((p): DocumentoRecente => ({
      tipo: 'parecer', titulo: extrairNomeInspecionado(String(p.inspecionado || '')), detalhe: String(p.especialidade || ''),
      data: String(p.data || ''), ts: parseDataBR(p.data), link: String(p.link || ''),
    })),
    ...pericias.map((p): DocumentoRecente => ({
      tipo: 'pericia-menor', titulo: extrairNomeInspecionado(String(p.inspecionado || '')), detalhe: String(p.cid || ''),
      data: String(p.dataAtestado || ''), ts: parseDataBR(p.dataAtestado), link: String(p.link || ''),
    })),
  ];
  return docs.sort((a, b) => b.ts - a.ts).slice(0, limite);
};
