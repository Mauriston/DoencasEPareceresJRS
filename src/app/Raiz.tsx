// Ficheiro: components/Raiz.tsx
// Único desvio entre o app autenticado (App) e as páginas públicas
// (AppPublico), decidido pela URL.
//
// O desvio mora AQUI, fora do App, de propósito: o App não precisou de
// nenhuma alteração para ganhar as rotas públicas, e as duas árvores nunca
// convivem — trocar de uma para a outra desmonta a anterior, em vez de
// embutir um ramo condicional no meio dos hooks do App (o número de hooks
// mudaria com a rota, o que o React não admite).
import React from 'react';
import { useLocation } from 'react-router-dom';
import App from './App';
import { AppPublico } from '@/components/publico/AppPublico';
import { ehRotaPublica } from '@/config/routes';

export const Raiz: React.FC<{ handoffToken?: string | null }> = ({ handoffToken = null }) => {
  const { pathname } = useLocation();
  return ehRotaPublica(pathname) ? <AppPublico /> : <App handoffToken={handoffToken} />;
};
