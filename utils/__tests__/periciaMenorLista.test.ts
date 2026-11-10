import { describe, it, expect } from 'vitest';
import { dataReferenciaPericia, formatarMedicoPerito, medicoDaPericia, codigoCid, rotuloCidAbreviado, indiceCidAbreviado, tiposDispensa } from '../periciaMenorLista';

describe('dataReferenciaPericia', () => {
  it('Registrar atestado: data da perícia (= do atestado) e dias de dispensa', () => {
    expect(dataReferenciaPericia({ dataAtestado: '2026-11-03', tempoAtestado: 5, tempoHomologado: 5 })).toEqual({ data: '2026-11-03', dias: 5 });
    expect(dataReferenciaPericia({ dataAtestado: '2026-11-03', dataPericia: '2026-11-04', tempoHomologado: 5 })).toEqual({ data: '2026-11-04', dias: 5 });
  });
  it('Homologar atestado: data de emissão do atestado e dias homologados', () => {
    expect(dataReferenciaPericia({ homologacao: true, dataAtestado: '2026-11-01', dataPericia: '2026-11-04', tempoAtestado: 30, tempoHomologado: 10 })).toEqual({ data: '2026-11-01', dias: 10 });
  });
});

describe('formatarMedicoPerito / medicoDaPericia', () => {
  it('posto em maiúsculas e nome de guerra só com a inicial', () => {
    expect(formatarMedicoPerito('CT MAURISTON')).toBe('CT Mauriston');
    expect(formatarMedicoPerito('ct mauriston')).toBe('CT Mauriston');
    expect(formatarMedicoPerito('1T JOÃO DA SILVA')).toBe('1T João da Silva');
    expect(formatarMedicoPerito('CMG ANA-LÚCIA')).toBe('CMG Ana-Lúcia');
    expect(formatarMedicoPerito('MAURISTON')).toBe('Mauriston');
    expect(formatarMedicoPerito('')).toBe('');
  });
  it('usa peritoNome quando traz posto; senão peritoUsuario', () => {
    expect(medicoDaPericia({ peritoNome: 'CC FULANO', peritoUsuario: 'CT MAURISTON' })).toBe('CC Fulano');
    expect(medicoDaPericia({ peritoNome: 'MAURISTON SOUZA', peritoUsuario: 'CT MAURISTON' })).toBe('CT Mauriston');
    expect(medicoDaPericia({ peritoNome: 'MAURISTON SOUZA', peritoUsuario: '' })).toBe('Mauriston Souza');
  });
});

describe('CID abreviado', () => {
  const idx = indiceCidAbreviado([{ SUBCAT: 'M232', DESCRABREV: 'M23.2 Transt menisco desarranjo' }]);
  it('extrai o código do cidCodigo ou do rótulo', () => {
    expect(codigoCid({ cidCodigo: 'M232' })).toBe('M232');
    expect(codigoCid({ cid: 'M23.2 - Transtorno do menisco' })).toBe('M232');
    expect(codigoCid({ cid: 'G432 - Estado de mal' })).toBe('G432');
    expect(codigoCid({ cid: 'texto livre' })).toBe('');
  });
  it('mostra código — descrição abreviada; sem índice, o rótulo gravado', () => {
    expect(rotuloCidAbreviado({ cid: 'M23.2 - Transtorno do menisco' }, idx)).toBe('M23.2 — Transt menisco desarranjo');
    expect(rotuloCidAbreviado({ cid: 'M23.2 - Transtorno do menisco' }, null)).toBe('M23.2 - Transtorno do menisco');
    expect(rotuloCidAbreviado({ cid: 'Z00 - Outro' }, idx)).toBe('Z00 - Outro');
  });
});

describe('tiposDispensa', () => {
  it('separa Dispensas (todas as atividades) de Restrições', () => {
    expect(tiposDispensa(['TODAS AS ATIVIDADES'])).toEqual({ dispensa: true, restricoes: false });
    expect(tiposDispensa(['TFM', 'SERVIÇO ARMADO'])).toEqual({ dispensa: false, restricoes: true });
    expect(tiposDispensa(['TODAS AS ATIVIDADES', 'TFM'])).toEqual({ dispensa: true, restricoes: true });
    expect(tiposDispensa([])).toEqual({ dispensa: false, restricoes: false });
    expect(tiposDispensa(undefined)).toEqual({ dispensa: false, restricoes: false });
  });
});
