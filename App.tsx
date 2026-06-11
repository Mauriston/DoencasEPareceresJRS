import React, { useState } from 'react'; 
import { DiseaseGuide } from './components/DiseaseGuide'; 
import { LawReference } from './components/LawReference'; 
import { Videos } from './components/Videos'; 
import { DGPM406Guide } from './components/DGPM406Guide'; 
import { DGPM406AnexosGuide } from './components/DGPM406AnexosGuide'; 
import { ConcursosGuide } from './components/ConcursosGuide'; 
import { PortariaGuide } from './components/PortariaGuide'; 
import { FinalidadesGuide } from './components/FinalidadesGuide'; 
import { ExamesGuide } from './components/ExamesGuide'; 
import { Aulas } from './components/Aulas'; 
import { Infograficos } from './components/Infograficos'; 
import { Resumos } from './components/Resumos'; 
import { Pareceres } from './components/Pareceres'; 
import { TemplatesGuide } from './components/TemplatesGuide'; 
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
      case 'guide':         
        return <DiseaseGuide />;       
      case 'laws':         
        return <LawReference />;       
      case 'videos':         
        return <Videos />;       
      case 'dgpm406':         
        return <DGPM406Guide />;       
      case 'dgpm406-anexos':         
        return <DGPM406AnexosGuide />;       
      case 'concursos':         
        return <ConcursosGuide />;       
      case 'portaria':         
        return <PortariaGuide />;       
      case 'finalidades':         
        return <FinalidadesGuide />;       
      case 'exames':         
        return <ExamesGuide />;       
      case 'aulas':         
        return <Aulas />;       
      case 'infograficos':         
        return <Infograficos />;       
      case 'resumos':         
        return <Resumos />;       
      case 'pareceres':         
        return <Pareceres />;       
      case 'templates':         
        return <TemplatesGuide />;       
      default:         
        return <DiseaseGuide />;     
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
    <div className="fixed inset-0 flex flex-col bg-gray-light overflow-hidden pt-safe">       
      {/* Área de conteúdo principal com rolagem isolada independente */}
      <main className="flex-1 w-full h-full max-w-4xl mx-auto flex flex-col overflow-y-auto pb-24">         
        {renderView()}       
      </main>       

      {/* Barra de Navegação Inferior - Com áreas de segurança do iOS */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)] px-4 z-50">         
        <div className="flex justify-around items-stretch h-16 max-w-4xl mx-auto">           
          
          {/* BOTÃO: BENEFÍCIOS */}
          <div className="relative group flex flex-col items-center justify-center w-full h-full pt-2 pb-1">             
            <button               
              onClick={() => setIsBeneficiosFabOpen(!isBeneficiosFabOpen)}               
              className="flex flex-col items-center justify-center w-full h-full focus:outline-none"             
            >               
              <div className={`mb-1 px-4 py-1 rounded-full transition-colors duration-200 flex items-center justify-center ${                 
                (currentView === 'guide' || currentView === 'portaria' || currentView === 'finalidades')                   
                  ? 'bg-blue-100 text-navy'                    
                  : 'text-gray-600 hover:bg-gray-100'               
              }`}>                 
                <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: (currentView === 'guide' || currentView === 'portaria' || currentView === 'finalidades') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}>stethoscope</span>               
              </div>               
              <span className={`text-[10px] sm:text-[12px] font-medium font-body transition-colors ${(currentView === 'guide' || currentView === 'portaria' || currentView === 'finalidades') ? 'text-navy font-bold' : 'text-gray-600'}`}>Benefícios</span>             
            </button>                          
            
            {isBeneficiosFabOpen && (               
              <div className="absolute bottom-full left-0 mb-4 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 p-2 flex flex-col gap-1 min-w-[170px] animate-fade-in z-50">                 
                <button                    
                  onClick={() => { setCurrentView('guide'); setIsBeneficiosFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'guide' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>medical_information</span>                   
                  Doenças de Lei                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('finalidades'); setIsBeneficiosFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'finalidades' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>fact_check</span>                   
                  Finalidades                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('portaria'); setIsBeneficiosFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'portaria' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>article</span>                   
                  Portaria                 
                </button>                 
                <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45"></div>               
              </div>             
            )}                          
            
            {isBeneficiosFabOpen && (               
              <div                  
                className="fixed inset-0 z-40 bg-transparent"                  
                onClick={() => setIsBeneficiosFabOpen(false)}               
              />             
            )}           
          </div>           

          {/* BOTÃO: AVALIAÇÕES */}
          <div className="relative group flex flex-col items-center justify-center w-full h-full pt-2 pb-1">             
            <button               
              id="nav-btn-avaliacoes"               
              onClick={() => setIsAvaliacoesFabOpen(!isAvaliacoesFabOpen)}               
              className="group flex flex-col items-center justify-center w-full h-full focus:outline-none"             
            >               
              <div className={`mb-1 px-4 py-1 rounded-full transition-colors duration-200 flex items-center justify-center ${                 
                (currentView === 'concursos' || currentView === 'exames')                   
                  ? 'bg-blue-100 text-navy group-hover:bg-blue-200/80'                    
                  : 'text-gray-600 group-hover:bg-gray-100'               
              }`}>                 
                <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: (currentView === 'concursos' || currentView === 'exames') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}>checklist</span>               
              </div>               
              <span className={`text-[10px] sm:text-[12px] font-medium font-body transition-colors ${(currentView === 'concursos' || currentView === 'exames') ? 'text-navy font-bold' : 'text-gray-600'}`}>Avaliações</span>             
            </button>                          
            
            {isAvaliacoesFabOpen && (               
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 p-2 flex flex-col gap-1 min-w-[150px] animate-fade-in z-50">                 
                <button                    
                  onClick={() => { setCurrentView('concursos'); setIsAvaliacoesFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'concursos' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>emoji_events</span>                   
                  Concursos                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('exames'); setIsAvaliacoesFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'exames' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>science</span>                   
                  Exames                 
                </button>                 
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45"></div>               
              </div>             
            )}                          
            
            {isAvaliacoesFabOpen && (               
              <div                  
                className="fixed inset-0 z-40 bg-transparent"                  
                onClick={() => setIsAvaliacoesFabOpen(false)}               
              />             
            )}           
          </div>           

          {/* BOTÃO: DOCUMENTOS */}
          <div className="relative group flex flex-col items-center justify-center w-full h-full pt-2 pb-1">             
            <button               
              id="nav-btn-gerar-doc"               
              onClick={() => setIsGerarDocFabOpen(!isGerarDocFabOpen)}               
              className="group flex flex-col items-center justify-center w-full h-full focus:outline-none"             
            >               
              <div className={`mb-1 px-4 py-1 rounded-full transition-colors duration-200 flex items-center justify-center ${                 
                (currentView === 'pareceres' || currentView === 'templates')                   
                  ? 'bg-blue-100 text-navy group-hover:bg-blue-200/80'                    
                  : 'text-gray-600 group-hover:bg-gray-100'               
              }`}>                 
                <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: (currentView === 'pareceres' || currentView === 'templates') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}>description</span>               
              </div>               
              <span className={`text-[10px] sm:text-[12px] font-medium font-body transition-colors ${(currentView === 'pareceres' || currentView === 'templates') ? 'text-navy font-bold' : 'text-gray-600'}`}>Documentos</span>             
            </button>                          
            
            {isGerarDocFabOpen && (               
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 p-2 flex flex-col gap-1 min-w-[160px] animate-fade-in z-50">                 
                <button                    
                  onClick={() => { setCurrentView('pareceres'); setIsGerarDocFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'pareceres' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>assignment</span>                   
                  Pareceres                 
                </button>                 
                <button                    
                  onClick={() => { setIsGerarDocFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>personal_injury</span>                   
                  Perícia Menor                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('templates'); setIsGerarDocFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'templates' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>edit_document</span>                   
                  Templates                 
                </button>                 
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45"></div>               
              </div>             
            )}                          
            
            {isGerarDocFabOpen && (               
              <div                  
                className="fixed inset-0 z-40 bg-transparent"                  
                onClick={() => setIsGerarDocFabOpen(false)}               
              />             
            )}           
          </div>           

          {/* BOTÃO: DGPM-406 */}
          <div className="relative group flex flex-col items-center justify-center w-full h-full pt-2 pb-1">             
            <button               
              onClick={() => setIsFabOpen(!isFabOpen)}               
              className="flex flex-col items-center justify-center w-full h-full focus:outline-none"             
            >               
              <div className={`mb-1 px-4 py-1 rounded-full transition-colors duration-200 flex items-center justify-center ${                 
                (currentView === 'dgpm406' || currentView === 'dgpm406-anexos' || currentView === 'resumos')                   
                  ? 'bg-blue-100 text-navy'                    
                  : 'text-gray-600 hover:bg-gray-100'               
              }`}>                 
                <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: (currentView === 'dgpm406' || currentView === 'dgpm406-anexos' || currentView === 'resumos') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}>anchor</span>               
              </div>               
              <span className={`text-[10px] sm:text-[12px] font-medium font-body transition-colors ${(currentView === 'dgpm406' || currentView === 'dgpm406-anexos' || currentView === 'resumos') ? 'text-navy font-bold' : 'text-gray-600'}`}>DGPM-406</span>             
            </button>                          
            
            {isFabOpen && (               
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 p-2 flex flex-col gap-1 min-w-[150px] animate-fade-in z-50">                 
                <button                    
                  onClick={() => { setCurrentView('dgpm406-anexos'); setIsFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'dgpm406-anexos' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>attachment</span>                   
                  Anexos                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('dgpm406'); setIsFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'dgpm406' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>library_books</span>                   
                  Capítulos                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('resumos'); setIsFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'resumos' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>menu_book</span>                   
                  Resumos                 
                </button>                 
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45"></div>               
              </div>             
            )}                          
            
            {isFabOpen && (               
              <div                  
                className="fixed inset-0 z-40 bg-transparent"                  
                onClick={() => setIsFabOpen(false)}               
              />             
            )}           
          </div>           

          {/* BOTÃO: EXTRAS */}
          <div className="relative group flex flex-col items-center justify-center w-full h-full pt-2 pb-1">             
            <button               
              onClick={() => setIsExtrasFabOpen(!isExtrasFabOpen)}               
              className="flex flex-col items-center justify-center w-full h-full focus:outline-none"             
            >               
              <div className={`mb-1 px-4 py-1 rounded-full transition-colors duration-200 flex items-center justify-center ${                 
                (currentView === 'videos' || currentView === 'aulas' || currentView === 'laws' || currentView === 'infograficos')                   
                  ? 'bg-blue-100 text-navy'                    
                  : 'text-gray-600 hover:bg-gray-100'               
              }`}>                 
                <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: (currentView === 'videos' || currentView === 'aulas' || currentView === 'laws' || currentView === 'infograficos') ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 400" }}>widgets</span>               
              </div>               
              <span className={`text-[10px] sm:text-[12px] font-medium font-body transition-colors ${(currentView === 'videos' || currentView === 'aulas' || currentView === 'laws' || currentView === 'infograficos') ? 'text-navy font-bold' : 'text-gray-600'}`}>Extras</span>             
            </button>                          
            
            {isExtrasFabOpen && (               
              <div className="absolute bottom-full right-0 mb-4 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 p-2 flex flex-col gap-1 min-w-[150px] animate-fade-in z-50">                 
                <button                    
                  onClick={() => { setCurrentView('aulas'); setIsExtrasFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'aulas' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>co_present</span>                   
                  Aulas                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('infograficos'); setIsExtrasFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'infograficos' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>image</span>                   
                  Infográficos                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('laws'); setIsExtrasFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'laws' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>balance</span>                   
                  Legislação                 
                </button>                 
                <button                    
                  onClick={() => { setCurrentView('videos'); setIsExtrasFabOpen(false); }}                   
                  className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === 'videos' ? 'bg-navy/5 text-navy font-bold' : 'text-gray-700 hover:bg-gray-50'}`}                 
                >                   
                  <span className="material-symbols-outlined mr-2" style={{ fontSize: '20px' }}>smart_display</span>                   
                  Vídeos                 
                </button>                 
                <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45"></div>               
              </div>             
            )}                          
            
            {isExtrasFabOpen && (               
              <div                  
                className="fixed inset-0 z-40 bg-transparent"                  
                onClick={() => setIsExtrasFabOpen(false)}               
              />             
            )}           
          </div>         
        </div>       
      </nav>     
    </div>   
  ); 
};

export default App;