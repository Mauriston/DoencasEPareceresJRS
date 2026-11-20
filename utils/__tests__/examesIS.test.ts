import { describe, it, expect } from 'vitest';
import { categoriaDaLeitura, categoriaDoExame, dataDoDocumento, itensDaLeitura, textoParaCopiar, textosParaCopiar } from '../examesIS';

describe('categoria do PDF (exame × atestado)', () => {
  it('usa a categoria da IA; sem ela, deduz pelos tipos dos documentos', () => {
    expect(categoriaDaLeitura('atestado', [{ tipo: 'exame_imagem' }])).toBe('atestado');
    expect(categoriaDaLeitura('EXAME', [{ tipo: 'atestado' }])).toBe('exame');
    expect(categoriaDaLeitura('', [{ tipo: 'atestado' }, { tipo: 'laudo_medico' }])).toBe('atestado');
    expect(categoriaDaLeitura(undefined, [{ tipo: 'atestado' }, { tipo: 'exame_laboratorial' }])).toBe('exame');
    expect(categoriaDaLeitura('outra', [])).toBe('exame');
  });

  it('exame gravado sem categoria é "exame"; data do documento', () => {
    expect(categoriaDoExame({})).toBe('exame');
    expect(categoriaDoExame({ categoria: 'atestado' })).toBe('atestado');
    expect(dataDoDocumento([{ data: '' }, { data: '2026-09-10' }], '2026-10-01T12:00')).toBe('2026-09-10');
    expect(dataDoDocumento([{ data: '' }], '2026-10-01T12:00')).toBe('2026-10-01');
  });
});

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
