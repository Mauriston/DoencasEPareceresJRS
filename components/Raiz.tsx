// Ficheiro: components/Raiz.tsx
// Único desvio entre o app autenticado (App) e as páginas públicas
// (AppPublico), decidido pela URL.
//
// O desvio mora AQUI, fora do App, de propósito: o App não precisou de
// nenhuma alteração para ganhar as rotas públicas, e as duas árvores nunca
// convivem — trocar de uma para a outra desmonta a anterior, em vez de
// embutir um ramo condicional no meio dos hooks do App (o número de hooks
// mudaria com a rota, o que o React não admite).
//
// O App é carregado sob demanda: quem abre uma página pública (ex.: #/publico/sobre)
// não baixa o app nem inicia o Firebase Auth (services/firebaseAuth.ts roda no import).
import React, { Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { AppPublico } from './publico/AppPublico';
import { ehRotaPublica } from '../config/routes';

const App = React.lazy(() => import('../App'));

export const Raiz: React.FC<{ handoffToken?: string | null }> = ({ handoffToken = null }) => {
  const { pathname } = useLocation();
  if (ehRotaPublica(pathname)) return <AppPublico />;
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-canvas" aria-busy="true" />}>
      <App handoffToken={handoffToken} />
    </Suspense>
  );
};
