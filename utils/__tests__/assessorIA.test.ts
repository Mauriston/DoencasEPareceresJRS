import { describe, expect, it } from 'vitest';
import {
  CID_SEM_DOENCA, isDoAssessor, patchInserirCid, patchInserirLaudo, patchInserirRedacao, podeUsarAssessorIA, sugestoesDoAssessor,
} from '../assessorIA';
import type { EstadoConclusao } from '../conclusaoIS';

const base: EstadoConclusao = {
  status: 'agendada', dataEntrevista: '2026-11-11T10:50', finalidade: 'Verificação de Deficiência Funcional', grupoFinalidade: 'Verificações e Términos',
  dataLaudo: '', laudo: '', restricoes: '', tis: '', ds1a: '', observacoes: '', cid: '',
};

describe('quem usa o Assessor IA', () => {
  it('só Admin, user_medicos e user_medicos_mpi', () => {
    expect(podeUsarAssessorIA('admin')).toBe(true);
    expect(podeUsarAssessorIA('user_medicos')).toBe(true);
    expect(podeUsarAssessorIA('user_medicos_mpi')).toBe(true);
    expect(podeUsarAssessorIA('user_secretaria')).toBe(false);
    expect(podeUsarAssessorIA('user_medicos_geral')).toBe(false);
    expect(podeUsarAssessorIA(undefined)).toBe(false);
  });
});

describe('IS atendidas', () => {
  it('só as em andamento, da mais recente para a mais antiga', () => {
    const lista = [
      { is: 10, situacao: 'andamento', status: 'agendada' },
      { is: 30, situacao: 'aberta', status: 'aberta' },
      { is: 20, situacao: 'andamento', status: 'votacao_pendente' },
      { is: 40, situacao: 'finalizada', status: 'tis_assinado' },
    ];
    expect(isDoAssessor(lista).map(i => i.is)).toEqual([20, 10]);
  });
});

describe('Inserir na IS — Entrevista, Exame Clínico e Conclusão', () => {
  it('grava o texto e leva a IS a Conclusão pendente', () => {
    expect(patchInserirRedacao('agendada', 'redacaoEntrevista', '  texto  ')).toEqual({ redacaoEntrevista: 'texto', status: 'conclusao_pendente', situacao: 'andamento' });
    expect(patchInserirRedacao('parecer_solicitado', 'redacaoConclusao', 'x')).toMatchObject({ status: 'conclusao_pendente' });
    expect(patchInserirRedacao('faltou', 'redacaoExameClinico', 'x')).toMatchObject({ status: 'conclusao_pendente' });
  });
  it('não faz a IS voltar de status posteriores', () => {
    for (const st of ['conclusao_pendente', 'votacao_pendente', 'assinaturas_pendentes', 'auditoria'] as const) {
      expect(patchInserirRedacao(st, 'redacaoConclusao', 'x')).toEqual({ redacaoConclusao: 'x' });
    }
  });
});

describe('Inserir na IS — Laudo e CID', () => {
  it('o laudo leva a Votação pendente e grava a Data do laudo', () => {
    expect(patchInserirLaudo({ ...base, status: 'conclusao_pendente' }, 'Incapaz Temporariamente para o SMV, necessitando de 60 dias de LTS', '2026-11-21'))
      .toMatchObject({ laudo: 'Incapaz Temporariamente para o SMV, necessitando de 60 dias de LTS', dataLaudo: '2026-11-21', status: 'votacao_pendente' });
  });
  it('o CID vale para qualquer finalidade e não regrava o mesmo', () => {
    expect(patchInserirCid('', { descrAbrev: 'Z10.2 Exame geral de rotina de forca armada', subcat: 'z102' }))
      .toEqual({ cid: 'Z10.2 Exame geral de rotina de forca armada', cidCodigo: 'Z102' });
    expect(patchInserirCid('F31.2 X', { descrAbrev: 'F31.2 X', subcat: 'F312' })).toEqual({});
    expect(CID_SEM_DOENCA).toBe('Z10.2');
  });
});

describe('sugestões de comando', () => {
  it('não citam o número da IS e mudam conforme a finalidade e o laudo', () => {
    const vdf = sugestoesDoAssessor({ grupoFinalidade: 'Verificações e Términos' });
    expect(vdf[0]).toEqual({ rotulo: 'Redigir a IS', comando: 'Redija a IS.' });
    expect(vdf.every(s => !/IS \d/.test(s.rotulo + s.comando))).toBe(true);
    expect(vdf.some(s => /relatou/.test(s.comando))).toBe(true);
    const trienal = sugestoesDoAssessor({ grupoFinalidade: 'Controle Periódico', laudo: 'Apto para o SAM' });
    expect(trienal.some(s => /sem alterações/.test(s.comando))).toBe(true);
    expect(trienal.some(s => /laudo registrado/.test(s.comando))).toBe(true);
  });
});
