// Base comum dos e-mails: configuração (config/emails.ts) e assinatura dinâmica (servidor/email/comum.ts).
import { describe, expect, it } from 'vitest';
import { CONFIG_EMAILS_PADRAO, cargoSemJrs, mesclarConfigEmails } from '../../config/emails';
import { assinaturaSemSignatario, assinaturaTexto, juntarEmails } from '../../servidor/email/comum';

describe('config/emails', () => {
  it('sem documento salvo: padrões', () => {
    expect(mesclarConfigEmails(undefined)).toEqual(CONFIG_EMAILS_PADRAO);
  });
  it('campo salvo substitui o padrão (lista vazia vale), inválidos e repetidos saem', () => {
    const c = mesclarConfigEmails({ destinatarios: { faltasHNRe: { para: ['A@Marinha.mil.br', 'a@marinha.mil.br', 'lixo'], cc: [] } } });
    expect(c.destinatarios.faltasHNRe).toEqual({ para: ['a@marinha.mil.br'], cc: [], cco: [] });
    expect(c.destinatarios.agendaIS).toEqual(CONFIG_EMAILS_PADRAO.destinatarios.agendaIS);
  });
  it('cargo sem "JRS/HNRe"', () => {
    expect(cargoSemJrs('Secretário da JRS/HNRe')).toBe('Secretário');
    expect(cargoSemJrs('Supervisor - JRS/HNRe')).toBe('Supervisor');
    expect(cargoSemJrs('Encarregada da Secretaria')).toBe('Encarregada da Secretaria');
  });
});

describe('assinatura e destinatários', () => {
  it('sem signatário (Admin/automático): só o Presidente, sem "Por ordem de"', () => {
    const t = assinaturaTexto(assinaturaSemSignatario());
    expect(t).not.toContain('Por ordem de');
    expect(t).toContain('Mauriston Renan Martins Silva');
  });
  it('com signatário', () => {
    const t = assinaturaTexto({ ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'Fulano de Tal', signatario_posto: 'Suboficial-RM1-EF', signatario_cargo: 'Supervisor' });
    expect(t).toContain('Por ordem de:\nFulano de Tal\nSuboficial-RM1-EF\nSupervisor');
  });
  it('juntarEmails sem repetir e excluindo os de outra lista', () => {
    expect(juntarEmails([['X@a.com', 'y@a.com'], 'x@a.com', undefined], ['y@a.com'])).toEqual(['x@a.com']);
  });
});
