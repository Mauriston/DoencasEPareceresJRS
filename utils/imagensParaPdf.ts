// Ficheiro: utils/imagensParaPdf.ts
// Converte as páginas digitalizadas (data URLs JPEG/PNG) num PDF A4, uma imagem por página, centralizada
// e ajustada às margens; cada página segue a orientação da sua imagem.
export const imagensParaPdf = async (imagens: string[]): Promise<Blob> => {
  if (!imagens.length) throw new Error('Nenhuma página para o PDF.');
  const { jsPDF } = await import('jspdf');
  const medir = new jsPDF();
  const props = imagens.map(i => medir.getImageProperties(i));
  const orient = (p: { width: number; height: number }) => (p.width > p.height ? 'landscape' : 'portrait');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: orient(props[0]) });
  const margem = 10;
  imagens.forEach((img, i) => {
    const p = props[i];
    if (i > 0) pdf.addPage('a4', orient(p));
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const escala = Math.min((pw - 2 * margem) / p.width, (ph - 2 * margem) / p.height);
    const w = p.width * escala;
    const h = p.height * escala;
    pdf.addImage(img, p.fileType, (pw - w) / 2, margem, w, h);
  });
  return pdf.output('blob');
};

/** Data URL → File (para os fluxos que recebem arquivos, como o IS por foto). */
export const dataUrlParaArquivo = (dataUrl: string, nome: string): File => {
  const [cab, base64 = ''] = dataUrl.split(',');
  const tipo = /data:([^;]+)/.exec(cab)?.[1] || 'image/jpeg';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], nome, { type: tipo });
};
