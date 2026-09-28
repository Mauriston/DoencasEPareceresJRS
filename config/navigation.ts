// Ficheiro: config/navigation.ts
// Lista plana (sem categorias) das páginas do app, usada tanto pelos cards da
// Página Inicial quanto pela barra lateral (desktop). A visibilidade de cada
// item respeita a mesma matriz de permissões por perfil já usada em toda a app.
import { NavItem } from '../types';
import { PAGE_DEFS, canAccessPage } from './permissions';

export interface NavEntry {
  id: NavItem;
  label: string;
  icon: string;
  badge?: number;
}

export const getNavEntries = (
  perfil: string | undefined,
  periciaMenorVigentes: number = 0
): NavEntry[] => {
  const entries: NavEntry[] = PAGE_DEFS
    .filter(page => canAccessPage(page.id, perfil))
    .map(page => ({
      id: page.id,
      label: page.label,
      icon: page.icon,
      badge: page.id === 'pericia-menor' && periciaMenorVigentes > 0 ? periciaMenorVigentes : undefined,
    }));

  if (perfil === 'admin') {
    entries.push({ id: 'usuarios', label: 'Usuários', icon: 'group' });
  }

  return entries;
};
