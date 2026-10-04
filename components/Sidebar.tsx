import React, { useContext, useEffect, useState } from 'react';
import { NavContext } from '../context/NavContext';
import { getNavCategories, findCategoryForView, NavCategory } from '../config/navigation';
import { Avatar, UserDropdownContent } from './Header';
import { useIsDesktop } from '../hooks/useIsDesktop';

/**
 * Barra lateral com os menus principais (mesmos cards da Página Inicial).
 * Um menu com mais de um subitem funciona como accordion (expande/recolhe a
 * lista de subitens ao clicar); um menu com um único subitem navega direto
 * para ele. No desktop é uma barra fixa (só ícones, expande no hover). No
 * mobile vira um drawer acionado pelo botão hambúrguer do Header.
 */
export const Sidebar: React.FC = () => {
  const nav = useContext(NavContext);
  const currentView = nav?.currentView;
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;
  const isMobileMenuOpen = nav?.isMobileMenuOpen || false;
  const setIsMobileMenuOpen = nav?.setIsMobileMenuOpen || (() => {});
  // Compartilhado com o dropdown do avatar no Header (desktop); no mobile
  // quem abre/renderiza esse menu é o item de rodapé abaixo, perto de si
  // mesmo, em vez do avatar da topbar.
  const isAvatarMenuOpen = nav?.isAvatarMenuOpen || false;
  const setIsAvatarMenuOpen = nav?.setIsAvatarMenuOpen || (() => {});
  const handleLogout = nav?.handleLogout || (() => {});

  const isDesktop = useIsDesktop();
  const categories = getNavCategories(authUser?.perfil, periciaMenorVigentes, isDesktop);
  const activeCategory = currentView ? findCategoryForView(categories, currentView) : undefined;

  const [expandedId, setExpandedId] = useState<string | undefined>(activeCategory?.id);

  // Ao navegar para uma página, reabre o accordion do menu correspondente
  // (não interfere ao expandir/recolher manualmente sem sair da página atual).
  useEffect(() => {
    setExpandedId(activeCategory?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const handleCategoryClick = (cat: NavCategory) => {
    if (cat.subitems.length === 1) {
      setCurrentView(cat.subitems[0].id);
      return;
    }
    setExpandedId(prev => (prev === cat.id ? undefined : cat.id));
  };

  const renderCategory = (cat: NavCategory, variant: 'rail' | 'drawer') => {
    const isActive = activeCategory?.id === cat.id;
    const isExpanded = expandedId === cat.id;
    const badge = cat.subitems.reduce((acc, s) => acc + (s.badge || 0), 0);
    const showSubitems = cat.subitems.length > 1;

    return (
      <div key={cat.id}>
        <button
          type="button"
          onClick={() => handleCategoryClick(cat)}
          title={cat.label}
          className={`relative w-full flex items-center h-11 px-[20px] transition-colors whitespace-nowrap ${
            isActive ? 'bg-white/15 text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-[#079551] rounded-r-full" />}
          <span className="material-symbols-outlined text-[22px] shrink-0">{cat.icon}</span>
          <span
            className={`ml-3 text-xs font-bold uppercase tracking-wide transition-opacity duration-150 ${
              variant === 'rail' ? 'opacity-0 group-hover/sidebar:opacity-100' : 'opacity-100'
            }`}
          >
            {cat.label}
          </span>
          {badge > 0 ? (
            <span
              className={`ml-auto mr-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 items-center justify-center shrink-0 ${
                variant === 'rail' ? 'hidden group-hover/sidebar:flex' : 'flex'
              }`}
            >
              {badge}
            </span>
          ) : null}
          {showSubitems ? (
            <span
              className={`material-symbols-outlined text-[18px] shrink-0 transition-transform duration-200 ${
                badge > 0 ? '' : 'ml-auto'
              } ${isExpanded ? 'rotate-180' : ''} ${variant === 'rail' ? 'hidden group-hover/sidebar:inline-block' : ''}`}
            >
              expand_more
            </span>
          ) : null}
        </button>

        {showSubitems && (
          <div
            className={`overflow-hidden transition-all duration-200 ease-in-out ${
              variant === 'rail' ? 'hidden group-hover/sidebar:block' : ''
            } ${isExpanded ? 'max-h-96' : 'max-h-0'}`}
          >
            {cat.subitems.map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setCurrentView(sub.id)}
                className={`w-full flex items-center h-10 pl-[46px] pr-4 transition-colors whitespace-nowrap ${
                  currentView === sub.id ? 'text-white font-bold bg-white/10' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] shrink-0 mr-2">{sub.icon}</span>
                <span className="text-[11px] uppercase tracking-wide truncate">{sub.label}</span>
                {sub.badge ? (
                  <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                    {sub.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const Logo: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div
      className="flex flex-col items-center justify-center gap-1.5 py-4 shrink-0 border-b border-white/10 cursor-pointer"
      onClick={onClick}
      title="Página Inicial"
    >
      <div className="w-9 h-9 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm shrink-0">
        <img src="https://i.imgur.com/KUbQz08.png" alt="JRS/HNRe" className="h-full w-full object-contain" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 whitespace-nowrap">
        JRS/HNRe
      </span>
    </div>
  );

  return (
    <>
      {/* DESKTOP: barra fixa, só ícones, expande no hover */}
      <aside className="hidden md:flex group/sidebar flex-col shrink-0 h-full bg-[#050F41] text-white overflow-hidden transition-[width] duration-200 ease-in-out w-[64px] hover:w-[240px] z-30">
        <Logo onClick={() => setCurrentView('home')} />
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {categories.map(cat => renderCategory(cat, 'rail'))}
        </nav>
      </aside>

      {/* MOBILE: overlay + drawer acionado pelo hambúrguer do Header */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[110] bg-navy/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-[260px] bg-[#050F41] text-white z-[120] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex items-center justify-center border-b border-white/10 shrink-0">
          <Logo onClick={() => setCurrentView('home')} />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/70 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {categories.map(cat => renderCategory(cat, 'drawer'))}
        </nav>
        <div className="relative shrink-0">
          {/* Menu do usuário abre aqui mesmo, perto do item que o aciona,
              em vez de ancorado no avatar da topbar (Header.tsx). O drawer
              continua aberto por trás — só fecha ao escolher Perfil/Logout
              ou ao tocar fora (backdrop abaixo). */}
          {isAvatarMenuOpen && (
            <>
              <div className="fixed inset-0 z-[125]" onClick={() => setIsAvatarMenuOpen(false)} />
              <div className="absolute left-3 right-3 bottom-full mb-2 z-[130]">
                <UserDropdownContent
                  authUser={authUser}
                  onPerfilClick={() => { setIsAvatarMenuOpen(false); setCurrentView('perfil'); }}
                  onLogoutClick={() => { setIsAvatarMenuOpen(false); handleLogout(); }}
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
            className="w-full border-t border-white/10 px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
          >
            <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} size={36} />
            <span className="min-w-0 flex flex-col items-start leading-tight">
              <span className="text-sm font-bold text-white truncate max-w-[170px]">{authUser?.usuario || 'Usuário'}</span>
              <span className="text-[11px] font-medium text-gray-400 truncate max-w-[170px]">{authUser?.cargo || ' '}</span>
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
