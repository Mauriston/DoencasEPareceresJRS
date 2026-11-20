import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebaseAuth', () => ({ app: {} }));
vi.mock('firebase/firestore', () => ({ getFirestore: vi.fn(), collection: vi.fn(), onSnapshot: vi.fn() }));
vi.mock('firebase/storage', () => ({ getStorage: vi.fn(), ref: vi.fn(), getDownloadURL: vi.fn() }));

import {
  categoriaDoExame, cidsDasIS, exameDaFicha, faixa12MesesIS, periodoDoLaudo, periodosDasIS, resumoIS, somarDiasISO,
} from '../fichaDados';

describe('periodoDoLaudo', () => {
  it('lê LTS e restrições do laudo', () => {
    expect(periodoDoLaudo('Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS')).toEqual({ tipo: 'lts', dias: 30 });
    expect(periodoDoLaudo('Apto com restrições por 90 dias')).toEqual({ tipo: 'restricoes', dias: 90 });
    expect(periodoDoLaudo('Apto com restricoes por 60 (sessenta) dias')).toEqual({ tipo: 'restricoes', dias: 60 });
  });
  it('sem prazo ou sem LTS/restrições: null', () => {
    expect(periodoDoLaudo('Apto para o SAM')).toBeNull();
    expect(periodoDoLaudo('Apto com restrições')).toBeNull();
    expect(periodoDoLaudo('')).toBeNull();
    expect(periodoDoLaudo(undefined)).toBeNull();
  });
});

describe('períodos e resumo das IS', () => {
  const lista = [
    { id: '1', laudo: 'Incapaz temporariamente, necessitando de 30 dias de LTS', dataLaudo: '2026-12-20', dataAbertura: '2026-12-01', status: 'tis_assinado' },
    { id: '2', laudo: 'Apto com restrições por 10 dias', dataLaudo: '2025-03-01', dataAbertura: '2025-02-01', status: 'tis_assinado' },
    { id: '3', laudo: 'Apto com restrições por 90 dias', dataLaudo: '2026-01-01', dataAbertura: '2026-01-01', status: 'cancelada' },
    { id: '4', laudo: '', dataAbertura: '2026-05-01', status: 'aberta' },
  ];
  it('somarDiasISO', () => { expect(somarDiasISO('2026-12-20', 29)).toBe('2027-01-18'); });
  it('periodosDasIS ignora canceladas e laudos sem prazo', () => {
    expect(periodosDasIS(lista)).toEqual([
      { isId: '1', tipo: 'lts', inicio: '2026-12-20', fim: '2027-01-18', dias: 30 },
      { isId: '2', tipo: 'restricoes', inicio: '2025-03-01', fim: '2025-03-10', dias: 10 },
    ]);
  });
  it('resumoIS conta IS do ano e dias (no ano e total)', () => {
    expect(resumoIS(lista, '2026-11-20')).toEqual({
      ano: 2026, isNoAno: 2, isTotal: 3, lts: { ano: 12, total: 30 }, restricoes: { ano: 0, total: 10 },
    });
  });
  it('faixa12MesesIS marca os meses com LTS ou restrições', () => {
    const f = faixa12MesesIS(periodosDasIS(lista), '2027-01-05');
    expect(f).toHaveLength(12);
    expect(f[11]).toMatchObject({ chave: '2027-01', tipo: 'lts' });
    expect(f[10]).toMatchObject({ chave: '2026-12', tipo: 'lts' });
    expect(f[9].tipo).toBeNull();
  });
});

describe('exames e CID', () => {
  it('categoria ausente = exame', () => {
    expect(categoriaDoExame({})).toBe('exame');
    expect(categoriaDoExame({ categoria: 'atestado' })).toBe('atestado');
    expect(categoriaDoExame({ categoria: 'outra' })).toBe('exame');
  });
  it('exameDaFicha usa o título do 1º documento', () => {
    expect(exameDaFicha('9', 9, 'e1', { caminho: 'inspecoes/9/exames/e1.pdf', nomeArquivo: 'rm.pdf', itens: [{ titulo: 'RM do joelho', data: '2026-10-01' }] }))
      .toMatchObject({ titulo: 'RM do joelho', data: '2026-10-01', categoria: 'exame', is: 9 });
    expect(exameDaFicha('9', 9, 'e2', { nomeArquivo: 'x.pdf', categoria: 'atestado' })).toMatchObject({ titulo: 'x.pdf', categoria: 'atestado' });
  });
  it('cidsDasIS agrupa e ordena por frequência', () => {
    expect(cidsDasIS([{ cid: 'Dor lombar M54.5' }, { cid: 'dor lombar m54.5' }, { cid: 'Gonartrose M17; Dor lombar M54.5' }, {}, { cid: 3 }]))
      .toEqual([{ chave: 'dor lombar m54.5', texto: 'Dor lombar M54.5', n: 3 }, { chave: 'gonartrose m17', texto: 'Gonartrose M17', n: 1 }]);
  });
});
