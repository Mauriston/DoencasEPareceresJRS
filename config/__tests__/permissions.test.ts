import { describe, it, expect, vi } from 'vitest';
vi.mock('../../services/firestorePermissions', () => ({ salvarPermissoesRemoto: vi.fn() }));
import { canAccessPage, canUseFeature, PAGE_DEFS, FEATURE_DEFS } from '../permissions';

describe('perfil user_medicos_geral (padrões)', () => {
  const p = 'user_medicos_geral';
  it('só acessa Escala SVÇ, Exames mínimos e Perícia Menor', () => {
    const liberadas = PAGE_DEFS.map(d => d.id).filter(id => canAccessPage(id, p));
    expect(liberadas.sort()).toEqual(['escala', 'exames', 'pericia-menor']);
  });
  it('só usa as funcionalidades da Perícia Menor', () => {
    const liberadas = FEATURE_DEFS.map(f => f.id).filter(id => canUseFeature(id, p));
    expect(liberadas.sort()).toEqual(['pericia-menor.historico', 'pericia-menor.novo']);
  });
  it('não muda os outros perfis', () => {
    expect(canAccessPage('guide', 'user_medicos')).toBe(true);
    expect(canAccessPage('exames', 'user_secretaria')).toBe(true);
    expect(canAccessPage('qualquer', 'perfil_desconhecido')).toBe(false);
  });
});
