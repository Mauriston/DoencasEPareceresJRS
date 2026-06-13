// Ficheiro: components/Aulas.tsx
import React from 'react';
import { Header } from './Header';
import { Presentation } from 'lucide-react';

// Substitui por os teus dados reais de aulas
const AULAS_DATA = [
  { id: '1', title: 'Introdução à Perícia', description: 'Conceitos básicos e legislação.' },
  { id: '2', title: 'Documentos Periciais', description: 'Como preencher laudos e pareceres.' },
  { id: '3', title: 'Avaliação Psiquiátrica', description: 'Abordagem em casos de saúde mental.' },
  { id: '4', title: 'Juntas de Saúde', description: 'Procedimentos e ritos de inspeção.' },
];

export const Aulas: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header title="Aulas" />
      
      <div className="p-4 flex-1 overflow-y-auto pb-24">
        {/* Documentação: Grid configurado para 2 colunas e gap ajustado */}
        <div className="grid grid-cols-2 gap-3 max-w-4xl mx-auto">
          {AULAS_DATA.map((aula) => (
            <button
              key={aula.id}
              onClick={() => console.log('Abrir aula', aula.id)}
              className="bg-white rounded-2xl p-4 border border-gray-200/60 shadow-sm flex flex-col text-left focus:outline-none hover:border-[#079551] hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#050F41] flex items-center justify-center mb-3 shadow-inner">
                <Presentation size={18} />
              </div>
              <h3 className="text-[12px] font-bold font-heading text-[#050F41] line-clamp-2 leading-snug mb-1">
                {aula.title}
              </h3>
              <p className="text-[10px] text-gray-500 font-body line-clamp-3 leading-relaxed">
                {aula.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
