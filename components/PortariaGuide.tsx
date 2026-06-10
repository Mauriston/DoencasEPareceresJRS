import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { 
  Brain, 
  HeartPulse, 
  EyeOff, 
  Radiation, 
  Activity, 
  Bone, 
  Ribbon, 
  Shield, 
  Wind, 
  Stethoscope, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  ArrowUp, 
  AlertTriangle,
  Heart
} from 'lucide-react';

// Import our modularized full-text sections
import { IntroSection } from './sections/IntroSection';
import { AlienacaoMentalSection } from './sections/AlienacaoMentalSection';
import { CardiopatiaGraveSection } from './sections/CardiopatiaGraveSection';
import { CegueiraSection } from './sections/CegueiraSection';
import { HepatopatiaRadiacaoSection } from './sections/HepatopatiaRadiacaoSection';
import { OtherDiseasesSection } from './sections/OtherDiseasesSection';

interface DiseaseIndexItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  subsections?: { id: string; name: string }[];
}

export const PortariaGuide: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cardioExpanded, setCardioExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const windowScroll = window.scrollY || document.documentElement.scrollTop;
      const scroller = document.getElementById('portaria-scroll-container');
      const scrollerScroll = scroller ? scroller.scrollTop : 0;
      const maxScroll = Math.max(windowScroll, scrollerScroll);
      
      if (maxScroll > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    const scroller = document.getElementById('portaria-scroll-container');
    if (scroller) {
      scroller.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scroller) {
        scroller.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const diseases: DiseaseIndexItem[] = [
    { id: 'doenca-alienacao', name: 'Alienação Mental', icon: <Brain size={15} /> },
    { 
      id: 'doenca-cardiopatia', 
      name: 'Cardiopatia Grave', 
      icon: <HeartPulse size={15} />,
      subsections: [
        { id: 'doenca-cardiopatia', name: 'Conceituação Geral' },
        { id: 'cardio-isquemica-aguda-ssst', name: 'Isquêmica - Aguda S/ SST' },
        { id: 'cardio-isquemica-aguda-csst', name: 'Isquêmica - Aguda C/ SST' },
        { id: 'cardio-isquemica-cronica', name: 'Isquêmica - Crônica' },
        { id: 'cardio-hipertensiva', name: 'Cardiopatia Hipertensiva' },
        { id: 'cardio-miocardio-hiper', name: 'Miocardiopatias - Hipertróficas' },
        { id: 'cardio-miocardio-dilatada', name: 'Miocardiopatias - Dilatadas' },
        { id: 'cardio-miocardio-restritiva', name: 'Miocardiopatias - Restritivas' },
        { id: 'cardio-miocardio-chagas', name: 'Miocardiopatias - Chagásica' },
        { id: 'cardio-arritmias', name: 'Arritmias Cardíacas' },
        { id: 'cardio-cor-pulmonale', name: 'Cor Pulmonale Crônico' },
        { id: 'cardio-congenitas', name: 'Cardiopatias Congênitas' },
        { id: 'cardio-valvopatias', name: 'Valvopatias' },
        { id: 'cardio-pericardiopatias', name: 'Pericardiopatias/Aortopatias' }
      ]
    },
    { id: 'doenca-cegueira', name: 'Cegueira / Visão Monocular', icon: <EyeOff size={15} /> },
    { id: 'doenca-espondilite', name: 'Espondilite Anquilosante', icon: <Bone size={15} /> },
    { id: 'doenca-paget', name: 'Mal de Paget (Osteíte Deformante)', icon: <Bone size={15} /> },
    { id: 'doenca-hanseniase', name: 'Hanseníase', icon: <Activity size={15} /> },
    { id: 'doenca-parkinson', name: 'Doença de Parkinson', icon: <Activity size={15} /> },
    { id: 'doenca-nefropatia', name: 'Nefropatia Grave', icon: <Stethoscope size={15} /> },
    { id: 'doenca-neoplasia', name: 'Neoplasia Maligna', icon: <Ribbon size={15} /> },
    { id: 'doenca-paralisia', name: 'Paralisia Irreversível e Incapacitante', icon: <Activity size={15} /> },
    { id: 'doenca-penfigo', name: 'Pênfigos', icon: <AlertTriangle size={15} /> },
    { id: 'doenca-aids', name: 'SIDA/Aids', icon: <Shield size={15} /> },
    { id: 'doenca-tuberculose', name: 'Tuberculose Ativa', icon: <Wind size={15} /> },
    { id: 'doenca-hepatopatia', name: 'Hepatopatia Grave', icon: <Heart size={15} /> },
    { id: 'doenca-radiacao', name: 'Contaminação por Radiação', icon: <Radiation size={15} /> },
    { id: 'doenca-esclerose', name: 'Esclerose Múltipla', icon: <Activity size={15} /> },
    { id: 'doenca-fibrose', name: 'Fibrose Cística', icon: <FileText size={15} /> },
  ];

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const scroller = document.getElementById('portaria-scroll-container');
      const isScrollerScrollable = scroller && scroller.scrollHeight > scroller.clientHeight;

      if (isScrollerScrollable) {
        const elementRect = element.getBoundingClientRect();
        const scrollerRect = scroller.getBoundingClientRect();
        const offset = elementRect.top - scrollerRect.top + scroller.scrollTop - 12;
        scroller.scrollTo({ top: offset, behavior: 'smooth' });
      } else {
        // Fallback or window scrolling when container is overflowing globally
        const elementRect = element.getBoundingClientRect();
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        // Subtract 60px to clear the sticky header (h-12 is 48px)
        const offset = elementRect.top + scrollTop - 60;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }
  };

  const filteredDiseases = diseases.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <Header title="PORTARIA NA ÍNTEGRA" />
      
      <div 
        className="p-4 space-y-4 animate-fade-in overflow-auto pb-24 h-full" 
        id="portaria-scroll-container"
      >
        
        {/* Cabecalho da Portaria */}
        <div className="text-center bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-navy font-heading leading-tight uppercase">MINISTÉRIO DA DEFESA</h2>
          <p className="text-[11px] text-gray-500 font-body mt-1 uppercase tracking-wider font-bold">
            PORTARIA GM-MD Nº 3.551, DE 26 DE AGOSTO DE 2021
          </p>
          <p className="text-xs text-gray-600 mt-3 text-justify leading-relaxed max-w-xl mx-auto italic">
            Visualização completa da legislação para concessão de isenção de imposto de renda, reforma militar e benefícios previdenciários das JRS das Forças Armadas e do HFA.
          </p>
        </div>

        {/* Indice Interativo de Doencas */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-heading font-bold text-navy text-xs mb-3 flex items-center gap-2 tracking-wider">
            <FileText size={16} className="text-navy" />
            ÍNDICE DINÂMICO DE CONSULTA
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredDiseases.map((disease) => (
              <div key={disease.id} className="space-y-1">
                <button
                  onClick={() => handleScrollTo(disease.id)}
                  className="w-full text-left p-2 hover:bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-xs text-gray-700 transition-colors duration-150"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="text-navy/70">{disease.icon}</span>
                    {disease.name}
                  </span>
                  
                  {disease.subsections ? (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardioExpanded(!cardioExpanded);
                      }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400"
                    >
                      {cardioExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Ir</span>
                  )}
                </button>

                {disease.subsections && cardioExpanded && (
                  <div className="pl-6 space-y-1 transition-all">
                    {disease.subsections.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => handleScrollTo(sub.id)}
                        className="w-full text-left py-1 px-2 text-[11px] text-gray-500 hover:text-navy hover:bg-gray-50 rounded flex justify-between"
                      >
                        <span>• {sub.name}</span>
                        <span className="text-[9px] text-gray-400">Pular</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Texto Completo na Integra */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-8 text-gray-700 leading-relaxed font-body text-sm text-justify">
          
          {/* 1. Introdução / Preâmbulo / Capítulos I e II */}
          <IntroSection />

          {/* 2. Alienação Mental */}
          <AlienacaoMentalSection />

          {/* 3. Cardiopatia Grave */}
          <CardiopatiaGraveSection />

          {/* 4. Cegueira */}
          <CegueiraSection />

          {/* 5. Hepatopatia e Radiação */}
          <HepatopatiaRadiacaoSection />

          {/* 6. Outras Doenças (Hanseníase, Parkinson, Nefropatia, etc.) e Disposições Finais */}
          <OtherDiseasesSection />

        </div>
      </div>

      {/* Botao Flutuante Elegante de Voltar ao Topo */}
      {showScrollTop && (
        <button 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            const scroller = document.getElementById('portaria-scroll-container');
            if (scroller) scroller.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-20 right-6 bg-navy hover:bg-navy/85 text-white p-3 rounded-full shadow-lg transition-transform focus:outline-none z-[60] animate-fade-in"
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <ArrowUp size={18} />
        </button>
      )}

    </div>
  );
};
