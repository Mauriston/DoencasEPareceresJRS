import React, { useState, useRef, useEffect } from 'react';
import { DISEASES } from '../constants';
import { Disease, Diagnosis } from '../types';
import { ChevronRight, ChevronDown, Info, FileText, CheckCircle2, PlayCircle, Share2, Brain, HeartPulse, EyeOff, Radiation, Activity, Bone, Wind, Microscope, Droplets, Accessibility, Droplet, Stethoscope, Ribbon, Search, X, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';

import { Header } from './Header';

const getDiseaseIcon = (name: string) => {
  switch(name) {
    case "Alienação Mental": return <Brain className="text-navy" size={24} />;
    case "Cardiopatia Grave": return <HeartPulse className="text-navy" size={24} />;
    case "Cegueira": return <EyeOff className="text-navy" size={24} />;
    case "Contaminação por Radiação": return <Radiation className="text-navy" size={24} />;
    case "Doença de Parkinson": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>elderly</span>;
    case "Esclerose Múltipla (EM)": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>personal_injury</span>;
    case "Espondilite Anquilosante": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>orthopedics</span>;
    case "Estados Avançados de Doença de Paget": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>rheumatology</span>;
    case "Fibrose Cística": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>pulmonology</span>;
    case "Hanseníase": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>dermatology</span>;
    case "Hepatopatia Grave": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>bloodtype</span>;
    case "Nefropatia Grave": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>nephrology</span>;
    case "Neoplasia Maligna": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>oncology</span>;
    case "Paralisia Irreversível e Incapacitante": return <Accessibility className="text-navy" size={24} />;
    case "Pênfigo": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>dermatology</span>;
    case "SIDA/AIDS": return <Ribbon className="text-navy" size={24} />;
    case "Tuberculose Ativa": return <span className="material-symbols-outlined text-navy" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>pulmonology</span>;
    default: return <Stethoscope className="text-navy" size={24} />;
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
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isPragmatismModalOpen, setIsPragmatismModalOpen] = useState(false);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const handlePlayVideo = async () => {
    setIsVideoPlaying(true);
    if (videoContainerRef.current) {
      try {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen();
        } else if ((videoContainerRef.current as any).webkitRequestFullscreen) {
          await (videoContainerRef.current as any).webkitRequestFullscreen();
        }
      } catch (err) {
        console.error("Erro ao tentar abrir em tela cheia:", err);
      }
    }
  };

  const handleDiseaseClick = (disease: Disease) => {
    setIsDocumentsOpen(false);
    if (disease.diagnoses.length === 1) {
      setSelectedDisease(disease);
      setSelectedDiagnosis(disease.diagnoses[0]);
    } else {
      setExpandedDiseaseId(expandedDiseaseId === disease.id ? null : disease.id);
    }
  };

  const handleBackClick = () => {
    setIsDocumentsOpen(false);
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
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', error);
        }
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
    
    // Configurações e fontes
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const maxLineWidth = pageWidth - margin * 2;
    
    // Título principal
    doc.setFontSize(18);
    doc.setTextColor(5, 15, 65); // navy
    doc.text(selectedDisease.name, margin, yPos);
    yPos += 8;

    // Diagnóstico
    if (selectedDisease.diagnoses.length > 1) {
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Diagnóstico: ${selectedDiagnosis.name}`, margin, yPos);
      yPos += 12;
    } else {
      yPos += 4;
    }

    // Seção - Definição
    doc.setFontSize(14);
    doc.setTextColor(5, 15, 65);
    doc.text("Definição", margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const definitionLines = doc.splitTextToSize(selectedDisease.definition, maxLineWidth);
    doc.text(definitionLines, margin, yPos);
    yPos += definitionLines.length * 5 + 8;

    // Seção - Critérios de Gravidade
    doc.setFontSize(14);
    doc.setTextColor(5, 15, 65);
    doc.text("Critérios de Gravidade", margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    selectedDiagnosis.criteria.forEach(crit => {
      const critLines = doc.splitTextToSize(`• ${crit}`, maxLineWidth);
      // Checa se vai passar da página
      if (yPos + (critLines.length * 5) > doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPos = margin + 10;
      }
      doc.text(critLines, margin, yPos);
      yPos += critLines.length * 5 + 3;
    });
    
    yPos += 5;

    // Seção - Documentos Necessários
    // Checa se cabe o título na página
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

    // Salva o PDF
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

  const handleSearchResultClick = (result: any) => {
    setSearchQuery('');
    if (result.type === 'disease') {
      handleDiseaseClick(result.disease);
    } else if (result.type === 'diagnosis' || result.type === 'criterion') {
      setSelectedDisease(result.disease);
      setSelectedDiagnosis(result.diagnosis);
    }
    setIsSearchVisible(false);
  };

  if (selectedDisease && selectedDiagnosis) {
    return (
      <div className="animate-fade-in flex flex-col h-full bg-gray-50">
        {/* Modal Personalidade */}
        {isPersonalityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-navy text-white">
                <h3 className="font-heading font-bold text-lg flex items-center">
                  <Brain className="mr-2" size={20} /> Entendendo a Gravidade
                </h3>
                <button 
                  onClick={() => setIsPersonalityModalOpen(false)}
                  className="text-white hover:text-gray-300 transition-colors p-1"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4">
                <div>
                  <p className="mb-2">Na psiquiatria e na neurologia, a <strong>"alteração completa ou considerável da personalidade"</strong> descreve uma ruptura profunda e duradoura na forma como um indivíduo pensa, sente, age e se relaciona com o mundo.</p>
                  <p className="mb-2">A personalidade é, por definição, o nosso conjunto mais estável de traços e comportamentos. Quando ocorre essa alteração, não estamos falando de uma simples mudança de humor, de amadurecimento ou de uma resposta temporária ao estresse. Trata-se de uma transformação estrutural: a pessoa perde a sua essência prévia e passa a agir de uma maneira que se torna irreconhecível para os amigos e familiares.</p>
                  <h4 className="font-bold text-navy text-base mt-4 mb-2 border-b border-gray-100 pb-1">Como essa alteração se manifesta na prática?</h4>
                  <ul className="list-disc pl-5 space-y-2 text-gray-700">
                    <li><strong className="text-navy">Inversão de traços fundamentais:</strong> Alguém que sempre foi cauteloso, contido e educado pode se tornar impulsivo, agressivo e desinibido. Por outro lado, alguém extrovertido e empático pode se tornar frio, apático e isolado.</li>
                    <li><strong className="text-navy">Perda de filtros sociais e éticos:</strong> O paciente pode começar a apresentar comportamentos antissociais, falas inapropriadas, desrespeito por regras ou hipersexualidade — atitudes que jamais teria no passado.</li>
                    <li><strong className="text-navy">Cronicidade:</strong> A mudança não oscila de um dia para o outro como em um episódio de raiva; ela se instala de forma rígida e se torna o "novo normal" do indivíduo.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Pragmatismo */}
        {isPragmatismModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-navy text-white">
                <h3 className="font-heading font-bold text-lg flex items-center">
                  <Brain className="mr-2" size={20} /> Entendendo a Gravidade
                </h3>
                <button 
                  onClick={() => setIsPragmatismModalOpen(false)}
                  className="text-white hover:text-gray-300 transition-colors p-1"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4">
                <div>
                  <h4 className="font-bold text-navy text-base mb-1 border-b border-gray-100 pb-1">Destruição da Autodeterminação (A Esfera da Vontade)</h4>
                  <p className="mb-2">A autodeterminação é a capacidade humana de ter desejos, estabelecer propósitos, fazer escolhas e iniciar ações com base em motivações internas. A sua "destruição" significa a perda da agência — o paciente perde o próprio "motor" interno.</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li><strong className="text-navy">Termos técnicos associados:</strong> Na psiquiatria, isso é chamado de <strong>abulia</strong> (perda total da vontade), <strong>hipobulia</strong> (diminuição grave da vontade), <strong>avolição</strong> (falta de iniciativa) e <strong>apatia</strong> (indiferença afetiva).</li>
                    <li><strong className="text-navy">Como se manifesta:</strong> O indivíduo torna-se passivo em relação à própria vida. Ele não consegue tomar decisões simples (como o que comer ou vestir) e perde o interesse por hobbies, relacionamentos ou planos para o futuro.</li>
                    <li><strong className="text-navy">O que o paciente vivencia:</strong> Não é necessariamente uma angústia ativa, mas muitas vezes um "vazio". O paciente pode passar o dia inteiro deitado ou sentado, olhando para o nada, sem sentir o impulso interno necessário para se levantar e fazer algo.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-navy text-base mb-1 border-b border-gray-100 pb-1">Destruição do Pragmatismo (A Esfera da Execução)</h4>
                  <p className="mb-2">O pragmatismo refere-se à utilidade prática das nossas ações — a capacidade de planejar, organizar e executar tarefas do dia a dia de forma lógica e eficiente. A sua destruição é a perda da capacidade de traduzir o pensamento em ações úteis e direcionadas a um objetivo.</p>
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    <li><strong className="text-navy">Termos técnicos associados:</strong> <strong>Disfunção executiva</strong>, <strong>desorganização do comportamento</strong> e perda global de <strong>funcionalidade</strong>.</li>
                    <li><strong className="text-navy">Como se manifesta:</strong> Mesmo que o paciente tenha um desejo (uma fagulha de autodeterminação), ele não consegue estruturar os passos para realizá-lo. As ações tornam-se caóticas, incompletas ou bizarras.</li>
                    <li><strong className="text-navy">O que o paciente vivencia:</strong> Incapacidade de manter o autocuidado básico (como tomar banho e escovar os dentes), de administrar dinheiro, de manter um emprego ou de seguir uma receita médica. O comportamento perde o propósito prático; o paciente pode, por exemplo, vestir várias camadas de roupa no calor extremo ou acumular lixo no quarto sem um motivo lógico.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <Header 
          title={getShortDiseaseName(selectedDisease.name)} 
          leftAction={
            <button 
              onClick={handleBackClick}
              className="text-white p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
              aria-label="Voltar"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
          }
          rightAction={
            <div className="flex items-center space-x-1">
              <button
                onClick={handleDownloadPDF}
                className="text-white p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                aria-label="Baixar PDF"
                title="Baixar PDF"
              >
                <Download size={20} className="shrink-0" />
              </button>
              <button
                onClick={handleShare}
                className="text-white p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
                aria-label="Compartilhar"
                title="Compartilhar"
              >
                <Share2 size={20} className="shrink-0" />
              </button>
            </div>
          }
        />
        
        <div className="p-4 space-y-6">
          <div className="mb-2 px-2">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-navy">{selectedDisease.name}</h2>
            {selectedDisease.diagnoses.length > 1 && (
              <span className="inline-block mt-2 text-navy text-sm font-bold border-l-4 border-gold pl-2">
                Diagnóstico: {selectedDiagnosis.name}
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            {/* Definição */}
            <div className="bg-white rounded-lg shadow-md p-5 border border-gray-100">
              <section className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                <h3 className="text-blue-900 font-heading text-lg mb-2 flex items-center">
                  <Info className="mr-2" size={20} />
                  Definição
                </h3>
                <p className="text-gray-800 font-body leading-relaxed text-sm md:text-base font-medium">
                  {selectedDisease.definition}
                </p>
              </section>
            </div>

            {/* Critérios de Gravidade */}
            <div className="bg-white rounded-lg shadow-md p-5 border border-gray-100">
              <section>
                <h3 className="text-navy font-heading text-lg mb-3 flex items-center border-b border-gray-200 pb-2">
                  <CheckCircle2 className="mr-2 text-green" size={20} />
                  Critérios de Gravidade
                </h3>
                <ul className="space-y-2">
                  {selectedDiagnosis.criteria.map((item, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-700 font-body group">
                      <input type="checkbox" readOnly className="mt-1 mr-2 flex-shrink-0" style={{ accentColor: '#079551' }} checked />
                      <span className="flex-1">
                        {item.includes('autodeterminação e do pragmatismo') ? (
                          <>
                            {item.split(/(destruiç[ãa]o da autodeterminação e do pragmatismo|destruction da autodeterminação e do pragmatismo)/i).map((part, i) => {
                              if (part.match(/destruiç[ãa]o da autodeterminação e do pragmatismo|destruction da autodeterminação e do pragmatismo/i)) {
                                return (
                                  <button 
                                    key={i}
                                    onClick={() => setIsPragmatismModalOpen(true)}
                                    className="inline text-blue-600 hover:text-blue-800 focus:outline-none group text-left whitespace-normal h-auto"
                                    title="Entender esses termos"
                                  >
                                    <strong className="font-bold underline align-middle">{part}</strong>
                                    <Info size={16} className="inline ml-1 align-baseline -mt-1" />
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
                                  <button 
                                    key={i}
                                    onClick={() => setIsPersonalityModalOpen(true)}
                                    className="inline text-blue-600 hover:text-blue-800 focus:outline-none group text-left whitespace-normal h-auto"
                                    title="Entender esses termos"
                                  >
                                    <strong className="font-bold underline align-middle">{part}</strong>
                                    <Info size={16} className="inline ml-1 align-baseline -mt-1" />
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
              </section>
            </div>

            {/* Documentos Necessários */}
            <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
              <section>
                <button 
                  onClick={() => setIsDocumentsOpen(!isDocumentsOpen)}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center focus:outline-none"
                >
                  <div className="flex items-center text-navy font-heading text-lg">
                    <FileText className="mr-2 text-gold-dark" size={20} />
                    Documentos Necessários
                  </div>
                  <ChevronDown 
                    className={`text-navy transition-transform duration-300 ${isDocumentsOpen ? 'rotate-180' : ''}`} 
                    size={20} 
                  />
                </button>
                
                {isDocumentsOpen && (
                  <div className="p-4 bg-white border-t border-gray-200 animate-fade-in">
                    <ul className="space-y-3">
                      {selectedDisease.documents.map((item, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-800 font-body font-medium">
                          <input type="checkbox" readOnly className="mt-1 mr-2 accent-navy flex-shrink-0" checked />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>
          </div>
      </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <Header 
        title="DOENÇAS DE LEI" 
        rightAction={
          <button 
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className="text-white p-1 hover:bg-white/10 rounded-full transition-colors focus:outline-none"
            aria-label="Buscar"
          >
            <span className={`material-symbols-outlined ${isSearchVisible ? "text-gold" : "text-white"}`} style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>search</span>
          </button>
        }
      />
      <div className="p-4 space-y-4">
        <div className="mb-6 bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-navy">DOENÇAS PREVISTAS EM LEI</h2>
            <p className="text-xs text-gray-500 font-medium">PORTARIA GM-MD No 3.551, DE 26 DE AGOSTO DE 2021</p>
            <p className="text-sm text-gray-600 font-body mt-2 text-justify leading-relaxed">
              Resumo das Doenças de Lei com Definição, Critérios para Enquadramento e Documentos Médicos Necessários. Clique nas doenças abaixo e veja os resumos.
            </p>
          </div>
          <a 
            href="https://drive.google.com/open?id=1Rf2al57vzBQqb8uniy3m9ME_3xnOZFH4" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-navy hover:text-[#079551] transition-colors p-1 flex-shrink-0"
            title="Abrir Portaria em nova aba"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>open_in_new</span>
          </a>
        </div>
        {isSearchVisible && (
          <div className="relative z-20 animate-fade-in mb-2 mt-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 20" }}>search</span>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy sm:text-sm transition-shadow shadow-sm relative z-30"
              placeholder="Buscar por doença ou diagnóstico..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none z-30"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {searchQuery.trim().length > 0 && isSearchFocused && searchResults.length > 0 && (
              <ul className="absolute z-40 top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-fade-in">
                {searchResults.map(result => (
                  <li 
                    key={result.id} 
                    className="cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center transition-colors group"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <div className="p-3 pl-4 flex-1">
                      <p className="text-sm font-bold text-navy group-hover:text-[#079551] transition-colors line-clamp-2">{result.name}</p>
                      {result.sub && (
                        <p className="text-xs text-gray-500 mt-0.5 font-medium"><span className="font-bold text-navy/70 group-hover:text-[#079551]">{result.sub}</span></p>
                      )}
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-[#079551] transform group-hover:translate-x-1 transition-all mr-4 flex-shrink-0" size={18} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {filteredDiseases.length === 0 ? (
          <div className="text-center py-10 px-4">
            <span className="material-symbols-outlined text-gray-300 mb-3 mx-auto flex justify-center" style={{ fontSize: '48px', fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 48" }}>search</span>
            <h3 className="text-sm font-medium text-gray-900">Nenhuma doença encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tente buscar usando termos diferentes.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-navy font-medium hover:text-blue-800 text-sm"
            >
              Limpar busca
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredDiseases.map((disease) => (
            <div 
              key={disease.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all border-l-4 border-navy hover:border-[#079551] group flex flex-col overflow-hidden"
            >
              <div 
                onClick={() => handleDiseaseClick(disease)}
                className="p-4 cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3 flex-1 pr-2">
                  {getDiseaseIcon(disease.name)}
                  <h3 className="text-navy font-heading text-sm font-bold group-hover:text-[#079551] transition-colors m-0">
                    {disease.name}
                  </h3>
                </div>
                {disease.diagnoses.length > 1 ? (
                  expandedDiseaseId === disease.id ? (
                    <ChevronDown className="text-navy group-hover:text-[#079551] rotate-180 transition-transform shrink-0 ml-2" size={24} />
                  ) : (
                    <ChevronDown className="text-navy group-hover:text-[#079551] transition-transform shrink-0 ml-2" size={24} />
                  )
                ) : (
                  <ChevronRight className="text-navy group-hover:text-[#079551] transform group-hover:translate-x-1 transition-all shrink-0 ml-2" size={24} />
                )}
              </div>

              {disease.diagnoses.length > 1 && expandedDiseaseId === disease.id && (
                <div className="bg-[#eff1f5] flex flex-col animate-fade-in border-t border-gray-200">
                  {disease.diagnoses.map((diagnosis, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setSelectedDisease(disease);
                        setSelectedDiagnosis(diagnosis);
                      }}
                      className={`p-4 cursor-pointer flex justify-between items-center hover:bg-white transition-colors group/diag ${idx !== disease.diagnoses.length - 1 ? 'border-b border-white' : ''}`}
                    >
                      <div className="flex items-center space-x-3 md:pl-2 pl-0">
                        <span className="flex items-center justify-center min-w-[24px] h-[24px] rounded-full bg-navy text-white text-[11px] font-bold group-hover/diag:bg-gold transition-colors" title={`${diagnosis.criteria.length} Critérios`}>
                          {diagnosis.criteria.length}
                        </span>
                        <span className="text-sm font-semibold text-navy group-hover/diag:text-gold transition-colors">{diagnosis.name}</span>
                      </div>
                      <ChevronRight className="text-navy group-hover/diag:text-gold transform group-hover/diag:translate-x-1 transition-all" size={20} />
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