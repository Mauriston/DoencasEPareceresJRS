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
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`w-full sticky top-0 z-50 h-[64px] flex items-center px-2 sm:px-4 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md text-[#050F41] shadow-[0_2px_10px_rgba(0,0,0,0.08)]'
          : 'bg-[#050F41] text-white shadow-none'
      }`}
    >
      {/* Botão Leading (Menu/Voltar) */}
      {leftAction && (
        <div className="flex items-center justify-center min-w-[48px] min-h-[48px] mr-2">
          {leftAction}
        </div>
      )}
      
      {/* Título - M3 Title Large alinhado à esquerda */}
      <div className="flex-1 text-left font-heading text-[20px] sm:text-[22px] font-medium tracking-wide truncate">
        {title}
      </div>
      
      {/* Ícones Trailing e Logo */}
      <div className="flex items-center justify-end gap-1 ml-2">
        {rightAction}
        
        <div className={`w-[36px] h-[36px] flex items-center justify-center rounded-xl p-0.5 ml-2 transition-colors ${
          isScrolled ? 'bg-[#F3F5F7] border border-gray-200' : 'bg-white/10 border border-white/20'
        }`}>
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