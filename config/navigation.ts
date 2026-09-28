// Ficheiro: config/navigation.ts
// Estrutura de navegação em 2 níveis: os menus principais (Concursos,
// Benefícios, Pareceres, Perícia Menor, Mensagens, Normas, Extras) + Usuários
// (admin) são usados nos cards da Página Inicial e como itens da barra
// lateral. Um menu principal com mais de um subitem expande em accordion na
// barra lateral (e, na Home/desktop, abre os cards de subitem ao lado); um
// menu com um único subitem navega direto para ele. A visibilidade de cada
// subitem respeita a mesma matriz de permissões por perfil já usada em toda
// a app.
import { NavItem } from '../types';
import { PAGE_DEFS, canAccessPage } from './permissions';

export interface NavSubItem {
  id: NavItem;
  label: string;
  icon: string;
  subtitle: string;
  badge?: number;
}

export interface NavCategory {
  id: string;
  label: string;
  icon: string;
  subtitle: string;
  subitems: NavSubItem[];
}

const CATEGORY_DEFS: { id: string; label: string; icon: string; subtitle: string; pages: NavItem[] }[] = [
  { id: 'concursos', label: 'Concursos', icon: 'checklist', subtitle: 'Acesse as planilhas de acompanhamento.', pages: ['concursosJRS', 'concursos', 'exames'] },
  { id: 'beneficios', label: 'Benefícios', icon: 'stethoscope', subtitle: 'Verifique os critérios de enquadramento das Doenças de Lei.', pages: ['guide', 'portaria'] },
  { id: 'pareceres', label: 'Pareceres', icon: 'description', subtitle: 'Gere solicitações de Pareceres em PDF por especialidade.', pages: ['pareceres'] },
  { id: 'pericia-menor', label: 'Perícia Menor', icon: 'personal_injury', subtitle: 'Registre as Perícias Menores dos militares de bordo.', pages: ['pericia-menor'] },
  { id: 'mensagens', label: 'Mensagens', icon: 'chat', subtitle: 'Faça minutas das MSG de IS auxiliado por IA.', pages: ['mensagens'] },
  { id: 'normas', label: 'Normas', icon: 'gavel', subtitle: 'DGPM-406 e Legislação.', pages: ['dgpm406', 'laws', 'templates'] },
  { id: 'extras', label: 'Extras', icon: 'widgets', subtitle: 'Acesse materiais para estudar.', pages: ['casos', 'videos', 'infograficos', 'roteiro'] },
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
    subtitle: cat.subtitle,
    subitems: cat.pages
      .map(id => pageMap.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter(p => canAccessPage(p.id, perfil))
      .map(p => ({
        id: p.id,
        label: p.label,
        icon: p.icon,
        subtitle: p.subtitle,
        badge: p.id === 'pericia-menor' && periciaMenorVigentes > 0 ? periciaMenorVigentes : undefined,
      })),
  })).filter(cat => cat.subitems.length > 0);

  if (perfil === 'admin') {
    categories.push({
      id: 'usuarios',
      label: 'Usuários',
      icon: 'group',
      subtitle: 'Gerencie usuários e permissões de acesso.',
      subitems: [{ id: 'usuarios', label: 'Usuários', icon: 'group', subtitle: 'Gerencie usuários e permissões de acesso.' }],
    });
  }

  return categories;
};

export const findCategoryForView = (categories: NavCategory[], view: NavItem): NavCategory | undefined =>
  categories.find(cat => cat.subitems.some(s => s.id === view));
