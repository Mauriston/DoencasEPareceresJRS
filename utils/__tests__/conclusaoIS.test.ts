import { describe, expect, it } from 'vitest';
import {
  encaminhamentoDoStatus, juntarRestricoes, laudoAptoComRestricoes, laudoIncapacidadeDefinitivaSam, mostraEncaminhamento, mostraRestricoes,
  patchConclusao, patchEncaminhamento, restituicaoDoStatus, separarRestricoes, type EstadoConclusao,
} from '../conclusaoIS';
import { diasUteisEntre, podeCancelarIS, statusAoAgendar } from '../inspecoes';

const HOJE = '2026-11-07';
const base: EstadoConclusao = {
  status: 'agendada', dataEntrevista: '2026-11-06T10:30', finalidade: 'Verificação de Deficiência Funcional', grupoFinalidade: 'Verificações e Términos',
  dataLaudo: '', laudo: '', restricoes: '', tis: '', ds1a: '', observacoes: '',
};

describe('detecções no laudo', () => {
  it('apto com restrições (não casa com inapto)', () => {
    expect(laudoAptoComRestricoes('Apto com restrições por 30 dias')).toBe(true);
    expect(laudoAptoComRestricoes('APTO COM RESTRICOES')).toBe(true);
    expect(laudoAptoComRestricoes('Inapto com restrições')).toBe(false);
    expect(laudoAptoComRestricoes('Apto para o SAM')).toBe(false);
  });
  it('incapacidade definitiva para o SAM', () => {
    expect(laudoIncapacidadeDefinitivaSam('Incapaz definitivamente para o SAM')).toBe(true);
    expect(laudoIncapacidadeDefinitivaSam('Incapacidade definitiva para o Serviço Ativo da Marinha (SAM)')).toBe(true);
    expect(laudoIncapacidadeDefinitivaSam('Incapaz temporariamente para o SAM')).toBe(false);
    expect(laudoIncapacidadeDefinitivaSam('Incapaz definitivamente para a samba')).toBe(false);
  });
});

describe('visibilidade', () => {
  it('Auditoria | JSD: Benefícios, Licenciamento ou Término de Incapacidade com incapacidade definitiva', () => {
    expect(mostraEncaminhamento({ laudo: '', finalidade: 'x', grupoFinalidade: 'Benefícios' })).toBe(false);
    expect(mostraEncaminhamento({ laudo: 'Apto', finalidade: 'x', grupoFinalidade: 'Benefícios' })).toBe(true);
    expect(mostraEncaminhamento({ laudo: 'Apto', finalidade: 'Deixar o SAM', grupoFinalidade: 'Licenciamento' })).toBe(true);
    expect(mostraEncaminhamento({ laudo: 'Apto', finalidade: 'Término de Incapacidade', grupoFinalidade: 'Verificações e Términos' })).toBe(false);
    expect(mostraEncaminhamento({ laudo: 'Incapaz definitivamente para o SAM', finalidade: 'Término de Incapacidade', grupoFinalidade: 'Verificações e Términos' })).toBe(true);
    expect(mostraEncaminhamento({ laudo: 'Incapaz definitivamente para o SAM', finalidade: 'Término de Restrições', grupoFinalidade: 'Verificações e Términos' })).toBe(false);
  });
  it('Restrições: Verificações e Términos com apto com restrições', () => {
    expect(mostraRestricoes({ laudo: 'Apto com restrições por 30 dias', grupoFinalidade: 'Verificações e Términos' })).toBe(true);
    expect(mostraRestricoes({ laudo: 'Apto com restrições por 30 dias', grupoFinalidade: 'Benefícios' })).toBe(false);
    expect(mostraRestricoes({ laudo: 'Apto', grupoFinalidade: 'Verificações e Términos' })).toBe(false);
  });
});

describe('restrições múltiplas', () => {
  it('separa e junta com "; " (compatível com uma opção só)', () => {
    expect(separarRestricoes('Marchas')).toEqual(['Marchas']);
    expect(separarRestricoes('Marchas; Embarque')).toEqual(['Marchas', 'Embarque']);
    expect(juntarRestricoes(['Marchas', 'Embarque', 'Marchas', ' '])).toBe('Marchas; Embarque');
  });
});

describe('patchConclusao', () => {
  it('Laudo inserido: data de hoje e Votação pendente', () => {
    const r = patchConclusao(base, 'laudo', ' Apto para o SAM ', HOJE);
    expect(r.patch).toEqual({ laudo: 'Apto para o SAM', dataLaudo: HOJE, status: 'votacao_pendente', situacao: 'andamento' });
    expect(r.concluirPareceres).toBe(false);
  });
  it('Laudo inserido com Parecer solicitado conclui os pareceres', () => {
    const r = patchConclusao({ ...base, status: 'parecer_solicitado' }, 'laudo', 'Apto', HOJE);
    expect(r.patch.status).toBe('votacao_pendente');
    expect(r.concluirPareceres).toBe(true);
  });
  it('Laudo alterado atualiza a data e não rebaixa o status', () => {
    const atual = { ...base, status: 'assinaturas_pendentes' as const, laudo: 'Apto', dataLaudo: '2026-11-01', tis: '026.000.1' };
    expect(patchConclusao(atual, 'laudo', 'Apto para o SAM', HOJE).patch).toEqual({ laudo: 'Apto para o SAM', dataLaudo: HOJE });
  });
  it('Laudo igual não grava', () => {
    expect(patchConclusao({ ...base, laudo: 'Apto' }, 'laudo', 'Apto ', HOJE).patch).toEqual({});
  });
  it('Laudo apagado apaga data, restrições, TIS e DS-1a e volta para Agendada (ou Aberta)', () => {
    const atual = { ...base, status: 'tis_assinado' as const, laudo: 'Apto com restrições', dataLaudo: HOJE, restricoes: 'Marchas', tis: '026.000.1', ds1a: 'X' };
    expect(patchConclusao(atual, 'laudo', '', HOJE).patch).toEqual({ laudo: '', dataLaudo: '', restricoes: '', tis: '', ds1a: '', status: 'agendada', situacao: 'andamento' });
    expect(patchConclusao({ ...atual, dataEntrevista: '' }, 'laudo', '', HOJE).patch.status).toBe('aberta');
  });
  it('Laudo que deixa de ser "apto com restrições" apaga as restrições', () => {
    const atual = { ...base, status: 'votacao_pendente' as const, laudo: 'Apto com restrições por 30 dias', restricoes: 'Marchas' };
    expect(patchConclusao(atual, 'laudo', 'Apto', HOJE).patch).toEqual({ laudo: 'Apto', dataLaudo: HOJE, restricoes: '' });
  });
  it('Laudo que tira o caso do encaminhamento volta a Votação pendente', () => {
    const atual = { ...base, finalidade: 'Término de Incapacidade', status: 'auditoria' as const, laudo: 'Incapaz definitivamente para o SAM' };
    expect(patchConclusao(atual, 'laudo', 'Apto', HOJE).patch.status).toBe('votacao_pendente');
  });
  it('Nº do TIS só com Laudo; inserido → Assinaturas pendentes; apagado → apaga DS-1a e volta a Votação pendente', () => {
    expect(patchConclusao(base, 'tis', '026.000.1', HOJE).patch).toEqual({});
    const comLaudo = { ...base, status: 'votacao_pendente' as const, laudo: 'Apto' };
    expect(patchConclusao(comLaudo, 'tis', '026.000.1', HOJE).patch).toEqual({ tis: '026.000.1', status: 'assinaturas_pendentes', situacao: 'andamento' });
    const comTis = { ...comLaudo, status: 'assinaturas_pendentes' as const, tis: '026.000.1', ds1a: 'D' };
    expect(patchConclusao(comTis, 'tis', '', HOJE).patch).toEqual({ tis: '', ds1a: '', status: 'votacao_pendente', situacao: 'andamento' });
  });
  it('DS-1a só com TIS; inserido → TIS assinado (Finalizada); apagado → Assinaturas pendentes', () => {
    const comLaudo = { ...base, status: 'votacao_pendente' as const, laudo: 'Apto' };
    expect(patchConclusao(comLaudo, 'ds1a', 'D', HOJE).patch).toEqual({});
    const comTis = { ...comLaudo, status: 'assinaturas_pendentes' as const, tis: '026.000.1' };
    expect(patchConclusao(comTis, 'ds1a', 'D', HOJE).patch).toEqual({ ds1a: 'D', status: 'tis_assinado', situacao: 'finalizada' });
    expect(patchConclusao({ ...comTis, status: 'tis_assinado', ds1a: 'D' }, 'ds1a', '', HOJE).patch).toEqual({ ds1a: '', status: 'assinaturas_pendentes', situacao: 'andamento' });
  });
  it('Restrições só são gravadas se visíveis; Observações sempre', () => {
    expect(patchConclusao({ ...base, laudo: 'Apto' }, 'restricoes', 'Marchas', HOJE).patch).toEqual({});
    expect(patchConclusao({ ...base, laudo: 'Apto com restrições por 30 dias' }, 'restricoes', 'Marchas;Embarque', HOJE).patch).toEqual({ restricoes: 'Marchas; Embarque' });
    expect(patchConclusao(base, 'observacoes', ' obs ', HOJE).patch).toEqual({ observacoes: 'obs' });
  });
});

describe('encaminhamento e restituição', () => {
  const beneficio = { ...base, grupoFinalidade: 'Benefícios', status: 'votacao_pendente' as const, laudo: 'Apto' };
  it('Auditoria | JSD mudam o status', () => {
    expect(patchEncaminhamento(beneficio, 'auditoria')).toEqual({ status: 'auditoria', situacao: 'andamento' });
    expect(patchEncaminhamento({ ...beneficio, status: 'restituicao_auditoria' }, 'auditoria')).toEqual({ status: 'auditoria', situacao: 'andamento' });
    expect(patchEncaminhamento({ ...beneficio, status: 'auditoria' }, 'jsd')).toEqual({ status: 'revisao_exofficio', situacao: 'andamento' });
    expect(patchEncaminhamento({ ...beneficio, status: 'auditoria' }, 'auditoria')).toEqual({});
    expect(patchEncaminhamento({ ...beneficio, laudo: '' }, 'auditoria')).toEqual({});
    expect(patchEncaminhamento({ ...beneficio, tis: '026.000.1' }, 'auditoria')).toEqual({});
  });
  it('status ↔ opção e item de restituição', () => {
    expect(encaminhamentoDoStatus('restituicao_jsd')).toBe('jsd');
    expect(encaminhamentoDoStatus('votacao_pendente')).toBeNull();
    expect(restituicaoDoStatus('auditoria')).toEqual({ rotulo: 'Restituição Auditoria', status: 'restituicao_auditoria' });
    expect(restituicaoDoStatus('revisao_exofficio')).toEqual({ rotulo: 'Restituição JSD', status: 'restituicao_jsd' });
    expect(restituicaoDoStatus('restituicao_jsd')).toBeNull();
  });
});

describe('agendamento e cancelamento', () => {
  it('status ao agendar', () => {
    expect(statusAoAgendar({ status: 'aberta', dataEntrevista: '' }, '2026-11-10T08:00')).toBe('agendada');
    expect(statusAoAgendar({ status: 'faltou', dataEntrevista: '2026-11-06T08:00' }, '2026-11-10T08:00')).toBe('reagendada');
    expect(statusAoAgendar({ status: 'agendada', dataEntrevista: '2026-11-06T08:00' }, '2026-11-10T08:00')).toBe('reagendada');
    // Só troca de perito (mesmo horário) e etapas depois da entrevista mantêm o status.
    expect(statusAoAgendar({ status: 'agendada', dataEntrevista: '2026-11-06T08:00' }, '2026-11-06T08:00')).toBe('agendada');
    expect(statusAoAgendar({ status: 'votacao_pendente', dataEntrevista: '2026-11-06T08:00' }, '2026-11-06T08:00')).toBe('votacao_pendente');
  });
  it('dias úteis desde a abertura (sem fins de semana e feriados)', () => {
    expect(diasUteisEntre('2026-11-02', '2026-11-09')).toBe(5); // seg 02 → seg 09: 03–06 e 09
    expect(diasUteisEntre('2026-11-09', '2026-11-18')).toBe(7); // 10–13 e 16–18 (15/11 é domingo)
    expect(diasUteisEntre('2026-11-16', '2026-11-23')).toBe(4); // 20/11 (Consciência Negra) não conta
    expect(diasUteisEntre('2026-11-09', '2026-11-09')).toBe(0);
  });
  it('Cancelar IS: Faltou, ou Aberta com 7 dias úteis', () => {
    expect(podeCancelarIS({ status: 'faltou', dataAbertura: HOJE }, HOJE)).toBe(true);
    expect(podeCancelarIS({ status: 'aberta', dataAbertura: '2026-11-02' }, '2026-11-10')).toBe(false);
    expect(podeCancelarIS({ status: 'aberta', dataAbertura: '2026-11-02' }, '2026-11-11')).toBe(true);
    expect(podeCancelarIS({ status: 'agendada', dataAbertura: '2026-01-02' }, HOJE)).toBe(false);
  });
});
