// Ficheiro: servidor/assessor/resposta.ts
// Interpretação da resposta do modelo (JSON) e conferência do CID na tabela do app (public/cid.json — a mesma do
// campo CID da IS). Puro e testado (utils/__tests__/assessorServidor.test.ts), exceto `carregarTabelaCid`.
import fs from 'node:fs/promises';
import path from 'node:path';

export interface LaudoProposto { finalidade: string; laudo: string }
export interface CidProposto { codigo: string; subcat: string; descrAbrev: string; descricao: string }

export interface RespostaAssessor {
  mensagem: string;
  entrevista: string;
  exameClinico: string;
  conclusao: string;
  laudos: LaudoProposto[];
  /** CID conferido na tabela (null quando não veio ou não existe). */
  cid: CidProposto | null;
  /** Avisos do servidor (ex.: CID proposto que não está na tabela). */
  avisos: string[];
}

export interface ItemCid { SUBCAT: string; DESCRICAO: string; DESCRABREV: string }

/** Tira as cercas de código e devolve o primeiro objeto JSON do texto. */
export const extrairJson = (texto: string): Record<string, unknown> | null => {
  const t = String(texto || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { const o = JSON.parse(t); return o && typeof o === 'object' ? o : null; } catch { /* tenta recortar */ }
  const ini = t.indexOf('{');
  const fim = t.lastIndexOf('}');
  if (ini < 0 || fim <= ini) return null;
  try { const o = JSON.parse(t.slice(ini, fim + 1)); return o && typeof o === 'object' ? o : null; } catch { return null; }
};

/** Bloco de texto vindo do modelo: sem cercas ``` e sem rótulo repetido na 1ª linha. */
export const limparBloco = (v: unknown, rotulos: string[] = []): string => {
  let t = String(v ?? '').replace(/\r\n/g, '\n').trim();
  t = t.replace(/^```(?:txt|text)?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
  const primeira = t.split('\n')[0].replace(/[*#:]/g, '').trim().toUpperCase();
  if (rotulos.some(r => primeira === r.toUpperCase())) t = t.split('\n').slice(1).join('\n').trim();
  return t;
};

/** "F19.5" / "f195" / "F19.5 Transt psicotico" → "F195". */
export const subcatDoCodigo = (codigo: string): string => {
  const m = /([A-Z])\s*(\d{2})\s*\.?\s*(\d)?/i.exec(String(codigo || '').trim());
  return m ? `${m[1].toUpperCase()}${m[2]}${m[3] ?? ''}` : '';
};

/** Acha o CID na tabela (subcategoria exata; sem o 4º dígito, a primeira subcategoria da categoria). */
export const acharCid = (tabela: ItemCid[], codigo: string): ItemCid | null => {
  const sub = subcatDoCodigo(codigo);
  if (!sub) return null;
  return tabela.find(c => c.SUBCAT === sub) ?? (sub.length === 3 ? tabela.find(c => c.SUBCAT.startsWith(sub)) ?? null : null);
};

/** Normaliza a resposta do modelo. */
export const normalizarResposta = (bruta: Record<string, unknown> | null, tabelaCid: ItemCid[], finalidades: string[]): RespostaAssessor => {
  if (!bruta) {
    return { mensagem: 'Não consegui interpretar a resposta da IA. Tente reformular o comando.', entrevista: '', exameClinico: '', conclusao: '', laudos: [], cid: null, avisos: [] };
  }
  const avisos: string[] = [];
  const laudosBrutos = Array.isArray(bruta.laudos) ? bruta.laudos : [];
  const laudos: LaudoProposto[] = laudosBrutos
    .map((l: any) => ({ finalidade: String(l?.finalidade ?? '').trim(), laudo: limparBloco(l?.laudo).replace(/^["“]|["”]$/g, '').trim() }))
    .filter(l => l.laudo)
    .map((l, i) => ({ ...l, finalidade: finalidades.find(f => f === l.finalidade) ?? finalidades[i] ?? l.finalidade }));
  const cidBruto = (bruta.cid && typeof bruta.cid === 'object' ? bruta.cid : { codigo: bruta.cid }) as { codigo?: unknown };
  const codigo = String(cidBruto.codigo ?? '').trim();
  let cid: CidProposto | null = null;
  if (codigo) {
    const achado = acharCid(tabelaCid, codigo);
    if (achado) cid = { codigo, subcat: achado.SUBCAT, descrAbrev: achado.DESCRABREV, descricao: achado.DESCRICAO };
    else avisos.push(`O CID proposto (${codigo}) não está na tabela de CID do app; escolha o CID manualmente.`);
  }
  return {
    mensagem: String(bruta.mensagem ?? '').trim(),
    entrevista: limparBloco(bruta.entrevista, ['ENTREVISTA']),
    exameClinico: limparBloco(bruta.exameClinico, ['EXAME CLÍNICO', 'EXAME CLINICO']),
    conclusao: limparBloco(bruta.conclusao, ['CONCLUSÃO', 'CONCLUSAO']),
    laudos,
    cid,
    avisos,
  };
};

let tabela: Promise<ItemCid[]> | null = null;
/** Tabela de CID do app: dist/cid.json (produção) ou public/cid.json (desenvolvimento). */
export const carregarTabelaCid = (): Promise<ItemCid[]> => {
  if (!tabela) {
    const candidatos = [path.join(process.cwd(), 'dist', 'cid.json'), path.join(process.cwd(), 'public', 'cid.json')];
    tabela = (async () => {
      for (const c of candidatos) {
        try { return JSON.parse(await fs.readFile(c, 'utf8')) as ItemCid[]; } catch { /* próximo */ }
      }
      tabela = null; // tenta de novo no próximo pedido
      return [];
    })();
  }
  return tabela;
};
