// Ficheiro: utils/scanner/detector.ts
// Ponte com o Web Worker do scanner (public/scanner/detector-worker.js, que carrega o OpenCV.js sob demanda).
// Interface única — detectar(frame) → cantos | null e retificar(imagem, cantos) → imagem — para que o motor
// (hoje OpenCV.js, algoritmo do jscanify) possa ser trocado sem mexer na interface do scanner.
import { cantosDeLista, cantosParaLista, type Cantos } from './geometria';

export interface Deteccao { cantos: Cantos | null; nitidez: number }

type Resposta = { id: number; tipo: string; mensagem?: string; [k: string]: unknown };

let worker: Worker | null = null;
let pronto: Promise<void> | null = null;
let seq = 0;
const pendentes = new Map<number, { ok: (r: Resposta) => void; erro: (e: Error) => void }>();

const enviar = (msg: Record<string, unknown>, transferir: Transferable[] = []): Promise<Resposta> => {
  if (!worker) return Promise.reject(new Error('Detector não iniciado.'));
  const id = ++seq;
  return new Promise((ok, erro) => {
    pendentes.set(id, { ok, erro });
    worker!.postMessage({ ...msg, id }, transferir);
  });
};

/** Inicia o worker e o OpenCV.js (≈10 MB na primeira vez; depois vem do cache do navegador). */
export const iniciarDetector = (): Promise<void> => {
  if (pronto) return pronto;
  if (typeof Worker === 'undefined') return Promise.reject(new Error('Navegador sem suporte a Web Workers.'));
  worker = new Worker(`${import.meta.env.BASE_URL}scanner/detector-worker.js`);
  worker.onmessage = ev => {
    const r = ev.data as Resposta;
    const p = pendentes.get(r.id);
    if (!p) return;
    pendentes.delete(r.id);
    if (r.tipo === 'erro') p.erro(new Error(r.mensagem || 'Falha no detector.'));
    else p.ok(r);
  };
  worker.onerror = ev => {
    const e = new Error(ev.message || 'Falha ao carregar o detector.');
    pendentes.forEach(p => p.erro(e));
    pendentes.clear();
  };
  pronto = enviar({ tipo: 'iniciar' }).then(() => undefined).catch(e => {
    encerrarDetector();
    throw e;
  });
  return pronto;
};

/** Libera o worker (a memória do OpenCV.js) — ao fechar o scanner. */
export const encerrarDetector = () => {
  worker?.terminate();
  worker = null;
  pronto = null;
  pendentes.forEach(p => p.erro(new Error('Detector encerrado.')));
  pendentes.clear();
};

export const detectar = async (img: ImageData): Promise<Deteccao> => {
  const buffer = img.data.slice().buffer;
  const r = await enviar({ tipo: 'detectar', largura: img.width, altura: img.height, buffer }, [buffer]);
  const lista = r.cantos as number[] | null;
  return { cantos: lista ? cantosDeLista(lista) : null, nitidez: Number(r.nitidez) || 0 };
};

export const retificar = async (img: ImageData, cantos: Cantos, ladoMax = 2400): Promise<ImageData> => {
  const buffer = img.data.slice().buffer;
  const r = await enviar({ tipo: 'retificar', largura: img.width, altura: img.height, buffer, cantos: cantosParaLista(cantos), ladoMax }, [buffer]);
  return new ImageData(new Uint8ClampedArray(r.buffer as ArrayBuffer), r.largura as number, r.altura as number);
};

// ---- Utilidades de imagem (canvas) ----

export const carregarImagem = (src: string) => new Promise<HTMLImageElement>((ok, erro) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => erro(new Error('Não foi possível abrir a imagem.'));
  img.src = src;
});

/** Desenha uma imagem/vídeo num canvas com o lado maior limitado e devolve os pixels e a escala usada. */
export const pixelsDe = (fonte: CanvasImageSource, largura: number, altura: number, ladoMax = Infinity): { dados: ImageData; escala: number } => {
  const escala = Math.min(1, ladoMax / Math.max(largura, altura));
  const w = Math.max(1, Math.round(largura * escala));
  const h = Math.max(1, Math.round(altura * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas indisponível.');
  ctx.drawImage(fonte, 0, 0, w, h);
  return { dados: ctx.getImageData(0, 0, w, h), escala };
};

export const imageDataParaDataUrl = (img: ImageData, qualidade = 0.9): string => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  canvas.getContext('2d')?.putImageData(img, 0, 0);
  return canvas.toDataURL('image/jpeg', qualidade);
};
