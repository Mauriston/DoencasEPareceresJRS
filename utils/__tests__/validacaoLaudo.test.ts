import { describe, expect, it } from 'vitest';
import formas from '../../data/formasConclusaoIS.json';
import finalidadesApp from '../../public/finalidadesIS.json';
import {
  identificarLaudo, linkItemDgpm, regraDaIS, validarLaudo, compilarModelo,
  type FormasConclusao,
} from '../validacaoLaudo';
import { derivarContexto, tipoServicoDoCadastro, type ContextoLaudo } from '../contextoLaudo';

const F = formas as unknown as FormasConclusao;

const ctx = (p: Partial<ContextoLaudo> = {}): ContextoLaudo => ({
  vinculo: 'Carreira', tipoServico: 'carreira', historicoDisponivel: true, ltsAnterior: false, ltsAnteriorTermino: null,
  apresentadoNoPrazo: null, ltsIninterruptaDias: 0, agregado: false, tempoAgregacaoDias: 0, restricoesAcumuladasMeses: 0, ao: 'sem_registro', ...p,
});
const ids = (r: ReturnType<typeof validarLaudo>) => r.achados.map(a => a.id);

describe('JSON de formas de conclusão', () => {
  it('cobre todas as finalidades do app e só referencia laudos existentes', () => {
    const nomes = (finalidadesApp as { grupos: { finalidades: { nome: string }[] }[] }).grupos.flatMap(g => g.finalidades.map(f => f.nome));
    for (const n of nomes) expect(F.finalidades[n], n).toBeTruthy();
    for (const r of Object.values(F.regras)) for (const l of r.laudosPermitidos) expect(F.laudos[l], l).toBeTruthy();
    for (const v of F.verificacoes || []) for (const l of v.se.laudos || []) expect(F.laudos[l], `${v.id}:${l}`).toBeTruthy();
  });
  it('todo modelo compila em expressão regular', () => {
    for (const [id, l] of Object.entries(F.laudos)) expect(() => compilarModelo(l.modelo), id).not.toThrow();
  });
});

describe('regraDaIS', () => {
  it('escolhe pelo tipo de serviço, vínculo e "*"', () => {
    expect(regraDaIS(F, 'Verificação de Deficiência Funcional', 'Carreira')).toBe('VDF_CARREIRA');
    expect(regraDaIS(F, 'Verificação de Deficiência Funcional', 'Temporário', 'SMI')).toBe('VDF_SMI');
    expect(regraDaIS(F, 'Verificação de Deficiência Funcional', 'Temporário', 'SMV')).toBe('VDF_SMV');
    expect(regraDaIS(F, 'Missão Antártica', 'Carreira')).toBe('MISSAO_ANTARTICA');
    expect(regraDaIS(F, 'Inexistente', 'Carreira')).toBeNull();
  });
});

describe('identificarLaudo', () => {
  const perm = (r: string) => F.regras[r].laudosPermitidos;
  it('reconhece laudos com campos e ignora aspas, caixa e acentos', () => {
    const l = identificarLaudo(F, '“INCAPAZ TEMPORARIAMENTE PARA O SAM, necessitando de 60 dias de LTS”', perm('VDF_CARREIRA'));
    expect(l?.id).toBe('SAM_INCAP_TEMP');
    expect(l?.campos.tempo_dias).toBe('60');
    expect(l?.permitido).toBe(true);
  });
  it('prefere o modelo mais específico', () => {
    const l = identificarLaudo(F, 'Incapaz Temporariamente para o SAM, por doença com relação de causa e efeito com o serviço, necessitando de 30 dias de LTS', perm('VDF_CARREIRA'));
    expect(l?.id).toBe('SAM_INCAP_TEMP_NEXO');
    expect(identificarLaudo(F, 'Apto para o SAM (com restrições) (por 90 dias)', perm('VDF_CARREIRA'))?.id).toBe('SAM_APTO_RESTR');
  });
  it('marca como não permitido o laudo de outra finalidade', () => {
    const l = identificarLaudo(F, 'Apto para o SAM com restrições por 30 dias', perm('VDF_SMI'));
    expect(l?.id).toBe('SAM_APTO_RESTR');
    expect(l?.permitido).toBe(false);
  });
});

describe('validarLaudo — erros frequentes no SINAIS', () => {
  it('prorrogação de LTS sem "em prorrogação"', () => {
    const r = validarLaudo(F, { finalidade: 'Término de Incapacidade', laudo: 'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS',
      contexto: ctx({ ltsAnterior: true, apresentadoNoPrazo: true }) });
    expect(ids(r)).toContain('PRORROGACAO_SEM_TERMO');
    expect(r.achados[0].severidade).toBe('erro');
  });
  it('sem histórico vira alerta de conferência', () => {
    const r = validarLaudo(F, { finalidade: 'Término de Incapacidade', laudo: 'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS',
      contexto: ctx({ historicoDisponivel: false, ltsAnterior: null, apresentadoNoPrazo: null }) });
    expect(r.achados.find(a => a.id === 'PRORROGACAO_SEM_TERMO')?.severidade).toBe('alerta');
  });
  it('com "em prorrogação" não acusa', () => {
    const r = validarLaudo(F, { finalidade: 'Término de Incapacidade', laudo: 'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS (em prorrogação)',
      contexto: ctx({ ltsAnterior: true, apresentadoNoPrazo: true }) });
    expect(ids(r)).not.toContain('PRORROGACAO_SEM_TERMO');
    expect(r.laudo?.id).toBe('SAM_INCAP_TEMP');
  });
  it('"em prorrogação" em VDF', () => {
    const r = validarLaudo(F, { finalidade: 'Verificação de Deficiência Funcional', laudo: 'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS em prorrogação', contexto: ctx() });
    expect(ids(r)).toContain('PRORROGACAO_EM_VDF');
  });
  it('VDF do SMI com "Apto com restrições"', () => {
    const r = validarLaudo(F, { finalidade: 'Verificação de Deficiência Funcional', laudo: 'Apto para o SAM com restrições por 30 dias',
      contexto: ctx({ vinculo: 'Temporário', tipoServico: 'SMI' }) });
    expect(ids(r)).toContain('VDF_SMI_FORMA');
    expect(ids(r)).not.toContain('LAUDO_NAO_PERMITIDO');
  });
  it('restrições discriminadas em controle periódico', () => {
    const base = { finalidade: 'Controle trienal', contexto: ctx() };
    expect(ids(validarLaudo(F, { ...base, laudo: 'Apto para Controle trienal, com restrições: não correr, por 90 dias' }))).toContain('CP_RESTRICOES_DISCRIMINADAS');
    expect(ids(validarLaudo(F, { ...base, laudo: 'Apto para Controle trienal, com restrições', restricoes: 'TFM' }))).toContain('CP_RESTRICOES_DISCRIMINADAS');
    expect(ids(validarLaudo(F, { ...base, laudo: 'Apto para Controle trienal, com restrições' }))).toEqual([]);
  });
  it('limite de 180 dias e "Continua incapaz"', () => {
    expect(ids(validarLaudo(F, { finalidade: 'Verificação de Deficiência Funcional', laudo: 'Incapaz temporariamente para o SAM, necessitando de 200 dias de LTS', contexto: ctx() }))).toContain('LIMITE_180_DIAS');
    const continua = 'Continua incapaz temporariamente para o SAM, por ser portador de Lombalgia M54.5, doença sem relação de causa e efeito com o serviço, necessitando de 90 dias de LTS, não estando inválido, não necessitando de internação permanente, não necessitando de assistência ou cuidados permanentes de enfermagem';
    expect(ids(validarLaudo(F, { finalidade: 'Término de Incapacidade', laudo: continua, contexto: ctx({ tempoAgregacaoDias: 100, ltsAnterior: true, apresentadoNoPrazo: true }) }))).toContain('CONTINUA_INCAP_SEM_AGREGACAO');
    expect(ids(validarLaudo(F, { finalidade: 'Término de Incapacidade', laudo: continua, contexto: ctx({ tempoAgregacaoDias: 800, ltsAnterior: true, apresentadoNoPrazo: true }) }))).not.toContain('CONTINUA_INCAP_SEM_AGREGACAO');
  });
  it('texto fora do padrão sugere o modelo mais parecido', () => {
    const r = validarLaudo(F, { finalidade: 'Deixar o SAM', laudo: 'Considerado em condições de deixar o serviço ativo', contexto: ctx() });
    expect(ids(r)).toContain('TEXTO_FORA_DO_PADRAO');
  });
  it('laudo correto não gera achados', () => {
    expect(validarLaudo(F, { finalidade: 'Deixar o SAM', laudo: 'Apto para deixar o SAM', contexto: ctx() }).achados).toEqual([]);
  });
});

describe('contexto', () => {
  it('tipo de serviço', () => {
    expect(tipoServicoDoCadastro({ temporario: true, pgq: 'MN-RC' })).toBe('SMI');
    expect(tipoServicoDoCadastro({ temporario: true, pgq: '2T (RM2-Md)' })).toBe('SMI');
    expect(tipoServicoDoCadastro({ temporario: true, pgq: '1T (RM2-Md)' })).toBe('SMV');
    expect(tipoServicoDoCadastro({ temporario: false, pgq: 'CT (Md)' })).toBe('carreira');
  });
  it('cadeia de LTS, agregação e prazo', () => {
    const hist = [
      { is: 1, dataLaudo: '2023-01-01', laudo: 'Incapaz temporariamente para o SAM, necessitando de 180 dias de LTS' },
      { is: 2, dataLaudo: '2023-06-30', laudo: 'Incapaz temporariamente para o SAM, necessitando de 180 dias de LTS (em prorrogação)' },
      { is: 3, dataLaudo: '2023-12-27', laudo: 'Incapaz temporariamente para o SAM, necessitando de 120 dias de LTS (em prorrogação)' },
    ];
    const c = derivarContexto({ temporario: false, pgq: '1SG-EF' }, hist, { is: 4, dataAbertura: '2024-04-20' });
    expect(c.ltsIninterruptaDias).toBe(480);
    expect(c.agregado).toBe(true);
    expect(c.tempoAgregacaoDias).toBe(115);
    expect(c.ltsAnterior).toBe(true);
    expect(c.apresentadoNoPrazo).toBe(true);
    const fora = derivarContexto({ temporario: false }, hist, { is: 4, dataAbertura: '2024-06-01' });
    expect(fora.apresentadoNoPrazo).toBe(false);
  });
  it('aptidão com restrições quebra a cadeia de LTS', () => {
    const hist = [
      { is: 1, dataLaudo: '2023-01-01', laudo: 'Incapaz temporariamente para o SAM, necessitando de 180 dias de LTS' },
      { is: 2, dataLaudo: '2023-06-30', laudo: 'Apto para o SAM (com restrições) (por 60 dias)' },
      { is: 3, dataLaudo: '2023-08-29', laudo: 'Incapaz temporariamente para o SAM, necessitando de 30 dias de LTS' },
    ];
    const c = derivarContexto({ temporario: false }, hist, { is: 4, dataAbertura: '2023-09-20' });
    expect(c.ltsIninterruptaDias).toBe(30);
    expect(c.restricoesAcumuladasMeses).toBe(9);
  });
  it('sem histórico: sem dado', () => {
    const c = derivarContexto({ temporario: true, pgq: 'CB-AM' }, [], { is: 1, dataAbertura: '2024-01-01' });
    expect(c.historicoDisponivel).toBe(false);
    expect(c.ltsAnterior).toBeNull();
    expect(c.tipoServico).toBe('SMV');
  });
});

describe('linkItemDgpm', () => {
  it('leva ao capítulo e ao item da DGPM-406', () => {
    expect(linkItemDgpm('6.2.2.e')).toBe('/normas/dgpm-406?cap=6&item=6.2.2');
    expect(linkItemDgpm(' 11.8.2.b')).toBe('/normas/dgpm-406?cap=11&item=11.8.2');
    expect(linkItemDgpm('formas de conclusão')).toBeNull();
  });
});
