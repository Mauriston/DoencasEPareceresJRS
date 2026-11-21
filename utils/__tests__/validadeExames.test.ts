import { describe, expect, it } from 'vitest';
import { avaliarValidade, regraValidade } from '../validadeExames';

const item = (exameMinimo: string, data = '', tipo: any = 'exame_laboratorial', titulo = '') => ({ exameMinimo, data, tipo, titulo });

describe('regra de validade (norma)', () => {
  it('laboratoriais: 90 dias', () => {
    expect(regraValidade(item('Hemograma completo'))?.dias).toBe(90);
    expect(regraValidade(item('Glicemia de jejum', '', 'outro'))?.dias).toBe(90);
  });
  it('toxicológico: 60 dias', () => expect(regraValidade(item('Exame toxicológico'))?.dias).toBe(60));
  it('anuais: RX, ergométrico, ecocardiograma, EEG', () => {
    for (const n of ['Radiografia de tórax', 'RX de tórax PA', 'Teste ergométrico', 'Ecocardiograma', 'Eletroencefalograma', 'EEG']) {
      expect(regraValidade(item(n, '', 'exame_imagem'))?.dias, n).toBe(365);
    }
  });
  it('Beta-HCG: 7 dias só no Ingresso no SAM/SMV; fora dele, laboratorial (90)', () => {
    expect(regraValidade(item('Beta-HCG qualitativo'), 'Ingresso no SAM')?.dias).toBe(7);
    expect(regraValidade(item('Beta-HCG qualitativo'), 'Ingresso no SMV')?.tipo).toBe('beta_hcg_ingresso');
    expect(regraValidade(item('Beta-HCG qualitativo'), 'Verificação de Deficiência Funcional')?.dias).toBe(90);
  });
  it('sem prazo na norma ou sem enquadramento: null', () => {
    expect(regraValidade(item('Ressonância magnética do joelho', '', 'exame_imagem'))).toBeNull();
    expect(regraValidade({ exameMinimo: undefined, titulo: 'Hemograma', tipo: 'exame_laboratorial' })).toBeNull();
  });
});

describe('avaliarValidade', () => {
  it('dentro do prazo (limite incluso)', () => {
    const a = avaliarValidade(item('Hemograma', '2026-08-22'), '2026-11-20');
    expect(a).toMatchObject({ situacao: 'valido', dias: 90, validoAte: '2026-11-20' });
  });
  it('vencido um dia depois', () => {
    expect(avaliarValidade(item('Hemograma', '2026-08-21'), '2026-11-20')?.situacao).toBe('vencido');
  });
  it('toxicológico vencido com 61 dias', () => {
    expect(avaliarValidade(item('Toxicológico', '2026-09-20'), '2026-11-20')?.situacao).toBe('vencido');
  });
  it('anual', () => {
    expect(avaliarValidade(item('Ecocardiograma', '2025-11-20', 'exame_funcional'), '2026-11-20')?.situacao).toBe('valido');
    expect(avaliarValidade(item('Ecocardiograma', '2025-11-19', 'exame_funcional'), '2026-11-20')?.situacao).toBe('vencido');
  });
  it('Beta-HCG do Ingresso: 8 dias antes vence', () => {
    expect(avaliarValidade(item('Beta-HCG', '2026-11-12'), '2026-11-20', 'Ingresso no SAM')?.situacao).toBe('vencido');
    expect(avaliarValidade(item('Beta-HCG', '2026-11-13'), '2026-11-20', 'Ingresso no SAM')?.situacao).toBe('valido');
  });
  it('sem data no laudo: sem_data; data após a referência: futuro', () => {
    expect(avaliarValidade(item('Hemograma', ''), '2026-11-20')?.situacao).toBe('sem_data');
    expect(avaliarValidade(item('Hemograma', '2026-11-25'), '2026-11-20')?.situacao).toBe('futuro');
  });
});

import { valoresDaLeitura } from '../examesIS';
describe('valores alterados e referência (leitura da IA)', () => {
  it('guarda referência, origem e alterado só quando vêm', () => {
    const v = valoresDaLeitura([
      { nome: 'Hemoglobina', valor: '11,2', referencia: '13,5 a 17,5 g/dL', referenciaOrigem: 'laudo', alterado: true },
      { nome: 'Glicose', valor: '90', referencia: '70 a 99 mg/dL', alterado: false },
      { nome: 'TSH', valor: '6,1', referencia: '0,4 a 4,0 µUI/mL', referenciaOrigem: 'usual', alterado: true },
      { nome: 'Plaquetas', valor: '250000' },
    ]);
    expect(v[0]).toEqual({ nome: 'Hemoglobina', valor: '11,2', referencia: '13,5 a 17,5 g/dL', referenciaOrigem: 'laudo', alterado: true });
    expect(v[1]).toEqual({ nome: 'Glicose', valor: '90', referencia: '70 a 99 mg/dL', referenciaOrigem: 'laudo' });
    expect(v[2].referenciaOrigem).toBe('usual');
    expect(v[3]).toEqual({ nome: 'Plaquetas', valor: '250000' });
    expect(Object.values(v).flatMap(x => Object.values(x)).includes(undefined as any)).toBe(false);
  });
});
