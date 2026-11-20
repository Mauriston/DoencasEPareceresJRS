import { describe, expect, it, vi } from 'vitest';

vi.mock('../examesIS', () => ({ listarDocumentosDasISDoInspecionado: vi.fn() }));
vi.mock('../afastamentosIS', () => ({ listarAfastamentosECidsDoInspecionado: vi.fn() }));

import { listarDocumentosDasISDoInspecionado } from '../examesIS';
import { listarAfastamentosECidsDoInspecionado } from '../afastamentosIS';
import { agruparCidsIS, carregarDadosISDaFicha, faixa12MesesIS, resumoIS, urlParaModal } from '../fichaDados';

const periodos = [
  { tipo: 'lts' as const, dataInicio: '2026-12-20', dataFim: '2027-01-18', dias: 30 },
  { tipo: 'restricoes' as const, dataInicio: '2025-03-01', dataFim: '2025-03-10', dias: 10 },
];

describe('resumoIS', () => {
  it('conta IS do ano (sem canceladas) e dias no ano e no total', () => {
    const is = [
      { dataAbertura: '2026-12-01', status: 'tis_assinado' }, { dataAbertura: '2025-02-01', status: 'tis_assinado' },
      { dataAbertura: '2026-01-01', status: 'cancelada' }, { dataAbertura: '2026-05-01', status: 'aberta' },
    ];
    expect(resumoIS(is, periodos, '2026-11-20')).toEqual({
      ano: 2026, isNoAno: 2, isTotal: 3, lts: { ano: 12, total: 30 }, restricoes: { ano: 0, total: 10 },
    });
  });
});

describe('faixa12MesesIS', () => {
  it('marca os meses com LTS ou restrições', () => {
    const f = faixa12MesesIS(periodos, '2027-01-05');
    expect(f).toHaveLength(12);
    expect(f[11]).toMatchObject({ chave: '2027-01', rotulo: 'jan', tipo: 'lts' });
    expect(f[10]).toMatchObject({ chave: '2026-12', tipo: 'lts' });
    expect(f[9].tipo).toBeNull();
  });
});

describe('agruparCidsIS', () => {
  it('agrupa o mesmo CID e ordena por frequência', () => {
    expect(agruparCidsIS([{ cid: 'Dor lombar M54.5', isNumero: 1 }, { cid: 'dor lombar  m54.5', isNumero: 2 }, { cid: 'Gonartrose M17', isNumero: 2 }, { cid: ' ', isNumero: 3 }]))
      .toEqual([
        { chave: 'dor lombar m54.5', texto: 'Dor lombar M54.5', n: 2, isNumeros: [1, 2] },
        { chave: 'gonartrose m17', texto: 'Gonartrose M17', n: 1, isNumeros: [2] },
      ]);
  });
});

describe('carregarDadosISDaFicha', () => {
  it('uma fonte que falha não derruba a outra', async () => {
    vi.mocked(listarDocumentosDasISDoInspecionado).mockRejectedValue(new Error('sem permissão'));
    vi.mocked(listarAfastamentosECidsDoInspecionado).mockResolvedValue({ afastamentos: [], cids: [{ cid: 'X', isId: '1', isNumero: 1, data: '', finalidade: '', origem: 'is' }] });
    const r = await carregarDadosISDaFicha('123');
    expect(r.exames).toEqual([]);
    expect(r.atestados).toEqual([]);
    expect(r.cids).toHaveLength(1);
    expect(listarDocumentosDasISDoInspecionado).toHaveBeenCalledWith('123', { comUrl: false });
  });
});

describe('urlParaModal', () => {
  it('Drive vira preview; demais passam direto', () => {
    expect(urlParaModal('https://drive.google.com/file/d/abc123/view')).toBe('https://drive.google.com/file/d/abc123/preview');
    expect(urlParaModal('https://x.com/a.pdf')).toBe('https://x.com/a.pdf');
  });
});
