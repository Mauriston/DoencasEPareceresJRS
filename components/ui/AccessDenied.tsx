// Ficheiro: components/ui/AccessDenied.tsx
// Estado explícito de "acesso negado": antes, quem abria uma página sem
// permissão era desviado em silêncio para "Doenças de Lei". Agora vê o motivo
// e o caminho para pedir a liberação.
import React, { useContext } from 'react';
import { NavContext } from '../../context/NavContext';
import { Header, PERFIL_LABELS } from '../Header';
import { Button } from './Button';

interface AccessDeniedProps {
  /** Nome da página que o usuário tentou abrir (ex.: "Pareceres"). */
  pagina?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ pagina }) => {
  const nav = useContext(NavContext);
  const perfil = nav?.authUser?.perfil;
  const perfilLabel = PERFIL_LABELS[perfil || ''] || perfil || 'seu perfil';

  return (
    <div className="flex flex-col h-full bg-canvas">
      <Header title="Acesso negado" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div role="alert" className="bg-white rounded-xl border border-line p-8 w-full max-w-md text-center space-y-4">
          <span className="material-symbols-outlined text-[40px] text-wine" aria-hidden="true">lock</span>
          <h1 className="font-heading font-extrabold text-xl text-navy">Acesso não autorizado</h1>
          <p className="text-sm text-ink leading-relaxed">
            {pagina ? <>A página <strong className="text-navy">{pagina}</strong> não está liberada para o perfil <strong className="text-navy">{perfilLabel}</strong>.</> : <>Esta página não está liberada para o perfil <strong className="text-navy">{perfilLabel}</strong>.</>}
            {' '}Se precisar de acesso, solicite a liberação ao administrador do sistema.
          </p>
          <Button icon="home" onClick={() => nav?.setCurrentView('home')}>Ir para a Página Inicial</Button>
        </div>
      </div>
    </div>
  );
};
