// Ficheiro: components/DiseaseGuide.tsx
import React, { useState, useEffect } from 'react';
import { DISEASES } from '../constants';
import { Disease, Diagnosis } from '../types';
import { ChevronRight, Info, Brain, HeartPulse, EyeOff, Radiation, Accessibility, Stethoscope, Ribbon, X, Download, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Header } from './Header';

// ==========================================
// DADOS E LÓGICA DA CALCULADORA CDR
// ==========================================
const cdrData = [
  { id: 'M', nome: 'Memória', sigla: '(M)', opcoes: [
      { pt: 0, desc: "Sem perda de memória ou perda leve e inconstante." },
      { pt: 0.5, desc: "Esquecimento constante, recordação parcial de eventos." },
      { pt: 1, desc: "Perda de memória moderada, mais para eventos recentes, atrapalha as atividades de vida diária." },
      { pt: 2, desc: "Perda grave de memória, apenas assunto altamente aprendido é recordado." },
      { pt: 3, desc: "Perda de memória grave. Apenas fragmentos são recordados." }
  ]},
  { id: 'O', nome: 'Orientação', sigla: '(O)', opcoes: [
      { pt: 0, desc: "Completa orientação." },
      { pt: 0.5, desc: "Completamente orientado com dificuldade leve em relação ao tempo." },
      { pt: 1, desc: "Dificuldade moderada com relação ao tempo, orientado em áreas familiares." },
      { pt: 2, desc: "Dificuldade grave com relação ao tempo, desorientado quase sempre no espaço." },
      { pt: 3, desc: "Apenas orientado em relação a pessoas." }
  ]},
  { id: 'JSP', nome: 'Julgamento e solução de problemas', sigla: '(JSP)', opcoes: [
      { pt: 0, desc: "Resolve problemas diários, como problemas financeiros; julgamento preservado." },
      { pt: 0.5, desc: "Dificuldade leve para solucionar problemas, similaridades e diferenças." },
      { pt: 1, desc: "Dificuldade moderada em lidar com problemas, similaridades e diferenças, julgamento social mantido." },
      { pt: 2, desc: "Dificuldade séria em lidar com problemas, similaridades e diferenças, julgamento social danificado." },
      { pt: 3, desc: "Incapaz de fazer julgamento ou resolver problemas." }
  ]},
  { id: 'RC', nome: 'Relações comunitárias', sigla: '(RC)', opcoes: [
      { pt: 0, desc: "Função independente no trabalho, compras, grupos sociais." },
      { pt: 0.5, desc: "Leve dificuldade nestas tarefas." },
      { pt: 1, desc: "Não é independente nestas atividades, parece normal em uma inspeção casual." },
      { pt: 2, desc: "Não há independência fora de casa, parece bem o bastante para ser levado fora de casa." },
      { pt: 3, desc: "Não há independência fora de casa, parece doente o bastante para ser levado fora de casa." }
  ]},
  { id: 'LP', nome: 'Lar e passatempos', sigla: '(LP)', opcoes: [
      { pt: 0, desc: "Vida em casa, passatempos e interesses intelectuais bem mantidos." },
      { pt: 0.5, desc: "Vida em casa, passatempos, interesses intelectuais levemente prejudicados." },
      { pt: 1, desc: "Prejuízo suave em tarefas em casa, tarefas mais difíceis, passatempo e interesses abandonados." },
      { pt: 2, desc: "Apenas tarefas simples são preservadas, interesses muito restritos e pouco mantidos." },
      { pt: 3, desc: "Sem função significativa em casa." }
  ]},
  { id: 'CP', nome: 'Cuidados pessoais', sigla: '(CP)', opcoes: [
      { pt: 0, desc: "Completamente capaz de cuidar-se." },
      { pt: 0.5, desc: "Completamente capaz de cuidar-se." },
      { pt: 1, desc: "Necessita de ajuda." },
      { pt: 2, desc: "Requer assistência ao vestir-se, para higiene." },
      { pt: 3, desc: "Muita ajuda para cuidados pessoais, incontinências freqüentes." }
  ]}
];

function calcularGlobalCDR(M: number, secScores: number[]) {
  const count = (conditionFn: (s: number) => boolean) => secScores.filter(conditionFn).length;
  if (M === 0) {
      if (count(s => s >= 0.5) >= 2) return 0.5;
      return 0;
  }
  if (M === 0.5) {
      if (count(s => s >= 1) >= 3) return 1;
      return 0.5;
  }
  const greater = count(s => s > M);
  const less = count(s => s < M);
  const equal = count(s => s === M);

  if (equal >= 3) return M;
  if (count(s => s === 0) >= 3) return 0.5;

  if (greater >= 3 || less >= 3) {
      if ((greater === 3 && less === 2) || (less === 3 && greater === 2)) return M;
      const maioriaArray = greater >= 3 ? secScores.filter(s => s > M) : secScores.filter(s => s < M);
      let freqs: Record<number, number> = {};
      maioriaArray.forEach(s => freqs[s] = (freqs[s] || 0) + 1);
      let maxFreq = 0;
      for (let k in freqs) if (freqs[k] > maxFreq) maxFreq = freqs[k];
      const modas = Object.keys(freqs).filter(k => freqs[Number(k)] === maxFreq).map(Number);
      if (modas.length === 1) return modas[0];
      let closest = modas[0];
      let minDiff = Math.abs(modas[0] - M);
      for (let i = 1; i < modas.length; i++) {
          const diff = Math.abs(modas[i] - M);
          if (diff < minDiff) {
              closest = modas[i];
              minDiff = diff;
          }
      }
      return closest;
  }
  return M;
}

function getStageText(globalScore: number) {
  switch(globalScore) {
      case 0: return { titulo: "Normal", sub: "sem demência" };
      case 0.5: return { titulo: "Questionável", sub: "a muito leve" };
      case 1: return { titulo: "Leve", sub: "demência" };
      case 2: return { titulo: "MODERADA", sub: "demência" };
      case 3: return { titulo: "GRAVE", sub: "demência" };
      default: return { titulo: "", sub: "" };
  }
}

// ==========================================
// COMPONENTE: CALCULADORA CDR (TELA CHEIA)
// ==========================================
const CdrCalculator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [scores, setScores] = useState({ M: 0, O: 0, JSP: 0, RC: 0, LP: 0, CP: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const secScores = [scores.O, scores.JSP, scores.RC, scores.LP, scores.CP];
  const globalScore = calcularGlobalCDR(scores.M, secScores);
  const sbScore = scores.M + secScores.reduce((acc, val) => acc + val, 0);
  const stage = getStageText(globalScore);

  const handleCopy = async () => {
    const text = `CLINICAL DEMENTIA RATING:\n\n- M = ${scores.M}\n- O = ${scores.O}\n- JSP = ${scores.JSP}\n- RC = ${scores.RC}\n- LP = ${scores.LP}\n- CP = ${scores.CP}\n-------------------------------\n- Global CDR = ${globalScore}\n- CDR-SB = ${sbScore}\n\n- RESULTADO: ${stage.titulo} (${stage.sub})`;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      if (navigator.share) {
        await navigator.share({
          title: 'Avaliação CDR Score',
          text: text
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Erro ao partilhar/copiar:", err);
      }
    }
  };

  const isGrave = globalScore === 3;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col animate-fade-in font-body pb-28">
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm sticky top-0 z-40 flex items-center px-4 py-4 md:py-6">
        <button onClick={onClose} className="mr-4 text-gray-500 hover:text-[#050F41] transition-colors p-1">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#050F41] font-heading leading-none">CDR Score</h1>
          <p className="text-xs text-gray-500 mt-1">Calculadora validada em português</p>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto p-4 w-full custom-scrollbar">
        {cdrData.map(cat => (
          <div key={cat.id} className="mb-8">
            <h2 className="text-base md:text-lg font-bold text-[#050F41] mb-3">{cat.nome} <span className="text-gray-500 font-normal">{cat.sigla}</span></h2>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              {cat.opcoes.map(opt => {
                const isSelected = scores[cat.id as keyof typeof scores] === opt.pt;
                const ptText = opt.pt === 0 ? '0' : '+' + opt.pt;
                return (
                  <div 
                    key={opt.pt} 
                    onClick={() => { setScores({...scores, [cat.id]: opt.pt}); setIsCopied(false); }}
                    className={`flex items-center p-3 md:p-4 cursor-pointer select-none transition-colors border-b border-gray-100 last:border-0 ${isSelected ? 'bg-[#050F41] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className="flex-1 pr-4 text-sm md:text-base leading-snug">{opt.desc}</div>
                    <div className={`font-bold text-sm md:text-base whitespace-nowrap px-2 py-1 rounded bg-black/5 ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                        {ptText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>

      {/* Rodapé Fixo */}
      <div className={`fixed bottom-0 left-0 w-full text-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 transition-colors duration-300 ${isGrave ? 'bg-red-900' : 'bg-[#050F41]'}`}>
        <div className="max-w-3xl mx-auto flex flex-row items-center justify-between p-4 md:p-6">
            
            {/* Pontuações */}
            <div className="flex flex-col justify-center">
                <div className="flex items-baseline gap-1 md:gap-2">
                    <span className="text-4xl md:text-5xl font-bold tracking-tight">{globalScore}</span>
                    <span className="text-sm md:text-lg text-gray-200">pontos</span>
                    <button onClick={() => setIsModalOpen(true)} className="ml-1 text-white hover:text-gray-300 focus:outline-none transition-colors" title="Informações sobre a pontuação">
                        <span className="material-symbols-outlined text-[20px] md:text-[24px]">info</span>
                    </button>
                </div>
                <div className="text-xs md:text-sm text-gray-300 mt-1 font-medium">Escore Global CDR</div>
                <div className="text-xs md:text-sm text-gray-400 mt-0.5">Escore CDR-SB: <span className="text-white font-semibold">{sbScore}</span> pontos</div>
            </div>

            {/* Estágio & Copiar */}
            <div className="flex items-center">
                <button 
                  onClick={handleCopy} 
                  disabled={isCopied}
                  className={`mr-4 transition-colors flex items-center justify-center p-2 rounded-full ${isCopied ? 'text-white/40 cursor-not-allowed bg-black/10' : 'text-white hover:bg-white/10 active:scale-95'}`}
                  title="Copiar Resultado"
                >
                   <span className="material-symbols-outlined text-[24px]">
                     {isCopied ? 'done_all' : 'content_copy'}
                   </span>
                </button>
                <div className={`border-l-2 ${isGrave ? 'border-red-400' : 'border-blue-400'} pl-4 md:pl-6 flex flex-col justify-center h-full`}>
                    <div className="text-xl md:text-3xl font-bold leading-tight uppercase">{stage.titulo}</div>
                    <div className="text-sm md:text-base text-gray-300">({stage.sub})</div>
                </div>
            </div>

        </div>
      </div>

      {/* Modal de Interpretação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 md:p-5 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-[#050F41] font-heading">Interpretação dos Resultados</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                      <X size={20} />
                  </button>
              </div>
              <div className="p-4 md:p-5 overflow-x-auto font-body">
                  <table className="w-full text-left text-sm text-gray-600 border-collapse">
                      <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
                          <tr>
                              <th className="px-4 py-3 border-b border-gray-200">Global CDR</th>
                              <th className="px-4 py-3 border-b border-gray-200">CDR-SB</th>
                              <th className="px-4 py-3 border-b border-gray-200">Demência</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">0</td>
                              <td className="px-4 py-3">0</td>
                              <td className="px-4 py-3">Normal (sem demência)</td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">0.5</td>
                              <td className="px-4 py-3">0.5-4.0</td>
                              <td className="px-4 py-3">Questionável a muito leve</td>
                          </tr>
                          <tr className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">1</td>
                              <td className="px-4 py-3">4.5-9.0</td>
                              <td className="px-4 py-3">Leve</td>
                          </tr>
                          <tr className="bg-red-50 hover:bg-red-100 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">2</td>
                              <td className="px-4 py-3 text-gray-700">9.5-15.5</td>
                              <td className="px-4 py-3 font-medium text-[#050F41]">MODERADA</td>
                          </tr>
                          <tr className="bg-red-100 hover:bg-red-200 transition-colors">
                              <td className="px-4 py-3 font-bold text-red-800">3</td>
                              <td className="px-4 py-3 text-gray-800">16.0-18.0</td>
                              <td className="px-4 py-3 font-bold text-red-800">GRAVE</td>
                          </tr>
                      </tbody>
                  </table>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// FUNÇÕES AUXILIARES DO GUIA DE DOENÇAS
// ==========================================
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
}

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
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export const DiseaseGuide: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);
  
  // Modais de Conteúdo Clínico
  const [isPragmatismModalOpen, setIsPragmatismModalOpen] = useState(false);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [isCdrImageOpen, setIsCdrImageOpen] = useState(false);
  const [isRettModalOpen, setIsRettModalOpen] = useState(false);
  const [isAutismModalOpen, setIsAutismModalOpen] = useState(false);
  
  // Novos Estados para o BAV II Mobitz II
  const [isBavModalOpen, setIsBavModalOpen] = useState(false);
  const [isBavImageExpanded, setIsBavImageExpanded] = useState(false);

  // Calculadora
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Estado para botão de copiar
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setIsCopied(false);
  }, [selectedDiagnosis]);

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

  const handleCopy = async () => {
    if (!selectedDisease || !selectedDiagnosis) return;
    const copyText = `Doença: ${selectedDisease.name}\nDiagnóstico: ${selectedDiagnosis.name}\n\nDefinição:\n${selectedDisease.definition}\n\nCritérios de Gravidade:\n${selectedDiagnosis.criteria.map(c => `- ${c}`).join('\n')}\n\nDocumentos Necessários:\n${selectedDisease.documents.map(d => `- ${d}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(copyText);
      setIsCopied(true);
    } catch (error) {
      console.error('Erro ao copiar:', error);
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
    return disease.name.toLowerCase().includes(query) || disease.diagnoses.some(diag => 
      diag.name.toLowerCase().includes(query) || diag.criteria.some(crit => crit.toLowerCase().includes(query))
    );
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
    if(result.diagnosis) {
        setSelectedDisease(result.disease);
        setSelectedDiagnosis(result.diagnosis);
    } else {
        setExpandedDiseaseId(result.disease.id);
        setSearchQuery("");
    }
  }

  if (isCalculatorOpen) {
    return <CdrCalculator onClose={() => setIsCalculatorOpen(false)} />;
  }

  // ==========================================
  // RENDERIZAÇÃO: PÁGINA DE DETALHE DA DOENÇA
  // ==========================================
  if (selectedDisease && selectedDiagnosis) {
    const isDemencia = selectedDisease.name === "Alienação Mental" && selectedDiagnosis.name === "Demência";

    return (
      <div className="animate-fade-in flex flex-col h-full bg-[#F3F5F7] relative">
        
        {/* Modais de Termos Clínicos */}
        {isPersonalityModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050F41]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#050F41] text-white">
                <h3 className="font-heading font-bold text-base flex items-center"><Brain className="mr-2 text-[#FAB932]" size={18} /> Entendendo a Gravidade</h3>
                <button onClick={() => setIsPersonalityModalOpen(false)} className="text-white hover:text-gray-300 p-1"><X size={20} /></button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4 text-justify custom-scrollbar">
                <p>Na psiquiatria e na neurologia, a <strong>"alteração completa ou considerável da personalidade"</strong> descreve uma ruptura profunda e duradoura na forma como um indivíduo pensa, sente, age e se relaciona com o mundo.</p>
                <p>A personalidade é, por definição, o nosso conjunto mais estável de traços e comportamentos. Quando ocorre essa alteração, não estamos falando de uma simples mudança de humor, de amadurecimento ou de uma resposta temporária ao estresse. Trata-se de uma transformação estrutural: a pessoa perde a sua essência prévia e passa a agir de uma maneira que se torna irreconhecível para os amigos e familiares.</p>
                
                <h4 className="font-bold text-[#050F41] text-base mt-4 mb-2 border-b border-gray-100 pb-1">Como essa alteração se manifesta na prática?</h4>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Inversão de traços fundamentais:</strong> Alguém que sempre foi cauteloso, contido e educado pode se tornar impulsivo, agressivo e desinibido. Por outro lado, alguém extrovertido e empático pode se tornar frio, apático e isolado.</li>
                  <li><strong>Perda de filtros sociais e éticos:</strong> O paciente pode começar a apresentar comportamentos antissociais, falas inapropriadas, desrespeito por regras ou hipersexualidade — atitudes que jamais teria no passado.</li>
                  <li><strong>Cronicidade:</strong> A mudança não oscila de um dia para o outro como em um episódio de raiva; ela se instala de forma rígida e se torna o "novo normal" do indivíduo.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {isPragmatismModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050F41]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#050F41] text-white">
                <h3 className="font-heading font-bold text-base flex items-center"><Brain className="mr-2 text-[#FAB932]" size={18} /> Entendendo a Gravidade</h3>
                <button onClick={() => setIsPragmatismModalOpen(false)} className="text-white hover:text-gray-300 p-1"><X size={20} /></button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-6 text-justify custom-scrollbar">
                <div>
                  <h4 className="font-bold text-[#050F41] text-base mb-2 border-b border-gray-100 pb-1">Destruição da Autodeterminação (A Esfera da Vontade)</h4>
                  <p className="mb-2">A autodeterminação é a capacidade humana de ter desejos, estabelecer propósitos, fazer escolhas e iniciar ações com base em motivações internas. A sua "destruição" significa a perda da agência — o paciente perde o próprio "motor" interno.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Termos técnicos associados:</strong> Na psiquiatria, isso é chamado de <strong>abulia</strong> (perda total da vontade), <strong>hipobulia</strong> (diminuição grave da vontade), <strong>avolição</strong> (falta de iniciativa) e <strong>apatia</strong> (indiferença afetiva).</li>
                    <li><strong>Como se manifesta:</strong> O indivíduo torna-se passivo em relação à própria vida. Ele não consegue tomar decisões simples (como o que comer ou vestir) e perde o interesse por hobbies, relacionamentos ou planos para o futuro.</li>
                    <li><strong>O que o paciente vivencia:</strong> Não é necessariamente uma angústia ativa, mas muitas vezes um "vazio". O paciente pode passar o dia inteiro deitado ou sentado, olhando para o nada, sem sentir o impulso interno necessário para se levantar e fazer algo.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-[#050F41] text-base mb-2 border-b border-gray-100 pb-1">Destruição do Pragmatismo (A Esfera da Execução)</h4>
                  <p className="mb-2">O pragmatismo refere-se à utilidade prática das nossas ações — a capacidade de planejar, organizar e executar tarefas do dia a dia de forma lógica e eficiente. A sua destruição é a perda da capacidade de traduzir o pensamento em ações úteis e direcionadas a um objetivo.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Termos técnicos associados:</strong> <strong>Disfunção executiva</strong>, <strong>desorganização do comportamento</strong> e perda global de <strong>funcionalidade</strong>.</li>
                    <li><strong>Como se manifesta:</strong> Mesmo que o paciente tenha um desejo (uma fagulha de autodeterminação), ele não consegue estruturar os passos para realizá-lo. As ações tornam-se caóticas, incompletas ou bizarras.</li>
                    <li><strong>O que o paciente vivencia:</strong> Incapacidade de manter o autocuidado básico (como tomar banho e escovar os dentes), de administrar dinheiro, de manter um emprego ou de seguir uma receita médica. O comportamento perde o propósito prático; o paciente pode, por exemplo, vestir várias camadas de roupa no calor extremo ou acumular lixo no quarto sem um motivo lógico.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: CDR Score Image Viewer */}
        {isCdrImageOpen && (
          <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-fade-in pb-env-safe">
            <div className="flex-shrink-0 w-full sticky top-0 z-50 shadow-sm bg-[#050F41] text-white h-[56px] flex items-center justify-between px-4 border-b border-transparent">
              <div className="flex-1 text-left font-heading text-[16px] font-semibold truncate pr-4 text-white uppercase tracking-wide">
                CDR Score
              </div>
            </div>
            <div className="flex-1 overflow-auto w-full bg-gray-900 flex flex-col items-center justify-center relative p-4">
              <img
                src="https://i.imgur.com/XWLygzr.jpeg"
                alt="Escala de Avaliação Clínica de Demência (CDR)"
                className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl block"
              />
              <button
                onClick={() => setIsCdrImageOpen(false)}
                className="absolute bottom-6 right-6 bg-[#FAB932] text-[#050F41] shadow-2xl rounded-2xl p-4 hover:scale-105 active:scale-95 transition-all border border-amber-400 flex items-center justify-center z-50"
                title="Voltar"
              >
                <ArrowLeft size={22} />
              </button>
            </div>
          </div>
        )}

        {/* Modal: Síndrome de Rett */}
        {isRettModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050F41]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#050F41] text-white">
                <h3 className="font-heading font-bold text-base flex items-center"><Brain className="mr-2 text-[#FAB932]" size={18} /> Síndrome de Rett</h3>
                <button onClick={() => setIsRettModalOpen(false)} className="text-white hover:text-gray-300 p-1"><X size={20} /></button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4 text-justify custom-scrollbar">
                <p>A síndrome de Rett é um distúrbio neurológico e do desenvolvimento de origem genética, que afeta quase exclusivamente indivíduos do sexo feminino devido a mutações no gene MECP2, localizado no cromossomo X. A condição é caracterizada pela perda de habilidades motoras, de linguagem e sociais que a criança já havia adquirido.</p>
                <p>Os sintomas cardinais incluem a perda do uso funcional das mãos — frequentemente substituído por movimentos estereotipados e repetitivos, como o ato de "lavar as mãos" —, além de desaceleração do crescimento cefálico, distúrbios respiratórios, convulsões, dificuldades na marcha e deficiência intelectual severa. Não há cura para a síndrome, e o tratamento é multidisciplinar para otimizar a qualidade de vida.</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Autismo Infantil e Atípico */}
        {isAutismModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050F41]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#050F41] text-white">
                <h3 className="font-heading font-bold text-base flex items-center"><Brain className="mr-2 text-[#FAB932]" size={18} /> Autismo</h3>
                <button onClick={() => setIsAutismModalOpen(false)} className="text-white hover:text-gray-300 p-1"><X size={20} /></button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4 text-justify custom-scrollbar">
                <p>O <strong>Autismo Infantil</strong> é diagnosticado historicamente pela presença de desenvolvimento anormal ou prejudicado que se manifesta <strong>obrigatoriamente antes dos três anos de idade</strong>. Os critérios fundamentam-se em uma tríade de prejuízos qualitativos: isolamento ou <strong>dificuldade severa na interação social</strong> recíproca; atrasos ou desvios na comunicação verbal e não verbal; e a presença de padrões de comportamento, interesses e atividades estritamente restritos, repetitivos e estereotipados.</p>
                <p>O <strong>Autismo Atípico</strong> difere do infantil por não atender completamente aos critérios de idade de início ou de sintomatologia da tríade clássica. O diagnóstico é aplicado quando o comportamento característico surge apenas <strong>após os três anos de idade</strong>, ou quando o indivíduo apresenta prejuízos evidentes em apenas uma ou duas das três áreas psicopatológicas necessárias para o autismo infantil (por exemplo, exibindo alterações sociais e comportamentais, mas sem o comprometimento típico da comunicação), sendo uma classificação frequente em pessoas com deficiência intelectual profunda ou atrasos graves de linguagem.</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal: BAV II grau Mobitz II */}
        {isBavModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050F41]/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#050F41] text-white">
                <h3 className="font-heading font-bold text-base flex items-center"><HeartPulse className="mr-2 text-[#FAB932]" size={18} /> BAV de II Grau Mobitz II</h3>
                <button onClick={() => setIsBavModalOpen(false)} className="text-white hover:text-gray-300 p-1"><X size={20} /></button>
              </div>
              <div className="p-5 overflow-y-auto font-body text-gray-800 text-sm space-y-4 text-justify custom-scrollbar">
                <p>O <strong>BAV de II Grau Mobitz II</strong> é um distúrbio de condução infra-nodal caracterizado pelo bloqueio intermitente e súbito da onda P, com <strong>intervalo PR rigorosamente constante</strong> nos batimentos conduzidos.</p>
                <p>Ao contrário do tipo I (Wenckebach), decorre de uma <strong>lesão estrutural grave e permanente no sistema His-Purkinje, apresentando alto risco de progressão para BAV total e assistolia</strong>.</p>
                <p>Devido à instabilidade clínica e ao prognóstico desfavorável, a conduta padrão é a indicação de marcapasso definitivo, frequentemente recomendada mesmo em pacientes assintomáticos.</p>
                
                <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden shadow-sm relative">
                  <img 
                    src="https://jaleko-blog-files.s3.amazonaws.com/wp-content/uploads/2021/07/05152854/Imagem4-e1625509757200.png" 
                    alt="ECG - BAV II grau Mobitz II" 
                    className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setIsBavImageExpanded(true)}
                  />
                  <div className="absolute top-2 right-2 bg-black/60 text-white rounded p-1 pointer-events-none">
                    <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: BAV Image Expanded */}
        {isBavImageExpanded && (
          <div className="fixed inset-0 z-[110] bg-gray-900/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setIsBavImageExpanded(false)}>
            <div className="relative max-w-full max-h-full">
              <button onClick={() => setIsBavImageExpanded(false)} className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2 bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/8/89/Heart_block.png?1625509332613" 
                alt="ECG Detalhado" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        <Header 
          title={getShortDiseaseName(selectedDisease.name)} 
          leftAction={<button onClick={handleBackClick} className="text-white p-2 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>}
        />
        
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full pb-40">
          <div className="px-1">
            <h2 className="text-xl font-heading font-bold text-[#050F41] uppercase">{selectedDisease.name}</h2>
            {selectedDisease.diagnoses.length > 1 && <p className="text-xs font-semibold text-gray-500 font-body mt-1">Diagnóstico Pericial: {selectedDiagnosis.name}</p>}
          </div>
          
          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <h3 className="font-heading font-bold text-base text-[#050F41] mb-3 border-b border-gray-100 pb-2 flex items-center uppercase">
               <span className="material-symbols-outlined mr-2 text-[#FAB932]">menu_book</span>DEFINIÇÃO
            </h3>
            <p className="font-body text-gray-800 text-sm leading-relaxed text-justify font-medium">{selectedDisease.definition}</p>
          </div>

          {/* NOVO CARTÃO: CLASSIFICAÇÃO SIDA/AIDS */}
          {selectedDisease.name === "SIDA/AIDS" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
              <h3 className="font-heading font-bold text-base text-[#050F41] mb-3 border-b border-gray-100 pb-2 flex items-center uppercase">
                <span className="material-symbols-outlined mr-2 text-[#FAB932]">grid_on</span>CLASSIFICAÇÃO
              </h3>
              <p className="font-body text-gray-700 text-sm mb-4 text-center font-bold">
                Cruzamento Clínico/Laboratorial. Classes A3, B3, C1, C2, C3 são considerados SIDA/AIDS:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full max-w-md mx-auto text-center border-collapse border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-700 font-bold text-sm">
                    <tr>
                      <th className="border border-gray-200 p-2 font-heading">CD4</th>
                      <th className="border border-gray-200 p-2 font-heading">Assint./LPG (A)</th>
                      <th className="border border-gray-200 p-2 font-heading">Sintom. não C (B)</th>
                      <th className="border border-gray-200 p-2 font-heading">Oportunistas (C)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-body">
                    <tr>
                      <td className="border border-gray-200 p-2 font-bold text-gray-700">&gt;=500 (1)</td>
                      <td className="border border-gray-200 p-2 text-gray-600">A1</td>
                      <td className="border border-gray-200 p-2 text-gray-600">B1</td>
                      <td className="border border-gray-200 p-2 bg-red-100 text-red-700 font-bold">C1</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 font-bold text-gray-700">200-499 (2)</td>
                      <td className="border border-gray-200 p-2 text-gray-600">A2</td>
                      <td className="border border-gray-200 p-2 text-gray-600">B2</td>
                      <td className="border border-gray-200 p-2 bg-red-100 text-red-700 font-bold">C2</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 p-2 bg-red-100 text-red-700 font-bold">&lt;200 (3)</td>
                      <td className="border border-gray-200 p-2 bg-red-50 text-red-700 font-bold">A3</td>
                      <td className="border border-gray-200 p-2 bg-red-50 text-red-700 font-bold">B3</td>
                      <td className="border border-gray-200 p-2 bg-red-100 text-red-700 font-bold">C3</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <h3 className="font-heading font-bold text-base text-[#050F41] mb-3 border-b border-gray-100 pb-2 flex items-center uppercase">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">verified</span>CRITÉRIOS DE GRAVIDADE
            </h3>
            <ul className="space-y-3.5">
              {selectedDiagnosis.criteria.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 font-body">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#079551] shrink-0 mt-2" />
                  <span className="leading-relaxed text-justify flex-1">
                    {item.includes('autodeterminação e do pragmatismo') ? (
                      <>
                        {item.split(/(destruição da autodeterminação e do pragmatismo|destruction da autodeterminação e do pragmatismo)/i).map((part, i) => {
                          if (part.match(/destruição da autodeterminação e do pragmatismo|destruction da autodeterminação e do pragmatismo/i)) {
                            return (
                              <button key={i} onClick={() => setIsPragmatismModalOpen(true)} className="inline text-blue-600 hover:text-blue-800 text-left font-semibold">
                                <span className="underline align-middle">{part}</span><Info size={14} className="inline ml-1 align-baseline -mt-0.5" />
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
                              <button key={i} onClick={() => setIsPersonalityModalOpen(true)} className="inline text-blue-600 hover:text-blue-800 text-left font-semibold">
                                <span className="underline align-middle">{part}</span><Info size={14} className="inline ml-1 align-baseline -mt-0.5" />
                              </button>
                            );
                          }
                          return part;
                        })}
                      </>
                    ) : item.toLowerCase().includes('próprio diagnóstico') ? (
                      <>
                        {item.split(/(próprio diagnóstico)/i).map((part, i) => {
                          if (part.toLowerCase() === 'próprio diagnóstico') {
                            return (
                              <button key={i} onClick={() => {
                                if (selectedDiagnosis.name === "Síndrome de Rett") {
                                  setIsRettModalOpen(true);
                                } else if (selectedDiagnosis.name === "Autismo infantil e atípico") {
                                  setIsAutismModalOpen(true);
                                }
                              }} className="inline text-blue-600 hover:text-blue-800 text-left font-semibold">
                                <span className="underline align-middle">Próprio diagnóstico</span><Info size={14} className="inline ml-1 align-baseline -mt-0.5" />
                              </button>
                            );
                          }
                          return part;
                        })}
                      </>
                    ) : item.toLowerCase().includes('bav ii grau mobitz ii') ? (
                      <>
                        {item.split(/(BAV II grau Mobitz II)/i).map((part, i) => {
                          if (part.toLowerCase() === 'bav ii grau mobitz ii') {
                            return (
                              <button key={i} onClick={() => setIsBavModalOpen(true)} className="inline text-blue-600 hover:text-blue-800 text-left font-semibold">
                                <span className="underline align-middle">{part}</span><Info size={14} className="inline ml-1 align-baseline -mt-0.5" />
                              </button>
                            );
                          }
                          return part;
                        })}
                      </>
                    ) : item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <h3 className="font-heading font-bold text-base text-[#050F41] mb-3 border-b border-gray-100 pb-2 flex items-center uppercase">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">folder_open</span>DOCUMENTOS NECESSÁRIOS
            </h3>
            <ul className="space-y-3">
              {selectedDisease.documents.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-gray-700 font-body">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#050F41] shrink-0 mt-2" />
                  <span className="leading-relaxed text-justify flex-1 font-medium">
                    {item.includes('CDR Score') ? (
                      isDemencia ? (
                        <span className="font-bold text-red-800">CDR Score</span>
                      ) : (
                        <>
                          {item.split(/(CDR Score)/i).map((part, i) => {
                            if (part.toLowerCase() === 'cdr score') {
                              return (
                                <button key={i} onClick={() => setIsCdrImageOpen(true)} className="inline text-blue-600 hover:text-blue-800 text-left font-semibold">
                                  <span className="underline align-middle">CDR Score</span><Info size={14} className="inline ml-1 align-baseline -mt-0.5" />
                                </button>
                              );
                            }
                            return part;
                          })}
                        </>
                      )
                    ) : item}
                  </span>
                </li>
              ))}
            </ul>
            
            {/* Botão Extra para abrir a Calculadora de CDR (Demência) */}
            {isDemencia && (
              <button
                onClick={() => setIsCalculatorOpen(true)}
                className="mt-5 w-full py-3 bg-red-800 text-white rounded-xl font-bold flex items-center justify-center hover:bg-red-900 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined mr-2">calculate</span>
                CDR Score
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            FABs FLUTUANTES (COPIAR E BAIXAR) - Canto inferior direito 
            ======================================================== */}
        <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
          <button
            onClick={handleCopy}
            disabled={isCopied}
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all border ${
              isCopied 
                ? 'bg-gray-300 text-gray-100 border-gray-300 cursor-not-allowed' 
                : 'bg-blue-100 text-[#050F41] border-blue-200 hover:scale-105 active:scale-95'
            }`}
            title="Copiar texto"
          >
             <span className="material-symbols-outlined text-[26px]">
               {isCopied ? 'done_all' : 'content_copy'}
             </span>
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="w-14 h-14 bg-[#050F41] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-slate-700"
            title="Baixar PDF"
          >
            <Download size={24} />
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZAÇÃO: PÁGINA INICIAL DA LISTA DE DOENÇAS
  // ==========================================
  return (
    <div className="flex flex-col h-full bg-[#F3F5F7]">
      <Header title="Doenças de Lei" />
      
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1 pb-36">
        {/* Barra de Pesquisa */}
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
          {searchQuery.trim().length > 0 && isSearchFocused && searchResults.length > 0 && (
            <ul className="absolute z-50 top-full mt-2 w-full bg-white border border-gray-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-50">
              {searchResults.map(result => (
                <li key={result.id} className="cursor-pointer hover:bg-gray-50 p-3.5 flex items-center justify-between transition-colors group" onClick={() => handleSearchResultClick(result)}>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#050F41] group-hover:text-[#079551] transition-colors truncate">{result.name}</p>
                    {result.sub && <p className="text-[10px] text-gray-400 mt-0.5 font-medium truncate">{result.sub}</p>}
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#079551]" />
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Lista de Doenças */}
        <div className="grid gap-2.5">
          {filteredDiseases.map((disease) => (
            <div key={disease.id} className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden transition-all duration-200">
              <div onClick={() => handleDiseaseClick(disease)} className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center space-x-3 truncate">
                  {getDiseaseIcon(disease.name)}
                  <h3 className="text-[#050F41] font-heading text-sm font-semibold truncate m-0">{disease.name}</h3>
                </div>
                <ChevronRight size={16} className={`text-gray-400 transition-transform ${expandedDiseaseId === disease.id && disease.diagnoses.length > 1 ? 'rotate-90 text-[#079551]' : ''}`} />
              </div>

              {disease.diagnoses.length > 1 && expandedDiseaseId === disease.id && (
                <div className="bg-gray-50/60 border-t border-gray-100 flex flex-col divide-y divide-gray-100/60">
                  {disease.diagnoses.map((diagnosis, idx) => (
                    <div key={idx} onClick={() => { setSelectedDisease(disease); setSelectedDiagnosis(diagnosis); }} className="p-3.5 pl-12 cursor-pointer flex justify-between items-center hover:bg-white transition-colors">
                      <span className="text-xs font-medium text-gray-700 font-body">{diagnosis.name}</span>
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};