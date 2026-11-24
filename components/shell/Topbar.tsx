// Ficheiro: components/shell/Topbar.tsx
// Topbar clara e única do app: trilha de navegação · busca global · menu do usuário.
// Desktop: a trilha completa; o título (h1) mora no PageHeader da página.
// Celular (auditoria v3, M9/4b): "‹" para o pai + o título da página como h1 (registrado pelo
// PageHeader via useTituloPagina — ver TituloPagina.tsx) · busca (ícone) · as ações da página
// (⋮ etc., que o PageHeader leva para o slot #topbar-acoes) · sino de notificações só na Início. O avatar/menu do usuário fica no rodapé do drawer (item "Menu" da
// barra inferior) — o ☰ e o avatar saíram da topbar do celular.
import React, { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { GlobalSearch } from './GlobalSearch';
import { UserMenu } from './UserMenu';
import { NavContext } from '../../context/NavContext';
import { TOPBAR_ACOES_ID } from '../ui/Page';

/** Sino de notificações do celular; some (CSS em app.css) quando o slot de ações da página tem conteúdo. */
const SinoNotificacoes: React.FC = () => {
  const nav = useContext(NavContext);
  const { pathname } = useLocation();
  // Só na Início: nas demais páginas o lugar é do ⋮ de ações (slot #topbar-acoes), quando a página tem ações.
  if (pathname !== '/' || !nav?.abrirNotificacoes) return null;
  const n = nav.notificacoesNaoLidas || 0;
  return (
    <button
      type="button" onClick={nav.abrirNotificacoes}
      aria-label={n ? `Notificações: ${n} não lidas` : 'Notificações'}
      className="topbar-sino md:hidden relative inline-flex items-center justify-center w-11 h-11 rounded-lg text-navy hover:bg-thead shrink-0"
    >
      <span className="material-symbols-outlined text-[24px]" aria-hidden="true">notifications</span>
      {n > 0 && <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-wine text-white text-xs font-bold leading-[18px] text-center ring-2 ring-white">{n > 99 ? '99+' : n}</span>}
    </button>
  );
};

interface TopbarProps {
  /** A página já rolou: a barra ganha a sombra de sobreposição. */
  rolou: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ rolou }) => (
  <header
    className={`relative z-topbar shrink-0 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-white border-b border-line flex items-center gap-2 md:gap-4 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] md:px-6 transition-shadow duration-200 ${rolou ? 'shadow-lg' : ''}`}
  >
    <Breadcrumbs className="flex-1" />
    <GlobalSearch className="md:w-56 xl:w-72 shrink-0" />
    <div id={TOPBAR_ACOES_ID} className="md:hidden flex items-center shrink-0" />
    <SinoNotificacoes />
    <div className="hidden md:block"><UserMenu /></div>
  </header>
);
