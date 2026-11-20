import { describe, expect, it } from 'vitest';
import { LIMITE_PDF_BYTES, LIMITE_PDF_MB, erroTamanhoPdf, exigirLimitePdf, formatarTamanho } from '../../config/limitePdf';
import { NIVEIS_COMPRESSAO, ajustarAoLimite, type NivelCompressao } from '../limitePdf';

// Página falsa: "tamanho" em bytes no texto; a recompressão escala pelo nível (lado² × qualidade).
const pagina = (bytes: number) => `pg:${bytes}`;
const bytesDe = (p: string) => Number(p.split(':')[1]);
const base = NIVEIS_COMPRESSAO[0];
const fator = (n: NivelCompressao) => ((n.lado / base.lado) ** 2) * (n.qualidade / base.qualidade);
const dep = (chamadas: string[] = []) => ({
  gerarPdf: async (ps: string[]) => { chamadas.push('pdf'); return new Blob([new Uint8Array(ps.reduce((s, p) => s + bytesDe(p), 0) + 1000)]); },
  recomprimir: async (p: string, n: NivelCompressao) => { chamadas.push(`rec:${n.lado}`); return pagina(Math.round(bytesDe(p) * fator(n))); },
});
const MB = 1024 * 1024;

describe('limite de 10 MB por PDF', () => {
  it('constante única de 10 MB', () => {
    expect(LIMITE_PDF_MB).toBe(10);
    expect(LIMITE_PDF_BYTES).toBe(10 * MB);
  });

  it('mensagens e formatação', () => {
    expect(erroTamanhoPdf(10 * MB - 1)).toBe('');
    expect(erroTamanhoPdf(10 * MB)).not.toBe(''); // Storage: size < 10 MB
    expect(erroTamanhoPdf(10 * MB + 1, 'exames.pdf')).toMatch(/exames\.pdf tem 10,0 MB — acima do limite de 10 MB/);
    expect(() => exigirLimitePdf(11 * MB)).toThrow(/10 MB/);
    expect(formatarTamanho(2.4 * MB)).toBe('2,4 MB');
    expect(formatarTamanho(830 * 1024)).toBe('830 KB');
  });

  it('cabe de primeira: sem recompressão, mede o Blob gerado', async () => {
    const ch: string[] = [];
    const r = await ajustarAoLimite([pagina(2 * MB), pagina(1 * MB)], dep(ch));
    expect(r).toMatchObject({ nivel: 0, excede: false, bytes: 3 * MB + 1000 });
    expect(r.pdf.size).toBe(r.bytes);
    expect(ch).toEqual(['pdf']);
  });

  it('passa do limite: recomprime no nível mais leve que couber', async () => {
    const ch: string[] = [];
    const r = await ajustarAoLimite(Array.from({ length: 6 }, () => pagina(2 * MB)), dep(ch)); // 12 MB
    expect(r.excede).toBe(false);
    expect(r.nivel).toBe(1);
    expect(r.bytes).toBeLessThan(10 * MB);
    expect(r.paginas.every(p => bytesDe(p) < 2 * MB)).toBe(true);
    expect(ch.filter(c => c === 'pdf')).toHaveLength(2);
  });

  it('recomprime sempre a partir das originais (não acumula perda)', async () => {
    const fatorPiso = fator(NIVEIS_COMPRESSAO[3]);
    const r = await ajustarAoLimite(Array.from({ length: 12 }, () => pagina(2 * MB)), dep()); // 24 MB → só o piso cabe
    expect(r.nivel).toBe(3);
    expect(bytesDe(r.paginas[0])).toBe(Math.round(2 * MB * fatorPiso));
  });

  it('nem o piso cabe: excede = true (a tela bloqueia)', async () => {
    const r = await ajustarAoLimite(Array.from({ length: 40 }, () => pagina(2 * MB)), dep());
    expect(r.excede).toBe(true);
    expect(r.nivel).toBe(NIVEIS_COMPRESSAO.length - 1);
    expect(r.bytes).toBeGreaterThan(10 * MB);
  });

  it('piso de legibilidade: nenhum nível abaixo de 1200 px / qualidade 0,6', () => {
    for (const n of NIVEIS_COMPRESSAO) {
      expect(n.lado).toBeGreaterThanOrEqual(1200);
      expect(n.qualidade).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('lista vazia é erro', async () => {
    await expect(ajustarAoLimite([], dep())).rejects.toThrow();
  });
});
