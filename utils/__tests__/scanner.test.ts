import { describe, expect, it } from 'vitest';
import { area, cantosDeLista, cantosPadrao, convexo, deslocamentoMax, escalarCantos, limitarPonto, ordenarCantos, type Cantos } from '../scanner/geometria';
import { CONFIG_PADRAO, ESTADO_INICIAL, avaliar, type EstadoEstabilidade } from '../scanner/estabilidade';
import { imagensParaPdf } from '../imagensParaPdf';

const W = 640;
const H = 480;
const doc: Cantos = [{ x: 150, y: 60 }, { x: 520, y: 95 }, { x: 480, y: 440 }, { x: 110, y: 400 }];
const desloca = (c: Cantos, dx: number, dy = 0): Cantos => c.map(p => ({ x: p.x + dx, y: p.y + dy })) as Cantos;

describe('geometria do scanner', () => {
  it('ordena cantos embaralhados em sup-esq, sup-dir, inf-dir, inf-esq', () => {
    expect(ordenarCantos([doc[2], doc[0], doc[3], doc[1]])).toEqual(doc);
  });

  it('ordena um documento girado ~15° (caso em que a ordenação por ângulo fixo falhava)', () => {
    const girado: Cantos = [{ x: 200, y: 40 }, { x: 560, y: 140 }, { x: 460, y: 470 }, { x: 100, y: 370 }];
    expect(ordenarCantos([girado[3], girado[1], girado[0], girado[2]])).toEqual(girado);
  });

  it('cantosDeLista converte o formato do worker', () => {
    expect(cantosDeLista([480, 440, 150, 60, 110, 400, 520, 95])).toEqual(doc);
  });

  it('área e convexidade', () => {
    expect(area(cantosPadrao(100, 50, 0))).toBe(5000);
    expect(convexo(doc)).toBe(true);
    const cruzado: Cantos = [doc[0], doc[2], doc[1], doc[3]];
    expect(convexo(cruzado)).toBe(false);
  });

  it('escala, deslocamento e limites', () => {
    expect(escalarCantos(doc, 2)[1]).toEqual({ x: 1040, y: 190 });
    expect(deslocamentoMax(doc, desloca(doc, 3, 4))).toBe(5);
    expect(limitarPonto({ x: -5, y: 900 }, W, H)).toEqual({ x: 0, y: H });
    expect(cantosPadrao(100, 100, 0.1)[0]).toEqual({ x: 10, y: 10 });
  });
});

describe('disparo automático', () => {
  const rodar = (seq: (Cantos | null)[], nitidez = 200, inicial: EstadoEstabilidade = ESTADO_INICIAL) => {
    let e = inicial;
    return seq.map(c => { const a = avaliar(e, c, nitidez, W, H); e = a.estado; return a; });
  };

  it('dispara depois de N detecções paradas e nítidas', () => {
    const r = rodar(Array(CONFIG_PADRAO.quadrosEstaveis + 1).fill(doc));
    expect(r.slice(0, -1).every(a => a.situacao === 'segure')).toBe(true);
    expect(r[r.length - 1].situacao).toBe('capturar');
  });

  it('tremor pequeno não zera; movimento grande zera a contagem', () => {
    const r = rodar([doc, desloca(doc, 2), desloca(doc, 1), desloca(doc, 60), desloca(doc, 60)]);
    expect(r[2].progresso).toBeGreaterThan(0);
    expect(r[3].progresso).toBe(0);
  });

  it('não dispara com imagem tremida', () => {
    const r = rodar(Array(CONFIG_PADRAO.quadrosEstaveis + 3).fill(doc), 10);
    expect(r.some(a => a.situacao === 'capturar')).toBe(false);
    expect(r[r.length - 1].situacao).toBe('desfocado');
  });

  it('documento pequeno no quadro pede para aproximar', () => {
    const pequeno = cantosPadrao(100, 80, 0).map(p => ({ x: p.x + 10, y: p.y + 10 })) as Cantos;
    expect(rodar([pequeno, pequeno])[1].situacao).toBe('aproxime');
  });

  it('sem documento: procurando', () => {
    expect(rodar([null])[0].situacao).toBe('procurando');
  });

  it('depois do disparo só rearma quando a página sai do quadro ou muda', () => {
    const n = CONFIG_PADRAO.quadrosEstaveis + 1;
    const r1 = rodar(Array(n).fill(doc));
    let e = r1[r1.length - 1].estado;
    expect(e.armado).toBe(false);
    // Mesma página parada: não dispara de novo.
    for (let i = 0; i < n * 2; i++) {
      const a = avaliar(e, doc, 200, W, H);
      expect(a.situacao).toBe('aguardando-troca');
      e = a.estado;
    }
    // Página retirada: rearma e volta a disparar com a próxima.
    e = avaliar(e, null, 200, W, H).estado;
    expect(e.armado).toBe(true);
    const r2 = rodar(Array(n).fill(doc), 200, e);
    expect(r2[r2.length - 1].situacao).toBe('capturar');
  });

  it('rearma quando a página muda bastante de posição (troca sem tirar do quadro)', () => {
    const n = CONFIG_PADRAO.quadrosEstaveis + 1;
    const e = rodar(Array(n).fill(doc))[n - 1].estado;
    const outra = desloca(doc, 120, 30);
    expect(avaliar(e, outra, 200, W, H).estado.armado).toBe(true);
  });
});

describe('imagensParaPdf', () => {
  // PNG 2×1 válido (RGB).
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAAD0lEQVR4nGP4z8DA8J8BAAf/Af8Bf4mnAAAAAElFTkSuQmCC';

  it('gera um PDF com uma página por imagem', async () => {
    const blob = await imagensParaPdf([png, png, png]);
    const texto = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
    expect(texto.startsWith('%PDF')).toBe(true);
    expect((texto.match(/\/Type \/Page\b/g) || []).length).toBe(3);
  });

  it('recusa lista vazia', async () => {
    await expect(imagensParaPdf([])).rejects.toThrow();
  });
});
