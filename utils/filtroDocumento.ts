// Ficheiro: utils/filtroDocumento.ts
// Filtro "Documento" para a página digitalizada (como o "realce" dos apps de digitalização): remove a
// iluminação desigual (sombras, luz amarelada/azulada) dividindo cada canal pela iluminação estimada, deixa
// o papel branco e a tinta nítida — em CORES (caneta azul continua azul) e sem binarizar (o preto e branco
// duro criava manchas e falhava a escrita). Sem CanvasRenderingContext2D.filter (o Safari do iPhone não o tem).

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

  // Iluminação (fundo do papel): imagem reduzida 16x, com um "máximo local" que apaga a tinta (o papel é o
  // que há de mais claro em volta) e ampliada de volta com suavização.
  const pw = Math.max(1, Math.round(w / 16));
  const ph = Math.max(1, Math.round(h / 16));
  const peq = document.createElement('canvas');
  peq.width = pw; peq.height = ph;
  const cp = peq.getContext('2d', { willReadFrequently: true });
  const fundoCanvas = document.createElement('canvas');
  fundoCanvas.width = w; fundoCanvas.height = h;
  const cf = fundoCanvas.getContext('2d', { willReadFrequently: true });
  if (!cp || !cf) return dataUrl;
  cp.imageSmoothingQuality = 'high';
  cp.drawImage(canvas, 0, 0, pw, ph);
  const pequeno = cp.getImageData(0, 0, pw, ph);
  maximoLocal(pequeno, 2);
  cp.putImageData(pequeno, 0, 0);
  cf.imageSmoothingEnabled = true;
  cf.imageSmoothingQuality = 'high';
  cf.drawImage(peq, 0, 0, w, h);

  const px = ctx.getImageData(0, 0, w, h);
  const fundo = cf.getImageData(0, 0, w, h).data;
  const d = px.data;
  const n = w * h;
  // Sombra: cada pixel dividido pelo BRILHO da iluminação (o mesmo fator nos 3 canais, sem manchas de cor).
  // Tom da luz (amarela/azulada): um único ganho por canal para a página toda, medido no papel (mediana).
  const norm = new Float32Array(n * 3);
  const amostra: number[][] = [[], [], []];
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    const lf = Math.max(16, 0.299 * fundo[i] + 0.587 * fundo[i + 1] + 0.114 * fundo[i + 2]);
    for (let c = 0; c < 3; c++) norm[j * 3 + c] = d[i + c] / lf;
    if ((j & 15) === 0) {
      const l = 0.299 * norm[j * 3] + 0.587 * norm[j * 3 + 1] + 0.114 * norm[j * 3 + 2];
      if (l > 0.85) for (let c = 0; c < 3; c++) amostra[c].push(norm[j * 3 + c]);
    }
  }
  const mediana = (v: number[]) => { if (!v.length) return 1; v.sort((x, y) => x - y); return v[v.length >> 1] || 1; };
  const ganho = amostra.map(v => 1 / Math.max(0.3, mediana(v)));
  const hist = new Uint32Array(256);
  for (let j = 0; j < n; j++) {
    let l = 0;
    for (let c = 0; c < 3; c++) {
      const v = Math.min(1.2, norm[j * 3 + c] * ganho[c]);
      norm[j * 3 + c] = v;
      l += v * (c === 0 ? 0.299 : c === 1 ? 0.587 : 0.114);
    }
    hist[Math.min(255, Math.round(l * 230))]++;
  }

  // Níveis suaves: o papel (≈ 1 na escala normalizada) fica branco; o ponto preto é o 0,5% mais escuro, sem
  // passar de 45% — a tinta fica nítida e escura, sem virar borrão nem manchas pretas (nada de binarização).
  let acum = 0; let pretoIdx = 0;
  for (let v = 0; v < 256; v++) { acum += hist[v]; if (acum >= n * 0.005) { pretoIdx = v; break; } }
  const preto = Math.min(0.45, pretoIdx / 230);
  const branco = 0.93;
  const faixa = Math.max(0.2, branco - preto);
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    // Papel sem cor: nas áreas claras a cor (reflexo do lençol, luz quente) é descartada; na tinta (escura), mantida.
    const l = 0.299 * norm[j * 3] + 0.587 * norm[j * 3 + 1] + 0.114 * norm[j * 3 + 2];
    const cor = Math.min(1, Math.max(0, (0.88 - l) / 0.3));
    for (let c = 0; c < 3; c++) {
      let v = (l + (norm[j * 3 + c] - l) * cor - preto) / faixa;
      v = v >= 1 ? 1 : v <= 0 ? 0 : Math.pow(v, 1.25); // escurece de leve o traço; o papel continua branco
      d[i + c] = v * 255;
    }
  }
  ctx.putImageData(px, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85);
};

/** Máximo local (dilatação) por canal, raio r, in-place — apaga a tinta na estimativa da iluminação. */
const maximoLocal = (img: ImageData, r: number) => {
  const { width: w, height: h, data } = img;
  const orig = new Uint8ClampedArray(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let m = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy));
          for (let dx = -r; dx <= r; dx++) {
            const xx = Math.min(w - 1, Math.max(0, x + dx));
            const v = orig[(yy * w + xx) * 4 + c];
            if (v > m) m = v;
          }
        }
        data[k + c] = m;
      }
    }
  }
};
