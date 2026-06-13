// Ficheiro: components/HNReGuide.tsx
import React from 'react';
import { Header } from './Header';
import { MoreVertical } from 'lucide-react';
import { NavItem } from '../types';

interface NormaHNRe {
  id: string;
  headline: string;
  subtitle: string;
  route?: NavItem; // Documentação: Rota opcional para navegação
}

const NORMAS_HNRE: NormaHNRe[] = [
  { 
    id: 'hnre-1', 
    headline: 'Regimento Interno', 
    subtitle: 'Portaria 107/HNRe de 23/10/2025',
    route: 'regimento-hnre' // Rota ligada aqui
  },
  { 
    id: 'hnre-2', 
    headline: 'Ordem Interna JRS/HNRe', 
    subtitle: 'Ordem Interna nº 02-05D' 
  }
];

interface Props {
  onNavigate: (view: NavItem) => void;
}

export const HNReGuide: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
      <Header title="Normas HNRe" />
      
      <div className="p-4 overflow-auto pb-24 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden divide-y divide-gray-100">
          {NORMAS_HNRE.map((item) => (
            <div 
              key={item.id} 
              // Documentação: Tratamento à prova de falhas para garantir o clique
              onClick={(e) => {
                e.preventDefault();
                if (item.route) {
                  onNavigate(item.route);
                }
              }}
              className={`group flex items-center justify-between p-4 transition-colors focus:outline-none ${
                item.route ? 'hover:bg-gray-50 active:bg-gray-100 cursor-pointer' : 'opacity-70'
              }`}
            >
              {/* Documentação: pointer-events-none nos filhos obriga o clique a ser registado na div pai */}
              <div className="flex flex-col pr-4 flex-1 pointer-events-none">
                <h3 className="text-[#050F41] font-heading font-bold text-[14px] leading-snug mb-1 group-hover:text-[#079551] transition-colors">
                  {item.headline}
                </h3>
                <p className="text-gray-500 font-body text-[11px] font-medium leading-relaxed line-clamp-2">
                  {item.subtitle}
                </p>
              </div>
              
              <div className="text-gray-400 group-hover:text-[#050F41] transition-colors flex-shrink-0 bg-gray-50 group-hover:bg-blue-50/50 p-2 rounded-full pointer-events-none">
                <MoreVertical size={18} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};