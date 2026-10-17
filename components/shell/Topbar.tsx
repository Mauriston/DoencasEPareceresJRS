// Ficheiro: components/shell/Topbar.tsx
// Topbar clara e única do app: menu (celular) · trilha de navegação · busca
// global · menu do usuário. O título da página NÃO fica aqui — mora no
// PageHeader da própria página (antes era repetido na topbar e no H2).
import React, { useContext } from 'react';
import { NavContext } from '../../context/NavContext';
import { Breadcrumbs } from './Breadcrumbs';
import { GlobalSearch } from './GlobalSearch';
import { UserMenu } from './UserMenu';

interface TopbarProps {
  /** A página já rolou: a barra ganha a sombra de sobreposição. */
  rolou: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ rolou }) => {
  const nav = useContext(NavContext);
  return (
    <header
      className={`relative z-30 shrink-0 h-14 bg-white border-b border-line flex items-center gap-2 md:gap-4 px-2 md:px-6 transition-shadow duration-200 ${rolou ? 'shadow-lg' : ''}`}
    >
      <button
        type="button"
        onClick={() => nav?.setIsMobileMenuOpen(true)}
        aria-label="Abrir menu"
        className="md:hidden w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead shrink-0"
      >
        <span className="material-symbols-outlined text-[24px]" aria-hidden="true">menu</span>
      </button>
      <Breadcrumbs className="flex-1" />
      <GlobalSearch className="md:w-56 xl:w-72 shrink-0" />
      <UserMenu />
    </header>
  );
};
