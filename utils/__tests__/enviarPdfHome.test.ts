import { describe, it, expect } from 'vitest';
import { isAtivaDoInspecionado, nomeConfere, militarPeloNome } from '../enviarPdfHome';

const L = [
  { id: 'a', is: 10, situacao: 'finalizada', inspecionado: '1T (MD) 1234567 JOAO DA SILVA SAURO' },
  { id: 'b', is: 12, situacao: 'andamento', inspecionado: '1T (MD) 1234567 JOAO DA SILVA SAURO' },
  { id: 'c', is: 13, situacao: 'aberta', inspecionado: 'CT 7654321 MARIA OLIVEIRA' },
];
describe('Enviar PDF (Início)', () => {
  it('nome confere ignorando acento, caixa e partículas', () => {
    expect(nomeConfere('João Silva Sauro', L[0].inspecionado)).toBe(true);
    expect(nomeConfere('Maria', L[2].inspecionado)).toBe(false);
  });
  it('acha a IS aberta/em andamento; finalizada não conta', () => {
    expect(isAtivaDoInspecionado('João da Silva Sauro', L)?.id).toBe('b');
    expect(isAtivaDoInspecionado('Maria Oliveira', L)?.id).toBe('c');
    expect(isAtivaDoInspecionado('João da Silva Sauro', [L[0]])).toBeNull();
    expect(isAtivaDoInspecionado('Fulano de Tal', L)).toBeNull();
  });
  it('cadastro só com correspondência única', () => {
    expect(militarPeloNome('Maria Oliveira', [{ id: '1', nome: 'MARIA OLIVEIRA' }])?.id).toBe('1');
    expect(militarPeloNome('Maria Oliveira', [{ id: '1', nome: 'MARIA OLIVEIRA' }, { id: '2', nome: 'MARIA OLIVEIRA' }])).toBeNull();
  });
});
