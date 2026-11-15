// E-mail de resultado de IS de Benefícios: regras (utils/emailResultadoBeneficios.ts) e montagem dos três modelos
// (servidor/email/resultadoBeneficios.ts).
import { describe, expect, it } from 'vitest';
import {
  dataBr, elegivelResultadoBeneficios, MODELOS_RESULTADO_BENEFICIOS, modeloSugeridoPorTexto, resultadoBeneficiosPendente,
} from '../emailResultadoBeneficios';
import { montarEmailResultadoBeneficios } from '../../servidor/email/resultadoBeneficios';
import { assinaturaSemSignatario } from '../../servidor/email/comum';

const placeholder = /\{\{[#^/]?\w+\}\}/;
const semJs = /<script|javascript:|\son\w+=|dfsrc|data-marker/i;
const B = 'Benefícios';

describe('regras', () => {
  it('elegível: Benefícios, Nº do TIS preenchido, Assinaturas Pendentes ou TIS assinado', () => {
    const base = { grupoFinalidade: B, tis: '026.000.12345', status: 'assinaturas_pendentes' };
    expect(elegivelResultadoBeneficios(base)).toBe(true);
    expect(elegivelResultadoBeneficios({ ...base, status: 'tis_assinado' })).toBe(true);
    expect(elegivelResultadoBeneficios({ ...base, status: 'votacao_pendente' })).toBe(false);
    expect(elegivelResultadoBeneficios({ ...base, tis: ' ' })).toBe(false);
    expect(elegivelResultadoBeneficios({ ...base, grupoFinalidade: 'Verificações e Términos' })).toBe(false);
  });
  it('pendente: finalizada (TIS assinado) de Benefícios sem o e-mail', () => {
    expect(resultadoBeneficiosPendente({ grupoFinalidade: B, status: 'tis_assinado' })).toBe(true);
    expect(resultadoBeneficiosPendente({ grupoFinalidade: B, status: 'assinaturas_pendentes' })).toBe(false);
    expect(resultadoBeneficiosPendente({ grupoFinalidade: B, status: 'tis_assinado', emailResultadoBeneficiosEnviadoEm: { seconds: 1 } })).toBe(false);
    expect(resultadoBeneficiosPendente({ grupoFinalidade: 'Ingresso', status: 'tis_assinado' })).toBe(false);
  });
  it('modelo sugerido (plano B): enquadramento em alguma finalidade vence; tipo define militar/não militar', () => {
    expect(modeloSugeridoPorTexto('Não enquadrado no inciso XIV do art. 6º da Lei 7.713/88', 'militar')).toBe('nao_enquadramento');
    expect(modeloSugeridoPorTexto('NÃO SE ENQUADRA', 'militar')).toBe('nao_enquadramento');
    expect(modeloSugeridoPorTexto('Enquadrado no inciso XIV do art. 6º da Lei 7.713/88', 'militar')).toBe('enquadramento_militar');
    expect(modeloSugeridoPorTexto('Enquadrado', undefined)).toBe('enquadramento_militar');
    expect(modeloSugeridoPorTexto('Isenção de IR: não enquadrado\nPensão: enquadrado (inválido)', 'pensionista')).toBe('enquadramento_nao_militar');
    expect(modeloSugeridoPorTexto('Não enquadrado; não enquadrado', 'dependente')).toBe('nao_enquadramento');
    expect(modeloSugeridoPorTexto('', 'militar')).toBe('nao_enquadramento');
  });
  it('data dd/mm/aaaa', () => {
    expect(dataBr('2026-10-30')).toBe('30/10/2026');
    expect(dataBr('')).toBe('');
  });
});

describe('montarEmailResultadoBeneficios', () => {
  const is = { is: 1253621, inspecionado: 'PENS-CMG 12.3456.78 MARIA DA SILVA', finalidade: 'Isenção de pagamento de imposto de renda', tis: '026.000.4321', dataLaudo: '2026-10-30' };
  const ass = { ...assinaturaSemSignatario(), mostrar_signatario: true, signatario_nome: 'Fulano de Tal', signatario_posto: 'Suboficial-RM1-EF', signatario_cargo: 'Supervisor' };

  it('os três modelos: assunto, identificação preenchida, sem placeholders nem JavaScript', () => {
    for (const modelo of MODELOS_RESULTADO_BENEFICIOS) {
      const r = montarEmailResultadoBeneficios(is, modelo, ass, 'MARIA DA SILVA');
      expect(r.assunto).toBe('RESULTADO DE IS FIM Isenção de pagamento de imposto de renda - PENS-CMG MARIA DA SILVA');
      expect(r.html).not.toMatch(placeholder);
      expect(r.html).not.toMatch(semJs);
      expect(r.html).toContain('MARIA DA SILVA');
      expect(r.html).toContain('1253621');
      expect(r.html).toContain('026.000.4321');
      expect(r.html).toContain('30/10/2026');
      expect(r.html).toContain('Isenção de pagamento de imposto de renda');
      expect(r.html).toContain('Baixar Requerimento (ODS)');
      expect(r.html).toContain('Site Oficial do CPMM');
      expect(r.html).toContain('Por ordem de:');
      expect(r.html).not.toContain('INFORMAÇÃO PESSOAL');
      expect(r.texto).toContain('Por ordem de:\nFulano de Tal');
    }
  });
  it('textos próprios de cada modelo', () => {
    const nao = montarEmailResultadoBeneficios(is, 'nao_enquadramento');
    expect(nao.html).toContain('NÃO ENQUADRAMENTO');
    expect(nao.html).toContain('em até 45 dias');
    const mil = montarEmailResultadoBeneficios(is, 'enquadramento_militar');
    expect(mil.html).toContain('ENQUADRAMENTO LEGAL');
    expect(mil.html).toContain('Revisão Ex-Officio');
    expect(mil.html).toContain('Hospital Naval de Natal');
    expect(mil.html).toContain('Informamos que após a análise pericial');
    const nm = montarEmailResultadoBeneficios(is, 'enquadramento_nao_militar');
    expect(nm.html).toContain('Retirada do Laudo Pericial');
    expect(nm.html).toContain('segunda à quinta de 08:00h às 11:00h');
    expect(nm.html).not.toContain('Revisão Ex-Officio');
  });
  it('sem nome do cadastro usa o inspecionado sem NIP; modelo inválido: erro', () => {
    expect(montarEmailResultadoBeneficios(is, 'nao_enquadramento').html).toContain('PENS-CMG MARIA DA SILVA');
    expect(() => montarEmailResultadoBeneficios(is, 'x' as never)).toThrow();
  });
});
