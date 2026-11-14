// Ficheiro: components/shell/Topbar.tsx
// Topbar clara e única do app: trilha de navegação · busca global · menu do usuário.
// Desktop: a trilha completa; o título (h1) mora no PageHeader da página.
// Celular (auditoria v3, M9/4b): "‹" para o pai + o título da página como h1 (registrado pelo
// PageHeader via useTituloPagina — ver TituloPagina.tsx). O menu (drawer) abre pelo item
// "Menu" da barra inferior (BarraInferior.tsx), que fica sob o polegar — o ☰ da topbar saiu.
import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { GlobalSearch } from './GlobalSearch';
import { UserMenu } from './UserMenu';

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
    <UserMenu />
  </header>
);
