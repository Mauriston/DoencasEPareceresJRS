import { describe, it, expect, afterEach } from 'vitest';
import { definirModelosMSG, modeloComPadrao, placeholdersDesconhecidos, preencherModelo, MODELOS_MSG_PADRAO, PLACEHOLDERS_MSG, TIPOS_MODELO_MSG } from '../modelosMinutaMSG';
import { camposMensagemResultado } from '../minutaMensagemResultado';
import { camposCancelamento } from '../minutasIS';

const IS = { finalidade: 'Controle Periódico de Saúde', inspecionado: '1T (MD) 1234567 FULANO DE TAL', om: 'HNRe', amp: 'JRS', dataLaudo: '2026-06-18', laudo: 'Apto', tis: '026.001.1', ds1a: 'ABC', is: 10 };
afterEach(() => definirModelosMSG(null));

describe('modelos de Minuta MSG', () => {
  it('preenche placeholders e deixa os desconhecidos como estão', () => {
    expect(preencherModelo('IS {{is}} {{ X }} {{nada}}', { is: '5', x: 'ok' })).toBe('IS 5 ok {{nada}}');
  });
  it('detecta placeholders desconhecidos por tipo', () => {
    expect(placeholdersDesconhecidos('resultado', 'a {{tis}} {{motivo}} {{Foo}}')).toEqual(['motivo', 'foo']);
  });
  it('padrões só usam placeholders conhecidos', () => {
    for (const t of TIPOS_MODELO_MSG) for (const v of Object.values(MODELOS_MSG_PADRAO[t])) expect(placeholdersDesconhecidos(t, v)).toEqual([]);
    expect(PLACEHOLDERS_MSG.cancelamento.map(p => p.chave)).toContain('motivo');
  });
  it('modelo salvo vale; campo vazio volta ao padrão', () => {
    expect(modeloComPadrao('resultado', { assunto: '  ', texto: 'X {{tis}}' })).toEqual({ assunto: MODELOS_MSG_PADRAO.resultado.assunto, texto: 'X {{tis}}' });
  });
  it('a minuta de resultado usa o modelo ativo', () => {
    definirModelosMSG({ resultado: { assunto: 'ASS {{is}} {{om}}', texto: 'TIS {{tis}} laudo "{{laudo}}"{{dispensa}}' } });
    const c = camposMensagemResultado(IS);
    expect(c.assunto).toBe('ASS 10 HNRe');
    expect(c.texto).toBe('TIS 026.001.1 laudo "Apto"');
  });
  it('a minuta de cancelamento usa o modelo ativo', () => {
    definirModelosMSG({ cancelamento: { de: 'JRS', assunto: 'CANC {{is}}', texto: '{{motivo}} / {{prazo}}' } });
    const c = camposCancelamento({ is: 7, finalidade: 'X', inspecionado: 'Y', dataAbertura: '2026-11-01', amp: 'JRS', dataEntrevista: '2026-11-10T09:00' });
    expect(c.de).toBe('JRS');
    expect(c.assunto).toBe('CANC 7');
    expect(c.texto).toContain('não comparecimento');
  });
});
