// Ficheiro: utils/filtroDocumento.ts
// Filtro "Documento" para a foto do atestado (como o dos apps de digitalização): tons de cinza,
// remoção da iluminação desigual (sombras, papel azulado) e contraste alto — fundo branco e
// tinta escura. Sem CanvasRenderingContext2D.filter (o Safari do iPhone não o tem): o fundo é
// estimado reduzindo a imagem e ampliando de volta, e cada pixel é dividido por ele.

/** Lado maior da imagem final (px): legível na leitura por IA e leve no PDF. */
const LADO_MAX = 1800;

const carregar = (src: string) => new Promise<HTMLImageElement>((ok, erro) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => erro(new Error('Não foi possível abrir a foto.'));
  img.src = src;
});

/** Aplica o filtro e devolve um JPEG (data URL). */
export const aplicarFiltroDocumento = async (dataUrl: string): Promise<string> => {
  const img = await carregar(dataUrl);
  const escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * escala));
  const h = Math.max(1, Math.round(img.naturalHeight * escala));

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  // Fundo: imagem reduzida ~32x (a tinta, fina, quase some na média) e ampliada de volta, suave.
  const pw = Math.max(1, Math.round(w / 32));
  const ph = Math.max(1, Math.round(h / 32));
  const peq = document.createElement('canvas');
  peq.width = pw; peq.height = ph;
  const cp = peq.getContext('2d');
  const fundoCanvas = document.createElement('canvas');
  fundoCanvas.width = w; fundoCanvas.height = h;
  const cf = fundoCanvas.getContext('2d', { willReadFrequently: true });
  if (!cp || !cf) return dataUrl;
  cp.imageSmoothingQuality = 'high';
  cp.drawImage(canvas, 0, 0, pw, ph);
  cf.imageSmoothingEnabled = true;
  cf.imageSmoothingQuality = 'high';
  cf.drawImage(peq, 0, 0, w, h);

  const px = ctx.getImageData(0, 0, w, h);
  const fundo = cf.getImageData(0, 0, w, h).data;
  const d = px.data;
  const n = w * h;
  const norm = new Uint8ClampedArray(n);
  const hist = new Uint32Array(256);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    const cinza = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const bg = Math.max(1, 0.299 * fundo[i] + 0.587 * fundo[i + 1] + 0.114 * fundo[i + 2]);
    const v = Math.min(255, (cinza / bg) * 255);
    norm[j] = v;
    hist[norm[j]]++;
  }

  // Níveis: o 1% mais escuro vira preto; o papel (≈ 92% da escala normalizada) vira branco.
  let acum = 0; let preto = 0;
  for (let v = 0; v < 256; v++) { acum += hist[v]; if (acum >= n * 0.01) { preto = v; break; } }
  const branco = 235;
  const faixa = Math.max(20, branco - preto);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    let v = ((norm[j] - preto) / faixa) * 255;
    v = v >= 255 ? 255 : v <= 0 ? 0 : 255 * Math.pow(v / 255, 1.4); // escurece o traço, mantém o papel branco
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(px, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8);
};
