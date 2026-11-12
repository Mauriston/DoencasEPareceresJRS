// Página Configurações: edição das listas de e-mail de config/emails (utils/configuracoes.ts).
import { describe, expect, it } from 'vitest';
import { adicionarEmails, removerEmail, configIgual, errosConfigEmails } from '../configuracoes';
import { CONFIG_EMAILS_PADRAO } from '../../config/emails';

describe('listas de e-mail', () => {
  it('acrescenta vários de uma vez, em minúsculas e sem repetir; inválidos voltam', () => {
    expect(adicionarEmails(['a@marinha.mil.br'], 'B@Marinha.mil.br, a@marinha.mil.br; lixo c@gmail.com')).toEqual({
      lista: ['a@marinha.mil.br', 'b@marinha.mil.br', 'c@gmail.com'],
      invalidos: ['lixo'],
    });
    expect(adicionarEmails([], '   ')).toEqual({ lista: [], invalidos: [] });
  });
  it('remove', () => {
    expect(removerEmail(['a@x.com', 'b@x.com'], 'a@x.com')).toEqual(['b@x.com']);
  });
});

describe('validação e comparação', () => {
  it('padrões são válidos e iguais a si mesmos', () => {
    expect(errosConfigEmails(CONFIG_EMAILS_PADRAO)).toEqual({});
    expect(configIgual(CONFIG_EMAILS_PADRAO, structuredClone(CONFIG_EMAILS_PADRAO))).toBe(true);
  });
  it('Reply-To e assinatura obrigatórios', () => {
    const c = { ...CONFIG_EMAILS_PADRAO, responderPara: 'x', saudacaoFaltasHNRe: ' ', assinatura: { ...CONFIG_EMAILS_PADRAO.assinatura, presidenteNome: ' ', presidentePosto: '', supervisorCargo: '' } };
    expect(Object.keys(errosConfigEmails(c)).sort()).toEqual(['presidenteNome', 'presidentePosto', 'responderPara', 'saudacaoFaltasHNRe', 'supervisorCargo']);
    expect(configIgual(c, CONFIG_EMAILS_PADRAO)).toBe(false);
  });
});
