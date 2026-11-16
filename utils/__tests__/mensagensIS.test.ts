import { describe, expect, it } from 'vitest';
import { camposMinutaMsgIS, faltaDestinatario, linhasMinuta, normalizarCampos, podeMinutarMsg, REMETENTE_MSG_IS } from '../mensagensIS';

const is = {
  is: 1312, finalidade: 'Verificação de Deficiência Funcional', grupoFinalidade: 'Verificações e Términos', inspecionado: '1T (RM2-Md) 12.3456.78 FULANO DE TAL',
  dataAbertura: '2026-11-01', amp: 'JRS', dataLaudo: '2026-11-10', laudo: 'Apto para o SAM', tis: '026.000.1', ds1a: 'D', peritoNome: 'CT X', dataEntrevista: '2026-11-10T08:00', restricoes: '',
};

describe('minuta MSG da IS', () => {
  it('reaproveita a minuta de resultado e preenche o DE', () => {
    const c = camposMinutaMsgIS(is, { om: 'HNRe' });
    expect(c.de).toBe(REMETENTE_MSG_IS);
    expect(c.assunto).toMatch(/INSPEÇÃO DE SAÚDE/);
    expect(c.texto.length).toBeGreaterThan(10);
  });
  it('mantém o DE do modelo quando existe', () => {
    expect(normalizarCampos({ de: 'HNRe (JRS)', para: 'A', assunto: 'B', texto: 'C' }).de).toBe('HNRe (JRS)');
    expect(normalizarCampos({ para: 'A', assunto: 'B', texto: 'C' })).toEqual({ de: 'HNRe', para: 'A', info: '', assunto: 'B', texto: 'C' });
  });
  it('detecta PARA/INFO a preencher', () => {
    expect(faltaDestinatario({ para: '[preencher: PARA]', info: '' })).toBe(true);
    expect(faltaDestinatario({ para: 'COMIMSUP', info: '[preencher INFO]' })).toBe(true);
    expect(faltaDestinatario({ para: 'COMIMSUP', info: 'DPMM' })).toBe(false);
  });
  it('linhas do texto corrido (INFO vazio sai)', () => {
    expect(linhasMinuta({ de: 'D', para: 'P', info: '', assunto: 'A', texto: 'T' }).map(l => l.rotulo)).toEqual(['DE', 'PARA', 'ASSUNTO', 'TEXTO']);
    expect(linhasMinuta({ de: 'D', para: 'P', info: 'I', assunto: 'A', texto: 'T' }).map(l => l.rotulo)).toEqual(['DE', 'PARA', 'INFO', 'ASSUNTO', 'TEXTO']);
  });
  it('só IS concluída', () => {
    expect(podeMinutarMsg({ status: 'tis_assinado' })).toBe(true);
    expect(podeMinutarMsg({ status: 'assinaturas_pendentes' })).toBe(false);
    expect(podeMinutarMsg({ status: 'cancelada' })).toBe(false);
  });
});
