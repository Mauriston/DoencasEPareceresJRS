// E-mail de resultado de Benefícios (front): disponibilidade, pendência, categoria do inspecionado e ajuste do modelo.
import { describe, expect, it } from 'vitest';
import {
  ajustarModeloPeloCadastro, categoriaDoInspecionado, descricaoCategoria, ehModeloResultadoBeneficios, instrucoesModeloBeneficios,
  resultadoBeneficiosDisponivel, resultadoBeneficiosPendente,
} from '../resultadoBeneficiosIS';
import { resultadoPendente } from '../emailResultadoIS';

const base = { grupoFinalidade: 'Benefícios', status: 'assinaturas_pendentes', tis: '026.000.123' };

describe('disponível e pendente', () => {
  it('disponível com Nº do TIS (Assinaturas pendentes ou TIS assinado), só Benefícios', () => {
    expect(resultadoBeneficiosDisponivel(base)).toBe(true);
    expect(resultadoBeneficiosDisponivel({ ...base, status: 'tis_assinado' })).toBe(true);
    expect(resultadoBeneficiosDisponivel({ ...base, tis: '' })).toBe(false);
    expect(resultadoBeneficiosDisponivel({ ...base, status: 'votacao_pendente' })).toBe(false);
    expect(resultadoBeneficiosDisponivel({ ...base, grupoFinalidade: 'Verificações e Términos' })).toBe(false);
  });
  it('pendente só depois de finalizada (TIS assinado) e enquanto não enviado', () => {
    expect(resultadoBeneficiosPendente(base)).toBe(false);
    expect(resultadoBeneficiosPendente({ ...base, status: 'tis_assinado' })).toBe(true);
    expect(resultadoBeneficiosPendente({ ...base, status: 'tis_assinado', emailResultadoBeneficiosEnviadoEm: { seconds: 1 } })).toBe(false);
    expect(resultadoBeneficiosPendente({ ...base, status: 'cancelada' })).toBe(false);
  });
  it('o resultado antigo não compete com o de Benefícios', () => {
    expect(resultadoPendente({ situacao: 'finalizada', status: 'tis_assinado', grupoFinalidade: 'Benefícios', laudo: 'Enquadra-se' })).toBe(false);
  });
});

describe('categoria do inspecionado e modelo', () => {
  it('dependente, pensionista e servidor civil são não militares', () => {
    expect(categoriaDoInspecionado({ tipo: 'dependente' })).toBe('nao_militar');
    expect(categoriaDoInspecionado({ tipo: 'pensionista' })).toBe('nao_militar');
    expect(categoriaDoInspecionado({ tipo: 'militar', pgq: 'SCNS' })).toBe('nao_militar');
    expect(categoriaDoInspecionado({ pgq: 'CF (RM1-Md)' })).toBe('militar');
    expect(categoriaDoInspecionado(null)).toBeNull();
    expect(descricaoCategoria({ pgq: 'SO-MR', refo: true })).toBe('militar reformado');
  });
  it('o cadastro decide militar × não militar; a IA decide o enquadramento', () => {
    expect(ajustarModeloPeloCadastro('enquadramento_militar', 'nao_militar')).toBe('enquadramento_nao_militar');
    expect(ajustarModeloPeloCadastro('enquadramento_nao_militar', 'militar')).toBe('enquadramento_militar');
    expect(ajustarModeloPeloCadastro('nao_enquadramento', 'militar')).toBe('nao_enquadramento');
    expect(ajustarModeloPeloCadastro('enquadramento_militar', null)).toBe('enquadramento_militar');
    expect(ehModeloResultadoBeneficios('enquadramento_militar')).toBe(true);
    expect(ehModeloResultadoBeneficios('outro')).toBe(false);
  });
  it('as instruções levam o laudo higienizado, sem NIP', () => {
    const t = instrucoesModeloBeneficios({ finalidade: 'Isenção de IR', laudo: 'Enquadra-se. NIP 12.3456.78', inspecionado: 'militar reformado' });
    expect(t).toContain('Isenção de IR');
    expect(t).toContain('Se ao menos uma finalidade for de enquadramento');
    expect(t).not.toContain('12.3456.78');
  });
});
