// E-mail de abertura da IS (servidor/email/aberturaIS.ts; regras e textos em utils/emailAberturaIS.ts).
import { describe, expect, it } from 'vitest';
import { assuntoAbertura, prazoFinalAbertura, textosAbertura, varianteAbertura } from '../emailAberturaIS';
import { montarEmailAbertura, montarEmailAberturaFicticio } from '../../servidor/email/aberturaIS';
import { finalidadeTemExamesMinimos } from '../guiasExames';
import { assinaturaSemSignatario } from '../../servidor/email/comum';
import { diasUteisEntre } from '../inspecoes';

const placeholder = /\{\{[#^/]?\w+\}\}/;
const assinaturaSec = { ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'BELTRANO DE SOUZA', signatario_posto: '1SG-ES', signatario_cargo: 'Secretário' };

describe('regras da abertura', () => {
  it('assunto com o inspecionado sem NIP', () => {
    expect(assuntoAbertura('Controle anual de praça de máquinas', 'CT (Md) 12.3456.78 MAURISTON RENAN MARTINS SILVA'))
      .toBe('ABERTURA DE IS FIM Controle anual de praça de máquinas - CT (Md) MAURISTON RENAN MARTINS SILVA');
  });
  it('variante: Benefícios prevalece; senão exames mínimos → guias; sem → agendamento', () => {
    expect(varianteAbertura('Benefícios', true)).toBe('beneficios');
    expect(varianteAbertura('Controle Periódico', true)).toBe('exames');
    expect(varianteAbertura('Verificações e Términos', false)).toBe('agendamento');
  });
  it('prazo: 7º dia útil depois da abertura; Benefícios 60 dias corridos', () => {
    const p = prazoFinalAbertura('2026-11-16', 'exames');
    expect(diasUteisEntre('2026-11-16', p)).toBe(7);
    expect(diasUteisEntre('2026-11-16', p.replace(/\d{2}$/, d => String(Number(d) - 1).padStart(2, '0')))).toBe(6);
    expect(prazoFinalAbertura('2026-11-16', 'beneficios')).toBe('2027-01-15');
    expect(prazoFinalAbertura('', 'exames')).toBe('');
  });
  it('textos citam a data escrita, o tratamento pelo sexo, os prazos e a norma', () => {
    const e = textosAbertura({ finalidade: 'Controle anual', dataAbertura: '2026-11-16', variante: 'exames', sexo: 'Masculino' });
    expect(e.abertura).toBe('participo abertura de IS fim Controle anual em 16/11/2026.');
    expect(e.prazoTexto).toMatch(/^O Senhor deverá comparecer à Secretaria da JRS\/HNRe em até 7 \(sete\) dias úteis a contar da data de apresentação \(16\/11\/2026\)/);
    expect(e.prazoTexto).toContain('obter as guias');
    const a = textosAbertura({ finalidade: 'VDF', dataAbertura: '2026-11-16', variante: 'agendamento', sexo: 'Feminino' });
    expect(a.prazoTexto).toMatch(/^A Senhora deverá realizar o agendamento/);
    expect(a.prazoTexto).toContain('(81) 3036-9073');
    const b = textosAbertura({ finalidade: 'Pensão', dataAbertura: '2026-11-16', variante: 'beneficios' });
    expect(b.prazoTexto).toMatch(/^O\(a\) Senhor\(a\) deverá realizar o agendamento da IS em até 60 \(sessenta\) dias/);
    expect(b.prazoTexto).toContain('até 15/01/2027');
    expect(e.arquivamento).toContain('alíneas b e c do item 2.1.2 da DGPM-406 9ª Rev');
    expect(e.destaque).toContain('cancelamento (arquivamento no SINAIS)');
    expect(e.destaque).toContain('contravenção disciplinar, a critério do Titular da OM');
  });
});

describe('montarEmailAbertura', () => {
  it('HTML: vocativo, data, prazo, norma, card de destaque e assinatura dupla; sem placeholder', () => {
    const r = montarEmailAbertura({
      inspecionado: 'CT (Md) 12.3456.78 FULANO DE TAL', finalidade: 'Controle anual de praça de máquinas', grupoFinalidade: 'Controle Periódico',
      dataAbertura: '2026-11-16', sexo: 'Masculino', temExamesMinimos: true,
    }, assinaturaSec);
    expect(r.assunto).toBe('ABERTURA DE IS FIM Controle anual de praça de máquinas - CT (Md) FULANO DE TAL');
    expect(r.variante).toBe('exames');
    expect(r.html).toContain('Prezado CT (Md) FULANO DE TAL,');
    expect(r.html).not.toContain('12.3456.78');
    expect(r.html).toContain('participo abertura de IS fim Controle anual de praça de máquinas em 16/11/2026.');
    expect(r.html).toContain('Alínea e do item 2.3.3 da DGPM-406 9ª Rev');
    expect(r.html).toContain('cancelamento (arquivamento no SINAIS)');
    expect(r.html).toContain('ATT/RPT,');
    expect(r.html).toContain('Por ordem de:');
    expect(r.html).toContain('Presidente');
    expect(r.html).not.toMatch(/INFORMA[CÇ][AÃ]O PESSOAL/i);
    expect(r.html).not.toMatch(/<script/i);
    expect(r.html).not.toMatch(placeholder);
    expect(r.texto).toContain('ATENÇÃO: O não cumprimento');
    expect(r.texto).not.toMatch(placeholder);
  });
  it('fictícios das três variantes montam sem placeholder', () => {
    (['exames', 'agendamento', 'beneficios'] as const).forEach(v => {
      const r = montarEmailAberturaFicticio(v);
      expect(r.variante).toBe(v);
      expect(r.html).not.toMatch(placeholder);
      expect(r.assunto).toMatch(/^ABERTURA DE IS FIM /);
    });
    expect(montarEmailAberturaFicticio('agendamento').html).toContain('Prezada 2SG-ES BELTRANA DE SOUZA');
  });
});

describe('finalidadeTemExamesMinimos (utils/guiasExames)', () => {
  it('finalidade da página Exames mínimos com exames que geram guia', () => {
    expect(finalidadeTemExamesMinimos('Controle anual de praça de máquinas')).toBe(true);
    expect(finalidadeTemExamesMinimos('Verificação de Deficiência Funcional')).toBe(false);
    expect(finalidadeTemExamesMinimos('')).toBe(false);
  });
});
