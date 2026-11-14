import { describe, it, expect } from 'vitest';
import { decidirVisibilidade, type EstadoRolagem } from '../ocultarAoRolar';

const M = (y: number) => ({ y, alturaVisivel: 800, alturaTotal: 3000 });
const rolar = (ys: number[]) => {
  let e: EstadoRolagem = { ultimoY: 0, acumulado: 0 };
  let vis = true;
  for (const y of ys) { const r = decidirVisibilidade(e, M(y)); e = r.estado; if (r.visivel !== null) vis = r.visivel; }
  return vis;
};

describe('ocultar a barra ao rolar (4e)', () => {
  it('no topo (< 56 px) fica visível', () => { expect(rolar([20, 40, 55])).toBe(true); });
  it('oculta após 8 px acumulados para baixo', () => { expect(rolar([100, 104, 108])).toBe(false); });
  it('não oculta com menos de 8 px no mesmo sentido', () => { expect(rolar([50, 53, 57])).toBe(true); });
  it('volta ao rolar 8 px para cima', () => { expect(rolar([100, 200, 195, 191])).toBe(true); });
  it('quique: mudança de sentido zera o acumulado', () => { expect(rolar([100, 200, 196, 199, 195])).toBe(false); });
  it('fim da página mostra', () => { expect(rolar([100, 300, 2200])).toBe(true); });
  it('página curta: sempre visível', () => {
    expect(decidirVisibilidade({ ultimoY: 0, acumulado: 0 }, { y: 0, alturaVisivel: 800, alturaTotal: 800 }).visivel).toBe(true);
  });
});
