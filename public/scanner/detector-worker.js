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

/** Reduz um contorno a um quadrilátero convexo: aproximação poligonal (limpo) ou, se permitido, o casco convexo. */
const quadrilatero = (contorno, permitirCasco) => {
  const peri = cv.arcLength(contorno, true);
  for (const eps of [0.015, 0.02, 0.03, 0.04, 0.05]) {
    const aprox = new cv.Mat();
    cv.approxPolyDP(contorno, aprox, eps * peri, true);
    const ok = aprox.rows === 4 && cv.isContourConvex(aprox);
    const pts = ok ? pontosDe(aprox) : null;
    aprox.delete();
    if (pts) return { pts, limpo: true };
  }
  if (!permitirCasco) return null;
  // Região (máscara do papel) com cantos arredondados/dobrados: aproxima o casco convexo a 4 vértices.
  const casco = new cv.Mat();
  cv.convexHull(contorno, casco, false, true);
  const periC = cv.arcLength(casco, true);
  for (const eps of [0.02, 0.04, 0.06, 0.08]) {
    const aprox = new cv.Mat();
    cv.approxPolyDP(casco, aprox, eps * periC, true);
    const pts = aprox.rows === 4 ? pontosDe(aprox) : null;
    aprox.delete();
    if (pts && distintos(pts)) { casco.delete(); return { pts, limpo: false }; }
  }
  casco.delete();
  return null;
};

/**
 * Refina os 4 cantos: cada lado vira a reta que melhor se ajusta (PCA) aos pontos do contorno perto dele, longe
 * dos cantos (arredondados, dobrados ou cobertos pelo dedo); os cantos são as interseções das retas vizinhas.
 */
const refinar = (pts, contorno) => {
  const todos = pontosDe(contorno);
  if (todos.length < 20) return pts;
  const retas = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i]; const b = pts[(i + 1) % 4];
    const dx = b.x - a.x; const dy = b.y - a.y; const L = Math.hypot(dx, dy) || 1;
    const tol = Math.max(3, L * 0.04);
    const sel = todos.filter(p => {
      const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (L * L);
      const d = Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / L;
      return t > 0.12 && t < 0.88 && d < tol;
    });
    if (sel.length < 6) return pts;
    const mx = sel.reduce((s, p) => s + p.x, 0) / sel.length;
    const my = sel.reduce((s, p) => s + p.y, 0) / sel.length;
    let sxx = 0; let syy = 0; let sxy = 0;
    for (const p of sel) { sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; sxy += (p.x - mx) * (p.y - my); }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    retas.push({ x: mx, y: my, ux: Math.cos(ang), uy: Math.sin(ang) });
  }
  const novos = [];
  for (let i = 0; i < 4; i++) {
    const r1 = retas[(i + 3) % 4]; const r2 = retas[i];
    const det = r1.ux * r2.uy - r1.uy * r2.ux;
    if (Math.abs(det) < 1e-6) return pts;
    const t = ((r2.x - r1.x) * r2.uy - (r2.y - r1.y) * r2.ux) / det;
    novos.push({ x: r1.x + t * r1.ux, y: r1.y + t * r1.uy });
  }
  // Recusa refinamentos que andam demais (retas mal estimadas).
  const lado = Math.max(...pts.map((p, i) => Math.hypot(p.x - pts[(i + 1) % 4].x, p.y - pts[(i + 1) % 4].y)));
  return novos.every((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y) < lado * 0.15) ? novos : pts;
};

/** Quadriláteros candidatos dos maiores contornos de uma imagem binária. */
const candidatos = (bin, areaMin, origem, permitirCasco) => {
  const contornos = new cv.MatVector();
  const hier = new cv.Mat();
  cv.findContours(bin, contornos, hier, permitirCasco ? cv.RETR_EXTERNAL : cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
  const lista = [];
  for (let i = 0; i < contornos.size(); i++) {
    const c = contornos.get(i);
    const a = cv.contourArea(c);
    if (a >= areaMin) lista.push({ c, a }); else c.delete();
  }
  lista.sort((x, y) => y.a - x.a);
  const r = [];
  for (const { c, a } of lista.slice(0, 6)) {
    const q = quadrilatero(c, permitirCasco);
    if (q) { const pts = ordenar(refinar(ordenar(q.pts), c)); r.push({ pts, limpo: q.limpo, origem, preenchimento: a / Math.max(1, areaPoligono(pts)) }); }
  }
  lista.forEach(({ c }) => c.delete());
  contornos.delete(); hier.delete();
  return r;
};

/** Brilho médio de uma região (máscara de polígono). */
const mediaNaMascara = (cinza, mascara) => cv.mean(cinza, mascara)[0];

const mascaraPoligono = (largura, altura, pts) => {
  const m = cv.Mat.zeros(altura, largura, cv.CV_8UC1);
  const mv = new cv.MatVector();
  const poly = cv.matFromArray(4, 1, cv.CV_32SC2, pts.flatMap(p => [Math.round(p.x), Math.round(p.y)]));
  mv.push_back(poly);
  cv.fillPoly(m, mv, new cv.Scalar(255));
  poly.delete(); mv.delete();
  return m;
};

/**
 * Nota de um candidato: o papel é uma região clara, quase toda preenchida pelo contorno, mais clara que a
 * faixa em volta e que não encosta em dois lados do quadro (o que indica o fundo, não a folha).
 */
const avaliarCandidato = (cand, cinza, textura, mapaPapel, largura, altura) => {
  const total = largura * altura;
  const fr = areaPoligono(cand.pts) / total;
  if (fr < 0.1 || fr > 0.93) return -1;
  const margem = Math.min(largura, altura) * 0.015;
  const naBorda = cand.pts.filter(p => p.x < margem || p.y < margem || p.x > largura - margem || p.y > altura - margem).length;
  if (naBorda >= 2) return -1;
  // Ângulos internos muito agudos/obtusos: não é uma folha vista de frente.
  for (let i = 0; i < 4; i++) {
    const a = cand.pts[(i + 3) % 4]; const b = cand.pts[i]; const c = cand.pts[(i + 1) % 4];
    const v1 = { x: a.x - b.x, y: a.y - b.y }; const v2 = { x: c.x - b.x, y: c.y - b.y };
    const cos = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
    const ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    if (ang < 45 || ang > 135) return -1;
  }
  const dentro = mascaraPoligono(largura, altura, cand.pts);
  const anel = new cv.Mat();
  const k = Math.max(3, Math.round(Math.min(largura, altura) * 0.06)) | 1;
  const ker = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(k, k));
  cv.dilate(dentro, anel, ker);
  cv.subtract(anel, dentro, anel);
  const interno = new cv.Mat();
  cv.erode(dentro, interno, ker);
  const base = cv.countNonZero(interno) > 0 ? interno : dentro;
  const temAnel = cv.countNonZero(anel) > 0;
  const mi = mediaNaMascara(cinza, base);
  const mo = temAnel ? mediaNaMascara(cinza, anel) : mi;
  // Lisura: a folha é lisa por dentro; o fundo em volta, não (ou é bem mais escuro).
  const ti = mediaNaMascara(textura, base);
  // Cobertura: quanto do quadrilátero é "papel" (claro e liso). Invadir o fundo derruba a nota.
  const cobertura = mediaNaMascara(mapaPapel, dentro) / 255;
  const to = temAnel ? mediaNaMascara(textura, anel) : ti;
  dentro.delete(); anel.delete(); interno.delete(); ker.delete();
  const contraste = mi - mo;
  const lisura = to - ti;
  if (contraste < 8 && lisura < 6) return -1;
  if (ti > 22 || cobertura < 0.75) return -1; // por dentro está texturizado / não é papel: pegou o fundo
  return cobertura * 3 + contraste / 40 + lisura / 15 + Math.min(1, cand.preenchimento) * 0.5 + (cand.limpo ? 0.2 : 0) + fr * 0.8;
};

/** Detecção: retorna os 4 cantos (ordenados) ou null, e a nitidez (variância do Laplaciano). */
const detectar = (largura, altura, buffer) => {
  const rgba = cv.matFromImageData({ data: new Uint8ClampedArray(buffer), width: largura, height: altura });
  const cinza = new cv.Mat();
  cv.cvtColor(rgba, cinza, cv.COLOR_RGBA2GRAY);

  const lap = new cv.Mat();
  cv.Laplacian(cinza, lap, cv.CV_64F);
  const media = new cv.Mat();
  const desvio = new cv.Mat();
  cv.meanStdDev(lap, media, desvio);
  const nitidez = desvio.data64F[0] * desvio.data64F[0];
  lap.delete(); media.delete(); desvio.delete();

  const areaMin = largura * altura * 0.1;
  const lado = Math.min(largura, altura);
  const imp = n => (Math.max(3, Math.round(n)) | 1);
  const desfoque = new cv.Mat();
  cv.GaussianBlur(cinza, desfoque, new cv.Size(5, 5), 0);
  let lista = [];
  let ctxTextura;

  // 1) Mapa do "papel": região clara E lisa (desvio-padrão local baixo). O fundo real (lençol amassado, tecido,
  //    madeira, teclado) é texturizado; a folha é lisa — a escrita é fina e some no fechamento morfológico.
  const kTex = imp(lado * 0.035);
  const f32 = new cv.Mat();
  desfoque.convertTo(f32, cv.CV_32F);
  const mu = new cv.Mat(); const mu2 = new cv.Mat(); const sq = new cv.Mat();
  cv.boxFilter(f32, mu, -1, new cv.Size(kTex, kTex));
  cv.multiply(f32, f32, sq);
  cv.boxFilter(sq, mu2, -1, new cv.Size(kTex, kTex));
  const var_ = new cv.Mat();
  cv.multiply(mu, mu, sq);
  cv.subtract(mu2, sq, var_);
  const std8 = new cv.Mat();
  cv.max(var_, new cv.Mat(var_.rows, var_.cols, var_.type(), new cv.Scalar(0)), var_);
  cv.sqrt(var_, var_);
  var_.convertTo(std8, cv.CV_8U);
  const liso = new cv.Mat();
  cv.threshold(std8, liso, 14, 255, cv.THRESH_BINARY_INV);
  // Claro: acima do limiar de Otsu do brilho (ou, se o fundo também for claro, acima da mediana + margem).
  const claro = new cv.Mat();
  cv.threshold(desfoque, claro, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
  const papel = new cv.Mat();
  cv.bitwise_and(claro, liso, papel);
  const kAbre = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(imp(lado * 0.02), imp(lado * 0.02)));
  const kFecha = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(imp(lado * 0.06), imp(lado * 0.06)));
  cv.morphologyEx(papel, papel, cv.MORPH_CLOSE, kFecha); // fecha a escrita dentro da folha
  cv.morphologyEx(papel, papel, cv.MORPH_OPEN, kFecha); // solta a folha de manchas lisas encostadas
  lista = lista.concat(candidatos(papel, areaMin, 'papel', true));
  // Só o brilho (fundo escuro e liso: mesa, pasta) — candidato extra, decidido pela nota.
  cv.morphologyEx(claro, claro, cv.MORPH_OPEN, kAbre);
  cv.morphologyEx(claro, claro, cv.MORPH_CLOSE, kFecha);
  lista = lista.concat(candidatos(claro, areaMin, 'claro', true));
  if (self.__depurar) self.__mascaras = [liso, claro, papel].map(m => new Uint8Array(m.data));
  [f32, mu, mu2, sq, liso, claro, kAbre, kFecha].forEach(m => m.delete());
  ctxTextura = { var_, std8, papel };

  // 2) Bordas (Canny) — só quadriláteros limpos (o casco convexo das bordas engloba o fundo).
  const bordas = new cv.Mat();
  cv.Canny(desfoque, bordas, 50, 150);
  const k3 = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
  cv.dilate(bordas, bordas, k3);
  lista = lista.concat(candidatos(bordas, areaMin, 'bordas', false));
  bordas.delete(); k3.delete();
  rgba.delete(); desfoque.delete();

  let melhor = null; let nota = 0;
  for (const c of lista) {
    const n = avaliarCandidato(c, cinza, ctxTextura.std8, ctxTextura.papel, largura, altura);
    if (self.__depurar) (self.__notas = self.__notas || []).push({ origem: c.origem, n: Math.round(n * 100) / 100, pts: c.pts.map(p => [Math.round(p.x), Math.round(p.y)]) });
    if (n > nota) { nota = n; melhor = c; }
  }
  cinza.delete(); ctxTextura.var_.delete(); ctxTextura.std8.delete(); ctxTextura.papel.delete();
  return { cantos: melhor ? melhor.pts.flatMap(p => [p.x, p.y]) : null, nitidez, origem: melhor ? melhor.origem : null };
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
    if (m.tipo === 'detectar') {
      self.__depurar = !!m.depurar; self.__notas = [];
      const r = detectar(m.largura, m.altura, m.buffer);
      responder({ tipo: 'detectado', ...r, ...(m.depurar ? { mascaras: self.__mascaras, notas: self.__notas } : {}) });
      return;
    }
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
