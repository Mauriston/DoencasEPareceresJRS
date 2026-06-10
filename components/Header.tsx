import React from 'react';

export interface HeaderProps {
  title?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, leftAction, rightAction }) => {
  return (
    <header className="w-full sticky top-0 z-50 shadow-md bg-navy text-white h-[38px] flex items-center justify-between px-4 border-b border-gold flex-shrink-0">
      <div className="flex items-center min-w-[50px]">
        {leftAction}
      </div>
      <div className="flex-1 text-center font-heading text-[12px] font-bold truncate px-2 text-white uppercase tracking-wide">
        {title}
      </div>
      <div className="flex items-center justify-end min-w-[50px] space-x-2">
        {rightAction}
        <img 
          src="https://i.imgur.com/KUbQz08.png" 
          alt="HNRe Logo" 
          className="h-[28px] w-[28px] object-contain bg-white rounded p-0.5"
        />
      </div>
    </header>
  );
};
