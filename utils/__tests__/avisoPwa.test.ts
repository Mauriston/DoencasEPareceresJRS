import { describe, expect, it } from 'vitest';
import { deveExibirAvisoPwa, MAX_EXIBICOES_AVISO_PWA } from '../pwa';

describe('diálogo "adicionar à tela de início" automático', () => {
  const base = { exibicoes: 0, concluido: false, standalone: false, jaNestaSessao: false };
  it('abre nos 3 primeiros acessos e não no 4º', () => {
    expect(MAX_EXIBICOES_AVISO_PWA).toBe(3);
    expect(deveExibirAvisoPwa(base)).toBe(true);
    expect(deveExibirAvisoPwa({ ...base, exibicoes: 2 })).toBe(true);
    expect(deveExibirAvisoPwa({ ...base, exibicoes: 3 })).toBe(false);
  });
  it('usuários antigos sem contador começam do zero; o contador existente é mantido', () => {
    expect(deveExibirAvisoPwa({ ...base, exibicoes: undefined })).toBe(true);
    expect(deveExibirAvisoPwa({ ...base, exibicoes: 5 })).toBe(false);
  });
  it('não abre se já concluiu, se o app está aberto pelo ícone ou se já abriu nesta sessão', () => {
    expect(deveExibirAvisoPwa({ ...base, concluido: true })).toBe(false);
    expect(deveExibirAvisoPwa({ ...base, standalone: true })).toBe(false);
    expect(deveExibirAvisoPwa({ ...base, jaNestaSessao: true })).toBe(false);
  });
});
