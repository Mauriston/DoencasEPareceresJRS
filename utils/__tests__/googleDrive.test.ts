import { describe, it, expect } from 'vitest';
import { getDriveFileId, getDriveFileIdSeDrive, camposIdDrive } from '../googleDrive';

describe('googleDrive', () => {
  it('extrai o id nos formatos conhecidos', () => {
    expect(getDriveFileId('https://drive.google.com/file/d/AbC_123-x/view')).toBe('AbC_123-x');
    expect(getDriveFileId('https://drive.google.com/open?id=AbC_123-x')).toBe('AbC_123-x');
  });
  it('só considera URLs do Drive', () => {
    expect(getDriveFileIdSeDrive('https://drive.google.com/file/d/AbC/view')).toBe('AbC');
    expect(getDriveFileIdSeDrive('https://firebasestorage.googleapis.com/v0/b/x/o/p%2Fa.pdf?alt=media')).toBeNull();
    expect(getDriveFileIdSeDrive('')).toBeNull();
    expect(getDriveFileIdSeDrive(undefined)).toBeNull();
  });
  it('camposIdDrive não cria chave vazia (Firestore rejeita undefined)', () => {
    expect(camposIdDrive('https://drive.google.com/file/d/AbC/view')).toEqual({ pdfFileId: 'AbC' });
    expect(camposIdDrive('https://exemplo.com/a.pdf')).toEqual({});
  });
});
