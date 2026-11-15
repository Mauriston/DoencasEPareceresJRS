// Seção "E-mails enviados" do detalhe da IS: registros + campos antigos, ordem e formatação.
import { describe, expect, it } from 'vitest';
import { dataHoraDoEnvio, mesclarHistoricoEmails, msDeCarimbo, rotuloDoEnvio } from '../historicoEmailsIS';
import type { RegistroEmailIS } from '../registroEmailsIS';

// 15/11/2026 13:40 em Recife (UTC−3) = 16:40 UTC.
const T = Date.UTC(2026, 10, 15, 16, 40);
const reg = (id: string, tipo: RegistroEmailIS['tipo'], ms: number, extra: Partial<RegistroEmailIS> = {}): RegistroEmailIS & { id: string } => ({
  id, tipo, assunto: 'A', para: ['x@y.com'], cc: [], enviadoEmMs: ms, enviadoPor: { uid: 'u1', usuario: 'sec.fulana' }, ...extra,
});
const carimbo = (ms: number) => ({ toMillis: () => ms });

describe('formatação', () => {
  it('data/hora dd/mm/aaaa hh:mm em Recife', () => {
    expect(dataHoraDoEnvio(T)).toBe('15/11/2026 13:40');
    expect(dataHoraDoEnvio(0)).toBe('');
  });
  it('carimbos do Firestore, Date e { seconds }', () => {
    expect(msDeCarimbo(carimbo(5))).toBe(5);
    expect(msDeCarimbo({ seconds: 2 })).toBe(2000);
    expect(msDeCarimbo(new Date(7))).toBe(7);
    expect(msDeCarimbo(null)).toBe(0);
  });
  it('rótulo com a variante', () => {
    expect(rotuloDoEnvio('agendamentoGeral', 'reagendamento')).toBe('Agendamento · reagendamento');
    expect(rotuloDoEnvio('resultadoBeneficios', 'nao_enquadramento')).toBe('Resultado (Benefícios) · não enquadramento');
    expect(rotuloDoEnvio('aberturaIS')).toBe('Abertura da IS');
  });
});

describe('mesclarHistoricoEmails', () => {
  it('mais recente primeiro, com quem enviou', () => {
    const r = mesclarHistoricoEmails([reg('a', 'aberturaIS', T - 1000), reg('b', 'agendamentoGeral', T)], {});
    expect(r.map(i => i.chave)).toEqual(['b', 'a']);
    expect(r[0].usuario).toBe('sec.fulana');
    expect(r[0].legado).toBe(false);
  });
  it('campo antigo sem registro correspondente entra no histórico', () => {
    const r = mesclarHistoricoEmails([], {
      emailResultadoEnviadoEm: carimbo(T), emailResultadoPara: 'z@w.com', emailResultadoEnviadoPor: 'u9',
      emailNacEnviadoEm: carimbo(T - 60_000), emailFaltaEnviadoEm: null,
    }, uid => (uid === 'u9' ? 'adm' : undefined));
    expect(r.map(i => i.tipo)).toEqual(['resultadoIS', 'nac']);
    expect(r[0]).toMatchObject({ para: ['z@w.com'], usuario: 'adm', legado: true, assunto: 'RESULTADO DE INSPEÇÃO DE SAÚDE' });
    expect(r[1].usuario).toBe('');
  });
  it('campo antigo com registro do mesmo envio (qualquer modelo de agendamento) não duplica', () => {
    const r = mesclarHistoricoEmails([reg('a', 'agendamentoBeneficios', T + 2000)], { emailAgendamentoEnviadoEm: carimbo(T), emailAgendamentoPara: 'x@y.com' });
    expect(r).toHaveLength(1);
    // Envio antigo (dias antes) do agendamento continua aparecendo.
    const r2 = mesclarHistoricoEmails([reg('a', 'agendamentoIS', T)], { emailAgendamentoEnviadoEm: carimbo(T - 3 * 86_400_000) });
    expect(r2).toHaveLength(2);
    expect(r2[1].legado).toBe(true);
  });
});
