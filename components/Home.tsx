import React, { useContext } from 'react';
import { Header } from './Header';
import { NavContext, getPrimeiroNome } from '../context/NavContext';
import { getNavEntries } from '../config/navigation';

export const Home: React.FC = () => {
  const nav = useContext(NavContext);
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;

  const entries = getNavEntries(authUser?.perfil, periciaMenorVigentes);
  const primeiroNome = getPrimeiroNome(authUser);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      <Header title="Hospital Naval de Recife - Junta Regular de Saúde" />

      <div className="p-4 sm:p-6 lg:p-8 w-full flex-1">
        <div className="mb-6">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#050F41]">
            Olá, {primeiroNome || 'Perito'}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">O que pretende fazer agora?</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {entries.map(entry => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setCurrentView(entry.id)}
              className="relative flex flex-col items-center justify-center gap-2.5 bg-[#079551] hover:bg-[#067a43] active:bg-[#056635] text-white rounded-2xl shadow-sm hover:shadow-md transition-all py-6 px-3 text-center"
            >
              {entry.badge ? (
                <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white/30">
                  {entry.badge}
                </span>
              ) : null}
              <span className="material-symbols-outlined text-[28px]">{entry.icon}</span>
              <span className="text-xs sm:text-sm font-bold leading-tight">{entry.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
