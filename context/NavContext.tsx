import React, { createContext, useContext } from 'react';
import { NavItem } from '../types';

export interface AuthUser {
  uid: string;
  usuario: string;
  nome: string;
  perfil: 'admin' | 'user_medicos' | 'user_secretaria' | 'user_medicos_mpi' | string;
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
  pwaTutorialConcluido?: boolean;
}

export interface NavContextType {
  currentView: NavItem;
  /** Navega para a página (rota base). Mantido pela API original — agora muda a URL. */
  setCurrentView: (view: NavItem) => void;
  /** Navega para qualquer rota do app (subníveis com parâmetros). */
  navigate: (to: string, opcoes?: { replace?: boolean }) => void;
  /** Usuário logado. Com o Admin em "ver como", `perfil` é o perfil visualizado (a identidade é a do próprio Admin). */
  authUser: AuthUser | null;
  /** Perfil de verdade do usuário logado (não muda com o "ver como"). */
  perfilReal?: string;
  /** Perfil que o Admin está apenas visualizando; null = vendo como ele mesmo. */
  verComo: string | null;
  setVerComo: (perfil: string | null) => void;
  /** Avisos não bloqueantes mostrados na Início (antes eram diálogos em sequência no login). */
  avisos: { casosPendente: boolean; pwaPendente: boolean };
  /** Abre o tutorial (celular) ou o QR code (desktop) de instalação do app. */
  abrirInstalacaoApp: () => void;
  updateAuthUser: (patch: Partial<AuthUser>) => void;
  handleLogout: () => void;
  periciaMenorVigentes: number;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isAvatarMenuOpen: boolean;
  setIsAvatarMenuOpen: (open: boolean) => void;
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
