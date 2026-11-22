import { describe, it, expect } from 'vitest';
import { aberturaPendente, conclusaoPendenteAntiga, faltaNaoCancelada, finalizadaPelaJSD, nacAtrasado, semAgendamentoNoPrazo, semMinutaMsg } from '../pendenciasHomeIS';

const HOJE = '2026-11-23'; // segunda
describe('pendências da Início (IS)', () => {
  it('e-mail de abertura: IS aberta sem e-mail enviado', () => {
    expect(aberturaPendente({ situacao: 'aberta' })).toBe(true);
    expect(aberturaPendente({ situacao: 'aberta', emailAberturaPara: 'a@b.c' })).toBe(false);
    expect(aberturaPendente({ situacao: 'andamento' })).toBe(false);
  });
  it('sem agendamento: >7 dias úteis, sem guias; Benefícios 60 dias', () => {
    const is = { situacao: 'aberta', dataAbertura: '2026-11-03', grupoFinalidade: 'Verificações e Términos' };
    expect(semAgendamentoNoPrazo(is, HOJE)).toBe(true);
    expect(semAgendamentoNoPrazo({ ...is, dataAbertura: '2026-11-18' }, HOJE)).toBe(false);
    expect(semAgendamentoNoPrazo({ ...is, guiasEntregues: true }, HOJE)).toBe(false);
    expect(semAgendamentoNoPrazo({ ...is, dataEntrevista: '2026-11-30' }, HOJE)).toBe(false);
    expect(semAgendamentoNoPrazo({ ...is, grupoFinalidade: 'Benefícios' }, HOJE)).toBe(false);
    expect(semAgendamentoNoPrazo({ ...is, grupoFinalidade: 'Benefícios', dataAbertura: '2026-08-01' }, HOJE)).toBe(true);
  });
  it('conclusão pendente: entrevista há mais de 20 dias e sem laudo', () => {
    const is = { status: 'conclusao_pendente', dataEntrevista: '2026-10-30T09:00', laudo: '' };
    expect(conclusaoPendenteAntiga(is, HOJE)).toBe(true);
    expect(conclusaoPendenteAntiga({ ...is, dataEntrevista: '2026-11-10T09:00' }, HOJE)).toBe(false);
    expect(conclusaoPendenteAntiga({ ...is, laudo: 'Apto' }, HOJE)).toBe(false);
  });
  it('sem minuta MSG: exclui finalizada pela JSD, cancelada e as que já têm mensagem', () => {
    const vdf = { situacao: 'finalizada', status: 'tis_assinado', finalidade: 'Controle Periódico de Saúde', grupoFinalidade: 'Verificações e Términos', laudo: 'Apto' };
    expect(semMinutaMsg(vdf, false)).toBe(true);
    expect(semMinutaMsg(vdf, true)).toBe(false);
    expect(semMinutaMsg({ ...vdf, status: 'cancelada' }, false)).toBe(false);
    const ben = { situacao: 'finalizada', status: 'tis_assinado', finalidade: 'Isenção de Imposto de Renda', grupoFinalidade: 'Benefícios', laudo: 'Tem histórico médico de Neoplasia Maligna, doença especificada na Lei 7.713/1988.' };
    expect(finalizadaPelaJSD(ben, { rm1: true })).toBe(true);
    expect(semMinutaMsg(ben, false, { rm1: true })).toBe(false);
    expect(semMinutaMsg(ben, false, { tipo: 'pensionista' })).toBe(true);
    const inc = { ...vdf, finalidade: 'Verificação de Deficiência Funcional', laudo: 'Incapaz definitivamente para o SAM', tis: '026.001.1' };
    expect(semMinutaMsg(inc, false)).toBe(false);
  });
  it('falta registrada ainda não cancelada', () => {
    expect(faltaNaoCancelada({ status: 'faltou' })).toBe(true);
    expect(faltaNaoCancelada({ status: 'cancelada' })).toBe(false);
  });
  it('NAC: só quando a IS mais antiga da lista passou de 7 dias', () => {
    const base = { situacao: 'finalizada', status: 'tis_assinado', grupoFinalidade: 'Verificações e Términos' };
    expect(nacAtrasado([{ ...base, dataLaudo: '2026-11-10' }, { ...base, dataLaudo: '2026-11-20' }], HOJE)).toBe(true);
    expect(nacAtrasado([{ ...base, dataLaudo: '2026-11-20' }], HOJE)).toBe(false);
    expect(nacAtrasado([], HOJE)).toBe(false);
  });
});
