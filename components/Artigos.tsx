// Ficheiro: components/Artigos.tsx
import React from 'react';
import { Header } from './Header';

// Documentação: Array estático contendo os 3 artigos solicitados
const ARTIGOS_DATA = [
  {
    id: '1',
    title: 'MEDICINA LEGAL E PERÍCIA MÉDICA',
    author: 'Prof. Daniel Muñoz | FCMUSP'
  },
  {
    id: '2',
    title: 'PERÍCIA MÉDICA',
    author: 'Dra. Simone Nakahara | CREMEGO'
  },
  {
    id: '3',
    title: 'DIREITOS E DEVERES DO MÉDICO PERITO',
    author: 'Prof. Daniel Muñoz | FCMUSP'
  }
];

export const Artigos: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      <Header title="Artigos" />
      
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1 pb-24">
        {/* Documentação: Lista de cartões com o design semelhante aos Infográficos */}
        <div className="grid grid-cols-1 gap-2.5">
          {ARTIGOS_DATA.map((item) => (
            <div 
              key={item.id} 
              className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col w-full text-left p-4"
            >
              <div className="flex justify-between items-start gap-4 w-full">
                <h3 className="text-sm font-bold text-[#050F41] font-heading leading-snug">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-body leading-relaxed mt-2 font-medium">
                {item.author}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
