import { describe, expect, it } from 'vitest';
import {
  encaminhamentoDoStatus, exigeCid, faltaCid, grupoComRestricoes, juntarRestricoes, laudoAptoComRestricoes, laudoMencionaRestricoes, patchCid, laudoIncapacidadeDefinitivaSam, mostraEncaminhamento, mostraRestricoes,
  opcoesDeRestricoes, patchConclusao, patchEncaminhamento, patchFinalidade, podeEditarConclusao, podeEditarFinalidade, restituicaoDoStatus,
  separarRestricoes, type EstadoConclusao,
  dataConclusaoInicial, erroDataConclusao, motivoNaoConcluir, patchConcluirIS, patchReabrirIS, podeReabrirIS, statusAoReabrir,
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
  it('Restrições: Verificações e Términos E Laudo que menciona "restrições"', () => {
    expect(mostraRestricoes(base)).toBe(false);
    expect(mostraRestricoes({ ...base, laudo: 'Apto para o SAM' })).toBe(false);
    expect(mostraRestricoes({ ...base, laudo: 'Apto para o SAM com restrições por 30 dias' })).toBe(true);
    expect(mostraRestricoes({ ...base, laudo: 'APTO COM RESTRICOES' })).toBe(true);
    expect(mostraRestricoes({ grupoFinalidade: 'Benefícios', laudo: 'Apto com restrições' })).toBe(false);
    expect(mostraRestricoes({ grupoFinalidade: '', laudo: 'Apto com restrições' })).toBe(false);
    expect(grupoComRestricoes('Verificações e Términos')).toBe(true);
    expect(grupoComRestricoes('Benefícios')).toBe(false);
  });
  it('laudo menciona restrições (maiúsculas/acentos; singular; não casa com palavras parecidas)', () => {
    expect(laudoMencionaRestricoes('Apto com Restrições por 30 dias')).toBe(true);
    expect(laudoMencionaRestricoes('apto com restricao para marchas')).toBe(true);
    expect(laudoMencionaRestricoes('Incapaz temporariamente, 30 dias de LTS')).toBe(false);
    expect(laudoMencionaRestricoes('restritivo')).toBe(false);
    expect(laudoMencionaRestricoes(undefined)).toBe(false);
  });
  it('CID: obrigatório em Verificações e Términos', () => {
    expect(exigeCid(base)).toBe(true);
    expect(exigeCid({ grupoFinalidade: 'Benefícios' })).toBe(false);
    expect(faltaCid(base)).toBe(true);
    expect(faltaCid({ ...base, cid: 'M54.5 Dor lombar baixa' })).toBe(false);
    expect(faltaCid({ grupoFinalidade: 'Benefícios' })).toBe(false);
  });
  it('patchCid grava DESCRABREV e SUBCAT; igual não grava; fora do grupo não grava', () => {
    expect(patchCid(base, { descrAbrev: 'M54.5 Dor lombar baixa', subcat: 'm545' })).toEqual({ cid: 'M54.5 Dor lombar baixa', cidCodigo: 'M545' });
    expect(patchCid({ ...base, cid: 'M54.5 Dor lombar baixa' }, { descrAbrev: 'M54.5 Dor lombar baixa', subcat: 'M545' })).toEqual({});
    expect(patchCid({ ...base, cid: 'M54.5 Dor lombar baixa' }, null)).toEqual({ cid: '', cidCodigo: '' });
    expect(patchCid({ grupoFinalidade: 'Benefícios' }, { descrAbrev: 'M54.5 Dor lombar baixa', subcat: 'M545' })).toEqual({});
  });
});

describe('restrições múltiplas', () => {
  it('separa e junta com "; " (compatível com uma opção só)', () => {
    expect(separarRestricoes('Marchas')).toEqual(['Marchas']);
    expect(separarRestricoes('Marchas; Embarque')).toEqual(['Marchas', 'Embarque']);
    expect(juntarRestricoes(['Marchas', 'Embarque', 'Marchas', ' '])).toBe('Marchas; Embarque');
  });
  it('opções sem "TODAS AS ATIVIDADES"', () => {
    expect(opcoesDeRestricoes(['TODAS AS ATIVIDADES', 'Marchas', 'Todas as atividades ', 'Embarque'])).toEqual(['Marchas', 'Embarque']);
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
  it('Laudo apagado apaga data, TIS, DS-1a e restrições e volta para Agendada (ou Aberta)', () => {
    const atual = { ...base, status: 'tis_assinado' as const, laudo: 'Apto com restrições', dataLaudo: HOJE, restricoes: 'Marchas', tis: '026.000.1', ds1a: 'X' };
    expect(patchConclusao(atual, 'laudo', '', HOJE).patch).toEqual({ laudo: '', dataLaudo: '', tis: '', ds1a: '', restricoes: '', status: 'agendada', situacao: 'andamento' });
    expect(patchConclusao({ ...atual, dataEntrevista: '' }, 'laudo', '', HOJE).patch.status).toBe('aberta');
  });
  it('Laudo que deixa de mencionar restrições as apaga; fora de Verificações e Términos também', () => {
    const atual = { ...base, status: 'votacao_pendente' as const, laudo: 'Apto com restrições por 30 dias', restricoes: 'Marchas' };
    expect(patchConclusao(atual, 'laudo', 'Apto', HOJE).patch).toEqual({ laudo: 'Apto', dataLaudo: HOJE, restricoes: '' });
    expect(patchConclusao(atual, 'laudo', 'Apto com restrições por 60 dias', HOJE).patch).toEqual({ laudo: 'Apto com restrições por 60 dias', dataLaudo: HOJE });
    const fora = { ...atual, grupoFinalidade: 'Benefícios' };
    expect(patchConclusao(fora, 'laudo', 'Apto', HOJE).patch).toEqual({ laudo: 'Apto', dataLaudo: HOJE, restricoes: '' });
    expect(patchConclusao(fora, 'laudo', '', HOJE).patch.restricoes).toBe('');
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
    // TIS inserido com o DS-1a já gravado: não finaliza (a conclusão é pelo botão).
    expect(patchConclusao({ ...comLaudo, ds1a: 'D' }, 'tis', '026.000.1', HOJE).patch.status).toBe('assinaturas_pendentes');
  });
  it('DS-1a só com TIS; inserido NÃO finaliza (fica Assinaturas pendentes); apagado → Assinaturas pendentes', () => {
    const comLaudo = { ...base, status: 'votacao_pendente' as const, laudo: 'Apto' };
    expect(patchConclusao(comLaudo, 'ds1a', 'D', HOJE).patch).toEqual({});
    const comTis = { ...comLaudo, status: 'assinaturas_pendentes' as const, tis: '026.000.1', cid: 'M54.5 Dor lombar baixa' };
    expect(patchConclusao(comTis, 'ds1a', 'D', HOJE).patch).toEqual({ ds1a: 'D' });
    // Verificações e Términos sem CID: o DS-1a não entra.
    expect(patchConclusao({ ...comTis, cid: '' }, 'ds1a', 'D', HOJE).patch).toEqual({});
    expect(patchConclusao({ ...comTis, cid: '', grupoFinalidade: 'Benefícios' }, 'ds1a', 'D', HOJE).patch).toEqual({ ds1a: 'D' });
    expect(patchConclusao({ ...comTis, status: 'tis_assinado', ds1a: 'D' }, 'ds1a', '', HOJE).patch).toEqual({ ds1a: '', status: 'assinaturas_pendentes', situacao: 'andamento' });
  });
  it('Restrições só são gravadas se visíveis (Laudo com "restrições"); apagar sempre; Observações sempre', () => {
    const comRestr = { ...base, laudo: 'Apto com restrições por 30 dias' };
    expect(patchConclusao({ ...comRestr, grupoFinalidade: 'Benefícios' }, 'restricoes', 'Marchas', HOJE).patch).toEqual({});
    expect(patchConclusao(base, 'restricoes', 'Marchas', HOJE).patch).toEqual({});
    expect(patchConclusao(comRestr, 'restricoes', 'Marchas;Embarque', HOJE).patch).toEqual({ restricoes: 'Marchas; Embarque' });
    expect(patchConclusao({ ...comRestr, restricoes: 'Marchas; Embarque' }, 'restricoes', 'Embarque', HOJE).patch).toEqual({ restricoes: 'Embarque' });
    expect(patchConclusao({ ...base, restricoes: 'Marchas' }, 'restricoes', '', HOJE).patch).toEqual({ restricoes: '' });
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
    expect(patchEncaminhamento({ ...beneficio, tis: '026.000.1' }, 'jsd')).toEqual({ status: 'revisao_exofficio', situacao: 'andamento' });
    expect(patchEncaminhamento({ ...beneficio, tis: '026.000.1', status: 'tis_assinado' }, 'jsd')).toEqual({});
    expect(patchConclusao({ ...beneficio, status: 'revisao_exofficio' }, 'tis', '026.000.1').patch).toEqual({ tis: '026.000.1' });
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

describe('o que é editável no detalhe', () => {
  it('Conclusão: só com data de entrevista e até finalizar/cancelar', () => {
    expect(podeEditarConclusao({ status: 'aberta', dataEntrevista: '' })).toBe(false);
    expect(podeEditarConclusao({ status: 'votacao_pendente', dataEntrevista: '' })).toBe(false);
    expect(podeEditarConclusao({ status: 'agendada', dataEntrevista: '2026-11-10T08:00' })).toBe(true);
    expect(podeEditarConclusao({ status: 'faltou', dataEntrevista: '2026-11-10T08:00' })).toBe(true);
    expect(podeEditarConclusao({ status: 'assinaturas_pendentes', dataEntrevista: '2026-11-10T08:00' })).toBe(true);
    expect(podeEditarConclusao({ status: 'tis_assinado', dataEntrevista: '2026-11-10T08:00' })).toBe(false);
    expect(podeEditarConclusao({ status: 'cancelada', dataEntrevista: '2026-11-10T08:00' })).toBe(false);
  });
  it('Finalidade: só com a IS Aberta sem data de entrevista', () => {
    expect(podeEditarFinalidade({ status: 'aberta', dataEntrevista: '' })).toBe(true);
    expect(podeEditarFinalidade({ status: 'aberta', dataEntrevista: '2026-11-10T08:00' })).toBe(false);
    expect(podeEditarFinalidade({ status: 'agendada', dataEntrevista: '2026-11-10T08:00' })).toBe(false);
    expect(podeEditarFinalidade({ status: 'cancelada', dataEntrevista: '' })).toBe(false);
  });
});

describe('troca da finalidade', () => {
  const aberta = { finalidade: 'Controle Trienal', grupoFinalidade: 'Controle Periódico', amp: 'JRS' as const, peritoUid: 'u1', restricoes: '' };
  it('grava finalidade, grupo e AMP; mesmo AMP mantém o perito', () => {
    expect(patchFinalidade(aberta, { finalidade: 'Verificação de Deficiência Funcional', grupo: 'Verificações e Términos', amp: 'JRS' }))
      .toEqual({ finalidade: 'Verificação de Deficiência Funcional', grupoFinalidade: 'Verificações e Términos', amp: 'JRS' });
  });
  it('outro AMP apaga o perito', () => {
    expect(patchFinalidade(aberta, { finalidade: 'Outra', grupo: 'Ingresso', amp: 'MPI' }))
      .toEqual({ finalidade: 'Outra', grupoFinalidade: 'Ingresso', amp: 'MPI', peritoUid: '', peritoNome: '', peritoGmail: '' });
    expect(patchFinalidade({ ...aberta, peritoUid: '' }, { finalidade: 'Outra', grupo: 'Ingresso', amp: 'MPI' }))
      .toEqual({ finalidade: 'Outra', grupoFinalidade: 'Ingresso', amp: 'MPI' });
  });
  it('Restrições saem fora de Verificações e Términos; mesma finalidade não grava', () => {
    expect(patchFinalidade({ ...aberta, grupoFinalidade: 'Verificações e Términos', restricoes: 'Marchas' }, { finalidade: 'Controle Trienal', grupo: 'Controle Periódico', amp: 'JRS' }))
      .toEqual({ finalidade: 'Controle Trienal', grupoFinalidade: 'Controle Periódico', amp: 'JRS', restricoes: '' });
    expect(patchFinalidade(aberta, { finalidade: 'Controle Trienal', grupo: 'Controle Periódico', amp: 'JRS' })).toEqual({});
    expect(patchFinalidade(aberta, { finalidade: '', grupo: 'Controle Periódico', amp: 'JRS' })).toEqual({});
  });
});

describe('conclusão explícita (Concluir IS / Reabrir IS)', () => {
  const pronta = {
    ...base, status: 'assinaturas_pendentes' as const, laudo: 'Apto', dataLaudo: '2026-11-05', tis: '026.000.1', ds1a: 'D', cid: 'M54.5 Dor lombar baixa',
  };
  const quem = { uid: 'u1', usuario: 'CT TESTE' };
  it('Data da Conclusão: obrigatória, AAAA-MM-DD e nunca anterior à Data do laudo', () => {
    expect(erroDataConclusao('2026-11-05', '2026-11-05')).toBe('');
    expect(erroDataConclusao('2026-11-07', '2026-11-05')).toBe('');
    expect(erroDataConclusao('2026-11-04', '2026-11-05')).toMatch(/anterior à Data do laudo/);
    expect(erroDataConclusao('', '2026-11-05')).toMatch(/Informe/);
    expect(erroDataConclusao('07/11/2026', '')).toMatch(/inválida/);
    expect(erroDataConclusao('2026-11-07', '')).toBe('');
  });
  it('Data da Conclusão inicial: a gravada ou hoje', () => {
    expect(dataConclusaoInicial('', HOJE)).toBe(HOJE);
    expect(dataConclusaoInicial(undefined, HOJE)).toBe(HOJE);
    expect(dataConclusaoInicial('2026-11-01', HOJE)).toBe('2026-11-01');
  });
  it('só conclui com Laudo, TIS, DS-1a, CID (Verificações e Términos) e data válida', () => {
    expect(motivoNaoConcluir(pronta, HOJE)).toBe('');
    expect(motivoNaoConcluir({ ...pronta, ds1a: '' }, HOJE)).toMatch(/DS-1a/);
    expect(motivoNaoConcluir({ ...pronta, tis: '' }, HOJE)).toMatch(/TIS/);
    expect(motivoNaoConcluir({ ...pronta, laudo: '' }, HOJE)).toMatch(/Laudo/);
    expect(motivoNaoConcluir({ ...pronta, cid: '' }, HOJE)).toMatch(/CID/);
    expect(motivoNaoConcluir({ ...pronta, cid: '', grupoFinalidade: 'Benefícios' }, HOJE)).toBe('');
    expect(motivoNaoConcluir({ ...pronta, dataEntrevista: '' }, HOJE)).toMatch(/entrevista/);
    expect(motivoNaoConcluir({ ...pronta, status: 'tis_assinado' }, HOJE)).toMatch(/finalizada/);
    expect(motivoNaoConcluir(pronta, '2026-11-01')).toMatch(/anterior/);
  });
  it('Concluir grava TIS assinado (Finalizada), a data e quem concluiu', () => {
    expect(patchConcluirIS(pronta, HOJE, quem)).toEqual({ status: 'tis_assinado', situacao: 'finalizada', dataConclusao: HOJE, concluidaPor: quem });
    expect(patchConcluirIS({ ...pronta, ds1a: '' }, HOJE, quem)).toBeNull();
    expect(patchConcluirIS(pronta, '2026-11-01', quem)).toBeNull();
  });
  it('Reabrir volta ao status coerente e apaga a conclusão', () => {
    const concluida = { ...pronta, status: 'tis_assinado' as const };
    expect(patchReabrirIS(concluida)).toEqual({ status: 'assinaturas_pendentes', situacao: 'andamento', dataConclusao: '', concluidaPor: null });
    expect(patchReabrirIS(pronta)).toBeNull();
    expect(statusAoReabrir({ laudo: 'Apto', tis: '', dataEntrevista: 'x' })).toBe('votacao_pendente');
    expect(statusAoReabrir({ laudo: '', tis: '', dataEntrevista: '2026-11-06T10:30' })).toBe('agendada');
    expect(statusAoReabrir({ laudo: '', tis: '', dataEntrevista: '' })).toBe('aberta');
  });
  it('Reabrir: quem tem a função ou quem concluiu; só IS concluída', () => {
    const concluida = { status: 'tis_assinado' as const, concluidaPor: { uid: 'u1' } };
    expect(podeReabrirIS(concluida, 'u2', true)).toBe(true);
    expect(podeReabrirIS(concluida, 'u1', false)).toBe(true);
    expect(podeReabrirIS(concluida, 'u2', false)).toBe(false);
    expect(podeReabrirIS({ status: 'tis_assinado' }, 'u1', false)).toBe(false);
    expect(podeReabrirIS({ status: 'assinaturas_pendentes', concluidaPor: { uid: 'u1' } }, 'u1', true)).toBe(false);
  });
});
