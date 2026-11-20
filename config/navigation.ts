// Ficheiro: config/navigation.ts
// Menu agrupado por TAREFA (auditoria v2, N1/N2): Trabalho · Consulta · Formação ·
// Administração. Cada página é um link direto (sem accordion); o grupo é só um
// rótulo de seção na barra lateral. A visibilidade de cada página respeita a mesma
// matriz de permissões por perfil usada em toda a app (canAccessPage) — o
// agrupamento muda, as permissões não. Um grupo sem páginas visíveis não aparece.
import { NavItem } from '../types';
import { PAGE_DEFS, canAccessPage } from './permissions';
import { termosPericia } from './termosPericia';

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

// Páginas que só aparecem no menu em telas pequenas. Antes: "Vídeos" (['videos']). A auditoria de frontend (F28) recomenda não
// condicionar funcionalidade ao tamanho da tela — por isso a lista agora está
// vazia e as duas páginas aparecem em qualquer largura. Para voltar ao
// comportamento antigo, basta repor os dois ids aqui.
const MOBILE_ONLY_PAGES: NavItem[] = [];

const CATEGORY_DEFS: { id: string; label: string; icon: string; subtitle: string; pages: NavItem[] }[] = [
  { id: 'trabalho', label: 'Trabalho', icon: 'work', subtitle: 'Inspeções de saúde, inspecionados, concursos, perícias menores, pareceres e mensagens.', pages: ['inspecoes', 'militares', 'concursosJRS', 'pericia-menor', 'escala', 'pareceres', 'mensagens'] },
  { id: 'consulta', label: 'Consulta', icon: 'manage_search', subtitle: 'Doenças de Lei, exames, índices e normas.', pages: ['guide', 'exames', 'concursos', 'dgpm406', 'portaria', 'laws'] },
  { id: 'formacao', label: 'Formação', icon: 'school', subtitle: 'Vídeos e apresentações.', pages: ['videos', 'apresentacoes'] },
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
        label: p.id === 'pericia-menor' ? termosPericia(perfil).pagina : p.label,
        icon: p.icon,
        subtitle: p.subtitle,
        badge: p.id === 'pericia-menor' && periciaMenorVigentes > 0 ? periciaMenorVigentes : undefined,
      })),
  })).filter(cat => cat.subitems.length > 0);

  // Sistema (auditoria v3, 8b): "Administração" (só Admin — usuários, perfis e permissões, e-mails, agenda das IS,
  // integrações e registro de alterações; components/administracao/) e "Férias" (matriz de permissões; padrão:
  // Admin, médicos JRS/MPI e Secretaria). O id da página de Administração continua 'usuarios' (rota /administracao).
  const ferias = pageMap.get('ferias')!;
  const sistema: NavSubItem[] = [
    ...(perfil === 'admin' ? [{ id: 'usuarios' as NavItem, label: 'Administração', icon: 'admin_panel_settings', subtitle: 'Usuários, permissões e ajustes do app.' }] : []),
    ...(canAccessPage('ferias', perfil) ? [{ id: ferias.id, label: ferias.label, icon: ferias.icon, subtitle: ferias.subtitle }] : []),
  ];
  if (sistema.length) {
    categories.push({
      id: 'administracao',
      label: 'Sistema',
      icon: 'admin_panel_settings',
      subtitle: 'Administração do app (só Admin); férias e afastamentos.',
      subitems: sistema,
    });
  }

  // Ajuda: "Sobre o app", "Feedback" e "Add à Tela de Início" (matriz de permissões; liberados a todos por padrão).
  const ajuda = (['sobre', 'feedback', 'instalar-app'] as NavItem[])
    .filter(id => canAccessPage(id, perfil))
    .map(id => pageMap.get(id)!)
    .map(p => ({ id: p.id, label: p.label, icon: p.icon, subtitle: p.subtitle }));
  if (ajuda.length) {
    categories.push({ id: 'ajuda', label: 'Ajuda', icon: 'help', subtitle: 'O que o app faz, por área, e o canal de feedback.', subitems: ajuda });
  }

  return categories;
};

export const findCategoryForView = (categories: NavCategory[], view: NavItem): NavCategory | undefined =>
  categories.find(cat => cat.subitems.some(s => s.id === view));
