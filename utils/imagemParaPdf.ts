// Ficheiro: utils/imagemParaPdf.ts
// Converte a foto do atestado (data URL JPEG/PNG) em um PDF A4 de uma página, com a imagem
// centralizada e ajustada às margens.
export const imagemParaPdf = async (imagemDataUrl: string): Promise<Blob> => {
  const { jsPDF } = await import('jspdf');
  const props = new jsPDF().getImageProperties(imagemDataUrl);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: props.width > props.height ? 'landscape' : 'portrait' });
  const margem = 10;
  const largura = pdf.internal.pageSize.getWidth() - 2 * margem;
  const altura = pdf.internal.pageSize.getHeight() - 2 * margem;
  const escala = Math.min(largura / props.width, altura / props.height);
  const w = props.width * escala;
  const h = props.height * escala;
  pdf.addImage(imagemDataUrl, props.fileType, (pdf.internal.pageSize.getWidth() - w) / 2, margem, w, h);
  return pdf.output('blob');
};
