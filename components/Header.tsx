import React, { useEffect, useState, useContext } from 'react';
import { NavContext } from '../context/NavContext';
import { getNavCategories, findCategoryForView } from '../config/navigation';

export interface HeaderProps {
  title?: string;
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

export const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction, onBack }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const nav = useContext(NavContext);
  const currentView = nav?.currentView;
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const handleLogout = nav?.handleLogout || (() => {});
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goHome = () => setCurrentView('home');

  const categories = getNavCategories(authUser?.perfil, periciaMenorVigentes);
  const activeCategory = currentView ? findCategoryForView(categories, currentView) : undefined;
  const showAccessoryBar = !!activeCategory && activeCategory.subitems.length > 1;

  return (
    <>
    <header
      className={`w-full sticky top-0 z-40 h-[56px] flex items-center justify-between transition-all duration-300 bg-[#050F41] text-white shadow-sm border-b border-white/10 shrink-0 ${
        isScrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="w-full flex items-center justify-between px-4 md:px-8 h-full relative">

        {/* MOBILE LEFT: BACK OR HOME BUTTON (desktop usa o logo da Sidebar) */}
        <div className="flex md:hidden items-center justify-start min-w-[48px]">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
              aria-label="Voltar"
            >
              <span className="material-symbols-outlined text-[24px]">chevron_left</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={goHome}
              className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
              aria-label="Página Inicial"
            >
              <span className="material-symbols-outlined text-[24px]">home</span>
            </button>
          )}
          {leftAction}
        </div>

        {/* CENTER: PAGE TITLE (sempre centralizado na topbar, independente dos lados) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[60%] text-center px-2 font-heading text-sm md:text-base font-bold tracking-wide truncate text-white uppercase pointer-events-none">
          {title}
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

    {showAccessoryBar && (
      <div className="w-full sticky top-[56px] z-30 bg-white border-b border-gray-200 shadow-xs shrink-0">
        <div className="flex items-center gap-1 px-4 md:px-8 h-11">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#050F41] transition-colors shrink-0"
            aria-label="Página Inicial"
            title="Página Inicial"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>

          <div className="flex items-center gap-1 ml-auto overflow-x-auto min-w-0">
            {activeCategory!.subitems.map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setCurrentView(sub.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
                  currentView === sub.id ? 'bg-[#050F41] text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{sub.icon}</span>
                <span>{sub.label}</span>
                {sub.badge ? (
                  <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
                    {sub.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}
    </>
  );
};
