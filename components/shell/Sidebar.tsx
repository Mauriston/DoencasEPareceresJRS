// Ficheiro: components/shell/Sidebar.tsx
// Barra lateral com os menus principais (as mesmas categorias e a mesma matriz
// de permissões da Página Inicial — `getNavCategories`). No desktop ela é FIXA:
// 240px com rótulos sempre visíveis, e um botão explícito "Recolher menu" a
// reduz a um trilho de 64px — não há mais expansão no hover empurrando o
// conteúdo. Abaixo de 768px vira um drawer aberto pelo botão da topbar.
import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavContext } from '../../context/NavContext';
import { getNavCategories, findCategoryForView, type NavCategory } from '../../config/navigation';
import { pathForView } from '../../config/routes';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Avatar, UserDropdownContent, PERFIL_LABELS } from './UserMenu';

const CHAVE_RECOLHIDA = 'jrs_sidebar_recolhida';

const lerPreferencia = (): boolean => {
  try {
    const salvo = localStorage.getItem(CHAVE_RECOLHIDA);
    if (salvo !== null) return salvo === '1';
  } catch { /* sem localStorage: segue o padrão */ }
  // 768–1279: trilho recolhido · ≥1280: sidebar de 240px.
  return typeof window !== 'undefined' && window.innerWidth < 1280;
};

export const Sidebar: React.FC = () => {
  const nav = useContext(NavContext);
  const currentView = nav?.currentView;
  const authUser = nav?.authUser || null;
  const isMobileMenuOpen = nav?.isMobileMenuOpen || false;
  const setIsMobileMenuOpen = nav?.setIsMobileMenuOpen || (() => {});
  const isAvatarMenuOpen = nav?.isAvatarMenuOpen || false;
  const setIsAvatarMenuOpen = nav?.setIsAvatarMenuOpen || (() => {});
  const handleLogout = nav?.handleLogout || (() => {});
  const setCurrentView = nav?.setCurrentView || (() => {});

  const isDesktop = useIsDesktop();
  const categories = getNavCategories(authUser?.perfil, nav?.periciaMenorVigentes || 0, isDesktop);
  const activeCategory = currentView ? findCategoryForView(categories, currentView) : undefined;

  const [recolhida, setRecolhida] = useState<boolean>(lerPreferencia);
  const [expandedId, setExpandedId] = useState<string | undefined>(activeCategory?.id);

  // Ao navegar para uma página, reabre o accordion da categoria correspondente.
  useEffect(() => {
    setExpandedId(activeCategory?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const alternarRecolhida = () => {
    setRecolhida(prev => {
      const proximo = !prev;
      try { localStorage.setItem(CHAVE_RECOLHIDA, proximo ? '1' : '0'); } catch { /* sem localStorage */ }
      return proximo;
    });
  };

  const renderCategory = (cat: NavCategory, variante: 'desktop' | 'drawer') => {
    const rail = variante === 'desktop' && recolhida;
    const isActive = activeCategory?.id === cat.id;
    const isExpanded = expandedId === cat.id && !rail;
    const badge = cat.subitems.reduce((acc, s) => acc + (s.badge || 0), 0);
    const multiplos = cat.subitems.length > 1;
    const classeLinha = `relative w-full flex items-center h-11 px-5 transition-colors whitespace-nowrap ${
      isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
    }`;
    const conteudo = (
      <>
        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-gold rounded-r-full" aria-hidden="true" />}
        <span className="material-symbols-outlined text-[24px] shrink-0" aria-hidden="true">{cat.icon}</span>
        {!rail && <span className="ml-3 text-sm font-semibold truncate">{cat.label}</span>}
        {badge > 0 && (
          <span className={`bg-wine text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shrink-0 ${rail ? 'absolute top-1.5 right-2' : 'ml-auto'}`}>
            {badge}
          </span>
        )}
        {multiplos && !rail && (
          <span className={`material-symbols-outlined text-[20px] shrink-0 transition-transform duration-200 ${badge > 0 ? 'ml-1' : 'ml-auto'} ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true">
            expand_more
          </span>
        )}
      </>
    );

    return (
      <div key={cat.id}>
        {multiplos ? (
          <button
            type="button"
            title={cat.label}
            aria-label={rail ? cat.label : undefined}
            aria-expanded={rail ? undefined : isExpanded}
            onClick={() => {
              // No trilho recolhido o clique expande a sidebar e abre o grupo.
              if (rail) { alternarRecolhida(); setExpandedId(cat.id); return; }
              setExpandedId(prev => (prev === cat.id ? undefined : cat.id));
            }}
            className={classeLinha}
          >
            {conteudo}
          </button>
        ) : (
          <Link
            to={pathForView(cat.subitems[0].id)}
            title={cat.label}
            aria-label={rail ? cat.label : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={classeLinha}
          >
            {conteudo}
          </Link>
        )}

        {multiplos && isExpanded && (
          <div>
            {cat.subitems.map(sub => (
              <Link
                key={sub.id}
                to={pathForView(sub.id)}
                aria-current={currentView === sub.id ? 'page' : undefined}
                className={`w-full flex items-center min-h-[44px] pl-[52px] pr-4 transition-colors whitespace-nowrap ${
                  currentView === sub.id ? 'text-white font-bold bg-white/10' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0 mr-2" aria-hidden="true">{sub.icon}</span>
                <span className="text-sm truncate">{sub.label}</span>
                {sub.badge ? (
                  <span className="ml-auto bg-wine text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shrink-0">{sub.badge}</span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  const Marca: React.FC<{ rail?: boolean }> = ({ rail = false }) => (
    <Link to="/" title="Página Inicial" className="flex flex-col items-center justify-center gap-1.5 py-4 shrink-0 border-b border-white/10">
      <span className="w-9 h-9 bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
        <img src="https://i.imgur.com/8HeAdv4.png" alt="JRS/HNRe" className="h-full w-full object-contain" />
      </span>
      {!rail && <span className="text-xs font-bold tracking-[0.16em] uppercase text-white whitespace-nowrap">JRS/HNRe</span>}
    </Link>
  );

  return (
    <>
      {/* DESKTOP: sidebar fixa (240) ou trilho (64) — só muda pelo botão. */}
      <aside
        aria-label="Menu principal"
        className={`hidden md:flex flex-col shrink-0 h-full bg-navy text-white z-30 transition-[width] duration-200 ${recolhida ? 'w-16' : 'w-60'}`}
      >
        <Marca rail={recolhida} />
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {categories.map(cat => renderCategory(cat, 'desktop'))}
        </nav>
        <button
          type="button"
          onClick={alternarRecolhida}
          aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
          title={recolhida ? 'Expandir menu' : 'Recolher menu'}
          className="shrink-0 h-12 px-5 flex items-center gap-3 border-t border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">{recolhida ? 'left_panel_open' : 'left_panel_close'}</span>
          {!recolhida && <span className="text-sm font-semibold">Recolher menu</span>}
        </button>
      </aside>

      {/* MOBILE: overlay + drawer aberto pelo botão da topbar. */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[110] bg-navy/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <aside
        aria-label="Menu principal"
        className={`md:hidden fixed top-0 left-0 h-full w-[280px] bg-navy text-white z-[120] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex items-center justify-center border-b border-white/10 shrink-0">
          <Marca />
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">close</span>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {categories.map(cat => renderCategory(cat, 'drawer'))}
        </nav>
        <div className="relative shrink-0">
          {isAvatarMenuOpen && (
            <>
              <div className="fixed inset-0 z-[125]" onClick={() => setIsAvatarMenuOpen(false)} />
              <div className="absolute left-3 right-3 bottom-full mb-2 z-[130]">
                <UserDropdownContent
                  authUser={authUser}
                  onPerfilClick={() => { setIsAvatarMenuOpen(false); setCurrentView('perfil'); }}
                  onLogoutClick={() => { setIsAvatarMenuOpen(false); handleLogout(); }}
                  perfilReal={nav?.perfilReal}
                  verComo={nav?.verComo}
                  onVerComo={perfil => { setIsAvatarMenuOpen(false); nav?.setVerComo(perfil); }}
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
            className="w-full border-t border-white/10 px-4 py-3 flex items-center justify-end gap-3 text-right hover:bg-white/5 transition-colors"
          >
            <span className="min-w-0 flex flex-col items-end leading-tight">
              <span className="text-sm font-bold text-white truncate max-w-[170px]">{authUser?.usuario || 'Usuário'}</span>
              <span className={`text-xs truncate max-w-[170px] ${nav?.verComo ? 'font-bold text-gold' : 'font-medium text-white/70'}`}>{nav?.verComo ? `Vendo como ${PERFIL_LABELS[nav.verComo] || nav.verComo}` : (authUser?.cargo || ' ')}</span>
            </span>
            <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} size={36} />
          </button>
        </div>
      </aside>
    </>
  );
};
