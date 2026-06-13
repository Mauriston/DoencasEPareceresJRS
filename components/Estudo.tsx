// Ficheiro: components/Estudo.tsx
import React, { useState } from 'react';
import { Header } from './Header';
import { ArrowLeft, BookOpen, PlaySquare } from 'lucide-react';
import { Aulas } from './Aulas';
import { Videos } from './Videos';

interface Props {
  onBack: () => void;
}

export const Estudo: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'aulas' | 'videos'>('aulas');

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
      
      {/* Sistema de Tabs (Separadores) */}
      <div className="bg-[#050F41] px-2 pt-1 flex justify-around shadow-md z-10">
        <button 
          onClick={() => setActiveTab('aulas')}
          className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 text-sm font-bold transition-all relative focus:outline-none ${activeTab === 'aulas' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          <BookOpen size={16} />
          <span>Aulas e Slides</span>
          {activeTab === 'aulas' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#079551] rounded-t-md animate-fade-in" />
          )}
        </button>
        
        <button 
          onClick={() => setActiveTab('videos')}
          className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 text-sm font-bold transition-all relative focus:outline-none ${activeTab === 'videos' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          <PlaySquare size={16} />
          <span>Vídeos</span>
          {activeTab === 'videos' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#079551] rounded-t-md animate-fade-in" />
          )}
        </button>
      </div>

      {/* Conteúdo Dinâmico gerido pelos Tabs */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'aulas' ? <Aulas /> : <Videos />}
      </div>
    </div>
  );
};