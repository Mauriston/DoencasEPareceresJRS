// E-mail "COMUNICAÇÃO DE FALTAS A INSPEÇÕES DE SAÚDE" (HNRe): regra de pendência, nome de guerra e montagem.
import { describe, expect, it } from 'vitest';
import { ehOmHnre, faltaSemEmail, faltasPendentesHNRe, separarNomeGuerra } from '../emailFaltasHNRe';
import { montarEmailFaltas, ASSUNTO_FALTAS_HNRE } from '../../servidor/email/faltasHNRe';
import { assinaturaSemSignatario } from '../../servidor/email/comum';

describe('pendências', () => {
  const oms: Record<string, string> = { '1': 'HNRe', '2': 'EAMPE', '3': 'hnre' };
  const lista = [
    { id: 'a', status: 'faltou', dataEntrevista: '2026-11-10T08:00', inspecionadoId: '1' },
    { id: 'b', status: 'faltou', dataEntrevista: '2026-11-09T08:00', inspecionadoId: '3' },
    { id: 'c', status: 'faltou', dataEntrevista: '2026-11-09T09:00', inspecionadoId: '2' }, // outra OM
    { id: 'd', status: 'agendada', dataEntrevista: '2026-11-09T10:00', inspecionadoId: '1' }, // não faltou
    { id: 'e', status: 'faltou', dataEntrevista: '2026-11-08T10:00', inspecionadoId: '1', emailFaltaDataEntrevista: '2026-11-08T10:00' }, // já enviado
    { id: 'f', status: 'faltou', dataEntrevista: '2026-11-11T10:00', inspecionadoId: '1', emailFaltaDataEntrevista: '2026-11-01T10:00' }, // nova falta
  ];
  it('só faltas do HNRe ainda não comunicadas, da mais antiga para a mais recente', () => {
    expect(faltasPendentesHNRe(lista, id => oms[id]).map(i => i.id)).toEqual(['b', 'a', 'f']);
  });
  it('OM sem caixa nem acento; falta já comunicada', () => {
    expect(ehOmHnre(' hnre ')).toBe(true);
    expect(ehOmHnre('HNRe-00.0')).toBe(false);
    expect(ehOmHnre(undefined)).toBe(false);
    expect(faltaSemEmail(lista[4])).toBe(false);
  });
});

describe('nome de guerra em negrito', () => {
  it('acha o nome de guerra depois do NIP, palavra inteira, sem acento', () => {
    expect(separarNomeGuerra('CT (Md) 13.0450.24 MAURISTON RENAN MARTINS SILVA', 'Mauriston'))
      .toEqual({ antes: 'CT (Md) 13.0450.24 ', guerra: 'MAURISTON', depois: ' RENAN MARTINS SILVA' });
    expect(separarNomeGuerra('1T 12.3456.78 JÚLIO CÉSAR SOUZA', 'JULIO CESAR').guerra).toBe('JÚLIO CÉSAR');
    expect(separarNomeGuerra('CB 12.3456.78 ANA ANAMARIA', 'ANAMARIA')).toEqual({ antes: 'CB 12.3456.78 ANA ', guerra: 'ANAMARIA', depois: '' });
  });
  it('sem nome de guerra (ou não encontrado): tudo sem negrito', () => {
    expect(separarNomeGuerra('CB 12.3456.78 FULANO', '')).toEqual({ antes: 'CB 12.3456.78 FULANO', guerra: '', depois: '' });
    expect(separarNomeGuerra('CB 12.3456.78 FULANO', 'BELTRANO').guerra).toBe('');
  });
});

describe('montarEmailFaltas', () => {
  const r = montarEmailFaltas([
    { numero_is: '1234813', dataEntrevista: '2026-05-20T08:00', inspecionado: 'CT (Md) 13.0450.24 MAURISTON RENAN MARTINS SILVA', nomeGuerra: 'MAURISTON', finalidade: 'VDF' },
    { numero_is: '1234814', dataEntrevista: '2026-05-21T09:00', inspecionado: 'CB-EL 08.0299.97 VICTOR <X> LEAO', finalidade: 'Término de Restrições' },
  ]);
  it('assunto, placeholders preenchidos, sem JavaScript, valores escapados', () => {
    expect(r.assunto).toBe(ASSUNTO_FALTAS_HNRE);
    expect(r.html).not.toMatch(/\{\{[#^/]?\w+\}\}/);
    expect(r.html).not.toMatch(/<script|javascript:|\son\w+=/i);
    expect(r.html).toContain('<b>MAURISTON</b> RENAN MARTINS SILVA');
    expect(r.html).toContain('20MAI2026');
    expect(r.html).toContain('VICTOR &lt;X&gt; LEAO');
    expect(r.html).toContain('background-color:#f9f9f9'); // zebra
  });
  it('assinatura: sem signatário não tem "Por ordem de"; com signatário, tem', () => {
    expect(r.html).not.toContain('Por ordem de:');
    const c = montarEmailFaltas([], { ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'Fulano de Tal', signatario_posto: '1SG-EF', signatario_cargo: 'Secretário' });
    expect(c.html).toContain('Por ordem de:');
    expect(c.html).toContain('Fulano de Tal');
    expect(c.texto).toContain('Secretário');
  });
});

describe('saudação configurável', () => {
  it('usa a saudação da configuração', () => {
    const r = montarEmailFaltas([], undefined, 'Prezado CT Fulano,');
    expect(r.html).toContain('Prezado CT Fulano,');
    expect(r.html).not.toContain('Luciana');
  });
});
