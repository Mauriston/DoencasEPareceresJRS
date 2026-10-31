import { describe, expect, it } from 'vitest';
import {
  TRIAGEM_VAZIA, alertasDaTriagem, calcularImc, formatarDecimal, lerTriagem, mascaraAltura, mascaraInteiro3,
  mascaraIshihara, pendenciasDaTriagem, validarTriagem, type TriagemDados,
} from '../triagem';

const normal: TriagemDados = {
  ...TRIAGEM_VAZIA,
  altura: '1,75', peso: '70', pas: '120', pad: '80', fc: '72', snellenSC: '20', snellenCC: '', ishiharaErros: '0',
};
const campos = (t: TriagemDados) => alertasDaTriagem(t).map(a => a.campo);

describe('máscaras', () => {
  it('põe a vírgula da altura sozinha', () => {
    expect(mascaraAltura('1')).toBe('1');
    expect(mascaraAltura('17')).toBe('1,7');
    expect(mascaraAltura('175')).toBe('1,75');
    expect(mascaraAltura('1,754')).toBe('1,75');
  });
  it('aceita 2 ou 3 dígitos nos inteiros e limita o Ishihara a 15', () => {
    expect(mascaraInteiro3('12a34')).toBe('123');
    expect(mascaraIshihara('7')).toBe('7');
    expect(mascaraIshihara('22')).toBe('15');
  });
});

describe('IMC', () => {
  it('calcula com 1 casa e formata com vírgula', () => {
    expect(calcularImc({ altura: '1,75', peso: '70' })).toBe(22.9);
    expect(formatarDecimal(22.9)).toBe('22,9');
  });
  it('fica vazio sem peso ou altura', () => {
    expect(calcularImc({ altura: '', peso: '70' })).toBeNull();
    expect(formatarDecimal(null)).toBe('');
  });
});

describe('alertas', () => {
  it('não alerta valores normais', () => {
    expect(alertasDaTriagem(normal)).toEqual([]);
  });
  it('altura abaixo de 1,54 (R62.8)', () => {
    expect(campos({ ...normal, altura: '1,53', peso: '50' })).toContain('altura');
    expect(campos({ ...normal, altura: '1,54', peso: '50' })).not.toContain('altura');
  });
  it('IMC < 18 (R62.8) e > 30 (E66.9)', () => {
    const baixo = alertasDaTriagem({ ...normal, peso: '50' });
    expect(baixo.find(a => a.campo === 'imc')?.mensagem).toMatch(/R62\.8/);
    const alto = alertasDaTriagem({ ...normal, peso: '100' });
    expect(alto.find(a => a.campo === 'imc')?.mensagem).toMatch(/E66\.9/);
  });
  it('PAS > 140, PAD > 100 e FC > 120 pedem nova aferição', () => {
    expect(campos({ ...normal, pas: '141', pad: '101', fc: '121' })).toEqual(['pas', 'pad', 'fc']);
    expect(campos({ ...normal, pas: '140', pad: '100', fc: '120' })).toEqual([]);
  });
  it('Snellen S/C pior que 20/100 e C/C diferente de 20/20 (H52.7)', () => {
    expect(campos({ ...normal, snellenSC: '100' })).toEqual([]);
    expect(campos({ ...normal, snellenSC: '200' })).toEqual(['snellenSC']);
    expect(campos({ ...normal, snellenCC: '20' })).toEqual([]);
    expect(campos({ ...normal, snellenCC: '25' })).toEqual(['snellenCC']);
  });
  it('Ishihara com 5 ou mais erros (H53.5)', () => {
    expect(campos({ ...normal, ishiharaErros: '4' })).toEqual([]);
    expect(campos({ ...normal, ishiharaErros: '5' })).toEqual(['ishiharaErros']);
  });
});

describe('pendências e validação', () => {
  it('badge soma alertas e alterações descritas', () => {
    const t: TriagemDados = { ...normal, pas: '150', entrevista: { alterado: true, texto: 'asma' }, exames: { alterado: true, texto: '' } };
    expect(pendenciasDaTriagem(t)).toBe(2);
  });
  it('exige os campos obrigatórios e o texto das alterações marcadas', () => {
    expect(validarTriagem(normal)).toEqual({});
    const erros = validarTriagem({ ...TRIAGEM_VAZIA, exameClinico: { alterado: true, texto: ' ' } });
    expect(Object.keys(erros).sort()).toEqual(['altura', 'exameClinico', 'fc', 'ishiharaErros', 'pad', 'pas', 'peso', 'snellenSC']);
  });
  it('Snellen C/C é opcional, mas validado se preenchido', () => {
    expect(validarTriagem({ ...normal, snellenCC: '2' }).snellenCC).toBeTruthy();
  });
});

describe('lerTriagem', () => {
  it('normaliza o que vem do Firestore', () => {
    expect(lerTriagem(null)).toBeNull();
    const t = lerTriagem({ altura: '1,70', peso: 65, entrevista: { alterado: 1, texto: 'x' } });
    expect(t?.peso).toBe('65');
    expect(t?.entrevista).toEqual({ alterado: true, texto: 'x' });
    expect(t?.exames).toEqual({ alterado: false, texto: '' });
  });
});
