// Ficheiro: config/limitePdf.ts
// Limite ÚNICO de tamanho dos PDFs enviados no app (prontos ou gerados pelo scanner): 10 MB por PDF, sem limite
// de páginas. Vale também nas regras do Storage (storage.rules: "< 10 * 1024 * 1024" nos caminhos de PDF) e
// cabe com folga na leitura pela IA (o PDF vai em base64, ~33% maior, numa requisição de até 20 MB).
export const LIMITE_PDF_MB = 10;
export const LIMITE_PDF_BYTES = LIMITE_PDF_MB * 1024 * 1024;

/** Cabe no limite: estritamente menor (as regras do Storage usam "size < 10 * 1024 * 1024"). */
export const cabeNoLimitePdf = (bytes: number): boolean => bytes < LIMITE_PDF_BYTES;

/** "2,4 MB" / "830 KB". */
export const formatarTamanho = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Mensagem de erro de um arquivo acima do limite ('' quando cabe). */
export const erroTamanhoPdf = (bytes: number, nome = 'O arquivo'): string =>
  !cabeNoLimitePdf(bytes)
    ? `${nome} tem ${formatarTamanho(bytes)} — acima do limite de ${LIMITE_PDF_MB} MB por PDF. Divida em dois PDFs ou digitalize com o scanner (ele comprime as páginas).`
    : '';

/** Lança o erro de tamanho (para os serviços de envio). */
export const exigirLimitePdf = (bytes: number, nome?: string): void => {
  const e = erroTamanhoPdf(bytes, nome);
  if (e) throw new Error(e);
};
