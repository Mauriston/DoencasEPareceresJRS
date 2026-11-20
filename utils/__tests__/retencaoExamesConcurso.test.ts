import { describe, it, expect } from 'vitest';
import { caminhoDaUrlStorage, dataBaseRetencao, dataDescarteExames } from '../../servidor/concursos/retencaoExames';

describe('retenção dos PDFs de exames dos concursos', () => {
  it('usa a última data de agendamento como base', () => {
    expect(dataBaseRetencao(['2026-03-10', '', '2026-05-02', '2026-04-01'], new Date('2026-06-01T12:00:00Z'))).toBe('2026-05-02');
  });
  it('sem agendamento, usa o encerramento; sem os dois, não descarta', () => {
    expect(dataBaseRetencao(['', 'x'], new Date('2026-06-01T12:00:00Z'))).toBe('2026-06-01');
    expect(dataBaseRetencao([], null)).toBeNull();
  });
  it('descarta 1 ano depois', () => {
    expect(dataDescarteExames('2026-05-02')).toBe('2027-05-02');
  });
  it('só aceita objetos do Storage sob concursos/', () => {
    const base = 'https://firebasestorage.googleapis.com/v0/b/jrs-app-web.firebasestorage.app/o/';
    expect(caminhoDaUrlStorage(`${base}concursos%2Fabc%2Fcandidatos%2F123%2Fexames%2FEXAMES_1.pdf?alt=media&token=t`))
      .toBe('concursos/abc/candidatos/123/exames/EXAMES_1.pdf');
    expect(caminhoDaUrlStorage(`${base}pareceres%2Fx.pdf?alt=media`)).toBeNull();
    expect(caminhoDaUrlStorage('https://drive.google.com/file/d/abc/view')).toBeNull();
  });
});
