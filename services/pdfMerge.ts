// Ficheiro: services/pdfMerge.ts
// Junta PDFs (em base64) no navegador — o Apps Script não faz isso. O pdf-lib
// só é carregado quando necessário (import dinâmico), para não pesar o bundle.

/** Concatena os PDFs na ordem recebida e devolve o resultado em base64. */
export const juntarPdfsBase64 = async (pdfsBase64: string[]): Promise<string> => {
  const { PDFDocument } = await import('pdf-lib');
  const destino = await PDFDocument.create();
  for (const b64 of pdfsBase64) {
    const origem = await PDFDocument.load(b64);
    const paginas = await destino.copyPages(origem, origem.getPageIndices());
    paginas.forEach(p => destino.addPage(p));
  }
  return destino.saveAsBase64();
};
