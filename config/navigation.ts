// Ficheiro: config/navigation.ts
// Estrutura de navegação em 2 níveis: os 5 menus principais que antes ficavam
// na topbar (Benefícios, Concursos, Pareceres, Normas, Extras) + Usuários
// (admin) são usados nos cards da Página Inicial e na barra lateral. Os
// subitens de cada menu principal aparecem na barra acessória do Header,
// de acordo com o menu selecionado. A visibilidade de cada subitem respeita
// a mesma matriz de permissões por perfil já usada em toda a app.
import { NavItem } from '../types';
import { PAGE_DEFS, canAccessPage } from './permissions';

export interface NavSubItem {
  id: NavItem;
  label: string;
  icon: string;
  badge?: number;
}

export interface NavCategory {
  id: string;
  label: string;
  icon: string;
  subitems: NavSubItem[];
}

const CATEGORY_DEFS: { id: string; label: string; icon: string; pages: NavItem[] }[] = [
  { id: 'beneficios', label: 'Benefícios', icon: 'stethoscope', pages: ['guide', 'portaria'] },
  { id: 'concursos', label: 'Concursos', icon: 'checklist', pages: ['concursosJRS', 'concursos', 'exames'] },
  { id: 'pareceres', label: 'Pareceres', icon: 'description', pages: ['pareceres', 'pericia-menor', 'mensagens'] },
  { id: 'normas', label: 'Normas', icon: 'gavel', pages: ['dgpm406', 'laws', 'templates'] },
  { id: 'extras', label: 'Extras', icon: 'widgets', pages: ['casos', 'estudo', 'infograficos', 'resumos', 'roteiro'] },
];

export const getNavCategories = (
  perfil: string | undefined,
  periciaMenorVigentes: number = 0
): NavCategory[] => {
  const pageMap = new Map(PAGE_DEFS.map(p => [p.id, p]));

  const categories: NavCategory[] = CATEGORY_DEFS.map(cat => ({
    id: cat.id,
    label: cat.label,
    icon: cat.icon,
    subitems: cat.pages
      .map(id => pageMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter(p => canAccessPage(p.id, perfil))
      .map(p => ({
        id: p.id,
        label: p.label,
        icon: p.icon,
        badge: p.id === 'pericia-menor' && periciaMenorVigentes > 0 ? periciaMenorVigentes : undefined,
      })),
  })).filter(cat => cat.subitems.length > 0);

  if (perfil === 'admin') {
    categories.push({
      id: 'usuarios',
      label: 'Usuários',
      icon: 'group',
      subitems: [{ id: 'usuarios', label: 'Usuários', icon: 'group' }],
    });
  }

  return categories;
};

export const findCategoryForView = (categories: NavCategory[], view: NavItem): NavCategory | undefined =>
  categories.find(cat => cat.subitems.some(s => s.id === view));
