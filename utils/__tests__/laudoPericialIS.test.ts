import { describe, it, expect } from 'vitest';
import {
  laudoEnquadramento, laudoNaoEnquadramento, deveMarcarLaudoPericialPendente, ehMilitarInativo, sugerirDoencaLegalPeloLaudo,
  motivoDocumentoISIndisponivel, temTagLaudoPericialPendente, TAG_LAUDO_PERICIAL_PENDENTE,
} from '../documentosIS';

const REFORMA = 'Tem reforma motivada por acidente em serviço (ou doença ocupacional) conforme especificado na Lei n° 7.713/1988, alterada pelas Leis n° 8.541/1992 e 9.250/1995 e 11.052/2004.';
const HIST = 'Tem histórico médico de Neoplasia Maligna (C50.9), doença especificada na Lei no 7.713/1988, a partir de 01/01/2025.';
const CEG = 'É portador de Cegueira no olho direito (Visão Monocular), H54.4, doença especificada na Lei n° 7.713/1988, combinado com o Ato Declaratório n° 3/2016 da PGFN.';
const NAO = 'Não apresenta histórico médico de doença especificada na Lei no 7.713/1988.';
const IS = { situacao: 'finalizada', finalidade: 'Isenção de Imposto de Renda', grupoFinalidade: 'Benefícios' };

describe('Laudo Pericial (Isenção de IR)', () => {
  it('reconhece as 3 redações de enquadramento e a de não enquadramento', () => {
    [REFORMA, HIST, CEG].forEach(l => expect(laudoEnquadramento(l)).toBe(true));
    expect(laudoNaoEnquadramento(NAO)).toBe(true);
    expect(laudoEnquadramento(NAO)).toBe(false);
    expect(laudoEnquadramento('')).toBe(false);
  });
  it('habilita só com IS finalizada de Isenção de IR com enquadramento', () => {
    expect(motivoDocumentoISIndisponivel('laudoPericial', { ...IS, laudo: CEG })).toBeNull();
    expect(motivoDocumentoISIndisponivel('laudoPericial', { ...IS, laudo: NAO })).not.toBeNull();
    expect(motivoDocumentoISIndisponivel('laudoPericial', { ...IS, situacao: 'andamento', laudo: HIST })).not.toBeNull();
  });
  it('tag pendente: exceto militar inativo', () => {
    expect(ehMilitarInativo({ rm1: true })).toBe(true);
    expect(ehMilitarInativo({ tipo: 'pensionista', refo: true })).toBe(false);
    expect(deveMarcarLaudoPericialPendente({ ...IS, laudo: HIST }, false)).toBe(true);
    expect(deveMarcarLaudoPericialPendente({ ...IS, laudo: HIST }, true)).toBe(false);
    expect(deveMarcarLaudoPericialPendente({ ...IS, laudo: NAO }, false)).toBe(false);
    expect(temTagLaudoPericialPendente({ tags: [TAG_LAUDO_PERICIAL_PENDENTE] })).toBe(true);
  });
  it('sugere a doença legal pelo laudo', () => {
    expect(sugerirDoencaLegalPeloLaudo(HIST)).toBe('Neoplasia Maligna');
    expect(sugerirDoencaLegalPeloLaudo(CEG)).toBe('Cegueira (inclusive monocular)');
    expect(sugerirDoencaLegalPeloLaudo(REFORMA)).toBe('Moléstia Profissional');
  });
});
