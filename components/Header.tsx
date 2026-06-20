import React, { useEffect, useState } from 'react';

export interface HeaderProps {
  title?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction, onBack }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`w-full sticky top-0 z-50 h-[56px] flex items-center justify-between px-1 transition-all duration-300 ${
        isScrolled 
          ? 'bg-[#050F41] shadow-md' 
          : 'bg-[#050F41] shadow-sm'
      }`}
    >
      {/* Botão de Ação Esquerdo (M3: 48x48) */}
      <div className="flex items-center justify-center min-w-[48px] min-h-[48px]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full text-white hover:bg-white/10 transition-colors"
            aria-label="Voltar"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>
        ) : leftAction}
      </div>

      {/* Título Centralizado */}
      <div className="flex-1 text-center px-1 font-heading text-[16px] font-bold tracking-wide truncate text-white uppercase">
        {title}
      </div>

      {/* Botões de Ação Direitos e Logo */}
      <div className="flex items-center justify-end space-x-0.5 pr-2">
        {rightAction && (
          <div className="flex items-center justify-center min-w-[48px] min-h-[48px]">
            {rightAction}
          </div>
        )}
        <div className="w-[32px] h-[32px] flex items-center justify-center bg-white rounded-md p-1 shadow-sm ml-1">
          <img 
            src="https://i.imgur.com/KUbQz08.png" 
            alt="HNRe Logo" 
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    </header>
  );
};