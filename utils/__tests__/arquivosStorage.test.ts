import { describe, it, expect } from 'vitest';
import { caminhoArquivoValido } from '../arquivosPermitidos';
import { caminhoDoStorage } from '../../services/arquivosStorage';

describe('caminhoDoStorage', () => {
  it('extrai o caminho da URL de download do Firebase Storage', () => {
    expect(caminhoDoStorage('https://firebasestorage.googleapis.com/v0/b/jrs-app-web.firebasestorage.app/o/periciasMenores%2Fabc.pdf?alt=media&token=x'))
      .toBe('periciasMenores/abc.pdf');
    expect(caminhoDoStorage('https://firebasestorage.googleapis.com/v0/b/b/o/perfil%2FCT%20MAURISTON%2Ffoto.jpg?alt=media'))
      .toBe('perfil/CT MAURISTON/foto.jpg');
    expect(caminhoDoStorage('https://storage.googleapis.com/jrs-app-web.firebasestorage.app/legislacao/l1.pdf')).toBe('legislacao/l1.pdf');
  });
  it('URLs de fora do Storage passam direto (null)', () => {
    expect(caminhoDoStorage('https://drive.google.com/file/d/1/view')).toBeNull();
    expect(caminhoDoStorage('data:image/png;base64,AAA')).toBeNull();
    expect(caminhoDoStorage('')).toBeNull();
    expect(caminhoDoStorage(undefined)).toBeNull();
  });
});

describe('caminhoArquivoValido (repasse do servidor)', () => {
  it('aceita só as pastas liberadas em storage.rules', () => {
    expect(caminhoArquivoValido('periciasMenores/abc.pdf')).toBe(true);
    expect(caminhoArquivoValido('perfil/CT MAURISTON/foto.jpg')).toBe(true);
    expect(caminhoArquivoValido('concursos/x/termos/1.pdf')).toBe(true);
    expect(caminhoArquivoValido('outra/arquivo.pdf')).toBe(false);
  });
  it('nunca repassa o áudio das entrevistas gravadas (só o servidor ouve, por /api/entrevistas/ouvir)', () => {
    expect(caminhoArquivoValido('entrevistas/9001/e1/original.webm')).toBe(false);
    expect(caminhoArquivoValido('entrevistas/9001/e1/audio.flac')).toBe(false);
    expect(caminhoArquivoValido('perfil/../entrevistas/9001/e1/audio.flac')).toBe(false);
  });
  it('recusa travessia, barra inicial, controle e tipos errados', () => {
    expect(caminhoArquivoValido('periciasMenores/../segredo')).toBe(false);
    expect(caminhoArquivoValido('/periciasMenores/a.pdf')).toBe(false);
    expect(caminhoArquivoValido('periciasMenores/a\u0000.pdf')).toBe(false);
    expect(caminhoArquivoValido(123)).toBe(false);
    expect(caminhoArquivoValido('periciasMenores/' + 'a'.repeat(600))).toBe(false);
  });
});
