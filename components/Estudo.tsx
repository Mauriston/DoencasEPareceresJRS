// Ficheiro: components/Estudo.tsx
import React, { useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, BookOpen, PlaySquare, Book } from 'lucide-react'; // Importado o ícone Book
import { Aulas } from './Aulas';
import { Videos } from './Videos';
import { Artigos } from './Artigos'; // Importado o componente Artigos
import { NavItem } from '../types';

interface Props {
  onBack: () => void;
  onNavigate: (view: NavItem) => void; // Adicionada a prop para permitir navegar para o texto dos artigos
}

export const Estudo: React.FC<Props> = ({ onBack, onNavigate }) => {
  // Documentação: Estado expandido para controlar as 3 abas: aulas, vídeos e livros
  const [activeTab, setActiveTab] = useState<'aulas' | 'videos' | 'livros'>('aulas');

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header 
        title="MATERIAL DE ESTUDO" 
        leftAction={
          <button onClick={onBack} className="text-white p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none">
            <ArrowLeft size={20} />
          </button>
        } 
      />
      
      {/* Sistema de Tabs (Separadores) com as 3 opções alinhadas */}
      <div className="bg-[#050F41] px-2 pt-1 flex justify-around border-t-2 border-[#079551] z-10 flex-shrink-0">
        <button
          onClick={() => setActiveTab('aulas')}
          className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 text-xs sm:text-sm font-bold transition-all focus:outline-none ${activeTab === 'aulas' ? 'bg-[#079551] text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          <BookOpen size={16} />
          <span>Aulas</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 text-xs sm:text-sm font-bold transition-all focus:outline-none ${activeTab === 'videos' ? 'bg-[#079551] text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          <PlaySquare size={16} />
          <span>Vídeos</span>
        </button>

        <button
          onClick={() => setActiveTab('livros')}
          className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 text-xs sm:text-sm font-bold transition-all focus:outline-none ${activeTab === 'livros' ? 'bg-[#079551] text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          <Book size={16} />
          <span>Livros</span>
        </button>
      </div>

      {/* Conteúdo Dinâmico gerido pelas 3 Tabs */}
      <div className="flex-1 overflow-hidden relative">
  {activeTab === 'aulas' && <Aulas />}
  {activeTab === 'videos' && <Videos />}
  {/* Documentação: Passando a prop hideHeader como true para limpar o visual */}
  {activeTab === 'livros' && <Artigos onNavigate={onNavigate} hideHeader={true} />}
</div>
    </div>
  );
};
