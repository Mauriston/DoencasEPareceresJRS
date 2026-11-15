// Confirmação do e-mail de agendamento (todos os grupos): modelo pelo grupo, variante de reagendamento e cópias pela OM.
import { describe, expect, it } from 'vitest';
import {
  copiasPorOMDoAgendamento, ehReagendamentoEmail, rotuloCopiasPorOM, tipoEmailAgendamentoDoGrupo,
} from '../confirmacaoAgendamentoIS';
import { EMAILS_EAMPE } from '../../config/emails';

describe('tipoEmailAgendamentoDoGrupo', () => {
  it('Verificações → agendamentoIS; Benefícios → agendamentoBeneficios; demais → agendamentoGeral', () => {
    expect(tipoEmailAgendamentoDoGrupo('Verificações e Términos')).toBe('agendamentoIS');
    expect(tipoEmailAgendamentoDoGrupo('verificacoes e terminos')).toBe('agendamentoIS');
    expect(tipoEmailAgendamentoDoGrupo('Benefícios')).toBe('agendamentoBeneficios');
    expect(tipoEmailAgendamentoDoGrupo('Licenciamento')).toBe('agendamentoGeral');
    expect(tipoEmailAgendamentoDoGrupo(undefined)).toBe('agendamentoGeral');
  });
});

describe('ehReagendamentoEmail', () => {
  it('primeiro agendamento não é reagendamento', () => {
    expect(ehReagendamentoEmail({ status: 'agendada', dataEntrevista: '2026-11-20T08:00' })).toBe(false);
    expect(ehReagendamentoEmail({ status: 'agendada', dataEntrevista: '2026-11-20T08:00', emailAgendamentoDataEntrevista: '2026-11-20T08:00' })).toBe(false);
  });
  it('e-mail anterior para outra data, ou status Reagendada', () => {
    expect(ehReagendamentoEmail({ status: 'agendada', dataEntrevista: '2026-11-21T08:00', emailAgendamentoDataEntrevista: '2026-11-20T08:00' })).toBe(true);
    expect(ehReagendamentoEmail({ status: 'reagendada', dataEntrevista: '2026-11-21T08:00' })).toBe(true);
  });
});

describe('cópias pela OM', () => {
  it('HNRe → Divisão de Pessoal; EAMPE → e-mail; Benefícios sem cópia pela OM', () => {
    expect(rotuloCopiasPorOM('agendamentoIS', 'HNRe')).toBe('Divisão de Pessoal do HNRe');
    expect(rotuloCopiasPorOM('agendamentoGeral', 'EAMPE')).toBe(EMAILS_EAMPE.join(', '));
    expect(copiasPorOMDoAgendamento('agendamentoBeneficios', 'HNRe')).toEqual([]);
    expect(rotuloCopiasPorOM('agendamentoGeral', 'CPPE')).toBe('');
  });
});
