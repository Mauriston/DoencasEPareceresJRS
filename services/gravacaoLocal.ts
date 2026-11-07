// Ficheiro: services/gravacaoLocal.ts
// Cópia local (IndexedDB, só neste aparelho) da gravação da entrevista da IS enquanto ela não chega
// ao servidor. O MediaRecorder entrega um pedaço a cada 5 s e cada pedaço é gravado aqui na hora:
// se a aba fechar, o celular reiniciar ou a rede cair, nada se perde — a gravação aparece como
// pendente e pode ser reenviada. Os pedaços só são apagados depois que o servidor aceitou o
// processamento (POST /api/entrevistas/processar respondeu OK).
//
// Os pedaços são guardados como ArrayBuffer (o Safari antigo falhava ao guardar Blob no IndexedDB).

const NOME_DB = 'jrs-gravacoes-entrevista';
const VERSAO_DB = 1;
const STORE_GRAVACOES = 'gravacoes';
const STORE_PEDACOS = 'pedacos';

/** Metadados de uma gravação guardada neste aparelho (chave: entrevistaId). */
export interface GravacaoLocal {
  entrevistaId: string;
  isId: string;
  /** Número da IS e nome do inspecionado, só para exibir a pendência. */
  rotulo: string;
  /** Tipo do áudio sem parâmetros (ex.: "audio/webm", "audio/mp4"). */
  mimeType: string;
  /** Extensão do arquivo no Storage (webm | ogg | mp4). */
  ext: string;
  /** Duração gravada até agora, em segundos (atualizada a cada pedaço). */
  duracaoSeg: number;
  /** Bytes guardados até agora. */
  bytes: number;
  pedacos: number;
  /** A gravação foi encerrada pelo perito (falso: a aba fechou no meio). */
  finalizada: boolean;
  /** Caminho no Storage quando o áudio já foi enviado (o reenvio pula o upload e só pede o processamento). */
  caminhoEnviado?: string;
  criadaEm: number;
  atualizadaEm: number;
}

interface PedacoLocal { entrevistaId: string; seq: number; dados: ArrayBuffer }

let conexao: Promise<IDBDatabase> | null = null;

export const indexedDbDisponivel = (): boolean => typeof indexedDB !== 'undefined';

const abrir = (): Promise<IDBDatabase> => {
  if (conexao) return conexao;
  conexao = new Promise<IDBDatabase>((resolve, reject) => {
    if (!indexedDbDisponivel()) { reject(new Error('Este navegador não permite guardar a gravação no aparelho.')); return; }
    const req = indexedDB.open(NOME_DB, VERSAO_DB);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_GRAVACOES)) db.createObjectStore(STORE_GRAVACOES, { keyPath: 'entrevistaId' });
      if (!db.objectStoreNames.contains(STORE_PEDACOS)) {
        const s = db.createObjectStore(STORE_PEDACOS, { keyPath: ['entrevistaId', 'seq'] });
        s.createIndex('entrevistaId', 'entrevistaId', { unique: false });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Outra aba atualizou a versão: fecha para não travar e reabre na próxima chamada.
      db.onversionchange = () => { db.close(); conexao = null; };
      resolve(db);
    };
    req.onerror = () => reject(req.error || new Error('Não foi possível abrir o armazenamento local.'));
    req.onblocked = () => reject(new Error('O armazenamento local está bloqueado por outra aba do app.'));
  });
  conexao.catch(() => { conexao = null; });
  return conexao;
};

const pedido = <T>(req: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const concluir = (tx: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error || new Error('Gravação local interrompida.'));
});

/** Registra uma gravação nova (antes do primeiro pedaço). */
export const iniciarGravacaoLocal = async (
  meta: Pick<GravacaoLocal, 'entrevistaId' | 'isId' | 'rotulo' | 'mimeType' | 'ext'>,
): Promise<void> => {
  const db = await abrir();
  const tx = db.transaction(STORE_GRAVACOES, 'readwrite');
  const agora = Date.now();
  const registro: GravacaoLocal = { ...meta, duracaoSeg: 0, bytes: 0, pedacos: 0, finalizada: false, criadaEm: agora, atualizadaEm: agora };
  tx.objectStore(STORE_GRAVACOES).put(registro);
  await concluir(tx);
};

/** Guarda um pedaço do áudio e atualiza a duração/tamanho da gravação, numa só transação. */
export const salvarPedaco = async (entrevistaId: string, seq: number, pedaco: Blob, duracaoSeg: number): Promise<void> => {
  const dados = await pedaco.arrayBuffer();
  const db = await abrir();
  const tx = db.transaction([STORE_GRAVACOES, STORE_PEDACOS], 'readwrite');
  const linha: PedacoLocal = { entrevistaId, seq, dados };
  tx.objectStore(STORE_PEDACOS).put(linha);
  const gStore = tx.objectStore(STORE_GRAVACOES);
  const reqMeta = gStore.get(entrevistaId);
  reqMeta.onsuccess = () => {
    const meta = reqMeta.result as GravacaoLocal | undefined;
    if (!meta) return;
    gStore.put({ ...meta, duracaoSeg: Math.max(meta.duracaoSeg, Math.round(duracaoSeg)), bytes: meta.bytes + dados.byteLength, pedacos: meta.pedacos + 1, atualizadaEm: Date.now() });
  };
  await concluir(tx);
};

/** Altera metadados (ex.: finalizada, caminhoEnviado, duração final). */
export const atualizarGravacaoLocal = async (entrevistaId: string, patch: Partial<Omit<GravacaoLocal, 'entrevistaId'>>): Promise<void> => {
  const db = await abrir();
  const tx = db.transaction(STORE_GRAVACOES, 'readwrite');
  const store = tx.objectStore(STORE_GRAVACOES);
  const req = store.get(entrevistaId);
  req.onsuccess = () => {
    const meta = req.result as GravacaoLocal | undefined;
    if (meta) store.put({ ...meta, ...patch, entrevistaId, atualizadaEm: Date.now() });
  };
  await concluir(tx);
};

export const obterGravacaoLocal = async (entrevistaId: string): Promise<GravacaoLocal | null> => {
  const db = await abrir();
  const r = await pedido(db.transaction(STORE_GRAVACOES, 'readonly').objectStore(STORE_GRAVACOES).get(entrevistaId));
  return (r as GravacaoLocal | undefined) ?? null;
};

/** Junta os pedaços (na ordem) num único Blob do tipo da gravação. */
export const lerAudioLocal = async (entrevistaId: string): Promise<Blob | null> => {
  const db = await abrir();
  const tx = db.transaction([STORE_GRAVACOES, STORE_PEDACOS], 'readonly');
  // Os dois pedidos saem antes de qualquer await (a transação não fica inativa entre eles).
  const [metaR, pedacosR] = await Promise.all([
    pedido(tx.objectStore(STORE_GRAVACOES).get(entrevistaId)),
    pedido(tx.objectStore(STORE_PEDACOS).index('entrevistaId').getAll(entrevistaId)),
  ]);
  const meta = metaR as GravacaoLocal | undefined;
  const pedacos = pedacosR as PedacoLocal[];
  if (!meta || pedacos.length === 0) return null;
  pedacos.sort((a, b) => a.seq - b.seq);
  return new Blob(pedacos.map(p => p.dados), { type: meta.mimeType });
};

/**
 * Gravações deste aparelho ainda não aceitas pelo servidor (com ao menos um pedaço), mais recentes
 * primeiro. Com `isId`, só as daquela IS.
 */
export const listarPendentes = async (isId?: string): Promise<GravacaoLocal[]> => {
  if (!indexedDbDisponivel()) return [];
  const db = await abrir();
  const todas = (await pedido(db.transaction(STORE_GRAVACOES, 'readonly').objectStore(STORE_GRAVACOES).getAll())) as GravacaoLocal[];
  return todas
    .filter(g => g.pedacos > 0 && (!isId || g.isId === isId))
    .sort((a, b) => b.criadaEm - a.criadaEm);
};

/** Apaga a gravação e todos os seus pedaços deste aparelho. */
export const apagarGravacaoLocal = async (entrevistaId: string): Promise<void> => {
  const db = await abrir();
  const tx = db.transaction([STORE_GRAVACOES, STORE_PEDACOS], 'readwrite');
  tx.objectStore(STORE_GRAVACOES).delete(entrevistaId);
  const idx = tx.objectStore(STORE_PEDACOS).index('entrevistaId');
  const cursorReq = idx.openKeyCursor(IDBKeyRange.only(entrevistaId));
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor) return;
    tx.objectStore(STORE_PEDACOS).delete(cursor.primaryKey);
    cursor.continue();
  };
  await concluir(tx);
};

/** Pede ao navegador para não apagar o armazenamento do app sob pouca memória (melhor esforço). */
export const pedirArmazenamentoPersistente = async (): Promise<void> => {
  try { await navigator.storage?.persist?.(); } catch { /* sem suporte */ }
};
