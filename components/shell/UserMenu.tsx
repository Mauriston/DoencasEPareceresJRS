// Ficheiro: components/shell/UserMenu.tsx
// Avatar, rótulos de perfil e menu do usuário (Perfil / Logout), extraídos do
// antigo Header para serem usados pela topbar, pela sidebar mobile e pelos
// modais que listam usuários.
import React, { useContext } from 'react';
import { NavContext } from '../../context/NavContext';

export const PERFIL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  user_medicos: 'User Médicos',
  user_secretaria: 'User Secretaria',
  user_medicos_mpi: 'User Médicos MPI',
};

interface AvatarProps {
  nome?: string;
  imageProfile?: string;
  size?: number;
  /** "light": sobre fundo claro (topbar) · "dark": sobre navy (sidebar, modais). */
  tone?: 'light' | 'dark';
}

export const Avatar: React.FC<AvatarProps> = ({ nome, imageProfile, size = 32, tone = 'dark' }) => {
  const style = { width: size, height: size };
  const borda = tone === 'light' ? 'border border-line' : 'border border-white/30';
  if (imageProfile) {
    return <img src={imageProfile} alt={nome || 'Usuário'} style={style} className={`rounded-full object-cover shrink-0 ${borda}`} />;
  }
  return (
    <div
      style={style}
      className={`rounded-full font-bold flex items-center justify-center shrink-0 uppercase ${borda} ${tone === 'light' ? 'bg-navy text-white' : 'bg-white/20 text-white'}`}
    >
      {nome ? nome.charAt(0) : <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person</span>}
    </div>
  );
};

interface UserDropdownContentProps {
  authUser: { nome?: string; imageProfile?: string; perfil?: string } | null;
  onPerfilClick: () => void;
  onLogoutClick: () => void;
}

export const UserDropdownContent: React.FC<UserDropdownContentProps> = ({ authUser, onPerfilClick, onLogoutClick }) => (
  <div role="menu" className="w-60 bg-white text-ink rounded-xl shadow-lg border border-line py-1.5 animate-fade-in divide-y divide-line">
    <div className="px-4 py-2.5 flex items-center gap-2.5">
      <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} size={36} tone="light" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-navy truncate">{authUser?.nome || 'Usuário'}</p>
        <p className="text-xs font-semibold text-ink-3 truncate">{PERFIL_LABELS[authUser?.perfil || ''] || authUser?.perfil || 'perfil'}</p>
      </div>
    </div>
    <div className="py-1">
      <button type="button" role="menuitem" onClick={onPerfilClick} className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-ink hover:bg-thead flex items-center gap-2.5 transition-colors">
        <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">account_circle</span>
        <span>Perfil</span>
      </button>
      <button type="button" role="menuitem" onClick={onLogoutClick} className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-wine hover:bg-wine/10 flex items-center gap-2.5 transition-colors">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
        <span>Sair</span>
      </button>
    </div>
  </div>
);

/** Botão do usuário na topbar (desktop mostra nome e cargo; mobile só o avatar). */
export const UserMenu: React.FC = () => {
  const nav = useContext(NavContext);
  const authUser = nav?.authUser || null;
  const aberto = nav?.isAvatarMenuOpen || false;
  const setAberto = nav?.setIsAvatarMenuOpen || (() => {});

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu do usuário"
        className="flex items-center gap-2 pl-1 pr-1 md:pr-3 py-1 rounded-full hover:bg-thead transition-colors"
      >
        <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} tone="light" />
        <span className="hidden md:flex flex-col items-start leading-tight text-left">
          <span className="text-xs font-bold text-navy truncate max-w-[140px]">{authUser?.usuario || 'Usuário'}</span>
          <span className="text-xs text-ink-3 truncate max-w-[140px]">{authUser?.cargo || ' '}</span>
        </span>
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-12 z-50">
            <UserDropdownContent
              authUser={authUser}
              onPerfilClick={() => { setAberto(false); nav?.setCurrentView('perfil'); }}
              onLogoutClick={() => { setAberto(false); nav?.handleLogout(); }}
            />
          </div>
        </>
      )}
    </div>
  );
};
