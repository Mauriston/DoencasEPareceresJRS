import React, { useEffect, useState, useContext } from 'react';
import { NavContext } from '../context/NavContext';
import { getNavCategories, findCategoryForView } from '../config/navigation';

export interface HeaderProps {
  title?: string;
  desktopTitle?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

const PERFIL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  user_medicos: 'User Médicos',
  user_secretaria: 'User Secretaria',
};

const Avatar: React.FC<{ nome?: string; imageProfile?: string; size?: number }> = ({ nome, imageProfile, size = 32 }) => {
  const style = { width: size, height: size };
  if (imageProfile) {
    return (
      <img
        src={imageProfile}
        alt={nome || 'Usuário'}
        style={style}
        className="rounded-full object-cover border border-white/30 shrink-0"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full bg-white/20 text-white font-bold flex items-center justify-center border border-white/30 shrink-0 uppercase"
    >
      {nome ? (
        nome.charAt(0)
      ) : (
        <span className="material-symbols-outlined text-[18px]">person</span>
      )}
    </div>
  );
};

export const Header: React.FC<HeaderProps> = ({ title, desktopTitle, leftAction, rightAction, onBack }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const nav = useContext(NavContext);
  const currentView = nav?.currentView;
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const handleLogout = nav?.handleLogout || (() => {});
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;
  const setIsMobileMenuOpen = nav?.setIsMobileMenuOpen || (() => {});

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = getNavCategories(authUser?.perfil, periciaMenorVigentes);
  const activeCategory = currentView ? findCategoryForView(categories, currentView) : undefined;
  const activeSubitem = activeCategory?.subitems.find(s => s.id === currentView);

  // Desktop: "{categoria} - {subitem}" quando a página pertence a um menu
  // principal; a própria página pode sobrepor isso passando "desktopTitle"
  // explicitamente (ex.: título dinâmico de uma subpágina, como o nome do
  // concurso selecionado em Concursos); sem "desktopTitle", cai para
  // "categoryTitle" e por fim para "title".
  const categoryTitle = activeCategory && activeSubitem
    ? (activeSubitem.label === activeCategory.label
        ? activeCategory.label
        : `${activeCategory.label} - ${activeSubitem.label}`)
    : undefined;
  const resolvedDesktopTitle = desktopTitle ?? categoryTitle ?? title;

  return (
    <>
    <header
      className={`w-full sticky top-0 z-40 h-[56px] flex items-center justify-between transition-all duration-300 bg-[#050F41] text-white shadow-sm border-b border-white/10 shrink-0 ${
        isScrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="w-full flex items-center justify-between px-4 md:px-8 h-full relative">

        {/* MOBILE LEFT: HAMBURGER (o botão de voltar fica abaixo da topbar) */}
        <div className="flex md:hidden items-center justify-start min-w-[48px]">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
            aria-label="Abrir menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          {leftAction}
        </div>

        {/* CENTER: PAGE TITLE (sempre centralizado na topbar, independente dos lados) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[60%] text-center px-2 font-heading text-sm md:text-base font-bold tracking-wide truncate text-white uppercase pointer-events-none">
          <span className="md:hidden">{title}</span>
          <span className="hidden md:inline">{resolvedDesktopTitle}</span>
        </div>

        {/* RIGHT: CUSTOM ACTION & USER BUTTON */}
        <div className="ml-auto flex items-center justify-end space-x-2 min-w-[48px]">
          {rightAction}

          <div className="relative flex items-center shrink-0">
            {/* Botão do usuário — compacto no mobile, com foto + usuário + cargo no desktop */}
            <button
              type="button"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
              className="flex md:hidden rounded-full hover:opacity-90 transition-all shadow-sm focus:outline-none active:scale-95 cursor-pointer"
              aria-label="Menu do usuário"
              title={authUser?.usuario || 'Usuário'}
            >
              <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} />
            </button>

            <button
              type="button"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
              className="hidden md:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-all focus:outline-none active:scale-[0.98] cursor-pointer"
              aria-label="Menu do usuário"
            >
              <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-xs font-bold text-white truncate max-w-[140px]">{authUser?.usuario || 'Usuário'}</span>
                <span className="text-[10px] font-medium text-gray-300 truncate max-w-[140px]">{authUser?.cargo || ' '}</span>
              </span>
            </button>

            {isAvatarMenuOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsAvatarMenuOpen(false)} />
                <div className="absolute right-0 top-11 w-56 bg-white text-gray-800 rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fade-in divide-y divide-gray-100">
                  <div className="px-4 py-2.5 flex items-center space-x-2.5">
                    <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} size={36} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#050F41] truncate">{authUser?.nome || 'Usuário'}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider truncate">
                        {PERFIL_LABELS[authUser?.perfil || ''] || authUser?.perfil || 'perfil'}
                      </p>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => { setIsAvatarMenuOpen(false); setCurrentView('perfil'); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-[#050F41]">account_circle</span>
                      <span>Perfil</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsAvatarMenuOpen(false); handleLogout(); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px] text-red-500">logout</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Botão de voltar à página anterior: canto superior esquerdo, logo
        abaixo da topbar, em todas as subpáginas (quando onBack é fornecido). */}
    {onBack && (
      <div className="w-full sticky top-[56px] z-30 px-4 md:px-8 pt-3 pointer-events-none shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto flex items-center justify-center w-9 h-9 rounded-full bg-white text-[#050F41] shadow-md border border-gray-200/70 hover:bg-gray-50 active:scale-95 transition-all"
          aria-label="Voltar"
          title="Voltar"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
      </div>
    )}
    </>
  );
};
