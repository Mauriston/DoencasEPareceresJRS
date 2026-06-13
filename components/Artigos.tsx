// Ficheiro: components/Artigos.tsx
import React from 'react';
import { Header } from './Header';
import { ChevronRight } from 'lucide-react';
import { NavItem } from '../types';

// Documentação: Array estático com os dados dos artigos
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

// Documentação: Interface que garante que a função de navegação é recebida do App.tsx
interface ArtigosProps {
  onNavigate: (view: NavItem) => void;
}

export const Artigos: React.FC<ArtigosProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      <Header title="Artigos" />
      
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1 pb-24">
        <div className="grid grid-cols-1 gap-2.5">
          {ARTIGOS_DATA.map((item) => {
            // Verifica se é o card 2 (o único clicável no momento)
            const isClickable = item.id === '2';

            return (
              <button 
                key={item.id} 
                // Documentação: Se for o card correto, chama a função para mudar a tela
                onClick={() => { 
                  if (isClickable) {
                    onNavigate('artigo-pericia');
                  }
                }}
                disabled={!isClickable} // Desabilita o clique nos outros cards
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col w-full text-left p-4 transition-all duration-300 focus:outline-none ${
                  isClickable 
                    ? 'cursor-pointer border-gray-200/60 hover:border-[#079551] hover:shadow-md active:scale-[0.98]' 
                    : 'cursor-default border-gray-200/60'
                }`}
              >
                <div className="flex justify-between items-start gap-4 w-full">
                  <h3 className={`text-sm font-bold font-heading leading-snug transition-colors ${
                    isClickable ? 'text-[#050F41] hover:text-[#079551]' : 'text-gray-700'
                  }`}>
                    {item.title}
                  </h3>
                  {isClickable && <ChevronRight className="text-gray-400 transform transition-all flex-shrink-0 mt-0.5" size={18} />}
                </div>
                <p className="text-xs text-gray-500 font-body leading-relaxed mt-2 font-medium">
                  {item.author}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};