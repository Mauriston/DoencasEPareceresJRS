import React, { useContext } from 'react';
import { NavContext } from '../context/NavContext';
import { getNavCategories, findCategoryForView } from '../config/navigation';

/**
 * Barra lateral fixa (somente desktop) com os mesmos 5 menus principais +
 * Usuários dos cards da Página Inicial. Fica retraída (só ícones) e expande
 * ao passar o mouse, revelando os títulos — mesma lógica de exibição por
 * perfil dos cards. O logo do app já aparece na topbar (Header), por isso
 * não é repetido aqui.
 */
export const Sidebar: React.FC = () => {
  const nav = useContext(NavContext);
  const currentView = nav?.currentView;
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;

  const categories = getNavCategories(authUser?.perfil, periciaMenorVigentes);
  const activeCategory = currentView ? findCategoryForView(categories, currentView) : undefined;

  return (
    <aside
      className="hidden md:flex group/sidebar flex-col shrink-0 h-full bg-[#050F41] text-white overflow-hidden transition-[width] duration-200 ease-in-out w-[64px] hover:w-[240px] z-30"
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {categories.map(cat => {
          const isActive = activeCategory?.id === cat.id;
          const badge = cat.subitems.reduce((acc, s) => acc + (s.badge || 0), 0);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCurrentView(cat.subitems[0].id)}
              title={cat.label}
              className={`relative w-full flex items-center h-11 px-[20px] transition-colors whitespace-nowrap ${
                isActive ? 'bg-white/15 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#079551] rounded-r-full" />}
              <span className="material-symbols-outlined text-[22px] shrink-0">{cat.icon}</span>
              <span className="ml-3 text-xs font-bold uppercase tracking-wide opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
                {cat.label}
              </span>
              {badge > 0 ? (
                <span className="ml-auto mr-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 items-center justify-center shrink-0 hidden group-hover/sidebar:flex">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
