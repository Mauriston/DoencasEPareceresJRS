// Ficheiro: services/pdfMerge.ts
// Junta PDFs (em base64) no navegador — o Apps Script não faz isso. O pdf-lib
// só é carregado quando necessário (import dinâmico), para não pesar o bundle.

/** Concatena os PDFs na ordem recebida e devolve o resultado em base64. */
export const juntarPdfsBase64 = async (pdfsBase64: string[]): Promise<string> => {
  let PDFDocument: typeof import('pdf-lib').PDFDocument;
  try {
    ({ PDFDocument } = await import('pdf-lib'));
  } catch {
    // Aba aberta com uma versão antiga do app: o arquivo do módulo já não existe no servidor.
    throw new Error('O app foi atualizado desde que esta página foi aberta. Recarregue a página (Ctrl+F5) e tente de novo.');
  }
  const destino = await PDFDocument.create();
  for (const b64 of pdfsBase64) {
    const origem = await PDFDocument.load(b64);
    const paginas = await destino.copyPages(origem, origem.getPageIndices());
    paginas.forEach(p => destino.addPage(p));
  }
  return destino.saveAsBase64();
};
