import { describe, it, expect } from 'vitest';
import { documentoISVisivel, perfilCompetenteIS, termoRecursoCabe, TAG_LAUDO_PERICIAL_PENDENTE } from '../documentosIS';

const MED = 'user_medicos';
const base = { situacao: 'andamento', amp: 'JRS', finalidade: 'Controle Periódico de Saúde', grupoFinalidade: 'Verificações e Términos', laudo: '', tis: '' };
const NAO = 'Não apresenta histórico médico de doença especificada na Lei no 7.713/1988.';
const HIST = 'Tem histórico médico de Neoplasia Maligna (C50.9), doença especificada na Lei no 7.713/1988.';
const BEN = { situacao: 'finalizada', amp: 'JRS', finalidade: 'Isenção de Imposto de Renda', grupoFinalidade: 'Benefícios', tis: '025.001.1' };

describe('visibilidade dos documentos da IS (oculta, não desabilita)', () => {
  it('Declaração de Comparecimento: só IS em andamento', () => {
    expect(documentoISVisivel('declaracaoComparecimento', MED, base)).toBe(true);
    expect(documentoISVisivel('declaracaoComparecimento', MED, { ...base, situacao: 'aberta' })).toBe(false);
    expect(documentoISVisivel('declaracaoComparecimento', MED, { ...base, situacao: 'finalizada' })).toBe(false);
  });
  it('Solicitação de Exames: em andamento e sem laudo', () => {
    expect(documentoISVisivel('solicitacaoExames', MED, base)).toBe(true);
    expect(documentoISVisivel('solicitacaoExames', MED, { ...base, laudo: 'Apto' })).toBe(false);
  });
  it('Papeleta: em andamento, JRS, VDF/Término, sem laudo', () => {
    const vdf = { ...base, finalidade: 'Verificação de Deficiência Funcional' };
    expect(documentoISVisivel('papeletaDispensa', MED, vdf)).toBe(true);
    expect(documentoISVisivel('papeletaDispensa', MED, { ...vdf, laudo: 'Incapaz' })).toBe(false);
    expect(documentoISVisivel('papeletaDispensa', MED, { ...vdf, amp: 'MPI' })).toBe(false);
    expect(documentoISVisivel('papeletaDispensa', MED, base)).toBe(false);
  });
  it('Termo de Recurso: exige TIS e o laudo certo por grupo', () => {
    const ver = { ...base, situacao: 'finalizada', tis: '025.001.1' };
    expect(termoRecursoCabe({ ...ver, laudo: 'Apto com restrições por 30 dias' })).toBe(true);
    expect(termoRecursoCabe({ ...ver, laudo: 'Apto' })).toBe(true);
    expect(termoRecursoCabe({ ...ver, laudo: 'Incapaz definitivamente para o SAM' })).toBe(true);
    expect(termoRecursoCabe({ ...ver, laudo: 'Incapaz temporariamente' })).toBe(false);
    expect(termoRecursoCabe({ ...ver, laudo: 'Apto', tis: '' })).toBe(false);
    expect(termoRecursoCabe({ ...BEN, laudo: NAO })).toBe(true);
    expect(termoRecursoCabe({ ...BEN, laudo: HIST })).toBe(false);
  });
  it('Laudo Pericial: só finalizada de Isenção de IR com a tag pendente; some ao gerar (tag removida)', () => {
    const pend = { ...BEN, laudo: HIST, tags: [TAG_LAUDO_PERICIAL_PENDENTE] };
    expect(documentoISVisivel('laudoPericial', 'user_secretaria', pend)).toBe(true);
    expect(documentoISVisivel('laudoPericial', 'user_secretaria', { ...pend, tags: [] })).toBe(false);
    expect(documentoISVisivel('laudoPericial', 'user_secretaria', { ...pend, laudo: NAO, tags: [] })).toBe(false);
    expect(documentoISVisivel('laudoPericial', 'user_secretaria', { ...pend, situacao: 'andamento' })).toBe(false);
  });
  it('competência: médicos só na própria junta', () => {
    expect(perfilCompetenteIS('user_medicos', 'JRS')).toBe(true);
    expect(perfilCompetenteIS('user_medicos', 'MPI')).toBe(false);
    expect(perfilCompetenteIS('user_medicos_mpi', 'MPI')).toBe(true);
    expect(perfilCompetenteIS('user_medicos_mpi', 'JRS')).toBe(false);
    expect(perfilCompetenteIS('admin', 'MPI')).toBe(true);
  });
});
