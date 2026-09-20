import React, { createContext, useContext } from 'react';
import { NavItem } from '../types';

export interface AuthUser {
  nome: string;
  perfil: 'admin' | 'user_medicos' | 'user_secretaria' | string;
}

export interface NavContextType {
  currentView: NavItem;
  setCurrentView: (view: NavItem) => void;
  authUser: AuthUser | null;
  handleLogout: () => void;
  periciaMenorVigentes: number;
}

export const NavContext = createContext<NavContextType | undefined>(undefined);

export const useNav = () => {
  return useContext(NavContext);
};
