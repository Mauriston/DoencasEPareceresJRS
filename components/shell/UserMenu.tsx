// Ficheiro: components/shell/UserMenu.tsx
// Avatar, rótulos de perfil e menu do usuário (Perfil / Logout), extraídos do
// antigo Header para serem usados pela topbar, pela sidebar mobile e pelos
// modais que listam usuários.
import React, { useContext, useState } from 'react';
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
  /** Perfil de verdade do usuário: só o Admin vê o item "Visualizar como". */
  perfilReal?: string;
  verComo?: string | null;
  onVerComo?: (perfil: string | null) => void;
}

const PERFIS_VISUALIZAVEIS = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'];

/** Item exclusivo do Admin: troca só a visualização do app (não altera o perfil de fato). Sempre visível para o Admin. */
const VisualizarComo: React.FC<{ atual: string; onEscolher: (perfil: string | null) => void }> = ({ atual, onEscolher }) => {
  const [aberto, setAberto] = useState(false);
  return (
    <div>
      <button type="button" role="menuitem" aria-expanded={aberto} onClick={() => setAberto(a => !a)} className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-ink hover:bg-thead flex items-center gap-2.5 transition-colors">
        <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">visibility</span>
        <span className="flex-1">Visualizar como</span>
        <span className="material-symbols-outlined text-[18px] text-ink-3" aria-hidden="true">{aberto ? 'expand_less' : 'expand_more'}</span>
      </button>
      {aberto && (
        <div role="group" aria-label="Perfil a visualizar" className="pb-1">
          {PERFIS_VISUALIZAVEIS.map(p => (
            <button
              key={p} type="button" role="menuitemradio" aria-checked={atual === p}
              onClick={() => onEscolher(p === 'admin' ? null : p)}
              className={`w-full text-left pl-11 pr-4 min-h-[40px] text-sm hover:bg-thead flex items-center gap-2 transition-colors ${atual === p ? 'font-bold text-navy' : 'text-ink-2'}`}
            >
              <span className="flex-1">{PERFIL_LABELS[p]}</span>
              {atual === p && <span className="material-symbols-outlined text-[18px] text-green-700" aria-hidden="true">check</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const UserDropdownContent: React.FC<UserDropdownContentProps> = ({ authUser, onPerfilClick, onLogoutClick, perfilReal, verComo, onVerComo }) => (
  <div role="menu" className="w-60 bg-white text-ink rounded-xl shadow-lg border border-line py-1.5 animate-fade-in divide-y divide-line">
    <div className="px-4 py-2.5 flex items-center gap-2.5">
      <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} size={36} tone="light" />
      <div className="min-w-0">
        <p className="text-sm font-bold text-navy truncate">{authUser?.nome || 'Usuário'}</p>
        <p className="text-xs font-semibold text-ink-3 truncate">{verComo ? `Vendo como ${PERFIL_LABELS[verComo] || verComo}` : (PERFIL_LABELS[authUser?.perfil || ''] || authUser?.perfil || 'perfil')}</p>
      </div>
    </div>
    <div className="py-1">
      <button type="button" role="menuitem" onClick={onPerfilClick} className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-ink hover:bg-thead flex items-center gap-2.5 transition-colors">
        <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">account_circle</span>
        <span>Perfil</span>
      </button>
      {perfilReal === 'admin' && onVerComo && <VisualizarComo atual={verComo || 'admin'} onEscolher={onVerComo} />}
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
          <span className={`text-xs truncate max-w-[140px] ${nav?.verComo ? 'font-bold text-wine' : 'text-ink-3'}`}>{nav?.verComo ? `Vendo como ${PERFIL_LABELS[nav.verComo] || nav.verComo}` : (authUser?.cargo || ' ')}</span>
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
              perfilReal={nav?.perfilReal}
              verComo={nav?.verComo}
              onVerComo={perfil => { setAberto(false); nav?.setVerComo(perfil); }}
            />
          </div>
        </>
      )}
    </div>
  );
};
