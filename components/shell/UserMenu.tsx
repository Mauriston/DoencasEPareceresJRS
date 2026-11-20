// Ficheiro: components/shell/UserMenu.tsx
// Avatar, rótulos de perfil e menu do usuário (Perfil / Notificações / Logout; as Configurações foram para Administração), extraídos do
// antigo Header para serem usados pela topbar, pela sidebar mobile e pelos
// modais que listam usuários.
import React, { useContext, useEffect, useState } from 'react';
import { NavContext } from '../../context/NavContext';
import { useTema, adotarTemaDoPerfil } from '../../hooks/useTema';
import { updateUsuarioProfile } from '../../services/firestoreUsuarios';
import { useUrlArquivo } from '../../services/arquivosStorage';
import { canAccessPage } from '../../config/permissions';
import { useChat } from '../chat/ChatContext';
import { chatPath } from '../../config/routes';

export const PERFIL_LABELS: Record<string, string> = {
  admin: 'Administrador',
  user_medicos: 'User Médicos',
  user_secretaria: 'User Secretaria',
  user_medicos_mpi: 'User Médicos MPI',
  user_medicos_geral: 'User Médicos Geral',
};

interface AvatarProps {
  nome?: string;
  imageProfile?: string;
  size?: number;
  /** "light": sobre fundo claro (topbar) · "dark": sobre navy (sidebar, modais). */
  tone?: 'light' | 'dark';
  /** Notificações não lidas: bolinha com o número no canto do avatar. */
  badge?: number;
  /** Texto acessível do badge (padrão: "N notificações não lidas"). */
  badgeRotulo?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ badge = 0, badgeRotulo, ...props }) => {
  if (!badge) return <AvatarImagem {...props} />;
  return (
    <span className="relative inline-flex shrink-0">
      <AvatarImagem {...props} />
      <span
        aria-label={badgeRotulo || `${badge} notificações não lidas`}
        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-wine text-white text-xs font-bold leading-[18px] text-center ring-2 ring-white"
      >
        {badge > 99 ? '99+' : badge}
      </span>
    </span>
  );
};

const AvatarImagem: React.FC<Omit<AvatarProps, 'badge' | 'badgeRotulo'>> = ({ nome, imageProfile, size = 32, tone = 'dark' }) => {
  const style = { width: size, height: size };
  const borda = tone === 'light' ? 'border border-line' : 'border border-white/30';
  // Foto do Storage via servidor do app (redes que bloqueiam o Storage); enquanto carrega, a inicial.
  const { src: foto } = useUrlArquivo(imageProfile);
  if (foto) {
    return <img src={foto} alt={nome || 'Usuário'} style={style} className={`rounded-full object-cover shrink-0 ${borda}`} />;
  }
  return (
    <div
      style={style}
      className={`rounded-full font-bold flex items-center justify-center shrink-0 uppercase ${borda} ${tone === 'light' ? 'bg-navy text-white' : 'bg-white/20 text-white'}`}
    >
      {nome ? nome.charAt(0) : <span className="material-symbols-outlined" style={{ fontSize: Math.max(18, Math.round(size * 0.6)) }} aria-hidden="true">person</span>}
    </div>
  );
};

interface UserDropdownContentProps {
  authUser: { nome?: string; imageProfile?: string; perfil?: string } | null;
  onPerfilClick: () => void;
  onLogoutClick: () => void;
  naoLidas?: number;
  onNotificacoesClick?: () => void;
  /** Perfil de verdade do usuário: só o Admin vê o item "Visualizar como". */
  perfilReal?: string;
  verComo?: string | null;
  onVerComo?: (perfil: string | null) => void;
}

const PERFIS_VISUALIZAVEIS = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria', 'user_medicos_geral'];

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
              className={`w-full text-left pl-11 pr-4 min-h-[40px] text-sm hover:bg-thead flex items-center gap-2 transition-colors ${atual === p ? 'font-bold text-navy' : 'text-ink'}`}
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

/** Item "Sobre o app" (auditoria v3, SB1): o que o app faz, área por área. Navega pelo NavContext (topbar e sidebar). */
const ItemSobre: React.FC = () => {
  const nav = useContext(NavContext);
  if (!nav || !canAccessPage('sobre', nav.authUser?.perfil)) return null;
  return (
    <button
      type="button" role="menuitem"
      onClick={() => { nav.setIsAvatarMenuOpen(false); nav.setIsMobileMenuOpen(false); nav.setCurrentView('sobre'); }}
      className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-ink hover:bg-thead flex items-center gap-2.5 transition-colors"
    >
      <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">info</span>
      <span>Sobre o app</span>
    </button>
  );
};

/** Item "Chat" (conversas entre usuários): só para quem pode enviar ou receber; badge com as não lidas. */
const ItemChat: React.FC = () => {
  const nav = useContext(NavContext);
  const chat = useChat();
  if (!nav || !chat?.ativo) return null;
  return (
    <button
      type="button" role="menuitem"
      onClick={() => { nav.setIsAvatarMenuOpen(false); nav.setIsMobileMenuOpen(false); nav.navigate(chatPath()); }}
      className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-ink hover:bg-thead flex items-center gap-2.5 transition-colors"
    >
      <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">forum</span>
      <span className="flex-1">Chat</span>
      {chat.naoLidas > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-wine text-white text-xs font-bold leading-5 text-center">{chat.naoLidas > 99 ? '99+' : chat.naoLidas}<span className="sr-only"> mensagens não lidas</span></span>}
    </button>
  );
};

/** Atalho lua/sol: alterna Claro ↔ Escuro sem abrir o perfil (a variante fica em Meu perfil → Aparência). */
const ItemTema: React.FC = () => {
  const nav = useContext(NavContext);
  const tema = useTema();
  const escuro = tema.efetivo === 'dark';
  return (
    <button
      type="button" role="menuitem"
      onClick={() => {
        const p = tema.alternar();
        if (nav?.authUser?.uid) updateUsuarioProfile(nav.authUser.uid, { aparencia: p }).catch(() => {});
      }}
      className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-ink hover:bg-thead flex items-center gap-2.5 transition-colors"
    >
      <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">{escuro ? 'light_mode' : 'dark_mode'}</span>
      <span>{escuro ? 'Tema claro' : 'Tema escuro'}</span>
    </button>
  );
};

export const UserDropdownContent: React.FC<UserDropdownContentProps> = ({ authUser, onPerfilClick, onLogoutClick, naoLidas = 0, onNotificacoesClick, perfilReal, verComo, onVerComo }) => (
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
      <ItemTema />
      <ItemChat />
      {onNotificacoesClick && (
        <button type="button" role="menuitem" onClick={onNotificacoesClick} className="w-full text-left px-4 min-h-[44px] text-sm font-semibold text-ink hover:bg-thead flex items-center gap-2.5 transition-colors">
          <span className="material-symbols-outlined text-[20px] text-navy" aria-hidden="true">notifications</span>
          <span className="flex-1">Notificações</span>
          {naoLidas > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-wine text-white text-xs font-bold leading-5 text-center">{naoLidas > 99 ? '99+' : naoLidas}</span>}
        </button>
      )}
      <ItemSobre />
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
  const chat = useChat();
  const authUser = nav?.authUser || null;
  const aberto = nav?.isAvatarMenuOpen || false;
  const setAberto = nav?.setIsAvatarMenuOpen || (() => {});
  // Preferência de tema salva no perfil vale neste aparelho se ele ainda não tem uma.
  useEffect(() => { adotarTemaDoPerfil(authUser?.aparencia); }, [authUser?.aparencia]);

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
        <Avatar nome={authUser?.nome} imageProfile={authUser?.imageProfile} tone="light" badge={(nav?.notificacoesNaoLidas || 0) + (chat?.naoLidas || 0)} badgeRotulo={chat?.naoLidas ? `${nav?.notificacoesNaoLidas || 0} notificações e ${chat.naoLidas} mensagens do chat não lidas` : undefined} />
        <span className="hidden md:flex flex-col items-start leading-tight text-left">
          <span className="text-xs font-bold text-navy truncate max-w-[140px]">{authUser?.usuario || 'Usuário'}</span>
          <span className={`text-xs truncate max-w-[140px] ${nav?.verComo ? 'font-bold text-wine' : 'text-ink-3'}`}>{nav?.verComo ? `Vendo como ${PERFIL_LABELS[nav.verComo] || nav.verComo}` : (authUser?.cargo || ' ')}</span>
        </span>
      </button>
      {aberto && (
        <>
          <div className="fixed inset-0 z-dropdown" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-12 z-dropdown">
            <UserDropdownContent
              authUser={authUser}
              onPerfilClick={() => { setAberto(false); nav?.setCurrentView('perfil'); }}
              onLogoutClick={() => { setAberto(false); nav?.handleLogout(); }}
              naoLidas={nav?.notificacoesNaoLidas}
              onNotificacoesClick={nav?.abrirNotificacoes}
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
