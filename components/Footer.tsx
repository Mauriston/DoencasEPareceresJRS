import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy pt-[12px] pb-24 md:pb-6 text-center text-white mt-auto h-[164px]">
      <div className="max-w-4xl mx-auto px-4 flex flex-col items-center h-[64px]">
        <img 
          src="https://i.imgur.com/qt97XzO.png" 
          alt="Marinha do Brasil" 
          className="h-[76px] pt-0 object-contain"
          onError={(e) => {
             (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    </footer>
  );
};