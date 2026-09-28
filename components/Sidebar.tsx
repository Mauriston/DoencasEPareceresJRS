import React, { useContext } from 'react';
import { NavContext } from '../context/NavContext';
import { getNavEntries } from '../config/navigation';

/**
 * Barra lateral fixa (somente desktop) com os mesmos itens/ícones dos cards da
 * Página Inicial. Fica retraída (só ícones) e expande ao passar o mouse,
 * revelando os títulos — mesma lógica de exibição por perfil dos cards.
 */
export const Sidebar: React.FC = () => {
  const nav = useContext(NavContext);
  const currentView = nav?.currentView;
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;

  const entries = getNavEntries(authUser?.perfil, periciaMenorVigentes);

  return (
    <aside
      className="hidden md:flex group/sidebar flex-col shrink-0 h-full bg-[#050F41] text-white overflow-hidden transition-[width] duration-200 ease-in-out w-[64px] hover:w-[240px] z-30"
    >
      <div className="flex items-center h-[56px] px-[16px] shrink-0 border-b border-white/10">
        <div className="w-8 h-8 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm shrink-0">
          <img src="https://i.imgur.com/KUbQz08.png" alt="HNRe Logo" className="h-full w-full object-contain" />
        </div>
        <span className="ml-3 font-heading text-xs font-bold uppercase tracking-wider whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
          JRS / HNRe
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        {entries.map(entry => {
          const isActive = currentView === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setCurrentView(entry.id)}
              title={entry.label}
              className={`relative w-full flex items-center h-11 px-[20px] transition-colors whitespace-nowrap ${
                isActive ? 'bg-white/15 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#079551] rounded-r-full" />}
              <span className="material-symbols-outlined text-[22px] shrink-0">{entry.icon}</span>
              <span className="ml-3 text-xs font-bold uppercase tracking-wide opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
                {entry.label}
              </span>
              {entry.badge ? (
                <span className="ml-auto mr-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 items-center justify-center shrink-0 hidden group-hover/sidebar:flex">
                  {entry.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
