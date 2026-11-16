import { describe, it, expect } from 'vitest';
import {
  assuntoDocumentoSecretaria, erroEscolhaSecretaria, examesMinimosDaIS, instrucoesEnvioFicha, isParaCriar,
  nomeAnexoDocumento, pdfsDaLista, textoTranscricao, textoTranscricaoItem,
} from '../examesFicha';
import { exameMinimoValido, itensDaLeitura } from '../examesIS';

const IS = [
  { id: 'a', situacao: 'aberta', status: 'aberta' },
  { id: 'f', situacao: 'finalizada', status: 'tis_assinado' },
];

describe('Ficha › Exames e Atestados — "Criar novo"', () => {
  it('só com ?criar= igual à aba, IS do inspecionado não finalizada e permissão', () => {
    const base = { aba: 'exames', criar: 'exames', is: 'a', podeEnviar: true };
    expect(isParaCriar(base, IS)?.id).toBe('a');
    expect(isParaCriar({ ...base, aba: 'atestados', criar: 'atestados' }, IS)?.id).toBe('a');
    expect(isParaCriar({ ...base, criar: 'atestados' }, IS)).toBeNull();
    expect(isParaCriar({ ...base, is: 'f' }, IS)).toBeNull();
    expect(isParaCriar({ ...base, is: 'outra' }, IS)).toBeNull();
    expect(isParaCriar({ ...base, podeEnviar: false }, IS)).toBeNull();
    expect(isParaCriar({ ...base, aba: 'is', criar: 'is' }, IS)).toBeNull();
    expect(isParaCriar({ ...base, criar: null }, IS)).toBeNull();
  });

  it('aceita só PDFs (tipo ou extensão)', () => {
    const r = pdfsDaLista([
      { name: 'a.pdf', type: 'application/pdf' }, { name: 'b.PDF', type: '' }, { name: 'c.pdf', type: 'application/octet-stream' },
      { name: 'foto.png', type: 'image/png' }, { name: 'x.txt', type: '' },
    ]);
    expect(r.pdfs.map(f => f.name)).toEqual(['a.pdf', 'b.PDF', 'c.pdf']);
    expect(r.ignorados.map(f => f.name)).toEqual(['foto.png', 'x.txt']);
    expect(pdfsDaLista(null)).toEqual({ pdfs: [], ignorados: [] });
  });

  it('exames mínimos: os das guias geradas; sem guias, os do Anexo O pela finalidade', () => {
    expect(examesMinimosDaIS({ finalidade: 'x', guiasExames: { grupos: [{ exames: ['Hemograma completo', 'ECG'] }, { exames: ['ECG'] }] } }))
      .toEqual(['Hemograma completo', 'ECG']);
    expect(examesMinimosDaIS({ finalidade: '' })).toEqual([]);
    expect(examesMinimosDaIS({ finalidade: 'Finalidade que não existe' })).toEqual([]);
    const anexo = examesMinimosDaIS({ finalidade: 'Controle anual de praça de máquinas' }, { sexo: 'Masculino', dataNascimento: '1990-01-01' }, '2026-11-16');
    expect(anexo.length).toBeGreaterThan(0);
    expect(new Set(anexo).size).toBe(anexo.length);
  });

  it('instruções extras: lista fechada dos mínimos e a aba de destino', () => {
    const t = instrucoesEnvioFicha({ examesMinimos: ['Hemograma completo'], classeEsperada: 'laudo_exame' });
    expect(t).toContain('- Hemograma completo');
    expect(t).toContain('exameMinimo');
    expect(instrucoesEnvioFicha({ classeEsperada: 'atestado_relatorio' })).toContain('atestado');
    expect(instrucoesEnvioFicha({})).toBe('');
  });
});

describe('leitura da IA com enquadramento e analitos', () => {
  it('enquadramento só se for um nome da lista (sem acento/caixa); analitos só nos laboratoriais', () => {
    expect(exameMinimoValido('hemograma COMPLETO', ['Hemograma completo'])).toBe('Hemograma completo');
    expect(exameMinimoValido('Glicemia', ['Hemograma completo'])).toBe('');
    const itens = itensDaLeitura({ documentos: [
      { tipo: 'exame_laboratorial', titulo: 'Hemograma', texto: 'Hb 15,4', exameMinimo: 'Hemograma Completo', valores: [{ nome: 'Hemoglobina', valor: '15,4' }, { nome: '', valor: '1' }] },
      { tipo: 'exame_imagem', titulo: 'TC DE TÓRAX', texto: 'Normal.', exameMinimo: 'Inventado', valores: [{ nome: 'x', valor: '1' }] },
    ] }, ['Hemograma completo']);
    expect(itens[0].exameMinimo).toBe('Hemograma completo');
    expect(itens[0].valores).toEqual([{ nome: 'Hemoglobina', valor: '15,4' }]);
    expect('exameMinimo' in itens[1]).toBe(false);
    expect('valores' in itens[1]).toBe(false);
  });
});

describe('transcrição copiável (padrão dos concursos)', () => {
  const lab = { tipo: 'exame_laboratorial' as const, titulo: 'Hemograma', data: '2026-09-10', emissor: 'Lab X', texto: 'Hb 15,4', exameMinimo: 'Hemograma completo', valores: [{ nome: 'Hemoglobina', valor: '15,4' }, { nome: 'Leucócitos', valor: '7.000' }] };
  const img = { tipo: 'exame_imagem' as const, titulo: 'RM do joelho direito', data: '', emissor: '', texto: 'Conclusão: normal.' };
  it('laboratorial: título, um "Analito: valor" por linha e o emissor com a data', () => {
    expect(textoTranscricaoItem(lab)).toBe('# HEMOGRAMA COMPLETO\n\nHemoglobina: 15,4\nLeucócitos: 7.000\n\nLab X - 10/09/2026');
  });
  it('laudo narrativo e vários documentos', () => {
    expect(textoTranscricaoItem(img)).toBe('# RM DO JOELHO DIREITO\n\nConclusão: normal.');
    expect(textoTranscricao([img, img])).toBe('# RM DO JOELHO DIREITO\n\nConclusão: normal.\n\n\n# RM DO JOELHO DIREITO\n\nConclusão: normal.');
  });
});

describe('e-mail "Zimbra SEC-JRS"', () => {
  it('assunto, anexo e escolha', () => {
    expect(assuntoDocumentoSecretaria('laudo_exame', 'CT (Md) FULANO')).toBe('EXAME DE CT (Md) FULANO - IMPRESSÃO');
    expect(assuntoDocumentoSecretaria('atestado_relatorio', 'FULANO')).toBe('ATESTADO/LAUDO DE FULANO - IMPRESSÃO');
    expect(nomeAnexoDocumento('RM / joelho: "D"', 1234567)).toBe('RM joelho D - IS 1234567.pdf');
    expect(nomeAnexoDocumento('', 1)).toBe('Documento - IS 1.pdf');
    expect(erroEscolhaSecretaria([])).toBeTruthy();
    expect(erroEscolhaSecretaria(['u1'])).toBe('');
  });
});

describe('e-mail do documento à SEC-JRS (servidor)', () => {
  it('monta sem placeholder nem JavaScript, com o assunto sem NIP', async () => {
    const { montarEmailDocumentoSecretaria, DADOS_FICTICIOS_DOCUMENTO } = await import('../../servidor/email/documentoIS');
    const r = montarEmailDocumentoSecretaria(DADOS_FICTICIOS_DOCUMENTO, { nome: 'BELTRANO', posto: '1SG', cargo: '' });
    expect(r.assunto).toBe('EXAME DE CT (Md) FULANO DE TAL DA SILVA - IMPRESSÃO');
    expect(r.html).not.toMatch(/\{\{[^}]*\}\}/);
    expect(r.html).not.toMatch(/<script|javascript:/i);
    expect(r.html).toContain('RM DO JOELHO DIREITO');
    expect(r.anexoNome).toBe('RM DO JOELHO DIREITO - IS 1234567.pdf');
  });
});
