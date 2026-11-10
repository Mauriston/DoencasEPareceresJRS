import { describe, it, expect } from 'vitest';
import { itensDaLeitura, textoParaCopiar, textosParaCopiar } from '../examesIS';

describe('exames da IS', () => {
  it('limpa a leitura da IA: tipo desconhecido vira "outro", data inválida sai, documento vazio sai', () => {
    const itens = itensDaLeitura({ documentos: [
      { tipo: 'exame_imagem', titulo: ' Ressonância  magnética do ombro direito ', data: '2026-09-10', emissor: 'Clínica X', texto: 'Técnica: …\r\n\r\n\r\nConclusão: tendinopatia.' },
      { tipo: 'qualquer', titulo: '', data: '31/02/2026', texto: 'Texto' },
      { tipo: 'parecer', titulo: '', texto: '' },
    ] });
    expect(itens).toHaveLength(2);
    expect(itens[0]).toEqual({ tipo: 'exame_imagem', titulo: 'Ressonância magnética do ombro direito', data: '2026-09-10', emissor: 'Clínica X', texto: 'Técnica: …\n\nConclusão: tendinopatia.' });
    expect(itens[1]).toMatchObject({ tipo: 'outro', titulo: 'Outro documento', data: '' });
    expect(itensDaLeitura({})).toEqual([]);
  });

  it('texto para copiar: título, data e o laudo na íntegra', () => {
    const item = { tipo: 'exame_laboratorial' as const, titulo: 'Hemograma', data: '2026-09-10', emissor: '', texto: 'Hb 14 g/dL' };
    expect(textoParaCopiar(item)).toBe('HEMOGRAMA — 10/09/2026\nHb 14 g/dL');
    expect(textosParaCopiar([item, { ...item, data: '', titulo: 'TSH', texto: '2,1' }])).toBe('HEMOGRAMA — 10/09/2026\nHb 14 g/dL\n\nTSH\n2,1');
  });
});
