import React, { useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { NavContext, getPrimeiroNome } from '../context/NavContext';
import { getNavCategories, NavCategory } from '../config/navigation';
import { observarConcursos } from '../services/firestoreConcursos';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { StatusTag } from './ui/StatusTag';

export const Home: React.FC = () => {
  const nav = useContext(NavContext);
  const setCurrentView = nav?.setCurrentView || (() => {});
  const authUser = nav?.authUser || null;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;
  const isDesktop = useIsDesktop();

  const categories = getNavCategories(authUser?.perfil, periciaMenorVigentes, isDesktop);
  const primeiroNome = getPrimeiroNome(authUser);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [temConcursoEmAndamento, setTemConcursoEmAndamento] = useState(false);

  useEffect(() => observarConcursos(
    lista => setTemConcursoEmAndamento(lista.some(c => c.status === 'em_andamento')),
    () => { /* silencioso: não bloqueia a Home se a checagem falhar */ },
  ), []);

  const selectedCategory: NavCategory | null = categories.find(c => c.id === selectedId) || null;

  // Categorias com mais de um subitem mostram os cards de subitem (mobile e
  // desktop); no desktop os cards principais também se reorganizam numa
  // coluna à esquerda (motion), no mobile eles simplesmente somem, sem
  // precisar reagrupar.
  const handleCardClick = (cat: NavCategory) => {
    if (cat.subitems.length > 1) {
      setSelectedId(prev => (prev === cat.id ? null : cat.id));
      return;
    }
    setCurrentView(cat.subitems[0].id);
  };

  return (
    <div className="flex flex-col h-full bg-canvas animate-fade-in">
      <Header title="JRS/HNRe" desktopTitle="Hospital Naval de Recife - Junta Regular de Saúde" />

      <div className="p-4 sm:p-6 lg:p-8 w-full flex-1">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-extrabold text-navy">
            Olá, {primeiroNome || 'Perito'}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {selectedCategory ? `Escolha uma opção de ${selectedCategory.label}` : 'O que pretende fazer agora?'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-6">
          <div
            className={`w-full gap-3 sm:gap-4 ${
              selectedCategory ? 'hidden md:grid md:grid-cols-1 md:w-60 md:shrink-0' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {categories.map(cat => {
              const badge = cat.subitems.reduce((acc, s) => acc + (s.badge || 0), 0);
              const isSelected = selectedCategory?.id === cat.id;
              const isDimmed = !!selectedCategory && !isSelected;
              const isConcursosEmAndamento = cat.id === 'concursos' && temConcursoEmAndamento;

              return (
                <motion.button
                  key={cat.id}
                  layout
                  transition={{ type: 'spring', stiffness: 90, damping: 22, mass: 1 }}
                  type="button"
                  onClick={() => handleCardClick(cat)}
                  className={`relative flex rounded-xl border transition-colors duration-300 text-left ${
                    selectedCategory ? 'flex-row items-center gap-2.5 py-3.5 px-4' : 'flex-col gap-1.5 py-4 px-4 md:py-5 md:px-5'
                  } ${
                    isDimmed
                      ? 'bg-thead border-line text-ink-3 hover:border-navy'
                      : 'bg-white border-line text-navy hover:border-navy active:bg-thead'
                  }`}
                >
                  {badge > 0 ? (
                    <span className="absolute top-2.5 right-2.5 bg-wine text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                      {badge}
                    </span>
                  ) : null}
                  <span className={`flex items-center gap-2.5 ${selectedCategory ? '' : 'w-full'}`}>
                    <span className={`material-symbols-outlined shrink-0 text-navy ${selectedCategory ? 'text-[22px] md:text-[24px]' : 'text-[26px] md:text-[34px]'}`} aria-hidden="true">
                      {cat.icon}
                    </span>
                    <span className={`font-bold leading-tight ${selectedCategory ? 'text-base' : 'text-base'}`}>
                      {cat.label}
                    </span>
                    {isConcursosEmAndamento && <StatusTag tone="navy" className="ml-auto">Em andamento</StatusTag>}
                  </span>
                  {!selectedCategory && (
                    <span className="text-sm font-medium leading-snug text-ink-3">
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
                className="w-full flex-1"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="md:hidden flex items-center gap-1.5 text-sm font-bold text-navy mb-4"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Voltar
                </button>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
                {selectedCategory.subitems.map(sub => {
                  const isPlanilhasEmAndamento = sub.id === 'concursosJRS' && temConcursoEmAndamento;
                  return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setCurrentView(sub.id)}
                    className="relative flex flex-col gap-1.5 rounded-xl bg-white hover:border-navy active:bg-thead transition-colors py-4 px-4 md:py-5 md:px-5 text-left border border-line text-navy"
                  >
                    {sub.badge ? (
                      <span className="absolute top-2.5 right-2.5 bg-wine text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                        {sub.badge}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-2.5 w-full">
                      <span className="material-symbols-outlined text-[24px] md:text-[30px] shrink-0 text-navy" aria-hidden="true">{sub.icon}</span>
                      <span className="text-base font-bold leading-tight">{sub.label}</span>
                      {isPlanilhasEmAndamento && <StatusTag tone="navy" className="ml-auto">Em andamento</StatusTag>}
                    </span>
                    <span className="text-sm font-medium leading-snug text-ink-3">
                      {sub.subtitle}
                    </span>
                  </button>
                  );
                })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
