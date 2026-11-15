// E-mails de agendamento/reagendamento de IS: regras (utils/emailAgendamentoIS.ts) e montagem dos três modelos
// (servidor/email/agendamentoIS.ts: Verificações e Términos, Benefícios e geral).
import { describe, expect, it } from 'vitest';
import {
  agendamentoJaEnviado, agendamentoPendente, assuntoAgendamento, dataHoraDoAgendamento, ehElegivelAgendamento, nomeInspecionado,
  tipoEmailAgendamento, varianteAgendamento, vocativoPorSexo,
} from '../emailAgendamentoIS';
import { ccAgendamento, montarEmailAgendamento } from '../../servidor/email/agendamentoIS';
import { assinaturaSemSignatario } from '../../servidor/email/comum';
import { EMAILS_DIVISAO_PESSOAL_HNRE, EMAILS_EAMPE } from '../../config/emails';

const placeholder = /\{\{[#^/]?\w+\}\}/;
const semJs = /<script|javascript:|\son\w+=|dfsrc|data-marker/i;
const VT = 'Verificações e Términos';
const comSignatario = {
  ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'Fulano de Tal', signatario_posto: 'Suboficial-RM1-EF', signatario_cargo: 'Supervisor',
};

describe('regras', () => {
  it('modelo pelo grupo: Verificações → agendamentoIS; Benefícios → agendamentoBeneficios; demais → agendamentoGeral', () => {
    expect(tipoEmailAgendamento(VT)).toBe('agendamentoIS');
    expect(tipoEmailAgendamento('verificacoes e terminos')).toBe('agendamentoIS');
    expect(tipoEmailAgendamento('Benefícios')).toBe('agendamentoBeneficios');
    expect(tipoEmailAgendamento('Controle Periódico')).toBe('agendamentoGeral');
    expect(tipoEmailAgendamento(undefined)).toBe('agendamentoGeral');
  });
  it('elegível: qualquer grupo, com data e hora, não cancelada', () => {
    const base = { grupoFinalidade: VT, dataEntrevista: '2026-11-13T13:40', status: 'agendada' };
    expect(ehElegivelAgendamento(base)).toBe(true);
    expect(ehElegivelAgendamento({ ...base, grupoFinalidade: 'Ingresso' })).toBe(true);
    expect(ehElegivelAgendamento({ ...base, grupoFinalidade: 'Benefícios' })).toBe(true);
    expect(ehElegivelAgendamento({ ...base, dataEntrevista: '' })).toBe(false);
    expect(ehElegivelAgendamento({ ...base, dataEntrevista: '2026-11-13' })).toBe(false);
    expect(ehElegivelAgendamento({ ...base, status: 'cancelada' })).toBe(false);
  });
  it('um envio por data/hora: reagendada, pode enviar de novo', () => {
    expect(agendamentoJaEnviado({ dataEntrevista: '2026-11-13T13:40', emailAgendamentoDataEntrevista: '2026-11-13T13:40' })).toBe(true);
    expect(agendamentoJaEnviado({ dataEntrevista: '2026-11-20T08:00', emailAgendamentoDataEntrevista: '2026-11-13T13:40' })).toBe(false);
    expect(agendamentoJaEnviado({ dataEntrevista: '2026-11-13T13:40' })).toBe(false);
  });
  it('variante: reagendamento quando já houve e-mail para outra data/hora ou status reagendada', () => {
    expect(varianteAgendamento({ status: 'agendada', dataEntrevista: '2026-11-13T13:40' })).toBe('agendamento');
    expect(varianteAgendamento({ status: 'reagendada', dataEntrevista: '2026-11-13T13:40' })).toBe('reagendamento');
    expect(varianteAgendamento({ status: 'agendada', dataEntrevista: '2026-11-20T08:00', emailAgendamentoDataEntrevista: '2026-11-13T13:40' })).toBe('reagendamento');
    expect(varianteAgendamento({ status: 'agendada', dataEntrevista: '2026-11-13T13:40', emailAgendamentoDataEntrevista: '2026-11-13T13:40' })).toBe('agendamento');
  });
  it('pendente: qualquer grupo agendado de hoje em diante, sem o e-mail desta data', () => {
    const base = { grupoFinalidade: 'Benefícios', status: 'agendada', dataEntrevista: '2026-11-13T13:40' };
    expect(agendamentoPendente(base, '2026-11-12')).toBe(true);
    expect(agendamentoPendente({ ...base, grupoFinalidade: 'Ingresso', status: 'reagendada' }, '2026-11-13')).toBe(true);
    expect(agendamentoPendente(base, '2026-11-14')).toBe(false);
    expect(agendamentoPendente({ ...base, status: 'faltou' }, '2026-11-12')).toBe(false);
  });
  it('data e hora', () => {
    expect(dataHoraDoAgendamento('2026-11-13T13:40')).toEqual({ data: '13/11/2026', hora: '13:40' });
    expect(dataHoraDoAgendamento('')).toEqual({ data: '', hora: '' });
  });
  it('inspecionado sem NIP, assunto e vocativo', () => {
    expect(nomeInspecionado('CT (Md) 12.3456.78 MAURISTON RENAN MARTINS SILVA')).toBe('CT (Md) MAURISTON RENAN MARTINS SILVA');
    expect(nomeInspecionado('3SG-PT 07383657 CARLOS SILVA')).toBe('3SG-PT CARLOS SILVA');
    expect(nomeInspecionado('PENS-CMG MARIA DA SILVA')).toBe('PENS-CMG MARIA DA SILVA');
    expect(assuntoAgendamento('Controle Periódico', '1SG-EF 01.2345.67 JOSE LIMA')).toBe('AGENDAMENTO DE IS FIM Controle Periódico - 1SG-EF JOSE LIMA');
    expect(vocativoPorSexo('Masculino')).toBe('Prezado');
    expect(vocativoPorSexo('Feminino')).toBe('Prezada');
    expect(vocativoPorSexo(undefined)).toBe('Prezado(a)');
  });
});

describe('CC dinâmico', () => {
  const sec = ['ana.secretaria@marinha.mil.br'];
  it('Verificações e geral: Secretaria + cópias pela OM; Benefícios: só Secretaria', () => {
    expect(ccAgendamento('agendamentoIS', sec, 'HNRe')).toEqual([...sec, ...EMAILS_DIVISAO_PESSOAL_HNRE]);
    expect(ccAgendamento('agendamentoGeral', sec, 'EAMPE')).toEqual([...sec, ...EMAILS_EAMPE]);
    expect(ccAgendamento('agendamentoGeral', sec, 'CPPE')).toEqual(sec);
    expect(ccAgendamento('agendamentoBeneficios', sec, 'HNRe')).toEqual(sec);
  });
});

describe('montarEmailAgendamento', () => {
  const is = { is: 1253621, inspecionado: '3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA', finalidade: 'Verificação de Deficiência Funcional', dataEntrevista: '2026-11-13T13:40' };

  it('Verificações e Términos: modelo de VDF/Términos, novo assunto, sem placeholders nem JavaScript', () => {
    const r = montarEmailAgendamento({ ...is, grupoFinalidade: VT });
    expect(r.assunto).toBe('AGENDAMENTO DE IS FIM Verificação de Deficiência Funcional - 3SG-PT CARLOS ANTONIO PEREIRA DA SILVA');
    expect(r.tipo).toBe('agendamentoIS');
    expect(r.html).not.toMatch(placeholder);
    expect(r.html).not.toMatch(semJs);
    expect(r.html).toContain('Sobre as Finalidades VDF e Términos');
    expect(r.html).toContain('Confirmação de Agendamento de Inspeção de Saúde');
    expect(r.html).toContain('3SG-PT 07.3836.57 CARLOS ANTONIO PEREIRA DA SILVA');
    expect(r.html).toContain('13/11/2026');
    expect(r.html).toContain('tem o prazo de 20 dias');
    expect(r.html).not.toContain('INFORMAÇÃO PESSOAL');
  });

  it('reagendamento: título ajustado, assunto igual', () => {
    const a = montarEmailAgendamento({ ...is, grupoFinalidade: VT });
    const r = montarEmailAgendamento({ ...is, grupoFinalidade: VT }, undefined, 'reagendamento');
    expect(r.assunto).toBe(a.assunto);
    expect(r.html).toContain('Confirmação de Reagendamento de Inspeção de Saúde');
    expect(r.texto).toContain('CONFIRMAÇÃO DE REAGENDAMENTO');
    const b = montarEmailAgendamento({ ...is, grupoFinalidade: 'Benefícios' }, undefined, 'reagendamento');
    expect(b.html).toContain('Confirmação de Reagendamento de Inspeção de Saúde');
    const g = montarEmailAgendamento({ ...is, grupoFinalidade: 'Ingresso' }, undefined, 'reagendamento');
    expect(g.html).toContain('foi reagendada para');
    expect(g.texto).toContain('foi reagendada para 13/11/2026 às 13:40');
  });

  it('geral: vocativo pelo sexo com o inspecionado sem NIP e uma frase', () => {
    const r = montarEmailAgendamento({ ...is, finalidade: 'Controle Periódico', grupoFinalidade: 'Controle Periódico' }, comSignatario, 'agendamento', { sexo: 'Masculino' });
    expect(r.tipo).toBe('agendamentoGeral');
    expect(r.html).not.toMatch(placeholder);
    expect(r.html).not.toMatch(semJs);
    expect(r.html).toContain('Prezado 3SG-PT CARLOS ANTONIO PEREIRA DA SILVA,');
    expect(r.html).toContain('foi agendada para');
    expect(r.texto).toContain('Informo que a IS fim Controle Periódico foi agendada para 13/11/2026 às 13:40, na JRS/HNRe.');
    expect(r.html).toContain('Respeitosamente / Atenciosamente,');
    expect(r.html).toContain('Por ordem de:');
    expect(r.html).not.toContain('07.3836.57');
    const f = montarEmailAgendamento({ ...is, grupoFinalidade: 'Ingresso' }, undefined, 'agendamento', { sexo: 'Feminino' });
    expect(f.html).toContain('Prezada ');
    expect(montarEmailAgendamento({ ...is, grupoFinalidade: 'Ingresso' }).html).toContain('Prezado(a) ');
  });

  it('Benefícios: corpo do template do Presidente, finalidade real, nome do cadastro e assinatura dinâmica', () => {
    const r = montarEmailAgendamento({ ...is, finalidade: 'Isenção de pagamento de imposto de renda', grupoFinalidade: 'Benefícios' }, comSignatario, 'agendamento', { nome: 'CARLOS ANTONIO PEREIRA DA SILVA' });
    expect(r.tipo).toBe('agendamentoBeneficios');
    expect(r.assunto).toBe('AGENDAMENTO DE IS FIM Isenção de pagamento de imposto de renda - 3SG-PT CARLOS ANTONIO PEREIRA DA SILVA');
    expect(r.html).not.toMatch(placeholder);
    expect(r.html).not.toMatch(semJs);
    expect(r.html).toContain('Sr(a). <span style="color:#050f41;font-weight:bold">CARLOS ANTONIO PEREIRA DA SILVA</span>');
    expect(r.html).toContain('Isenção de pagamento de imposto de renda');
    expect(r.html).toContain('13:40h');
    expect(r.html).toContain('Documentos Médicos Específicos por Doença');
    expect(r.html).toContain('Fibrose Cística');
    expect(r.html).toContain('Fulano de Tal');
    expect(r.html).not.toContain('Alessandro');
    expect(r.html).not.toContain('Concessão de Benefícios');
  });

  it('assinatura: sem signatário (Admin) não há "Por ordem de"; com signatário, aparece', () => {
    const sem = montarEmailAgendamento({ ...is, grupoFinalidade: VT });
    expect(sem.html).not.toContain('Por ordem de');
    const com = montarEmailAgendamento({ ...is, grupoFinalidade: VT }, comSignatario);
    expect(com.html).toContain('Por ordem de:');
    expect(com.texto).toContain('Por ordem de:\nFulano de Tal');
  });

  it('sem data de entrevista: erro', () => {
    expect(() => montarEmailAgendamento({ ...is, dataEntrevista: '', grupoFinalidade: VT })).toThrow();
  });
});
