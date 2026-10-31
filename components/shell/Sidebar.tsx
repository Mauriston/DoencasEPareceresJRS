// Ficheiro: components/shell/Sidebar.tsx
// Barra lateral com os menus principais (as mesmas categorias e a mesma matriz
// de permissões da Página Inicial — `getNavCategories`). No desktop ela é FIXA:
// 240px com rótulos sempre visíveis, e um botão explícito "Recolher menu" a
// reduz a um trilho de 64px — não há mais expansão no hover empurrando o
// conteúdo. Abaixo de 768px vira um drawer aberto pelo botão da topbar.
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { NavContext } from '../../context/NavContext';
import { getNavCategories, type NavCategory } from '../../config/navigation';
import { pathForView } from '../../config/routes';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Avatar, UserDropdownContent, PERFIL_LABELS } from './UserMenu';
import iconeJrs from '../../assets/icone-jrs.png';

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

  const [recolhida, setRecolhida] = useState<boolean>(lerPreferencia);

  const alternarRecolhida = () => {
    setRecolhida(prev => {
      const proximo = !prev;
      try { localStorage.setItem(CHAVE_RECOLHIDA, proximo ? '1' : '0'); } catch { /* sem localStorage */ }
      return proximo;
    });
  };

  // Menu plano agrupado por tarefa (auditoria v2, N1–N3): o grupo é só um rótulo de seção,
  // toda linha é um link direto — sem accordion e, no trilho recolhido, sem reexpandir a sidebar.
  const renderGrupo = (cat: NavCategory, variante: 'desktop' | 'drawer', primeiro: boolean) => {
    const rail = variante === 'desktop' && recolhida;
    return (
      <div key={cat.id} role="group" aria-labelledby={`grupo-${variante}-${cat.id}`}>
        {rail ? (
          !primeiro && <div className="mx-4 my-2 border-t border-white/10" aria-hidden="true" />
        ) : (
          <p id={`grupo-${variante}-${cat.id}`} className="px-5 pt-4 pb-1 text-xs font-bold uppercase tracking-[0.16em] text-white/60">{cat.label}</p>
        )}
        {rail && <span id={`grupo-${variante}-${cat.id}`} className="sr-only">{cat.label}</span>}
        {cat.subitems.map(sub => {
          const ativo = currentView === sub.id;
          return (
            <Link
              key={sub.id}
              to={pathForView(sub.id)}
              title={sub.label}
              aria-label={rail ? sub.label : undefined}
              aria-current={ativo ? 'page' : undefined}
              className={`relative w-full flex items-center ${variante === 'drawer' ? 'h-11' : 'h-10'} px-5 transition-colors whitespace-nowrap ${
                ativo ? 'bg-white/10 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white font-semibold'
              }`}
            >
              {ativo && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-gold rounded-r-full" aria-hidden="true" />}
              <span className="material-symbols-outlined text-[24px] shrink-0" aria-hidden="true">{sub.icon}</span>
              {!rail && <span className="ml-3 text-sm truncate">{sub.label}</span>}
              {sub.badge ? (
                <span className={`bg-wine text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center shrink-0 ${rail ? 'absolute top-1 right-2' : 'ml-auto'}`}>{sub.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    );
  };

  const renderInicio = (variante: 'desktop' | 'drawer') => {
    const rail = variante === 'desktop' && recolhida;
    const ativo = currentView === 'home';
    return (
      <Link
        to="/"
        title="Início"
        aria-label={rail ? 'Início' : undefined}
        aria-current={ativo ? 'page' : undefined}
        className={`relative w-full flex items-center ${variante === 'drawer' ? 'h-11' : 'h-10'} px-5 transition-colors whitespace-nowrap ${
          ativo ? 'bg-white/10 text-white font-bold' : 'text-white/80 hover:bg-white/10 hover:text-white font-semibold'
        }`}
      >
        {ativo && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-gold rounded-r-full" aria-hidden="true" />}
        <span className="material-symbols-outlined text-[24px] shrink-0" aria-hidden="true">home</span>
        {!rail && <span className="ml-3 text-sm truncate">Início</span>}
      </Link>
    );
  };

  const Marca: React.FC<{ rail?: boolean }> = ({ rail = false }) => (
    <Link to="/" title="Página Inicial" className="flex flex-col items-center justify-center gap-1.5 py-4 shrink-0 border-b border-white/10">
      <span className="w-9 h-9 bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
        <img src={iconeJrs} alt="JRS/HNRe" className="h-full w-full object-contain" />
      </span>
      {!rail && <span className="text-xs font-bold tracking-[0.16em] uppercase text-white whitespace-nowrap">JRS/HNRe</span>}
    </Link>
  );

  return (
    <>
      {/* DESKTOP: sidebar fixa (240) ou trilho (64) — só muda pelo botão. */}
      <aside
        aria-label="Menu principal"
        className={`hidden md:flex flex-col shrink-0 h-full bg-navy text-white z-topbar transition-[width] duration-200 ${recolhida ? 'w-16' : 'w-60'}`}
      >
        <Marca rail={recolhida} />
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
          {renderInicio('desktop')}
          {categories.map((cat, i) => renderGrupo(cat, 'desktop', i === 0))}
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
        <div className="md:hidden fixed inset-0 z-drawer bg-navy/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <aside
        aria-label="Menu principal"
        className={`md:hidden fixed top-0 left-0 h-full w-[280px] bg-navy text-white z-drawer shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
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
          {renderInicio('drawer')}
          {categories.map((cat, i) => renderGrupo(cat, 'drawer', i === 0))}
        </nav>
        <div className="relative shrink-0">
          {isAvatarMenuOpen && (
            <>
              <div className="fixed inset-0 z-dropdown" onClick={() => setIsAvatarMenuOpen(false)} />
              <div className="absolute left-3 right-3 bottom-full mb-2 z-dropdown">
                <UserDropdownContent
                  authUser={authUser}
                  onPerfilClick={() => { setIsAvatarMenuOpen(false); setCurrentView('perfil'); }}
                  onLogoutClick={() => { setIsAvatarMenuOpen(false); handleLogout(); }}
                  naoLidas={nav?.notificacoesNaoLidas}
                  onNotificacoesClick={() => nav?.abrirNotificacoes()}
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
            <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} size={36} badge={nav?.notificacoesNaoLidas} />
          </button>
        </div>
      </aside>
    </>
  );
};
