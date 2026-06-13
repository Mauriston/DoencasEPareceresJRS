// Ficheiro: components/Artigos.tsx
import React from 'react';
import { Header } from './Header';
import { ChevronRight } from 'lucide-react';
import { NavItem } from '../types';

// Documentação: Array estático com os dados dos 6 artigos
const ARTIGOS_DATA = [
  { id: '1', title: 'MEDICINA LEGAL E PERÍCIA MÉDICA', author: 'Prof. Daniel Muñoz | FCMUSP' },
  { id: '2', title: 'PERÍCIA MÉDICA', author: 'Dra. Simone Nakahara | CREMEGO' },
  { id: '3', title: 'DIREITOS E DEVERES DO MÉDICO PERITO', author: 'Prof. Daniel Muñoz | FCMUSP' },
  { id: '4', title: 'O PERFIL DO MÉDICO PERITO', author: 'Dra. Tereza Chedid | CREMEGO' },
  { id: '5', title: 'PERÍCIA MÉDICA ADMINISTRATIVA', author: 'Profª Sonia Maria Rodrigues de Andrade | UERJ' },
  { id: '6', title: 'PERÍCIA MÉDICA EM PSIQUIATRIA', author: 'Dra. Tereza Chedid | CREMEGO' }
];

interface ArtigosProps {
  onNavigate: (view: NavItem) => void;
  hideHeader?: boolean; // Documentação: Nova Prop opcional para esconder o cabeçalho duplicado
}

export const Artigos: React.FC<ArtigosProps> = ({ onNavigate, hideHeader = false }) => {
  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      {/* Documentação: O cabeçalho só é renderizado se hideHeader for falso */}
      {!hideHeader && <Header title="Artigos" />}
             
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1 pb-24">
        <div className="grid grid-cols-1 gap-2.5">
          {ARTIGOS_DATA.map((item) => {
            // Documentação: Habilita o clique para os artigos 2, 4, 5 e 6
            const isClickable = item.id === '2' || item.id === '4' || item.id === '5' || item.id === '6';
            return (
              <button 
                key={item.id} 
                onClick={() => { 
                  if (item.id === '2') onNavigate('artigo-pericia');
                  if (item.id === '4') onNavigate('artigo-perfil');
                  if (item.id === '5') onNavigate('artigo-administrativa');
                  if (item.id === '6') onNavigate('artigo-psiquiatria');
                }}
                disabled={!isClickable}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col w-full text-left p-4 transition-all duration-300 focus:outline-none ${
                  isClickable 
                    ? 'cursor-pointer border-gray-200/60 hover:border-[#079551] hover:shadow-md active:scale-[0.98]' 
                    : 'cursor-default border-gray-200/60 opacity-80'
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
