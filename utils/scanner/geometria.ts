// Ficheiro: utils/scanner/geometria.ts
// Geometria dos 4 cantos do documento no scanner (components/scanner): ordenação, área, convexidade,
// escala entre o frame de análise e a foto em resolução cheia e cantos padrão para o ajuste manual.

export interface Ponto { x: number; y: number }
/** Sempre na ordem sup-esq, sup-dir, inf-dir, inf-esq. */
export type Cantos = [Ponto, Ponto, Ponto, Ponto];

/** [x0,y0,…,x3,y3] (formato do worker) → Cantos ordenados. */
export const cantosDeLista = (l: ArrayLike<number>): Cantos =>
  ordenarCantos([0, 1, 2, 3].map(i => ({ x: l[i * 2], y: l[i * 2 + 1] })));

export const cantosParaLista = (c: Cantos): number[] => c.flatMap(p => [p.x, p.y]);

/**
 * Ordena 4 pontos quaisquer em sup-esq, sup-dir, inf-dir, inf-esq: primeiro em volta do centro (sentido
 * horário, sem cruzar lados) e depois rotaciona a lista para começar no ponto de menor x + y.
 */
export const ordenarCantos = (pts: Ponto[]): Cantos => {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const horario = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let ini = 0;
  horario.forEach((p, i) => { if (p.x + p.y < horario[ini].x + horario[ini].y) ini = i; });
  const o = [0, 1, 2, 3].map(k => horario[(ini + k) % 4]);
  return [o[0], o[1], o[2], o[3]];
};

export const area = (c: Ponto[]): number => {
  let s = 0;
  for (let i = 0; i < c.length; i++) {
    const a = c[i];
    const b = c[(i + 1) % c.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
};

/** Quadrilátero convexo e não degenerado (todos os produtos vetoriais com o mesmo sinal). */
export const convexo = (c: Cantos): boolean => {
  let sinal = 0;
  for (let i = 0; i < 4; i++) {
    const a = c[i];
    const b = c[(i + 1) % 4];
    const d = c[(i + 2) % 4];
    const z = (b.x - a.x) * (d.y - b.y) - (b.y - a.y) * (d.x - b.x);
    if (Math.abs(z) < 1e-6) return false;
    const s = Math.sign(z);
    if (sinal && s !== sinal) return false;
    sinal = s;
  }
  return true;
};

export const escalarCantos = (c: Cantos, fx: number, fy: number = fx): Cantos =>
  c.map(p => ({ x: p.x * fx, y: p.y * fy })) as Cantos;

/** Maior deslocamento entre cantos correspondentes. */
export const deslocamentoMax = (a: Cantos, b: Cantos): number =>
  Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));

/** Cantos padrão do ajuste manual (quando a detecção falha): retângulo com 8% de margem. */
export const cantosPadrao = (largura: number, altura: number, margem = 0.08): Cantos => {
  const mx = largura * margem;
  const my = altura * margem;
  return [{ x: mx, y: my }, { x: largura - mx, y: my }, { x: largura - mx, y: altura - my }, { x: mx, y: altura - my }];
};

/** Mantém o ponto dentro da imagem. */
export const limitarPonto = (p: Ponto, largura: number, altura: number): Ponto => ({
  x: Math.min(largura, Math.max(0, p.x)),
  y: Math.min(altura, Math.max(0, p.y)),
});
