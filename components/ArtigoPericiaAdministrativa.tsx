// Ficheiro: components/ArtigoPericiaAdministrativa.tsx
import React, { useEffect, useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, ArrowUp } from 'lucide-react';

interface Props {
  onBack: () => void;
}

export const ArtigoPericiaAdministrativa: React.FC<Props> = ({ onBack }) => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const container = document.querySelector('main');
    if (!container) return;
    const handleScroll = () => {
      setShowScrollTop(container.scrollTop > 56);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="PERÍCIA MÉDICA ADMINISTRATIVA" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
        } 
      />

      <div className="p-4 space-y-6 max-w-3xl mx-auto w-full flex-1 pb-32">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm text-center">
          <h1 className="text-xl font-heading font-bold text-[#050F41] mb-4 uppercase">Perícia Médica Administrativa</h1>
          <div className="bg-gray-50 rounded-xl p-4 inline-block text-left text-xs text-gray-600 font-body space-y-1.5 border border-gray-100">
            <p><strong>Sonia Maria Rodrigues de Andrade:</strong> Pós-graduada em Gestão em Saúde pela UERJ. Médica perita da Secretaria Municipal de Administração do Rio de Janeiro. Membro efetivo da Câmara Técnica de Perícias Médicas do Cremego.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Conceitos</h2>
          <p>Podemos definir a perícia médica como <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">ato médico que tem por finalidade informar, esclarecer e amparar alguma autoridade sobre fato específico de sua área de atuação, em prol da Justiça e da administração pública.</mark></p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Critérios técnicos de avaliação para licença médica</h2>
          <p>Na visão da perícia administrativa, <mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">ninguém é afastado do trabalho para tratamento de saúde porque está doente, mas sim porque está incapaz.</mark></p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-4 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <h2 className="text-base font-heading font-bold text-[#050F41] uppercase border-b border-gray-100 pb-2 mb-4">Readaptação e Aposentadoria</h2>
          <p><mark className="bg-[#ffff99] text-gray-900 rounded-sm px-1 font-medium">ninguém é aposentado por ser portador de uma doença, mesmo que seja uma das doenças elencadas em lei.</mark> O que deverá ser atestado pela perícia é a incapacidade laboral total e permanente, em razão de tal enfermidade.</p>
        </div>

      </div>

      {showScrollTop && (
        <button 
          onClick={() => {
              const container = document.querySelector('main');
              if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          className="fixed bottom-24 right-6 bg-[#050F41] text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700"
          title="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};