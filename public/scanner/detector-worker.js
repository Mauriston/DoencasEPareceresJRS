// Ficheiro: public/scanner/detector-worker.js
// Web Worker clássico do scanner de documentos (components/scanner/ScannerDocumento.tsx).
// Carrega o OpenCV.js (≈10 MB, servido em <base>/scanner/opencv.js pelo plugin do vite.config.ts,
// copiado de node_modules/@techstark/opencv-js) só quando o scanner abre, fora da thread da interface.
// Mesmo algoritmo do jscanify (bordas → contornos → maior quadrilátero), com o pacote npm do jscanify
// fora do bundle: ele depende de "canvas" e "jsdom" (Node).
//
// Mensagens (entrada → saída), sempre com um id:
//   { tipo: 'iniciar' }                                              → { tipo: 'pronto' } | { tipo: 'erro', mensagem }
//   { tipo: 'detectar', largura, altura, buffer }                    → { tipo: 'detectado', cantos: number[8] | null, nitidez }
//   { tipo: 'retificar', largura, altura, buffer, cantos, ladoMax }  → { tipo: 'retificado', largura, altura, buffer }
// cantos: [x0,y0, x1,y1, x2,y2, x3,y3] em pixels da imagem recebida, na ordem sup-esq, sup-dir, inf-dir, inf-esq.
/* global cv */
/* eslint-disable no-restricted-globals */

let carregando = null;

const carregarOpenCV = () => {
  if (carregando) return carregando;
  carregando = new Promise((ok, erro) => {
    try {
      self.importScripts('opencv.js');
    } catch (e) {
      erro(new Error('Não foi possível carregar o OpenCV.js.'));
      return;
    }
    const pronto = () => { if (self.cv && self.cv.Mat) ok(); else erro(new Error('OpenCV.js sem a API esperada.')); };
    const m = self.cv;
    if (m && typeof m.then === 'function') {
      // Algumas builds expõem cv como uma Promise do módulo emscripten.
      m.then(mod => { self.cv = mod; pronto(); }, erro);
    } else if (m && m.Mat) {
      pronto();
    } else if (m) {
      m.onRuntimeInitialized = pronto;
    } else {
      erro(new Error('OpenCV.js não definiu cv.'));
    }
  });
  return carregando;
};

// ---- Geometria ----

/** Ordena 4 pontos em sup-esq, sup-dir, inf-dir, inf-esq (soma e diferença das coordenadas). */
const ordenar = pts => {
  const porSoma = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const porDif = [...pts].sort((a, b) => (a.y - a.x) - (b.y - b.x));
  const se = porSoma[0];
  const id = porSoma[3];
  const sd = porDif[0];
  const ie = porDif[3];
  return [se, sd, id, ie];
};

const areaPoligono = pts => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
};

const distintos = pts => new Set(pts.map(p => `${Math.round(p.x)},${Math.round(p.y)}`)).size === 4;

/** Pontos de um cv.Mat de contorno (CV_32SC2). */
const pontosDe = mat => {
  const r = [];
  for (let i = 0; i < mat.rows; i++) r.push({ x: mat.data32S[i * 2], y: mat.data32S[i * 2 + 1] });
  return r;
};

/** Tenta reduzir um contorno a um quadrilátero convexo com tolerâncias crescentes. */
const quadrilatero = contorno => {
  const peri = cv.arcLength(contorno, true);
  for (const eps of [0.015, 0.02, 0.03, 0.04, 0.06]) {
    const aprox = new cv.Mat();
    cv.approxPolyDP(contorno, aprox, eps * peri, true);
    const ok = aprox.rows === 4 && cv.isContourConvex(aprox);
    const pts = ok ? pontosDe(aprox) : null;
    aprox.delete();
    if (pts) return pts;
  }
  // Sem 4 vértices limpos: os extremos do fecho convexo (sup-esq, sup-dir, inf-dir, inf-esq) — como o jscanify.
  const casco = new cv.Mat();
  cv.convexHull(contorno, casco, false, true);
  const pts = pontosDe(casco);
  casco.delete();
  if (pts.length < 4) return null;
  const ext = ordenar([
    pts.reduce((a, p) => (p.x + p.y < a.x + a.y ? p : a)),
    pts.reduce((a, p) => (p.x - p.y > a.x - a.y ? p : a)),
    pts.reduce((a, p) => (p.x + p.y > a.x + a.y ? p : a)),
    pts.reduce((a, p) => (p.y - p.x > a.y - a.x ? p : a)),
  ]);
  return distintos(ext) ? ext : null;
};

/** Melhor quadrilátero entre os maiores contornos de uma imagem binária. */
const melhorQuad = (bin, areaMin) => {
  const contornos = new cv.MatVector();
  const hier = new cv.Mat();
  cv.findContours(bin, contornos, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
  const lista = [];
  for (let i = 0; i < contornos.size(); i++) {
    const c = contornos.get(i);
    const a = cv.contourArea(c);
    if (a >= areaMin) lista.push({ c, a }); else c.delete();
  }
  lista.sort((x, y) => y.a - x.a);
  let achado = null;
  for (const { c } of lista.slice(0, 5)) {
    if (!achado) {
      const q = quadrilatero(c);
      if (q && areaPoligono(q) >= areaMin) achado = ordenar(q);
    }
  }
  lista.forEach(({ c }) => c.delete());
  contornos.delete(); hier.delete();
  return achado;
};

/** Detecção: retorna os 4 cantos (ordenados) ou null, e a nitidez (variância do Laplaciano). */
const detectar = (largura, altura, buffer) => {
  const rgba = cv.matFromImageData({ data: new Uint8ClampedArray(buffer), width: largura, height: altura });
  const cinza = new cv.Mat();
  cv.cvtColor(rgba, cinza, cv.COLOR_RGBA2GRAY);
  rgba.delete();

  // Nitidez no centro (onde está o texto): variância do Laplaciano.
  const lap = new cv.Mat();
  cv.Laplacian(cinza, lap, cv.CV_64F);
  const media = new cv.Mat();
  const desvio = new cv.Mat();
  cv.meanStdDev(lap, media, desvio);
  const nitidez = desvio.data64F[0] * desvio.data64F[0];
  lap.delete(); media.delete(); desvio.delete();

  const desfoque = new cv.Mat();
  cv.GaussianBlur(cinza, desfoque, new cv.Size(5, 5), 0);
  const areaMin = largura * altura * 0.12;
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(5, 5));

  // 1) Bordas (Canny) fechadas por dilatação — funciona com papel sobre fundo de cor parecida.
  const bordas = new cv.Mat();
  cv.Canny(desfoque, bordas, 40, 120);
  cv.dilate(bordas, bordas, kernel);
  let quad = melhorQuad(bordas, areaMin);
  bordas.delete();

  // 2) Limiar de Otsu (papel claro × fundo escuro) — mais estável quando as bordas falham.
  if (!quad) {
    const bin = new cv.Mat();
    cv.threshold(desfoque, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    cv.morphologyEx(bin, bin, cv.MORPH_CLOSE, kernel);
    quad = melhorQuad(bin, areaMin);
    bin.delete();
  }
  kernel.delete(); desfoque.delete(); cinza.delete();
  return { cantos: quad ? quad.flatMap(p => [p.x, p.y]) : null, nitidez };
};

/** Retificação de perspectiva para o retângulo dos 4 cantos (lado maior limitado a ladoMax). */
const retificar = (largura, altura, buffer, cantos, ladoMax) => {
  const p = [0, 1, 2, 3].map(i => ({ x: cantos[i * 2], y: cantos[i * 2 + 1] }));
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let w = Math.max(d(p[0], p[1]), d(p[3], p[2]));
  let h = Math.max(d(p[0], p[3]), d(p[1], p[2]));
  const escala = Math.min(1, ladoMax / Math.max(w, h));
  w = Math.max(1, Math.round(w * escala));
  h = Math.max(1, Math.round(h * escala));

  const src = cv.matFromImageData({ data: new Uint8ClampedArray(buffer), width: largura, height: altura });
  const de = cv.matFromArray(4, 1, cv.CV_32FC2, cantos);
  const para = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
  const M = cv.getPerspectiveTransform(de, para);
  const dst = new cv.Mat();
  cv.warpPerspective(src, dst, M, new cv.Size(w, h), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
  const saida = new Uint8ClampedArray(dst.data).buffer;
  src.delete(); de.delete(); para.delete(); M.delete(); dst.delete();
  return { largura: w, altura: h, buffer: saida };
};

self.onmessage = async ev => {
  const m = ev.data || {};
  const responder = (dados, transferir) => self.postMessage({ id: m.id, ...dados }, transferir || []);
  try {
    await carregarOpenCV();
    if (m.tipo === 'iniciar') { responder({ tipo: 'pronto' }); return; }
    if (m.tipo === 'detectar') { responder({ tipo: 'detectado', ...detectar(m.largura, m.altura, m.buffer) }); return; }
    if (m.tipo === 'retificar') {
      const r = retificar(m.largura, m.altura, m.buffer, m.cantos, m.ladoMax || 2400);
      responder({ tipo: 'retificado', ...r }, [r.buffer]);
      return;
    }
    responder({ tipo: 'erro', mensagem: `Mensagem desconhecida: ${m.tipo}` });
  } catch (e) {
    responder({ tipo: 'erro', mensagem: (e && e.message) || String(e) });
  }
};
