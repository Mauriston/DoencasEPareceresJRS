// Ficheiro: components/shell/Breadcrumbs.tsx
// Trilha de navegação da topbar: Início › Página › (níveis extras
// declarados pela página). Substitui o título centralizado "Categoria - Subitem"
// e o botão circular flutuante de voltar — cada nível é um link/rota. No
// celular, mostra só o "‹" para o pai e o título da página (h1 — ver TituloPagina.tsx).
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { NavContext } from '../../context/NavContext';
import { useBreadcrumbExtras, type Crumb } from '../../context/BreadcrumbContext';
import { findCategoryForView, getNavCategories } from '../../config/navigation';
import { pathForView } from '../../config/routes';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useTituloNaTopbar } from './TituloPagina';

export const Breadcrumbs: React.FC<{ className?: string }> = ({ className = '' }) => {
  const nav = useContext(NavContext);
  const extras = useBreadcrumbExtras();
  const isDesktop = useIsDesktop();
  const view = nav?.currentView || 'home';
  const tituloPagina = useTituloNaTopbar();

  const crumbs: Crumb[] = [];
  if (view === 'home') {
    crumbs.push({ label: 'Início' });
  } else {
    crumbs.push({ label: 'Início', to: '/' });
    const categorias = getNavCategories(nav?.authUser?.perfil, nav?.periciaMenorVigentes || 0, isDesktop);
    const categoria = findCategoryForView(categorias, view);
    const subitem = categoria?.subitems.find(s => s.id === view);
    if (categoria && subitem) {
      // O grupo do menu (Trabalho, Consulta…) é só um rótulo de seção: não entra na trilha
      // (migalha morta — não existe página de grupo). Trilha: Início › Página › subnível.
      crumbs.push({ label: subitem.label, to: pathForView(view) });
    } else if (view === 'perfil') {
      crumbs.push({ label: 'Meu perfil', to: '/perfil' });
    } else if (view === 'configuracoes') {
      crumbs.push({ label: 'Configurações', to: '/configuracoes' });
    }
    crumbs.push(...extras);
  }

  // O último nível é a página atual (sem link).
  const ultimo = crumbs.length - 1;
  // Pai navegável mais próximo (para o "‹ Voltar" do celular).
  const pai = [...crumbs.slice(0, ultimo)].reverse().find(c => c.to);

  return (
    <div className={`min-w-0 ${className}`}>
      {/* Celular (M9): só o "‹" para o pai e o título da página. Quando a página registrou o título
          (useTituloPagina, via PageHeader), ele vira o <h1> aqui e o PageHeader esconde o seu abaixo de md. */}
      <div className="md:hidden flex items-center gap-0.5 min-w-0">
        {pai ? (
          <Link to={pai.to!} aria-label={`Voltar para ${pai.label}`} title={pai.label} className="inline-flex items-center justify-center w-11 h-11 -ml-1 rounded-lg text-navy hover:bg-thead shrink-0">
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">chevron_left</span>
          </Link>
        ) : null}
        {tituloPagina ? (
          <h1 className="text-base font-bold text-navy truncate">{tituloPagina}</h1>
        ) : (
          <span aria-current="page" className="text-base font-bold text-navy truncate">{crumbs[ultimo].label}</span>
        )}
      </div>

      {/* Desktop: trilha completa */}
      <nav aria-label="Trilha de navegação" className="hidden md:block min-w-0">
      <ol className="flex items-center gap-1 min-w-0 text-sm">
        {crumbs.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span className="material-symbols-outlined text-[16px] text-ink-4 shrink-0" aria-hidden="true">chevron_right</span>}
            {i === ultimo ? (
              <span aria-current="page" className="font-bold text-navy truncate max-w-[36ch]">{c.label}</span>
            ) : c.to ? (
              <Link to={c.to} className="font-semibold text-ink-3 hover:text-navy hover:underline truncate max-w-[24ch]">
                {i === 0 && view !== 'home' ? <span className="material-symbols-outlined text-[18px] align-middle" aria-label="Início">home</span> : c.label}
              </Link>
            ) : (
              <span className="font-semibold text-ink-3 truncate max-w-[24ch]">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
      </nav>
    </div>
  );
};
