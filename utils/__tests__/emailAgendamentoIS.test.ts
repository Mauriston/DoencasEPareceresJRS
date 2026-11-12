// E-mail "AGENDAMENTO DE INSPEÇÃO DE SAÚDE": regras (utils/emailAgendamentoIS.ts) e montagem (servidor/email/agendamentoIS.ts).
import { describe, expect, it } from 'vitest';
import { agendamentoJaEnviado, dataHoraDoAgendamento, ehElegivelAgendamento, modeloDoGrupo } from '../emailAgendamentoIS';
import { montarEmailAgendamento } from '../../servidor/email/agendamentoIS';
import { assinaturaSemSignatario } from '../../servidor/email/comum';

const placeholder = /\{\{[#^/]?\w+\}\}/;

describe('regras', () => {
  it('só Verificações e Términos tem e-mail de agendamento (Benefícios não)', () => {
    expect(modeloDoGrupo('Benefícios')).toBeNull();
    expect(modeloDoGrupo('Verificações e Términos')).toBe('verificacoes');
    expect(modeloDoGrupo('Controle Periódico')).toBeNull();
    expect(modeloDoGrupo(undefined)).toBeNull();
  });
  it('elegível: grupo certo, com data e hora, não cancelada', () => {
    const base = { grupoFinalidade: 'Verificações e Términos', dataEntrevista: '2026-11-13T13:40', status: 'agendada' };
    expect(ehElegivelAgendamento(base)).toBe(true);
    expect(ehElegivelAgendamento({ ...base, dataEntrevista: '' })).toBe(false);
    expect(ehElegivelAgendamento({ ...base, status: 'cancelada' })).toBe(false);
    expect(ehElegivelAgendamento({ ...base, grupoFinalidade: 'Ingresso' })).toBe(false);
    expect(ehElegivelAgendamento({ ...base, grupoFinalidade: 'Benefícios' })).toBe(false);
  });
  it('um envio por data/hora: reagendada, pode enviar de novo', () => {
    expect(agendamentoJaEnviado({ dataEntrevista: '2026-11-13T13:40', emailAgendamentoDataEntrevista: '2026-11-13T13:40' })).toBe(true);
    expect(agendamentoJaEnviado({ dataEntrevista: '2026-11-20T08:00', emailAgendamentoDataEntrevista: '2026-11-13T13:40' })).toBe(false);
    expect(agendamentoJaEnviado({ dataEntrevista: '2026-11-13T13:40' })).toBe(false);
  });
  it('data e hora', () => {
    expect(dataHoraDoAgendamento('2026-11-13T13:40')).toEqual({ data: '13/11/2026', hora: '13:40' });
  });
});

describe('montarEmailAgendamento', () => {
  const is = { is: 1253621, inspecionado: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', finalidade: 'Verificação de Deficiência Funcional', dataEntrevista: '2026-11-13T13:40' };

  it('Verificações e Términos: modelo de VDF/Términos, placeholders preenchidos, sem JavaScript', () => {
    const r = montarEmailAgendamento({ ...is, grupoFinalidade: 'Verificações e Términos' });
    expect(r.assunto).toBe('AGENDAMENTO DE INSPEÇÃO DE SAÚDE');
    expect(r.modelo).toBe('verificacoes');
    expect(r.html).not.toMatch(placeholder);
    expect(r.html).not.toMatch(/<script|javascript:|\son\w+=|dfsrc|data-marker/i);
    expect(r.html).toContain('Sobre as Finalidades VDF e Términos');
    expect(r.html).toContain('3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA');
    expect(r.html).toContain('Verificação de Deficiência Funcional');
    expect(r.html).toContain('13/11/2026');
    expect(r.html).toContain('13:40');
    expect(r.html).toContain('tem o prazo de 20 dias');
    expect(r.html).not.toContain('Doença Prevista em Lei');
  });

  it('assinatura: sem signatário (Admin) não há "Por ordem de"; com signatário, aparece', () => {
    const sem = montarEmailAgendamento({ ...is, grupoFinalidade: 'Verificações e Términos' });
    expect(sem.html).not.toContain('Por ordem de');
    const com = montarEmailAgendamento({ ...is, grupoFinalidade: 'Verificações e Términos' }, {
      ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'Fulano de Tal', signatario_posto: 'Suboficial-RM1-EF', signatario_cargo: 'Supervisor',
    });
    expect(com.html).toContain('Por ordem de:');
    expect(com.html).toContain('Fulano de Tal');
    expect(com.texto).toContain('Por ordem de:\nFulano de Tal');
  });

  it('grupo sem e-mail de agendamento (inclusive Benefícios): erro', () => {
    expect(() => montarEmailAgendamento({ ...is, grupoFinalidade: 'Ingresso' })).toThrow();
    expect(() => montarEmailAgendamento({ ...is, grupoFinalidade: 'Benefícios' })).toThrow();
  });
});
