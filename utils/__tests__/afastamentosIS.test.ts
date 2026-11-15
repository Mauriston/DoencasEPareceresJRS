import { describe, expect, it } from 'vitest';
import {
  VERSAO_AFASTAMENTOS_IS, afastamentosDasIS, dataBaseAfastamentos, diasDoPeriodo, elegivelAfastamentos, hashEntradaAfastamentos, hashTexto,
  marcadorProcessando, normalizarAfastamentosIA, precisaProcessarAfastamentos, tipoAfastamentoDe, PRAZO_PROCESSANDO_MS, type ISParaAfastamentos,
} from '../afastamentosIS';
import { tipoDaPericia } from '../periciaMenorResumo';

const HOJE = '2026-11-15';
const AGORA = 1_800_000_000_000;
const base: ISParaAfastamentos = {
  grupoFinalidade: 'Verificações e Términos', finalidade: 'Término de Restrições', situacao: 'finalizada', status: 'tis_assinado',
  laudo: 'Apto para o SAM com restrições por 30 dias', restricoes: 'Marchas; Corridas', cid: 'M54.5 Dor lombar baixa', cidCodigo: 'M545',
  dataLaudo: '2026-11-10', dataEntrevista: '2026-11-09T10:00',
};

describe('elegibilidade e idempotência', () => {
  it('só Verificações e Términos finalizada com TIS assinado e Laudo', () => {
    expect(elegivelAfastamentos(base)).toBe(true);
    expect(elegivelAfastamentos({ ...base, grupoFinalidade: 'Benefícios' })).toBe(false);
    expect(elegivelAfastamentos({ ...base, status: 'cancelada' })).toBe(false);
    expect(elegivelAfastamentos({ ...base, situacao: 'andamento', status: 'assinaturas_pendentes' })).toBe(false);
    expect(elegivelAfastamentos({ ...base, laudo: '  ' })).toBe(false);
  });
  it('hash estável e sensível ao laudo, às restrições e ao CID (não a espaços)', () => {
    expect(hashTexto('abc')).toBe(hashTexto('abc'));
    expect(hashTexto('abc')).toMatch(/^[0-9a-f]{8}$/);
    const h = hashEntradaAfastamentos(base);
    expect(hashEntradaAfastamentos({ ...base, laudo: ' Apto para o SAM  com restrições por 30 dias ' })).toBe(h);
    expect(hashEntradaAfastamentos({ ...base, laudo: 'Apto para o SAM com restrições por 60 dias' })).not.toBe(h);
    expect(hashEntradaAfastamentos({ ...base, restricoes: 'Marchas' })).not.toBe(h);
    expect(hashEntradaAfastamentos({ ...base, cid: 'M23.2 Transt menisco', cidCodigo: 'M232' })).not.toBe(h);
  });
  it('precisa processar: sem marcador, hash diferente, erro abaixo do limite ou "processando" abandonado', () => {
    expect(precisaProcessarAfastamentos(base, AGORA)).toBe(true);
    const marc = marcadorProcessando(base, AGORA);
    expect(marc).toMatchObject({ situacao: 'processando', tentativas: 1, versao: VERSAO_AFASTAMENTOS_IS, iniciadoEmMs: AGORA });
    expect(precisaProcessarAfastamentos({ ...base, afastamentosProcessamento: marc }, AGORA + 1000)).toBe(false);
    expect(precisaProcessarAfastamentos({ ...base, afastamentosProcessamento: marc }, AGORA + PRAZO_PROCESSANDO_MS + 1)).toBe(true);
    expect(precisaProcessarAfastamentos({ ...base, afastamentosProcessamento: { ...marc, situacao: 'concluido' } }, AGORA)).toBe(false);
    expect(precisaProcessarAfastamentos({ ...base, afastamentosProcessamento: { ...marc, situacao: 'sem_afastamento' } }, AGORA)).toBe(false);
    expect(precisaProcessarAfastamentos({ ...base, laudo: 'Apto', afastamentosProcessamento: { ...marc, situacao: 'concluido' } }, AGORA)).toBe(true);
    expect(precisaProcessarAfastamentos({ ...base, afastamentosProcessamento: { ...marc, situacao: 'erro', tentativas: 2 } }, AGORA)).toBe(true);
    expect(precisaProcessarAfastamentos({ ...base, afastamentosProcessamento: { ...marc, situacao: 'erro', tentativas: 3 } }, AGORA)).toBe(false);
    expect(precisaProcessarAfastamentos({ ...base, afastamentosProcessamento: { ...marc, situacao: 'concluido', versao: 0 } }, AGORA)).toBe(true);
  });
  it('tentativas contam com o mesmo hash e recomeçam com outro', () => {
    const erro = { ...marcadorProcessando(base, AGORA), situacao: 'erro' as const, tentativas: 2 };
    expect(marcadorProcessando({ ...base, afastamentosProcessamento: erro }, AGORA).tentativas).toBe(3);
    expect(marcadorProcessando({ ...base, laudo: 'Outro', afastamentosProcessamento: erro }, AGORA).tentativas).toBe(1);
  });
});

describe('datas e durações', () => {
  it('data base: laudo, senão entrevista, senão hoje', () => {
    expect(dataBaseAfastamentos(base, HOJE)).toBe('2026-11-10');
    expect(dataBaseAfastamentos({ ...base, dataLaudo: '' }, HOJE)).toBe('2026-11-09');
    expect(dataBaseAfastamentos({ ...base, dataLaudo: '', dataEntrevista: '' }, HOJE)).toBe(HOJE);
  });
  it('dias, semanas, meses (calendário) e anos; inválidos → 0', () => {
    expect(diasDoPeriodo(30, 'dias', '2026-11-10')).toBe(30);
    expect(diasDoPeriodo(2, 'semanas', '2026-11-10')).toBe(14);
    expect(diasDoPeriodo(1, 'mês', '2026-02-01')).toBe(28);
    expect(diasDoPeriodo(3, 'meses', '2026-01-10')).toBe(90);
    expect(diasDoPeriodo(1, 'ano', '2026-01-01')).toBe(365);
    expect(diasDoPeriodo(0, 'dias', '2026-11-10')).toBe(0);
    expect(diasDoPeriodo(undefined, 'dias', '2026-11-10')).toBe(0);
    expect(diasDoPeriodo(5000, 'dias', '2026-11-10')).toBe(0);
  });
  it('tipo pelo texto', () => {
    expect(tipoAfastamentoDe('lts')).toBe('lts');
    expect(tipoAfastamentoDe('Licença para Tratamento de Saúde')).toBe('lts');
    expect(tipoAfastamentoDe('restricoes')).toBe('restricoes');
    expect(tipoAfastamentoDe('Restrições')).toBe('restricoes');
    expect(tipoAfastamentoDe('férias')).toBeNull();
  });
});

describe('normalização da resposta da IA', () => {
  it('restrições por 30 dias a partir da data do laudo, com as Restrições e o CID da IS', () => {
    const r = normalizarAfastamentosIA({ afastamentos: [{ tipo: 'restricoes', quantidade: 30, unidade: 'dias', trecho: 'com restrições por 30 dias' }] }, { is: base, hoje: HOJE });
    expect(r).toEqual([{
      tipo: 'restricoes', dias: 30, dataInicio: '2026-11-10', dataTermino: '2026-12-09', restricoes: ['Marchas', 'Corridas'], dispensas: ['Marchas', 'Corridas'],
      cid: 'M54.5 Dor lombar baixa', cidCodigo: 'M545', trecho: 'com restrições por 30 dias',
    }]);
  });
  it('LTS seguida de restrições: períodos encadeados; LTS vira dispensa total', () => {
    const r = normalizarAfastamentosIA({
      afastamentos: [
        { tipo: 'lts', quantidade: 30, unidade: 'dias' },
        { tipo: 'restricoes', quantidade: 1, unidade: 'meses', restricoes: ['Embarque'] },
      ],
    }, { is: base, hoje: HOJE });
    expect(r.map(a => [a.tipo, a.dataInicio, a.dataTermino, a.dias])).toEqual([
      ['lts', '2026-11-10', '2026-12-09', 30],
      ['restricoes', '2026-12-10', '2027-01-09', 31],
    ]);
    expect(r[0].dispensas).toEqual(['TODAS AS ATIVIDADES']);
    expect(r[0].restricoes).toEqual([]);
    expect(r[1].restricoes).toEqual(['Embarque']);
    expect(tipoDaPericia(r[0].dispensas)).toBe('dispensa');
    expect(tipoDaPericia(r[1].dispensas)).toBe('restricoes');
  });
  it('data explícita válida (não anterior ao laudo) é respeitada', () => {
    const r = normalizarAfastamentosIA({ afastamentos: [{ tipo: 'lts', quantidade: 10, dataInicio: '2026-11-20' }, { tipo: 'lts', quantidade: 5, dataInicio: '2020-01-01' }] }, { is: base, hoje: HOJE });
    expect(r.map(a => [a.dataInicio, a.dias])).toEqual([['2026-11-20', 10], ['2026-11-30', 5]]);
  });
  it('outro CID citado no laudo: usa o índice DESCRABREV; inválidos e repetidos saem', () => {
    const idx = new Map([['M232', 'M23.2 Transt menisco desarranjo']]);
    const r = normalizarAfastamentosIA({
      afastamentos: [
        { tipo: 'restricoes', quantidade: 15, cidCodigo: 'M23.2' },
        { tipo: 'restricoes', quantidade: 15, cidCodigo: 'M23.2', dataInicio: '2026-11-10' },
        { tipo: 'ferias', quantidade: 10 },
        { tipo: 'lts', quantidade: 0 },
      ],
    }, { is: base, hoje: HOJE, cidsAbreviados: idx });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ cid: 'M23.2 Transt menisco desarranjo', cidCodigo: 'M232', dias: 15 });
    // Mesmo CID da IS (com ponto) → rótulo da IS.
    expect(normalizarAfastamentosIA({ afastamentos: [{ tipo: 'lts', quantidade: 3, cidCodigo: 'M54.5' }] }, { is: base, hoje: HOJE })[0].cid).toBe('M54.5 Dor lombar baixa');
  });
  it('sem afastamentos ou resposta vazia → []', () => {
    expect(normalizarAfastamentosIA({ afastamentos: [] }, { is: base, hoje: HOJE })).toEqual([]);
    expect(normalizarAfastamentosIA(null, { is: base, hoje: HOJE })).toEqual([]);
  });
  it('IS sem cidCodigo: o código sai do início do rótulo', () => {
    const r = normalizarAfastamentosIA({ afastamentos: [{ tipo: 'lts', quantidade: 3 }] }, { is: { ...base, cidCodigo: '' }, hoje: HOJE });
    expect(r[0].cidCodigo).toBe('M545');
  });
});

describe('Ficha: formato das perícias menores', () => {
  it('converte os períodos das IS', () => {
    const afast = normalizarAfastamentosIA({ afastamentos: [{ tipo: 'lts', quantidade: 30 }] }, { is: base, hoje: HOJE });
    const lista = afastamentosDasIS([{ id: '123', inspecionadoId: '12345678', inspecionado: 'CB X', afastamentos: afast }, { id: '9', afastamentos: null }]);
    expect(lista).toEqual([{
      id: 'is-123-0', militarId: '12345678', inspecionado: 'CB X', dataAtestado: '2026-11-10', dataTermino: '2026-12-09', tempoHomologado: 30,
      dispensas: ['TODAS AS ATIVIDADES'], cid: 'M54.5 Dor lombar baixa', cidCodigo: 'M545',
    }]);
  });
});
