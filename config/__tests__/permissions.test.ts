import { describe, it, expect, vi } from 'vitest';
vi.mock('../../services/firestorePermissions', () => ({ salvarPermissoesRemoto: vi.fn() }));
import { canAccessPage, canUseFeature, PAGE_DEFS, FEATURE_DEFS } from '../permissions';

describe('perfil user_medicos_geral (padrões)', () => {
  const p = 'user_medicos_geral';
  // "Sobre o app" é liberada a todos os perfis (auditoria v3, SB1).
  it('só acessa Escala de Serviço, Exames mínimos, Perícia Menor, Sobre o app e Feedback', () => {
    const liberadas = PAGE_DEFS.map(d => d.id).filter(id => canAccessPage(id, p));
    expect(liberadas.sort()).toEqual(['escala', 'exames', 'feedback', 'instalar-app', 'pericia-menor', 'sobre']);
  });
  it('só usa as funcionalidades da Perícia Menor (e a aba Afastamentos da ficha)', () => {
    const liberadas = FEATURE_DEFS.map(f => f.id).filter(id => canUseFeature(id, p));
    expect(liberadas.sort()).toEqual(['ficha.afastamentos', 'pericia-menor.historico', 'pericia-menor.novo']);
  });
  it('não muda os outros perfis', () => {
    expect(canAccessPage('guide', 'user_medicos')).toBe(true);
    expect(canAccessPage('exames', 'user_secretaria')).toBe(true);
    expect(canAccessPage('qualquer', 'perfil_desconhecido')).toBe(false);
  });
});
