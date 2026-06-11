import React, { useEffect, useState } from 'react';

export interface HeaderProps {
  title?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction }) => {
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
      className={`w-full sticky top-0 z-50 h-[56px] flex items-center justify-between px-2 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-md border-gray-200/50 shadow-sm' 
          : 'bg-[#050F41] text-white border-transparent'
      }`}
    >
      {/* Botão de Ação Esquerdo (M3: 48x48 com margem de 4px) */}
      <div className="flex items-center justify-center min-w-[48px] min-h-[48px] mx-1">
        {leftAction}
      </div>

      {/* M3 Small App Bar Spec: Título Alinhado à Esquerda */}
      <div className="flex-1 text-left pl-2 font-heading text-[18px] font-semibold tracking-wide truncate">
        {title}
      </div>

      {/* Botões de Ação Direitos e Logo */}
      <div className="flex items-center justify-end space-x-1 pr-2">
        {rightAction && (
          <div className="flex items-center justify-center min-w-[48px] min-h-[48px]">
            {rightAction}
          </div>
        )}
        <div className="w-[32px] h-[32px] flex items-center justify-center bg-white rounded-lg p-1 shadow-sm border border-gray-100/50 ml-1">
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