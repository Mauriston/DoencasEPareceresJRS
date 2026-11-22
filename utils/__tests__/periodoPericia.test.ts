import { describe, expect, it } from 'vitest';
import { dataReferenciaPericia, intervaloPeriodo, noPeriodo, periodoDaUrl } from '../periodoPericia';

describe('período da Perícia Menor', () => {
  const hoje = '2026-11-19';
  it('mês, trimestre, semestre e ano civis', () => {
    expect(intervaloPeriodo('mes', hoje)).toEqual({ inicio: '2026-11-01', fim: '2026-11-30' });
    expect(intervaloPeriodo('trimestre', hoje)).toEqual({ inicio: '2026-10-01', fim: '2026-12-31' });
    expect(intervaloPeriodo('semestre', '2026-03-05')).toEqual({ inicio: '2026-01-01', fim: '2026-06-30' });
    expect(intervaloPeriodo('ano', hoje)).toEqual({ inicio: '2026-01-01', fim: '2026-12-31' });
    expect(intervaloPeriodo('mes', '2028-02-10')?.fim).toBe('2028-02-29');
    expect(intervaloPeriodo('', hoje)).toBeNull();
  });
  it('personalizado: de/até, um lado aberto e invertidos', () => {
    expect(intervaloPeriodo('personalizado', hoje, '2026-10-01', '2026-10-15')).toEqual({ inicio: '2026-10-01', fim: '2026-10-15' });
    expect(intervaloPeriodo('personalizado', hoje, '2026-10-01', '')).toEqual({ inicio: '2026-10-01', fim: '9999-12-31' });
    expect(intervaloPeriodo('personalizado', hoje, '2026-10-15', '2026-10-01')).toEqual({ inicio: '2026-10-01', fim: '2026-10-15' });
    expect(intervaloPeriodo('personalizado', hoje, '', '')).toBeNull();
  });
  it('URL com os atalhos antigos', () => {
    expect(periodoDaUrl({ periodo: 'trimestre' })).toBe('trimestre');
    expect(periodoDaUrl({ mes: 'atual' })).toBe('mes');
    expect(periodoDaUrl({ ano: 'atual' })).toBe('ano');
    expect(periodoDaUrl({ periodo: 'xyz' })).toBe('');
  });
  it('data de referência: atestado ou data da homologação', () => {
    expect(dataReferenciaPericia({ dataAtestado: '2026-11-02' })).toBe('2026-11-02');
    expect(dataReferenciaPericia({ dataAtestado: '2026-10-02', dataPericia: '2026-11-05', homologacao: true })).toBe('2026-11-05');
    // a data de gravação no banco (criadoEm) não conta
    expect(dataReferenciaPericia({ dataAtestado: '2026-10-02', dataPericia: '2026-10-03', criadoEm: { toDate: () => new Date(2026, 10, 20) } } as any)).toBe('2026-10-02');
    expect(noPeriodo('2026-11-05', { inicio: '2026-11-01', fim: '2026-11-30' })).toBe(true);
    expect(noPeriodo('2026-12-01', { inicio: '2026-11-01', fim: '2026-11-30' })).toBe(false);
  });
});
