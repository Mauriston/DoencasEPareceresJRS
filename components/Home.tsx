import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { NavContext, getPrimeiroNome } from '../context/NavContext';
import { getNavCategories, NavCategory } from '../config/navigation';
import { useIsDesktop } from '../hooks/useIsDesktop';

export const Home: React.FC = () => {
  const nav = useContext(NavContext);
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;

  const categories = getNavCategories(authUser?.perfil, periciaMenorVigentes);
  const primeiroNome = getPrimeiroNome(authUser);
  const isDesktop = useIsDesktop();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // No mobile não há painel de subitens (item 10 é desktop-only): garante
  // que a seleção não fique "presa" se a janela encolher.
  useEffect(() => {
    if (!isDesktop) setSelectedId(null);
  }, [isDesktop]);

  const selectedCategory: NavCategory | null = categories.find(c => c.id === selectedId) || null;

  const handleCardClick = (cat: NavCategory) => {
    if (isDesktop && cat.subitems.length > 1) {
      setSelectedId(prev => (prev === cat.id ? null : cat.id));
      return;
    }
    setCurrentView(cat.subitems[0].id);
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      <Header title="JRS/HNRe" desktopTitle="Hospital Naval de Recife - Junta Regular de Saúde" />

      <div className="p-4 sm:p-6 lg:p-8 w-full flex-1">
        <div className="mb-6">
          <h1 className="font-heading text-xl sm:text-2xl font-bold text-[#050F41]">
            Olá, {primeiroNome || 'Perito'}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCategory ? `Escolha uma opção de ${selectedCategory.label}` : 'O que pretende fazer agora?'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
          <div
            className={`grid w-full gap-3 sm:gap-4 ${
              selectedCategory ? 'grid-cols-1 md:w-60 md:shrink-0' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {categories.map(cat => {
              const badge = cat.subitems.reduce((acc, s) => acc + (s.badge || 0), 0);
              const isSelected = selectedCategory?.id === cat.id;
              const isDimmed = !!selectedCategory && !isSelected;

              return (
                <motion.button
                  key={cat.id}
                  layout
                  transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 1 }}
                  type="button"
                  onClick={() => handleCardClick(cat)}
                  className={`relative flex rounded-2xl shadow-sm transition-colors duration-700 text-left ${
                    selectedCategory ? 'flex-row items-center gap-2.5 py-3.5 px-4' : 'flex-col gap-1.5 py-4 px-4 md:py-5 md:px-5'
                  } ${
                    isDimmed
                      ? 'bg-gray-200 text-gray-400 hover:bg-gray-200'
                      : 'bg-[#079551] hover:bg-[#067a43] active:bg-[#056635] text-white hover:shadow-md'
                  }`}
                >
                  {badge > 0 ? (
                    <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white/30">
                      {badge}
                    </span>
                  ) : null}
                  <span className={`flex items-center gap-2.5 ${selectedCategory ? '' : 'w-full'}`}>
                    <span className={`material-symbols-outlined shrink-0 ${selectedCategory ? 'text-[22px] md:text-[24px]' : 'text-[26px] md:text-[34px]'}`}>
                      {cat.icon}
                    </span>
                    <span className={`font-bold leading-tight ${selectedCategory ? 'text-sm md:text-base' : 'text-sm sm:text-base md:text-lg'}`}>
                      {cat.label}
                    </span>
                  </span>
                  {!selectedCategory && (
                    <span className="text-[11px] sm:text-xs md:text-sm font-medium leading-snug text-white/85">
                      {cat.subtitle}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {selectedCategory && (
              <motion.div
                key={selectedCategory.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.55, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full flex-1"
              >
                {selectedCategory.subitems.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setCurrentView(sub.id)}
                    className="relative flex flex-col gap-1.5 bg-white hover:bg-gray-50 active:bg-gray-100 text-[#050F41] rounded-2xl shadow-sm hover:shadow-md border border-gray-200/60 transition-all py-4 px-4 md:py-5 md:px-5 text-left"
                  >
                    {sub.badge ? (
                      <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-white">
                        {sub.badge}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-2.5 w-full">
                      <span className="material-symbols-outlined text-[24px] md:text-[30px] text-[#079551] shrink-0">{sub.icon}</span>
                      <span className="text-sm sm:text-base md:text-lg font-bold leading-tight">{sub.label}</span>
                    </span>
                    <span className="text-[11px] sm:text-xs md:text-sm font-medium leading-snug text-gray-500">
                      {sub.subtitle}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
