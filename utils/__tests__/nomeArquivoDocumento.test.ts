import { describe, expect, it } from 'vitest';
import { carimboArquivo, contentDisposition, nomeArquivoDocumento, nomeDoContentDisposition, nomeSemPostoNip, trechoNomeArquivo } from '../nomeArquivoDocumento';

describe('nomeArquivoDocumento', () => {
  it('normaliza trechos', () => {
    expect(trechoNomeArquivo('  João da Conceição-Ávila ')).toBe('JOAO_DA_CONCEICAO_AVILA');
  });
  it('remove posto e NIP', () => {
    expect(nomeSemPostoNip('CT (MD) 12345678 - Maria Júlia')).toBe('Maria Júlia');
    expect(nomeSemPostoNip('Maria Júlia')).toBe('Maria Júlia');
    expect(nomeSemPostoNip('CT (Md) 12.3456.78 FULANO DE TAL')).toBe('FULANO DE TAL');
  });
  it('monta o nome com IS', () => {
    expect(nomeArquivoDocumento({ tipo: 'GUIA_DE_EXAMES', nome: '1T 87654321 - José Ávila', is: 425 }))
      .toBe('GUIA_DE_EXAMES_JOSE_AVILA_IS425.pdf');
  });
  it('acrescenta carimbo nos tipos repetíveis', () => {
    const d = new Date(2026, 10, 20, 9, 5);
    expect(carimboArquivo(d)).toBe('202611200905');
    expect(nomeArquivoDocumento({ tipo: 'PAPELETA_DE_DISPENSA', nome: 'Ana', is: '12/2026', carimbo: d }))
      .toBe('PAPELETA_DE_DISPENSA_ANA_IS12_2026_202611200905.pdf');
    expect(nomeArquivoDocumento({ tipo: 'SOLICITACAO_DE_EXAMES', nome: 'Ana', is: 1 })).toMatch(/^SOLICITACAO_DE_EXAMES_ANA_IS1_\d{12}\.pdf$/);
  });
  it('usa o identificador sem IS', () => {
    expect(nomeArquivoDocumento({ tipo: 'TERMO_DE_RECURSO', nome: 'Ana Lú', identificador: 'CP-CEM 2026' }))
      .toBe('TERMO_DE_RECURSO_ANA_LU_CP_CEM_2026.pdf');
  });
  it('Content-Disposition ida e volta', () => {
    const cd = contentDisposition('GUIA_DE_EXAMES_ANA_IS1.pdf');
    expect(cd).toBe(`inline; filename="GUIA_DE_EXAMES_ANA_IS1.pdf"; filename*=UTF-8''GUIA_DE_EXAMES_ANA_IS1.pdf`);
    expect(nomeDoContentDisposition(cd)).toBe('GUIA_DE_EXAMES_ANA_IS1.pdf');
    expect(nomeDoContentDisposition('attachment; filename="x.pdf"')).toBe('x.pdf');
    expect(nomeDoContentDisposition(null)).toBe('');
  });
});
