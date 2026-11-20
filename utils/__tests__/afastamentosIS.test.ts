import { describe, it, expect } from 'vitest';
import {
  assinaturaFonteAfastamentos, cidsDasIS, dataDaIS, extrairAfastamentosDoTexto, isGeraAfastamentos,
  montarAfastamentosIS, normalizarAfastamentosIA,
} from '../afastamentosIS';

describe('afastamentos das IS — fallback por regex', () => {
  it('"Apto com restrições por 30 dias" → Restrições 30', () => {
    expect(extrairAfastamentosDoTexto('Apto com restrições por 30 dias')).toEqual([{ tipo: 'restricoes', dias: 30 }]);
  });

  it('LTS escrita por extenso e com o número entre parênteses', () => {
    expect(extrairAfastamentosDoTexto('Incapaz temporariamente para o SAM, necessitando de 30 (trinta) dias de licença para tratamento de saúde própria.'))
      .toEqual([{ tipo: 'lts', dias: 30 }]);
    expect(extrairAfastamentosDoTexto('Necessita de sessenta dias de LTS')).toEqual([{ tipo: 'lts', dias: 60 }]);
    expect(extrairAfastamentosDoTexto('Incapaz temporariamente para o SAM por 2 meses')).toEqual([{ tipo: 'lts', dias: 60 }]);
  });

  it('LTS seguida de restrições: duas entradas, a segunda encadeada', () => {
    expect(extrairAfastamentosDoTexto('Incapaz temporariamente para o SAM por 30 dias e, após, apto com restrições por 60 dias'))
      .toEqual([{ tipo: 'lts', dias: 30 }, { tipo: 'restricoes', dias: 60, aposAnterior: true }]);
    expect(extrairAfastamentosDoTexto('LTS por 15 dias. Restrições por 90 dias.'))
      .toEqual([{ tipo: 'lts', dias: 15 }, { tipo: 'restricoes', dias: 90 }]);
  });

  it('sem palavra-chave junto ao número: "apto" com restrições preenchidas → Restrições; sem duração → nada', () => {
    expect(extrairAfastamentosDoTexto('Apto para o SAM. Reavaliar em 45 dias', 'Marchas; Embarque')).toEqual([{ tipo: 'restricoes', dias: 45 }]);
    expect(extrairAfastamentosDoTexto('Apto para o SAM')).toEqual([]);
    expect(extrairAfastamentosDoTexto('Apto para o SAM. Retorno em 30 dias')).toEqual([]);
    expect(extrairAfastamentosDoTexto('')).toEqual([]);
  });

  it('duração no campo Restrições e repetição ignorada', () => {
    expect(extrairAfastamentosDoTexto('Apto com restrições', 'Marchas por 30 dias')).toEqual([{ tipo: 'restricoes', dias: 30 }]);
    expect(extrairAfastamentosDoTexto('Apto com restrições por 30 dias', 'Marchas por 30 dias')).toEqual([{ tipo: 'restricoes', dias: 30 }]);
  });
});

describe('afastamentos das IS — leitura da IA e períodos', () => {
  it('normaliza a resposta da IA: tipo desconhecido e dias inválidos saem', () => {
    expect(normalizarAfastamentosIA({ afastamentos: [
      { tipo: 'LTS', dias: 30 }, { tipo: 'restricoes', dias: '60', aposAnterior: true }, { tipo: 'ferias', dias: 10 },
      { tipo: 'lts', dias: 0 }, { tipo: 'lts', dias: 2.5 }, { tipo: 'lts', dias: 99999 },
    ] })).toEqual([{ tipo: 'lts', dias: 30 }, { tipo: 'restricoes', dias: 60, aposAnterior: true }]);
    expect(normalizarAfastamentosIA(null)).toEqual([]);
  });

  it('monta os períodos: início na data da IS; encadeado começa no dia seguinte ao fim do anterior', () => {
    const r = montarAfastamentosIS(
      [{ tipo: 'lts', dias: 30 }, { tipo: 'restricoes', dias: 60, aposAnterior: true }, { tipo: 'restricoes', dias: 10 }],
      '2026-11-05', ' Lombalgia M54.5 ', 'Marchas',
    );
    expect(r).toEqual([
      { tipo: 'lts', dias: 30, dataInicio: '2026-11-05', dataFim: '2026-12-04', cid: 'Lombalgia M54.5' },
      { tipo: 'restricoes', dias: 60, dataInicio: '2026-12-05', dataFim: '2027-02-02', cid: 'Lombalgia M54.5', restricoes: 'Marchas' },
      { tipo: 'restricoes', dias: 10, dataInicio: '2026-11-05', dataFim: '2026-11-14', cid: 'Lombalgia M54.5', restricoes: 'Marchas' },
    ]);
    expect(montarAfastamentosIS([{ tipo: 'lts', dias: 30 }], '', '')).toEqual([]);
  });

  it('elegibilidade, data da IS e assinatura da fonte', () => {
    expect(isGeraAfastamentos({ status: 'tis_assinado', grupoFinalidade: 'Verificações e Términos' })).toBe(true);
    expect(isGeraAfastamentos({ status: 'cancelada', grupoFinalidade: 'Verificações e Términos' })).toBe(false);
    expect(isGeraAfastamentos({ status: 'tis_assinado', grupoFinalidade: 'Benefícios' })).toBe(false);
    expect(dataDaIS({ dataEntrevista: '2026-11-05T09:20', dataLaudo: '2026-11-06', dataAbertura: '2026-10-01' })).toBe('2026-11-05');
    expect(dataDaIS({ dataEntrevista: '', dataLaudo: '2026-11-06', dataAbertura: '2026-10-01' })).toBe('2026-11-06');
    expect(dataDaIS({ dataAbertura: '2026-10-01' })).toBe('2026-10-01');
    expect(assinaturaFonteAfastamentos({ laudo: ' a ', dataIS: '2026-01-01' })).toBe(assinaturaFonteAfastamentos({ laudo: 'a', restricoes: '', dataIS: '2026-01-01' }));
  });

  it('CIDs das IS: o da IS, senão o inferido pela IA; mais recente primeiro', () => {
    const r = cidsDasIS([
      { id: '10', is: 10, cid: 'Lombalgia M54.5', finalidade: 'Término de LTS', dataEntrevista: '2026-01-10T08:00' },
      { id: '20', is: 20, finalidade: 'VDF', dataEntrevista: '2026-06-10T08:00' },
      { id: '30', is: 30, cid: '', dataAbertura: '2026-07-01' },
    ], { 20: 'Gonartrose M17' });
    expect(r).toEqual([
      { cid: 'Gonartrose M17', isId: '20', isNumero: 20, data: '2026-06-10', finalidade: 'VDF', origem: 'ia' },
      { cid: 'Lombalgia M54.5', isId: '10', isNumero: 10, data: '2026-01-10', finalidade: 'Término de LTS', origem: 'is' },
    ]);
  });
});
