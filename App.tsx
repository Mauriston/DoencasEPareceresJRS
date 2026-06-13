// Ficheiro: App.tsx
import React, { useState } from 'react';
import { DiseaseGuide } from './components/DiseaseGuide';
import { LawReference } from './components/LawReference';
import { DGPM406Guide } from './components/DGPM406Guide';
import { ConcursosGuide } from './components/ConcursosGuide';
import { PortariaGuide } from './components/PortariaGuide';
import { FinalidadesGuide } from './components/FinalidadesGuide';
import { ExamesGuide } from './components/ExamesGuide';
import { Infograficos } from './components/Infograficos';
import { Resumos } from './components/Resumos';
import { Pareceres } from './components/Pareceres';
import { TemplatesGuide } from './components/TemplatesGuide';
import { Artigos } from './components/Artigos';
import { ArtigoPericiaMedica } from './components/ArtigoPericiaMedica';
import { ArtigoPerfilPerito } from './components/ArtigoPerfilPerito';
import { ArtigoPericiaAdministrativa } from './components/ArtigoPericiaAdministrativa';
import { ArtigoPericiaPsiquiatria } from './components/ArtigoPericiaPsiquiatria';
import { CasosPericiais } from './components/CasosPericiais';
import { Estudo } from './components/Estudo'; 
import { HNReGuide } from './components/HNReGuide';
import { RegimentoHNRe } from './components/RegimentoHNRe';
import { OrdemInternaJRS } from './components/OrdemInternaJRS';
import { RoteiroJRS } from './components/RoteiroJRS'; // <-- IMPORTAÇÃO DO ROTEIRO AQUI
import { NavItem } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavItem>('splash');
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isBeneficiosFabOpen, setIsBeneficiosFabOpen] = useState(false);
  const [isExtrasFabOpen, setIsExtrasFabOpen] = useState(false);
  const [isAvaliacoesFabOpen, setIsAvaliacoesFabOpen] = useState(false);
  const [isGerarDocFabOpen, setIsGerarDocFabOpen] = useState(false);

  const renderView = () => {
    switch (currentView) {
      case 'guide': return <DiseaseGuide />;
      case 'laws': return <LawReference />;
      case 'dgpm406': return <DGPM406Guide />;
      case 'concursos': return <ConcursosGuide />;
      case 'portaria': return <PortariaGuide />;
      case 'finalidades': return <FinalidadesGuide />;
      case 'exames': return <ExamesGuide />;
      case 'infograficos': return <Infograficos />;
      case 'resumos': return <Resumos />;
      case 'pareceres': return <Pareceres />;
      case 'templates': return <TemplatesGuide />;
      case 'artigos': return <Artigos onNavigate={setCurrentView} />;
      case 'artigo-pericia': return <ArtigoPericiaMedica onBack={() => setCurrentView('estudo')} />;
      case 'artigo-perfil': return <ArtigoPerfilPerito onBack={() => setCurrentView('estudo')} />;
      case 'artigo-administrativa': return <ArtigoPericiaAdministrativa onBack={() => setCurrentView('estudo')} />;
      case 'artigo-psiquiatria': return <ArtigoPericiaPsiquiatria onBack={() => setCurrentView('estudo')} />;
      case 'casos': return <CasosPericiais onBack={() => setCurrentView('guide')} />; 
      case 'estudo': return <Estudo onBack={() => setCurrentView('guide')} onNavigate={setCurrentView} />; 
      case 'hnre': return <HNReGuide onNavigate={setCurrentView} />; 
      case 'regimento-hnre': return <RegimentoHNRe onBack={() => setCurrentView('hnre')} />;
      case 'ordem-interna-jrs': return <OrdemInternaJRS onBack={() => setCurrentView('hnre')} />;
      
      // Documentação: Chamada do renderizador da nova página Roteiro JRS
      case 'roteiro': return <RoteiroJRS />; 
      
      default: return <DiseaseGuide />;
    }
  };

  if (currentView === 'splash') {
    return (
      <div 
        className="fixed inset-0 w-full h-full cursor-pointer bg-[#050F41] flex flex-col items-center justify-center z-[100]"
        onClick={() => setCurrentView('guide')}
      >
        <img 
          src="https://i.imgur.com/5JjsbwG.png" 
          alt="Junta Regular de Saúde - Hospital Naval de Recife" 
          className="w-full h-full object-contain" 
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F3F5F7] text-[#1F2937] overflow-hidden antialiased select-none">
      <main className="flex-grow w-full max-w-4xl mx-auto flex flex-col overflow-y-auto pb-20 [text-align:justify]">
        {renderView()}
      </main>

      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200/70 shadow-[0_-4px_16px_rgba(0,0,0,0.03)] pb-[env(safe-area-inset-bottom)] px-4 z-50">
        <div className="flex justify-around items-center h-[64px] max-w-4xl mx-auto relative">
          
          {/* 1. Benefícios */}
          <div className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1">
            <button onClick={() => { setIsBeneficiosFabOpen(!isBeneficiosFabOpen); setIsAvaliacoesFabOpen(false); setIsGerarDocFabOpen(false); setIsFabOpen(false); setIsExtrasFabOpen(false); }} className="flex flex-col items-center justify-center w-full h-full focus:outline-none">
              <div className={`mb-1 px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${['guide', 'portaria', 'finalidades'].includes(currentView) ? 'bg-blue-100 text-[#050F41] font-semibold' : 'text-gray-500 hover:bg-gray-100/60'}`}>
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: ['guide', 'portaria', 'finalidades'].includes(currentView) ? "'FILL' 1" : "'FILL' 0" }}>stethoscope</span>
              </div>
              <span className={`text-[11px] font-medium font-body transition-colors ${['guide', 'portaria', 'finalidades'].includes(currentView) ? 'text-[#050F41] font-bold' : 'text-gray-500'}`}>Benefícios</span>
            </button>
            {isBeneficiosFabOpen && (
              <div className="absolute bottom-20 left-0 mb-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(5,15,65,0.08)] border border-gray-100 p-1.5 flex flex-col gap-0.5 min-w-[175px] animate-fade-in z-50">
                <button onClick={() => { setCurrentView('guide'); setIsBeneficiosFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'guide' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">medical_information</span>Doenças de Lei</button>
                <button onClick={() => { setCurrentView('finalidades'); setIsBeneficiosFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'finalidades' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">fact_check</span>Finalidades</button>
                <button onClick={() => { setCurrentView('portaria'); setIsBeneficiosFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'portaria' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">article</span>Portaria</button>
              </div>
            )}
          </div>

          {/* 2. Avaliações */}
          <div className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1">
            <button id="nav-btn-avaliacoes" onClick={() => { setIsAvaliacoesFabOpen(!isAvaliacoesFabOpen); setIsBeneficiosFabOpen(false); setIsGerarDocFabOpen(false); setIsFabOpen(false); setIsExtrasFabOpen(false); }} className="group flex flex-col items-center justify-center w-full h-full focus:outline-none">
              <div className={`mb-1 px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${['concursos', 'exames'].includes(currentView) ? 'bg-blue-100 text-[#050F41] font-semibold' : 'text-gray-500 hover:bg-gray-100/60'}`}>
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: ['concursos', 'exames'].includes(currentView) ? "'FILL' 1" : "'FILL' 0" }}>checklist</span>
              </div>
              <span className={`text-[11px] font-medium font-body transition-colors ${['concursos', 'exames'].includes(currentView) ? 'text-[#050F41] font-bold' : 'text-gray-500'}`}>Avaliações</span>
            </button>
            {isAvaliacoesFabOpen && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 mb-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(5,15,65,0.08)] border border-gray-100 p-1.5 flex flex-col gap-0.5 min-w-[155px] animate-fade-in z-50">
                <button onClick={() => { setCurrentView('concursos'); setIsAvaliacoesFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'concursos' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">emoji_events</span>Concursos</button>
                <button onClick={() => { setCurrentView('exames'); setIsAvaliacoesFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'exames' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">science</span>Exames</button>
              </div>
            )}
          </div>

          {/* 3. Documentos */}
          <div className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1">
            <button id="nav-btn-gerar-doc" onClick={() => { setIsGerarDocFabOpen(!isGerarDocFabOpen); setIsBeneficiosFabOpen(false); setIsAvaliacoesFabOpen(false); setIsFabOpen(false); setIsExtrasFabOpen(false); }} className="group flex flex-col items-center justify-center w-full h-full focus:outline-none">
              <div className={`mb-1 px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${['pareceres', 'templates'].includes(currentView) ? 'bg-blue-100 text-[#050F41] font-semibold' : 'text-gray-500 hover:bg-gray-100/60'}`}>
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: ['pareceres', 'templates'].includes(currentView) ? "'FILL' 1" : "'FILL' 0" }}>description</span>
              </div>
              <span className={`text-[11px] font-medium font-body transition-colors ${['pareceres', 'templates'].includes(currentView) ? 'text-[#050F41] font-bold' : 'text-gray-500'}`}>Documentos</span>
            </button>
            {isGerarDocFabOpen && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 mb-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(5,15,65,0.08)] border border-gray-100 p-1.5 flex flex-col gap-0.5 min-w-[170px] animate-fade-in z-50">
                <button onClick={() => { setCurrentView('pareceres'); setIsGerarDocFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'pareceres' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">assignment</span>Pareceres</button>
                <button onClick={() => { setIsGerarDocFabOpen(false); }} className="flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-400 cursor-not-allowed bg-gray-50/50" disabled><span className="material-symbols-outlined mr-3 text-gray-300 text-[18px]">personal_injury</span>Perícia Menor</button>
                <button onClick={() => { setCurrentView('templates'); setIsGerarDocFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'templates' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">edit_document</span>Templates</button>
              </div>
            )}
          </div>

          {/* 4. Normas */}
          <div className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1">
            <button onClick={() => { setIsFabOpen(!isFabOpen); setIsBeneficiosFabOpen(false); setIsAvaliacoesFabOpen(false); setIsGerarDocFabOpen(false); setIsExtrasFabOpen(false); }} className="flex flex-col items-center justify-center w-full h-full focus:outline-none">
              <div className={`mb-1 px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${['dgpm406', 'laws', 'hnre', 'regimento-hnre', 'ordem-interna-jrs'].includes(currentView) ? 'bg-blue-100 text-[#050F41] font-semibold' : 'text-gray-500 hover:bg-gray-100/60'}`}>
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: ['dgpm406', 'laws', 'hnre', 'regimento-hnre', 'ordem-interna-jrs'].includes(currentView) ? "'FILL' 1" : "'FILL' 0" }}>gavel</span>
              </div>
              <span className={`text-[11px] font-medium font-body transition-colors ${['dgpm406', 'laws', 'hnre', 'regimento-hnre', 'ordem-interna-jrs'].includes(currentView) ? 'text-[#050F41] font-bold' : 'text-gray-500'}`}>Normas</span>
            </button>
            {isFabOpen && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 mb-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(5,15,65,0.08)] border border-gray-100 p-1.5 flex flex-col gap-0.5 min-w-[155px] animate-fade-in z-50">
                <button onClick={() => { setCurrentView('dgpm406'); setIsFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'dgpm406' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">anchor</span>DGPM-406</button>
                <button onClick={() => { setCurrentView('hnre'); setIsFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${['hnre', 'regimento-hnre', 'ordem-interna-jrs'].includes(currentView) ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">local_hospital</span>HNRe</button>
                <button onClick={() => { setCurrentView('laws'); setIsFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'laws' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">balance</span>Legislação</button>
              </div>
            )}
          </div>

          {/* 5. Extras */}
          <div className="relative flex flex-col items-center justify-center w-full h-full pt-1.5 pb-1">
            <button onClick={() => { setIsExtrasFabOpen(!isExtrasFabOpen); setIsBeneficiosFabOpen(false); setIsAvaliacoesFabOpen(false); setIsGerarDocFabOpen(false); setIsFabOpen(false); }} className="flex flex-col items-center justify-center w-full h-full focus:outline-none">
              <div className={`mb-1 px-4 py-1 rounded-full transition-all duration-200 flex items-center justify-center ${['estudo', 'casos', 'infograficos', 'resumos', 'roteiro'].includes(currentView) ? 'bg-blue-100 text-[#050F41] font-semibold' : 'text-gray-500 hover:bg-gray-100/60'}`}>
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: ['estudo', 'casos', 'infograficos', 'resumos', 'roteiro'].includes(currentView) ? "'FILL' 1" : "'FILL' 0" }}>widgets</span>
              </div>
              <span className={`text-[11px] font-medium font-body transition-colors ${['estudo', 'casos', 'infograficos', 'resumos', 'roteiro'].includes(currentView) ? 'text-[#050F41] font-bold' : 'text-gray-500'}`}>Extras</span>
            </button>
            {isExtrasFabOpen && (
              <div className="absolute bottom-20 right-0 mb-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(5,15,65,0.08)] border border-gray-100 p-1.5 flex flex-col gap-0.5 min-w-[160px] animate-fade-in z-50">
                <button onClick={() => { setCurrentView('casos'); setIsExtrasFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'casos' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">quiz</span>Casos</button>
                <button onClick={() => { setCurrentView('estudo'); setIsExtrasFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'estudo' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">school</span>Estudo</button>
                <button onClick={() => { setCurrentView('infograficos'); setIsExtrasFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'infograficos' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">image</span>Infográficos</button>
                <button onClick={() => { setCurrentView('resumos'); setIsExtrasFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'resumos' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">menu_book</span>Resumos</button>
                
                <button onClick={() => { setCurrentView('roteiro'); setIsExtrasFabOpen(false); }} className={`flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${currentView === 'roteiro' ? 'bg-[#050F41]/5 text-[#050F41] font-bold' : 'text-gray-700 hover:bg-gray-50'}`}><span className="material-symbols-outlined mr-3 text-gray-400 text-[18px]">view_list</span>Roteiro JRS</button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {(isBeneficiosFabOpen || isAvaliacoesFabOpen || isGerarDocFabOpen || isFabOpen || isExtrasFabOpen) && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => { setIsBeneficiosFabOpen(false); setIsAvaliacoesFabOpen(false); setIsGerarDocFabOpen(false); setIsFabOpen(false); setIsExtrasFabOpen(false); }} />
      )}
    </div>
  );
};

export default App;