import { describe, expect, it } from 'vitest';
import {
  cidsFrequentes, compararParaLista, contagemTermino, contarPorMilitar, diasDecorridos, faixa12Meses, partesCid,
  postoDoInspecionado, repeticaoCid, resumoPericias, rotuloHistorico, tipoDaPericia,
} from '../periciaMenorResumo';

const HOJE = '2026-11-14';
const p = (dataAtestado: string, dataTermino: string, tempoHomologado: number, dispensas: string[], cid = '', extra = {}) =>
  ({ dataAtestado, dataTermino, tempoHomologado, dispensas, cid, ...extra });

describe('contagemTermino', () => {
  it('conta os dias que faltam', () => {
    expect(contagemTermino('2026-11-16', HOJE)).toMatchObject({ texto: 'termina em 2 dias', curto: 'em 2 dias', titulo: 'Termina em 2 dias', tom: 'futuro', dias: 2 });
    expect(contagemTermino('2026-11-15', HOJE).texto).toBe('termina amanhã');
    expect(contagemTermino(HOJE, HOJE)).toMatchObject({ texto: 'termina hoje', curto: 'hoje', tom: 'hoje' });
  });
  it('diz quando terminou', () => {
    expect(contagemTermino('2026-11-07', HOJE)).toMatchObject({ texto: 'terminou 07/11', curto: '07/11', tom: 'passado' });
    expect(contagemTermino('', HOJE).curto).toBe('—');
  });
});

describe('diasDecorridos', () => {
  it('conta o dia do atestado como o 1º e limita ao total', () => {
    expect(diasDecorridos({ dataAtestado: '2026-11-12', tempoHomologado: 5 }, HOJE)).toEqual({ decorridos: 3, total: 5 });
    expect(diasDecorridos({ dataAtestado: '2026-10-01', tempoHomologado: 5 }, HOJE)).toEqual({ decorridos: 5, total: 5 });
    expect(diasDecorridos({ dataAtestado: '2026-11-20', tempoHomologado: 5 }, HOJE)).toEqual({ decorridos: 0, total: 5 });
  });
});

describe('tipo e CID', () => {
  it('Dispensa total vence restrições', () => {
    expect(tipoDaPericia(['TODAS AS ATIVIDADES', 'TAF'])).toBe('dispensa');
    expect(tipoDaPericia(['TAF'])).toBe('restricoes');
    expect(tipoDaPericia([])).toBe('nenhum');
  });
  it('separa código e descrição, em caixa de frase', () => {
    expect(partesCid({ cid: 'M54.5 - DOR LOMBAR BAIXA' })).toEqual({ codigo: 'M54.5', descricao: 'Dor lombar baixa' });
    expect(partesCid({ cid: 'M54.5 - DOR LOMBAR BAIXA' }, new Map([['M545', 'M54.5 Dor lombar baixa']]))).toEqual({ codigo: 'M54.5', descricao: 'Dor lombar baixa' });
    expect(partesCid({ cid: '' })).toEqual({ codigo: '', descricao: '' });
  });
});

describe('resumo, faixa e CID frequentes', () => {
  const lista = [
    p('2026-11-12', '2026-11-16', 5, ['TODAS AS ATIVIDADES'], 'M54.5 - DOR LOMBAR BAIXA'),
    p('2026-09-02', '2026-09-08', 7, ['TODAS AS ATIVIDADES'], 'M54.5 - DOR LOMBAR BAIXA', { vdf: true }),
    p('2026-06-14', '2026-07-13', 30, ['TAF'], 'S83.6 - ENTORSE DO JOELHO'),
    p('2025-11-01', '2025-11-05', 5, ['TODAS AS ATIVIDADES'], 'J11 - INFLUENZA'),
  ];
  it('tabela 2 × 3', () => {
    expect(resumoPericias(lista, HOJE)).toEqual({
      dispensa: { d30: 5, m12: 12, total: 17 }, restricoes: { d30: 0, m12: 30, total: 30 }, registros: 4, vigentes: 1, vdf: 1,
    });
  });
  it('faixa dos 12 meses até o mês atual', () => {
    const f = faixa12Meses(lista, HOJE);
    expect(f).toHaveLength(12);
    expect(f[0]).toMatchObject({ chave: '2025-12', rotulo: 'dez', tipo: null });
    expect(f.find(m => m.chave === '2026-06')?.tipo).toBe('restricoes');
    expect(f.find(m => m.chave === '2026-07')?.tipo).toBe('restricoes');
    expect(f.find(m => m.chave === '2026-09')?.tipo).toBe('dispensa');
    expect(f[11]).toMatchObject({ chave: '2026-11', tipo: 'dispensa' });
  });
  it('CID mais frequentes e repetição em texto', () => {
    expect(cidsFrequentes(lista)[0]).toMatchObject({ codigo: 'M54.5', n: 2 });
    expect(repeticaoCid(lista)).toBe('M54.5 se repete — 2 das 4 perícias.');
    expect(repeticaoCid(lista.slice(2))).toBeNull();
  });
});

describe('lista', () => {
  it('conta registros por militar', () => {
    const m = contarPorMilitar([{ ...p('2026-01-01', '', 1, []), militarId: '1' }, { ...p('2026-01-02', '', 1, []), militarId: '1' }, { ...p('2026-01-03', '', 1, []), inspecionado: 'X' }]);
    expect(m.get('1')).toBe(2);
    expect(m.get('X')).toBe(1);
    expect(rotuloHistorico(1)).toBe('1º registro');
    expect(rotuloHistorico(4)).toBe('4 no histórico');
  });
  it('vigentes primeiro, pelo término mais próximo', () => {
    const a = p('2026-11-10', '2026-11-20', 10, []);
    const b = p('2026-11-13', '2026-11-14', 2, []);
    const c = p('2026-11-01', '2026-11-07', 7, []);
    expect([c, a, b].sort((x, y) => compararParaLista(x, y, HOJE))).toEqual([b, a, c]);
  });
  it('posto sem o NIP', () => {
    expect(postoDoInspecionado('CB-MO 12.3456.78 RICARDO ALVES BEZERRA', 'RICARDO ALVES BEZERRA')).toBe('CB-MO');
    expect(postoDoInspecionado('1T (IM) 44.4444.44 PACIENTE DE TESTE', 'PACIENTE DE TESTE')).toBe('1T (IM)');
  });
});
