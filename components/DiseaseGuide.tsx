import React, { useState, useRef, useEffect } from 'react';
import { DISEASES } from '../constants';
import { Disease, Diagnosis } from '../types';
import { ChevronRight, ChevronDown, Info, FileText, CheckCircle2, Share2, Brain, HeartPulse, EyeOff, Radiation, Accessibility, Stethoscope, Ribbon, X, Download, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Header } from './Header';

const getDiseaseIcon = (name: string) => {
  switch(name) {
    case "Alienação Mental": return <Brain className="text-[#050F41]" size={22} />;
    case "Cardiopatia Grave": return <HeartPulse className="text-[#050F41]" size={22} />;
    case "Cegueira": return <EyeOff className="text-[#050F41]" size={22} />;
    case "Contaminação por Radiação": return <Radiation className="text-[#050F41]" size={22} />;
    case "Doença de Parkinson": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>elderly</span>;
    case "Esclerose Múltipla (EM)": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>personal_injury</span>;
    case "Espondilite Anquilosante": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>orthopedics</span>;
    case "Estados Avançados de Doença de Paget": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>rheumatology</span>;
    case "Fibrose Cística": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>pulmonology</span>;
    case "Hanseníase": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>dermatology</span>;
    case "Hepatopatia Grave": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>bloodtype</span>;
    case "Nefropatia Grave": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>nephrology</span>;
    case "Neoplasia Maligna": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>oncology</span>;
    case "Paralisia Irreversível e Incapacitante": return <Accessibility className="text-[#050F41]" size={22} />;
    case "Pênfigo": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>dermatology</span>;
    case "SIDA/AIDS": return <Ribbon className="text-[#050F41]" size={22} />;
    case "Tuberculose Ativa": return <span className="material-symbols-outlined text-[#050F41]" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>pulmonology</span>;
    default: return <Stethoscope className="text-[#050F41]" size={22} />;
  }
};

const getShortDiseaseName = (name: string) => {
  switch (name) {
    case "Alienação Mental": return "ALIENAÇÃO";
    case "Cardiopatia Grave": return "CARDIOPATIA";
    case "Cegueira": return "CEGUEIRA";
    case "Contaminação por Radiação": return "RADIAÇÃO";
    case "Doença de Parkinson": return "PARKINSON";
    case "Esclerose Múltipla (EM)": return "ESCLEROSE";
    case "Espondilite Anquilosante": return "ESPONDILITE";
    case "Estados Avançados de Doença de Paget": return "PAGET";
    case "Fibrose Cística": return "FIBROSE CÍSTICA";
    case "Hanseníase": return "HANSENÍASE";
    case "Hepatopatia Grave": return "HEPATOPATIA";
    case "Nefropatia Grave": return "NEFROPATIA";
    case "Neoplasia Maligna": return "NEOPLASIA";
    case "Paralisia Irreversível e Incapacitante": return "PARALISIA";
    case "Pênfigo": return "PÊNFIGO";
    case "Pênfigo Grave": return "PÊNFIGO";
    case "SIDA/AIDS": return "SIDA/AIDS";
    case "Tuberculose Ativa": return "TUBERCULOSE";
    default: return name.toUpperCase();
  }
};

export const DiseaseGuide: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);
  const [isPragmatismModalOpen, setIsPragmatismModalOpen] = useState(false);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);

  const handleDiseaseClick = (disease: Disease) => {
    if (disease.diagnoses.length === 1) {
      setSelectedDisease(disease);
      setSelectedDiagnosis(disease.diagnoses[0]);
    } else {
      setExpandedDiseaseId(expandedDiseaseId === disease.id ? null : disease.id);
    }
  };

  const handleBackClick = () => {
    if (selectedDisease && selectedDiagnosis && selectedDisease.diagnoses.length > 1) {
      setSelectedDiagnosis(null);
    } else {
      setSelectedDisease(null);
      setSelectedDiagnosis(null);
    }
  };

  const handleShare = async () => {
    if (!selectedDisease || !selectedDiagnosis) return;

    const shareTitle = `${selectedDisease.name} - ${selectedDiagnosis.name}`;
    const shareText = `Doença: ${selectedDisease.name}\nDiagnóstico: ${selectedDiagnosis.name}\n\nDefinição:\n${selectedDisease.definition}\n\nCritérios de Gravidade:\n${selectedDiagnosis.criteria.map(c => `- ${c}`).join('\n')}\n\nDocumentos Necessários:\n${selectedDisease.documents.map(d => `- ${d}`).join('\n')}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') console.error('Erro ao compartilhar:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Resumo copiado para a área de transferência!');
      } catch (error) {
        console.error('Erro ao copiar:', error);
      }
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedDisease || !selectedDiagnosis) return;

    const doc = new jsPDF();
    let yPos = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const maxLineWidth = pageWidth - margin * 2;
    
    doc.setFontSize(18);
    doc.setTextColor(5, 15, 65);
    doc.text(selectedDisease.name, margin, yPos);
    yPos += 8;

    if (selectedDisease.diagnoses.length > 1) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Diagnóstico: ${selectedDiagnosis.name}`, margin, yPos);
      yPos += 12;
    } else {
      yPos += 4;
    }

    doc.setFontSize(14);
    doc.setTextColor(5, 15, 65);
    doc.text("Definição", margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const definitionLines = doc.splitTextToSize(selectedDisease.definition, maxLineWidth);
    doc.text(definitionLines, margin, yPos);
    yPos += definitionLines.length * 5 + 8;

    doc.setFontSize(14);
    doc.setTextColor(5, 15, 65);
    doc.text("Critérios de Gravidade", margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    selectedDiagnosis.criteria.forEach(crit => {
      const critLines = doc.splitTextToSize(`• ${crit}`, maxLineWidth);
      if (yPos + (critLines.length * 5) > doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPos = margin + 10;
      }
      doc.text(critLines, margin, yPos);
      yPos += critLines.length * 5 + 3;
    });
    
    yPos += 5;

    if (yPos + 10 > doc.internal.pageSize.height - margin) {
      doc.addPage();
      yPos = margin + 10;
    }

    doc.setFontSize(14);
    doc.setTextColor(5, 15, 65);
    doc.text("Documentos Necessários", margin, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    selectedDisease.documents.forEach(docItem => {
      const docLines = doc.splitTextToSize(`• ${docItem}`, maxLineWidth);
      if (yPos + (docLines.length * 5) > doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPos = margin + 10;
      }
      doc.text(docLines, margin, yPos);
      yPos += docLines.length * 5 + 3;
    });

    const safeName = selectedDisease.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    doc.save(`guia-${safeName}.pdf`);
  };

  const filteredDiseases = DISEASES.filter(disease => {
    const query = searchQuery.toLowerCase();
    const diseaseMatched = disease.name.toLowerCase().includes(query);
    const diagnosisMatched = disease.diagnoses.some(diag => 
      diag.name.toLowerCase().includes(query) || 
      diag.criteria.some(crit => crit.toLowerCase().includes(query))
    );
    return diseaseMatched || diagnosisMatched;
  });

  const searchResults: { type: 'disease' | 'diagnosis' | 'criterion', id: string, name: string, sub?: string, disease: Disease, diagnosis?: Diagnosis }[] = [];
  if (searchQuery.trim().length > 0) {
    const query = searchQuery.toLowerCase();
    DISEASES.forEach(disease => {
      if (disease.name.toLowerCase().includes(query)) {
        searchResults.push({ type: 'disease', id: `dz-${disease.id}`, name: disease.name, disease });
      }

      disease.diagnoses.forEach((diag, idx) => {
        if (diag.name.toLowerCase().includes(query)) {
           searchResults.push({ type: 'diagnosis', id: `dg-${disease.id}-${idx}`, name: diag.name, sub: `em ${disease.name}`, disease, diagnosis: diag });
        }
        diag.criteria.forEach((crit, critIdx) => {
          if (crit.toLowerCase().includes(query)) {
            searchResults.push({ type: 'criterion', id: `crit-${disease.id}-${idx}-${critIdx}`, name: crit, sub: `Critério para ${diag.name}`, disease, diagnosis: diag });
          }
        });
      });
    });
  }

  if (selectedDisease && selectedDiagnosis) {
    return (
      <div className="animate-fade-in flex flex-col h-full bg-[#F3F5F7]">
        {/* Modal Personalidade */}
        {isPersonalityModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050F41]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#050F41] text-white">
                <h3 className="font-heading font-bold text-base flex items-center">
                  <Brain className="mr-2 text-[#FAB932]" size={18} /> Entendendo a Gravidade
                </h3>
                <button onClick={() => setIsPersonalityModalOpen(false)} className="text-white hover:text-gray-300 p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4">
                <p>Na psiquiatria e na neurologia, a <strong>"alteração completa ou considerável da personalidade"</strong> descreve uma ruptura profunda e duradoura na forma como um indivíduo pensa, sente, age e se relaciona com o mundo.</p>
                <p>A personalidade é o nosso conjunto mais estável de traços. Quando ocorre essa alteração, trata-se de uma transformação estrutural: a pessoa perde a sua essência prévia e passa a agir de uma maneira que se torna irreconhecível para os amigos e familiares.</p>
                <h4 className="font-bold text-[#050F41] text-sm mt-2 border-b border-gray-100 pb-1 uppercase tracking-wide">Manifestações na prática:</h4>
                <ul className="list-disc pl-5 space-y-2 text-gray-700 text-xs">
                  <li><strong>Inversão de traços fundamentais:</strong> Alguém calmo e educado pode se tornar impulsivo e agressivo.</li>
                  <li><strong>Perda de filtros sociais:</strong> Comportamentos inapropriados ou desrespeito frontal por regras sociais estabelecidas.</li>
                  <li><strong>Cronicidade:</strong> A mudança instala-se de forma rígida e duradoura.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pragmatismo */}
        {isPragmatismModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050F41]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#050F41] text-white">
                <h3 className="font-heading font-bold text-base flex items-center">
                  <Brain className="mr-2 text-[#FAB932]" size={18} /> Entendendo a Gravidade
                </h3>
                <button onClick={() => setIsPragmatismModalOpen(false)} className="text-white hover:text-gray-300 p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4">
                <div>
                  <h4 className="font-bold text-[#050F41] text-sm mb-1 border-b border-gray-100 pb-1 uppercase tracking-wide">Destruição da Autodeterminação</h4>
                  <p className="text-xs text-gray-700">A autodeterminação é a capacidade humana de fazer escolhas e iniciar ações com base em motivações internas. A sua destruição acarreta perda total de agência pericial (abulia, hipobulia marcante ou avolição severa).</p>
                </div>
                <div>
                  <h4 className="font-bold text-[#050F41] text-sm mb-1 border-b border-gray-100 pb-1 uppercase tracking-wide">Destruição do Pragmatismo</h4>
                  <p className="text-xs text-gray-700">O pragmatismo refere-se à utilidade prática das ações diárias. A sua perda destrói a capacidade de planejar, organizar e executar tarefas do dia a dia (incapacidade de manter o autocuidado básico, gerir finanças ou exercer atividades laborais).</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* M3 Header com Título Alinhado à Esquerda */}
        <Header 
          title={getShortDiseaseName(selectedDisease.name)} 
          leftAction={
            <button onClick={handleBackClick} className="text-white p-2 rounded-full hover:bg-white/10">
              <ArrowLeft size={20} />
            </button>
          }
          rightAction={
            <div className="flex items-center space-x-1">
              <button onClick={handleDownloadPDF} className="text-white p-2 rounded-full hover:bg-white/10" title="Baixar PDF"><Download size={20} /></button>
              <button onClick={handleShare} className="text-white p-2 rounded-full hover:bg-white/10" title="Compartilhar"><Share2 size={20} /></button>
            </div>
          }
        />
        
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
          {/* Título de Contexto */}
          <div className="px-1">
            <h2 className="text-xl font-heading font-bold text-[#050F41] uppercase">{selectedDisease.name}</h2>
            {selectedDisease.diagnoses.length > 1 && (
              <p className="text-xs font-semibold text-gray-500 font-body mt-1">Diagnóstico Pericial: {selectedDiagnosis.name}</p>
            )}
          </div>
          
          {/* Definição */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <h3 className="font-heading font-bold text-xs text-gray-400 tracking-wider mb-2 uppercase">Conceituação Oficial</h3>
            <p className="font-body text-gray-800 text-sm leading-relaxed text-justify font-medium">{selectedDisease.definition}</p>
          </div>

          {/* Critérios de Gravidade (Lista Discreta e Harmoniosa) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <h3 className="font-heading font-bold text-sm text-[#050F41] mb-3 border-b border-gray-100 pb-2 flex items-center">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">verified</span>
              CRITÉRIOS DE GRAVIDADE
            </h3>
            <ul className="space-y-3.5">
              {selectedDiagnosis.criteria.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 font-body">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#079551] shrink-0 mt-2" />
                  <span className="leading-relaxed text-justify flex-1">
                    {item.includes('autodeterminação e do pragmatismo') ? (
                      <>
                        {item.split(/(destruiç[ãa]o da autodeterminação e do pragmatismo|destruction da autodeterminação e do pragmatismo)/i).map((part, i) => {
                          if (part.match(/destruiç[ãa]o da autodeterminação e do pragmatismo|destruction da autodeterminação e do pragmatismo/i)) {
                            return (
                              <button key={i} onClick={() => setIsPragmatismModalOpen(true)} className="inline text-blue-600 hover:text-blue-800 focus:outline-none text-left font-semibold">
                                <span className="underline align-middle">{part}</span>
                                <Info size={14} className="inline ml-1 align-baseline -mt-0.5" />
                              </button>
                            );
                          }
                          return part;
                        })}
                      </>
                    ) : item.includes('alteração completa ou considerável da personalidade') ? (
                      <>
                        {item.split(/(alteração completa ou considerável da personalidade)/i).map((part, i) => {
                          if (part.match(/alteração completa ou considerável da personalidade/i)) {
                            return (
                              <button key={i} onClick={() => setIsPersonalityModalOpen(true)} className="inline text-blue-600 hover:text-blue-800 focus:outline-none text-left font-semibold">
                                <span className="underline align-middle">{part}</span>
                                <Info size={14} className="inline ml-1 align-baseline -mt-0.5" />
                              </button>
                            );
                          }
                          return part;
                        })}
                      </>
                    ) : (
                      item
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Documentos Necessários (Convertido para Lista Direta Aberta e Harmonizada - Sem Accordion) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <h3 className="font-heading font-bold text-sm text-[#050F41] mb-3 border-b border-gray-100 pb-2 flex items-center">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">folder_open</span>
              DOCUMENTOS COMPROBATÓRIOS EXIGIDOS
            </h3>
            <ul className="space-y-3">
              {selectedDisease.documents.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 font-body">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#050F41] shrink-0 mt-2" />
                  <span className="leading-relaxed text-justify flex-1 font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7]">
      <Header title="Doenças de Lei" />
      
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
        {/* M3 Search Bar Inline, Permanente e Persistente */}
        <div className="relative w-full z-20">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input
            type="text"
            className="block w-full pl-11 pr-10 py-3.5 border border-gray-200 rounded-full bg-white text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#050F41]/10 transition-all font-body"
            placeholder="Pesquisar por doença, diagnóstico ou critério..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none">
              <X size={18} />
            </button>
          )}

          {/* Dropdown de Resultados Instantâneos M3 */}
          {searchQuery.trim().length > 0 && isSearchFocused && searchResults.length > 0 && (
            <ul className="absolute z-50 top-full mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-fade-in divide-y divide-gray-50">
              {searchResults.map(result => (
                <li 
                  key={result.id} 
                  className="cursor-pointer hover:bg-gray-50 p-3.5 flex items-center justify-between transition-colors group"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#050F41] group-hover:text-[#079551] transition-colors truncate">{result.name}</p>
                    {result.sub && <p className="text-[10px] text-gray-400 mt-0.5 font-medium truncate">{result.sub}</p>}
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#079551] transition-all" />
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Listagem Geral de Doenças */}
        {filteredDiseases.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200/60 p-6 shadow-sm">
            <span className="material-symbols-outlined text-gray-300 text-4xl mb-2 flex justify-center">search_off</span>
            <h3 className="text-sm font-semibold text-gray-700">Nenhuma patologia localizada</h3>
            <p className="mt-1 text-xs text-gray-400 font-body">Refine os termos médicos da busca.</p>
          </div>
        ) : (
          <div className="grid gap-2.5">
            {filteredDiseases.map((disease) => (
              <div key={disease.id} className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden transition-all duration-200 active:scale-[0.995]">
                <div onClick={() => handleDiseaseClick(disease)} className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center space-x-3 truncate">
                    {getDiseaseIcon(disease.name)}
                    <h3 className="text-[#050F41] font-heading text-sm font-semibold truncate m-0">{disease.name}</h3>
                  </div>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${expandedDiseaseId === disease.id && disease.diagnoses.length > 1 ? 'rotate-90 text-[#079551]' : ''}`} />
                </div>

                {/* Subdiagnósticos (Removido os badges/números à esquerda para visual limpo) */}
                {disease.diagnoses.length > 1 && expandedDiseaseId === disease.id && (
                  <div className="bg-gray-50/60 border-t border-gray-100 flex flex-col divide-y divide-gray-100/60">
                    {disease.diagnoses.map((diagnosis, idx) => (
                      <div 
                        key={idx}
                        onClick={() => { setSelectedDisease(disease); setSelectedDiagnosis(diagnosis); }}
                        className="p-3.5 pl-12 cursor-pointer flex justify-between items-center hover:bg-white transition-colors"
                      >
                        <span className="text-xs font-medium text-gray-700 font-body">{diagnosis.name}</span>
                        <ChevronRight size={14} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};