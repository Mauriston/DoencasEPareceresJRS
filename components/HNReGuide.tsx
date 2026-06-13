// Ficheiro: components/HNReGuide.tsx
import React from 'react';
import { Header } from './Header';
import { MoreVertical } from 'lucide-react';

// Documentação: Tipagem dos dados da nova lista de normas do HNRe
interface NormaHNRe {
  id: string;
  headline: string;
  subtitle: string;
}

// Documentação: Base de dados estática inicial com os dois itens pedidos
const NORMAS_HNRE: NormaHNRe[] = [
  { 
    id: 'hnre-1', 
    headline: 'Regimento Interno', 
    subtitle: 'Portaria 107/HNRe de 23/10/2025' 
  },
  { 
    id: 'hnre-2', 
    headline: 'Ordem Interna JRS/HNRe', 
    subtitle: 'Ordem Interna nº 02-05D' 
  }
];

export const HNReGuide: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header title="Normas HNRe" />
      
      <div className="p-4 animate-fade-in overflow-auto pb-24 max-w-4xl mx-auto w-full">
        {/* Documentação: Contentor único com divisores entre os itens (divide-y) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden divide-y divide-gray-100">
          {NORMAS_HNRE.map((item) => (
            <div 
              key={item.id} 
              // Documentação: Utilizei uma div em vez de tag 'a' porque a ação será configurada depois
              className="group flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none cursor-pointer"
            >
              {/* Textos à esquerda */}
              <div className="flex flex-col pr-4 flex-1">
                <h3 className="text-[#050F41] font-heading font-bold text-[14px] leading-snug mb-1 group-hover:text-[#079551] transition-colors">
                  {item.headline}
                </h3>
                <p className="text-gray-500 font-body text-[11px] font-medium leading-relaxed line-clamp-2">
                  {item.subtitle}
                </p>
              </div>
              
              {/* Ícone de 3 pontinhos à direita */}
              <div className="text-gray-400 group-hover:text-[#050F41] transition-colors flex-shrink-0 bg-gray-50 group-hover:bg-blue-50/50 p-2 rounded-full">
                <MoreVertical size={18} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};