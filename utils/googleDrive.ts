// Ficheiro: utils/googleDrive.ts
// Extrai o ID de um link de arquivo do Google Drive (nos formatos
// "...?id=ID", "/file/d/ID/..." ou "/open?id=ID") e monta a URL de preview
// embutido (iframe), usada para exibir PDFs/documentos do Drive dentro do
// próprio app, sem abrir outra aba ou o app do Drive.
export const getDriveFileId = (url: string): string | null => {
  const fileMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  return null;
};

export const isGoogleDriveUrl = (url: string): boolean => url.includes('drive.google.com');

export const getDriveEmbedUrl = (url: string): string | null => {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/file/d/${id}/preview` : null;
};
