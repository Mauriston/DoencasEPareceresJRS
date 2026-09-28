import React, { createContext, useContext } from 'react';
import { NavItem } from '../types';

export interface AuthUser {
  uid: string;
  usuario: string;
  nome: string;
  perfil: 'admin' | 'user_medicos' | 'user_secretaria' | string;
  postoGraduacao?: string;
  cargo?: string;
  nip?: string;
  crmPe?: string;
  rqe?: string;
  email?: string;
  gmail?: string;
  celular?: string;
  imageProfile?: string;
  senhaTemporaria?: boolean;
}

export interface NavContextType {
  currentView: NavItem;
  setCurrentView: (view: NavItem) => void;
  authUser: AuthUser | null;
  updateAuthUser: (patch: Partial<AuthUser>) => void;
  handleLogout: () => void;
  periciaMenorVigentes: number;
}

export const NavContext = createContext<NavContextType | undefined>(undefined);

export const useNav = () => {
  return useContext(NavContext);
};

/**
 * Extrai o primeiro nome (sem o posto/graduação) a partir do "usuario" (Ex.: login).
 * Ex.: "CT MAURISTON" -> "Mauriston" | "2T CASSUNDÉ" -> "Cassundé" | "1SG-EF DAYVISON" -> "Dayvison".
 */
export const getPrimeiroNome = (authUser: AuthUser | null): string => {
  if (!authUser) return '';
  const fonte = (authUser.usuario || authUser.nome || '').trim();
  const partes = fonte.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  const nomeBase = partes.length > 1 ? partes[1] : partes[0];
  return nomeBase.charAt(0).toUpperCase() + nomeBase.slice(1).toLowerCase();
};
