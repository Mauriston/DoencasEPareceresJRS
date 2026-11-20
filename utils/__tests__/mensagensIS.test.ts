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
  it('Verificações e Términos com restrições: frase de dispensa entre o laudo e o ACD TIS', () => {
    const c = camposMinutaMsgIS({ ...is, laudo: 'Apto para o SAM com restrições por 30 dias', restricoes: 'Marchas; Embarque' }, { om: 'HNRe' });
    expect(c.texto).toContain('com restrições por 30 dias". Deverá ser dispensado de Marchas, Embarque. ACD TIS nº 026.000.1');
    const f = camposMinutaMsgIS({ ...is, restricoes: 'SERVIÇO ARMADO' }, { om: 'HNRe', feminino: true });
    expect(f.texto).toContain('". Deverá ser dispensada de serviço armado. ACD TIS');
  });
  it('sem restrições ou fora de Verificações e Términos: sem frase de dispensa', () => {
    expect(camposMinutaMsgIS(is, { om: 'HNRe' }).texto).not.toContain('Deverá ser');
    expect(camposMinutaMsgIS({ ...is, grupoFinalidade: 'Benefícios', restricoes: 'Marchas' }, { om: 'HNRe' }).texto).not.toContain('Deverá ser');
  });
  it('só IS concluída', () => {
    expect(podeMinutarMsg({ status: 'tis_assinado' })).toBe(true);
    expect(podeMinutarMsg({ status: 'assinaturas_pendentes' })).toBe(false);
    expect(podeMinutarMsg({ status: 'cancelada' })).toBe(false);
  });
});

describe('Minuta MSG de incapacidade definitiva', () => {
  it('dispensa DS-1A: laudo + Nº do TIS bastam', async () => {
    const { podeMinutarMsg } = await import('../mensagensIS');
    const base = { status: 'assinaturas_pendentes', finalidade: 'Término de Incapacidade', grupoFinalidade: 'Verificações e Términos', laudo: 'Incapaz definitivamente para o SAM', tis: '1' };
    expect(podeMinutarMsg(base)).toBe(true);
    expect(podeMinutarMsg({ ...base, tis: '' })).toBe(false);
    expect(podeMinutarMsg({ ...base, laudo: 'Apto para o SAM' })).toBe(false);
  });
});
