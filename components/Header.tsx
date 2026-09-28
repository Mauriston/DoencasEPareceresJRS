import React, { useEffect, useState, useContext } from 'react';
import { NavContext } from '../context/NavContext';

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
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const handleLogout = nav?.handleLogout || (() => {});

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goHome = () => setCurrentView('home');

  return (
    <header
      className={`w-full sticky top-0 z-40 h-[56px] flex items-center justify-between transition-all duration-300 bg-[#050F41] text-white shadow-sm border-b border-white/10 shrink-0 ${
        isScrolled ? 'shadow-md' : ''
      }`}
    >
      <div className="w-full flex items-center justify-between px-4 md:px-8 h-full relative">

        {/* DESKTOP LEFT: LOGO ICON */}
        <div className="hidden md:flex items-center shrink-0 min-w-[48px]">
          <div
            className="w-8 h-8 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={goHome}
            title="Página Inicial"
          >
            <img src="https://i.imgur.com/KUbQz08.png" alt="HNRe Logo" className="h-full w-full object-contain" />
          </div>
        </div>

        {/* MOBILE LEFT: BACK OR HOME BUTTON */}
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

        {/* CENTER: PAGE TITLE (sempre centralizado) */}
        <div className="flex-1 text-center px-2 font-heading text-sm md:text-base font-bold tracking-wide truncate text-white uppercase">
          {title}
        </div>

        {/* RIGHT: CUSTOM ACTION & USER AVATAR */}
        <div className="flex items-center justify-end space-x-2 min-w-[48px]">
          {rightAction}

          <div className="relative flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setIsAvatarMenuOpen(!isAvatarMenuOpen)}
              className="rounded-full hover:opacity-90 transition-all shadow-sm focus:outline-none active:scale-95 cursor-pointer"
              aria-label="Menu do usuário"
              title={authUser?.nome || 'Usuário'}
            >
              <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} />
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
  );
};
