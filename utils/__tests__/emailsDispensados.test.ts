import { describe, expect, it } from 'vitest';
import { chaveDispensa, emailDispensado } from '../emailsDispensados';
import { agendamentoPendente } from '../emailAgendamentoIS';
import { faltaSemEmail } from '../emailFaltasHNRe';
import { pendenteNac } from '../emailNac';
import { textoAvisoEmail } from '../../config/notificacoesEmails';

describe('"Limpar" das pendências de e-mail', () => {
  const ag = { grupoFinalidade: 'Verificações e Términos', status: 'agendada', dataEntrevista: '2026-11-20T08:30' };

  it('agendamento: dispensado só para a data/hora dispensada; reagendar volta a pendência', () => {
    expect(agendamentoPendente(ag, '2026-11-16')).toBe(true);
    const limpo = { ...ag, emailsDispensados: { agendamento: chaveDispensa('agendamento', ag) } };
    expect(agendamentoPendente(limpo, '2026-11-16')).toBe(false);
    expect(agendamentoPendente({ ...limpo, status: 'reagendada', dataEntrevista: '2026-11-25T09:00' }, '2026-11-16')).toBe(true);
  });

  it('faltas: vale para a falta daquela data', () => {
    const f = { status: 'faltou', dataEntrevista: '2026-11-10T08:00' };
    expect(faltaSemEmail({ ...f, emailsDispensados: { faltas: '2026-11-10T08:00' } })).toBe(false);
    expect(faltaSemEmail({ ...f, dataEntrevista: '2026-11-12T08:00', emailsDispensados: { faltas: '2026-11-10T08:00' } })).toBe(true);
  });

  it('NAC: uma vez por IS', () => {
    const n = { situacao: 'finalizada', status: 'tis_assinado', grupoFinalidade: 'Verificações e Términos' };
    expect(pendenteNac(n)).toBe(true);
    expect(pendenteNac({ ...n, emailsDispensados: { nac: 'sim' } })).toBe(false);
    expect(emailDispensado('resultado', { emailsDispensados: { nac: 'sim' } })).toBe(false);
  });
});

describe('aviso de e-mail enviado', () => {
  it('preenche o modelo', () => {
    expect(textoAvisoEmail('{ator} enviou o e-mail de resultado da IS {is}', { ator: 'CB SILVA', is: '1249757' })).toBe('CB SILVA enviou o e-mail de resultado da IS 1249757');
    expect(textoAvisoEmail('O e-mail das IS agendadas em {data} foi enviado automaticamente', { data: '17/11/2026' })).toContain('17/11/2026');
  });
});
