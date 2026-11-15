import { describe, it, expect } from 'vitest';
import {
  afastamentosDaIS, cidsDaIS, cidsDoTexto, diasDoLaudo, diasNoAno, faixaPeriodos12Meses, guiaInicial, itensDaGuia,
  listaCidsDasIS, normalizarCid, pareceresDasIS, resumoISNoAno, somarDiasISO,
} from '../fichaInspecionado';
import { classeDoExame, classeDosItens, classificarExame } from '../examesIS';

describe('ficha do inspecionado — afastamentos da IS (adaptador)', () => {
  it('lê os dias de LTS e de restrições do laudo', () => {
    expect(diasDoLaudo('Incapaz temporariamente, necessitando de 30 dias de LTS')).toEqual({ lts: 30, restricoes: 0 });
    expect(diasDoLaudo('Apto com restrições por 60 dias')).toEqual({ lts: 0, restricoes: 60 });
    expect(diasDoLaudo('Incapaz temporariamente para o SAM, necessitando de 45 (quarenta e cinco) dias de LTS')).toEqual({ lts: 45, restricoes: 0 });
    expect(diasDoLaudo('Apto para o SAM com restrições por 2 meses, em prorrogação')).toEqual({ lts: 0, restricoes: 60 });
    expect(diasDoLaudo('Apto para o SAM')).toEqual({ lts: 0, restricoes: 0 });
  });

  it('sem campos estruturados, monta o período a partir da data do laudo', () => {
    expect(afastamentosDaIS({ dataLaudo: '2026-03-10', laudo: 'necessitando de 30 dias de LTS' }))
      .toEqual([{ tipo: 'lts', inicio: '2026-03-10', fim: '2026-04-08', dias: 30, origem: 'laudo' }]);
    expect(afastamentosDaIS({ dataAbertura: '2026-01-02', laudo: '' })).toEqual([]);
  });

  it('prefere a lista estruturada `afastamentos` (fim gravado ou dias)', () => {
    const r = afastamentosDaIS({
      dataLaudo: '2026-05-01', laudo: 'necessitando de 90 dias de LTS',
      afastamentos: [
        { tipo: 'LTS', dataInicio: '2026-05-01', dataFim: '2026-05-10' },
        { tipo: 'restricoes', inicio: '2026-05-11', dias: 20 },
        { tipo: 'desconhecido', dias: 5 },
      ],
    });
    expect(r).toEqual([
      { tipo: 'lts', inicio: '2026-05-01', fim: '2026-05-10', dias: 10, origem: 'campo' },
      { tipo: 'restricoes', inicio: '2026-05-11', fim: '2026-05-30', dias: 20, origem: 'campo' },
    ]);
  });

  it('aceita números soltos (diasLts, restricoesDias)', () => {
    expect(afastamentosDaIS({ dataLaudo: '2026-02-01', diasLts: 15, restricoesDias: '10' }).map(p => [p.tipo, p.dias, p.fim]))
      .toEqual([['lts', 15, '2026-02-15'], ['restricoes', 10, '2026-02-10']]);
  });

  it('conta só os dias dentro do ano', () => {
    const p = [{ tipo: 'lts' as const, inicio: '2025-12-22', fim: '2026-01-20', dias: 30, origem: 'campo' as const }];
    expect(diasNoAno(p, 'lts', 2026)).toBe(20);
    expect(diasNoAno(p, 'lts', 2025)).toBe(10);
    expect(diasNoAno(p, 'restricoes', 2026)).toBe(0);
  });

  it('resumo do ano: IS abertas no ano e dias de LTS/Restrições', () => {
    const r = resumoISNoAno([
      { dataAbertura: '2026-02-01', dataLaudo: '2026-02-10', laudo: 'necessitando de 30 dias de LTS' },
      { dataAbertura: '2026-06-01', dataLaudo: '2026-06-05', laudo: 'Apto com restrições por 15 dias' },
      { dataAbertura: '2025-11-01', dataLaudo: '2025-12-27', laudo: 'necessitando de 10 dias de LTS' },
    ], '2026-11-15');
    expect(r).toEqual({ ano: 2026, inspecoes: 2, diasLts: 30 + 5, diasRestricoes: 15 });
  });

  it('somarDiasISO atravessa o mês', () => {
    expect(somarDiasISO('2026-01-31', 1)).toBe('2026-02-01');
  });
});

describe('ficha do inspecionado — CIDs das IS', () => {
  it('extrai CIDs escritos após "CID" e normaliza', () => {
    expect(cidsDoTexto('Paciente com lombalgia. CID: M545. CID-10 F32.1 e F41')).toEqual(['M54.5', 'F32.1', 'F41']);
    expect(cidsDoTexto('Sem código aqui, A12 solto não conta')).toEqual([]);
    expect(normalizarCid('m545')).toBe('M54.5');
  });

  it('junta campos estruturados e textos (laudo, observações, exames) sem repetir', () => {
    expect(cidsDaIS({ cids: ['M54.5', { codigo: 'G43' }], laudo: 'CID M54.5', observacoes: 'CID: F32' }, ['Atestado. CID G43.0'])).toEqual(['M54.5', 'G43', 'F32', 'G43.0']);
  });

  it('lista os CIDs com as IS onde aparecem, mais frequentes primeiro', () => {
    expect(listaCidsDasIS([{ is: 12, cids: ['F32'] }, { is: 10, cids: ['M54.5', 'F32'] }])).toEqual([
      { codigo: 'F32', inspecoes: [10, 12] },
      { codigo: 'M54.5', inspecoes: [10] },
    ]);
  });
});

describe('ficha do inspecionado — guias, faixa e filtros', () => {
  it('filtra a linha do tempo pela guia', () => {
    const itens = [{ tipo: 'is', k: 1 }, { tipo: 'pericias', k: 2 }, { tipo: 'pareceres', k: 3 }];
    expect(itensDaGuia(itens, 'is').map(i => i.k)).toEqual([1]);
    expect(itensDaGuia(itens, 'pm').map(i => i.k)).toEqual([2]);
  });

  it('guia inicial: a pedida, a visível ou a que tem registros', () => {
    expect(guiaInicial('pm', { is: true, pm: true }, { is: 3, pm: 0 })).toBe('pm');
    expect(guiaInicial('pm', { is: true, pm: false }, { is: 3, pm: 2 })).toBe('is');
    expect(guiaInicial(null, { is: true, pm: true }, { is: 0, pm: 2 })).toBe('pm');
    expect(guiaInicial(null, { is: true, pm: true }, { is: 0, pm: 0 })).toBe('is');
    expect(guiaInicial(null, { is: false, pm: true }, { is: 0, pm: 0 })).toBe('pm');
  });

  it('faixa de 12 meses: o tipo prioritário vence no mês', () => {
    const f = faixaPeriodos12Meses([
      { tipo: 'restricoes', inicio: '2026-10-01', fim: '2026-11-30' },
      { tipo: 'lts', inicio: '2026-11-10', fim: '2026-11-20' },
    ], '2026-11-15', ['lts', 'restricoes']);
    expect(f).toHaveLength(12);
    expect(f[11]).toEqual({ chave: '2026-11', rotulo: 'nov', tipo: 'lts' });
    expect(f[10].tipo).toBe('restricoes');
    expect(f[0]).toEqual({ chave: '2025-12', rotulo: 'dez', tipo: null });
  });

  it('pareceres das IS: só os com vínculo a uma IS do inspecionado, mais recente primeiro', () => {
    const ts = (n: number) => ({ toMillis: () => n });
    const r = pareceresDasIS([{ id: 'a', isId: '1', criadoEm: ts(1) }, { id: 'b', criadoEm: ts(5) }, { id: 'c', isId: '2', criadoEm: ts(3) }, { id: 'd', isId: '9', criadoEm: ts(4) }], ['1', '2']);
    expect(r.map(p => p.id)).toEqual(['c', 'a']);
  });
});

describe('exames da IS — classificação do PDF', () => {
  it('usa a classe da IA quando válida; senão a dos tipos', () => {
    expect(classificarExame('atestado_relatorio', [{ tipo: 'exame_imagem' }])).toEqual({ classe: 'atestado_relatorio', origem: 'ia' });
    expect(classificarExame('qualquer', [{ tipo: 'atestado' }])).toEqual({ classe: 'atestado_relatorio', origem: 'tipos' });
    expect(classificarExame(undefined, [{ tipo: 'exame_laboratorial' }])).toEqual({ classe: 'laudo_exame', origem: 'tipos' });
  });

  it('pelos tipos: a maioria decide; empate ou nada → laudo de exame', () => {
    expect(classeDosItens([{ tipo: 'laudo_medico' }, { tipo: 'parecer' }, { tipo: 'exame_imagem' }])).toBe('atestado_relatorio');
    expect(classeDosItens([{ tipo: 'laudo_medico' }, { tipo: 'exame_imagem' }])).toBe('laudo_exame');
    expect(classeDosItens([{ tipo: 'receita' }])).toBe('laudo_exame');
    expect(classeDosItens([])).toBe('laudo_exame');
  });

  it('PDF antigo (sem o campo) é classificado pelos itens', () => {
    expect(classeDoExame({ itens: [{ tipo: 'atestado' }] })).toBe('atestado_relatorio');
    expect(classeDoExame({ classificacao: 'laudo_exame', itens: [{ tipo: 'atestado' }] })).toBe('laudo_exame');
  });
});
