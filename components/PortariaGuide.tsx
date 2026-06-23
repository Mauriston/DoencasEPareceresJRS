// Ficheiro: components/PortariaGuide.tsx
import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { 
  Brain, HeartPulse, EyeOff, Radiation, Activity, Bone, Ribbon, Shield, 
  Wind, Stethoscope, FileText, ChevronDown, ChevronUp, ChevronRight, 
  ArrowUp, AlertTriangle, Heart 
} from 'lucide-react';

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
      if (window.scrollY > 250) setShowScrollTop(true);
      else setShowScrollTop(false);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const diseases: DiseaseIndexItem[] = [
    { id: 'doenca-alienacao', name: 'Alienação Mental', icon: <Brain size={14} /> },
    { 
      id: 'doenca-cardiopatia', 
      name: 'Cardiopatia Grave', 
      icon: <HeartPulse size={14} />,
      subsections: [
        { id: 'doenca-cardiopatia', name: 'Conceituação Geral' },
        { id: 'cardio-isquemica-aguda-ssst', name: 'Isquémica - Aguda S/ SST' },
        { id: 'cardio-isquemica-aguda-csst', name: 'Isquémica - Aguda C/ SST' },
        { id: 'cardio-isquemica-cronica', name: 'Isquémica - Crônica' },
        { id: 'cardio-hipertensiva', name: 'Cardiopatia Hipertensiva' },
        { id: 'cardio-miocardio-hyper', name: 'Miocardiopatias - Hipertróficas' },
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
    { id: 'doenca-cegueira', name: 'Cegueira / Visão Monocular', icon: <EyeOff size={14} /> },
    { id: 'doenca-espondilite', name: 'Espondilite Anquilosante', icon: <Bone size={14} /> },
    { id: 'doenca-paget', name: 'Mal de Paget (Osteíte Deformante)', icon: <Bone size={14} /> },
    { id: 'doenca-hanseniase', name: 'Hanseníase', icon: <Activity size={14} /> },
    { id: 'doenca-parkinson', name: 'Doença de Parkinson', icon: <Activity size={14} /> },
    { id: 'doenca-nefropatia', name: 'Nefropatia Grave', icon: <Stethoscope size={14} /> },
    { id: 'doenca-neoplasia', name: 'Neoplasia Maligna', icon: <Ribbon size={14} /> },
    { id: 'doenca-paralisia', name: 'Paralisia Irreversível e Incapacitante', icon: <Activity size={14} /> },
    { id: 'doenca-penfigo', name: 'Pênfigos', icon: <AlertTriangle size={14} /> },
    { id: 'doenca-aids', name: 'SIDA/Aids', icon: <Shield size={14} /> },
    { id: 'doenca-tuberculose', name: 'Tuberculose Ativa', icon: <Wind size={14} /> },
    { id: 'doenca-hepatopatia', name: 'Hepatopatia Grave', icon: <Heart size={14} /> },
    { id: 'doenca-radiacao', name: 'Contaminação por Radiação', icon: <Radiation size={14} /> },
    { id: 'doenca-esclerose', name: 'Esclerose Múltipla', icon: <Activity size={14} /> },
    { id: 'doenca-fibrose', name: 'Fibrose Cística', icon: <FileText size={14} /> },
  ];

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = element.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  };

  const filteredDiseases = diseases.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] relative">
      <Header title="Portaria na Integra" />
      
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1">
        <div className="text-center bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm">
          <h2 className="text-sm font-heading font-bold text-[#050F41]">PORTARIA GM-MD Nº 3.551, DE 26 DE AGOSTO DE 2021</h2>
          <p className="text-xs text-gray-500 font-body mt-1">Diretrizes e Normas Técnicas Periciais Oficiais das Forças Armadas.</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm">
          <h3 className="font-heading font-bold text-xs text-[#050F41] mb-2.5 flex items-center gap-2 tracking-wider">
            <FileText size={16} /> ÍNDICE DINÂMICO DE LEITURA
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredDiseases.map(disease => (
              <div key={disease.id} className="space-y-1">
                <button 
                  onClick={() => handleScrollTo(disease.id)}
                  className="w-full text-left p-2.5 bg-gray-50 hover:bg-[#050F41]/5 rounded-xl border border-gray-100 flex items-center justify-between text-xs text-gray-700 font-medium transition-all"
                >
                  <span className="flex items-center gap-2 truncate">{disease.icon}{disease.name}</span>
                  {disease.subsections ? (
                    <span onClick={(e) => { e.stopPropagation(); setCardioExpanded(!cardioExpanded); }} className="p-1 hover:bg-gray-200/60 rounded text-gray-400">
                      {cardioExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>
                {disease.subsections && cardioExpanded && (
                  <div className="pl-4 space-y-1 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100/50">
                    {disease.subsections.map(sub => (
                      <button key={sub.id} onClick={() => handleScrollTo(sub.id)} className="w-full text-left py-1.5 px-2 text-[11px] text-gray-500 hover:text-[#050F41] rounded flex justify-between font-body font-medium">
                        <span>• {sub.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm space-y-8 font-body text-sm text-gray-700 leading-relaxed text-justify">
          <IntroSection />
          <AlienacaoMentalSection />
          <CardiopatiaGraveSection />
          <CegueiraSection />
          <HepatopatiaRadiacaoSection />
          <OtherDiseasesSection />
        </div>
      </div>

      {showScrollTop && (
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 bg-[#050F41] text-white shadow-2xl rounded-full p-4 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border border-slate-700"
          title="Voltar ao topo"
        >
          <ArrowUp size={20} />
        </button>
      )}
    </div>
  );
};
