// Ficheiro: config/navigation.ts
// Menu agrupado por TAREFA (auditoria v2, N1/N2): Trabalho · Consulta · Formação ·
// Administração. Cada página é um link direto (sem accordion); o grupo é só um
// rótulo de seção na barra lateral. A visibilidade de cada página respeita a mesma
// matriz de permissões por perfil usada em toda a app (canAccessPage) — o
// agrupamento muda, as permissões não. Um grupo sem páginas visíveis não aparece.
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

// Páginas que só aparecem no menu em telas pequenas. Antes: "Casos Periciais" e
// "Vídeos" (['casos', 'videos']). A auditoria de frontend (F28) recomenda não
// condicionar funcionalidade ao tamanho da tela — por isso a lista agora está
// vazia e as duas páginas aparecem em qualquer largura. Para voltar ao
// comportamento antigo, basta repor os dois ids aqui.
const MOBILE_ONLY_PAGES: NavItem[] = [];

const CATEGORY_DEFS: { id: string; label: string; icon: string; subtitle: string; pages: NavItem[] }[] = [
  { id: 'trabalho', label: 'Trabalho', icon: 'work', subtitle: 'Concursos, perícias menores, pareceres e mensagens.', pages: ['concursosJRS', 'pericia-menor', 'pareceres', 'mensagens'] },
  { id: 'consulta', label: 'Consulta', icon: 'manage_search', subtitle: 'Doenças de Lei, exames, índices, normas e modelos.', pages: ['guide', 'exames', 'concursos', 'dgpm406', 'portaria', 'laws', 'templates'] },
  { id: 'formacao', label: 'Formação', icon: 'school', subtitle: 'Casos periciais, vídeos, infográficos e roteiro.', pages: ['casos', 'videos', 'infograficos', 'roteiro'] },
];

export const getNavCategories = (
  perfil: string | undefined,
  periciaMenorVigentes: number = 0,
  isDesktop: boolean = false
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
      .filter(p => !(isDesktop && MOBILE_ONLY_PAGES.includes(p.id)))
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
      id: 'administracao',
      label: 'Administração',
      icon: 'admin_panel_settings',
      subtitle: 'Cadastro de militares e gestão de usuários.',
      subitems: [
        { id: 'militares', label: 'Militares', icon: 'military_tech', subtitle: 'Cadastro de militares da ativa e servidores civis.' },
        { id: 'usuarios', label: 'Usuários', icon: 'group', subtitle: 'Gerencie usuários e permissões de acesso.' },
      ],
    });
  }

  return categories;
};

export const findCategoryForView = (categories: NavCategory[], view: NavItem): NavCategory | undefined =>
  categories.find(cat => cat.subitems.some(s => s.id === view));
