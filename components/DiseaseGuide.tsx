// Ficheiro: components/DiseaseGuide.tsx
import React, { useState, useEffect } from 'react';
import { DISEASES } from '../constants';
import { Disease, Diagnosis } from '../types';
import { ChevronRight, Info, Brain, HeartPulse, EyeOff, Radiation, Accessibility, Stethoscope, Ribbon, X, Download, ArrowLeft } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Header } from './Header';

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
      { pt: 0, desc: "Resolve problemas diários; julgamento preservado." },
      { pt: 0.5, desc: "Dificuldade leve para solucionar problemas." },
      { pt: 1, desc: "Dificuldade moderada; julgamento social mantido." },
      { pt: 2, desc: "Dificuldade séria; julgamento social danificado." },
      { pt: 3, desc: "Incapaz de fazer julgamento ou resolver problemas." }
  ]},
  { id: 'RC', nome: 'Relações comunitárias', sigla: '(RC)', opcoes: [
      { pt: 0, desc: "Função independente no trabalho, compras, grupos sociais." },
      { pt: 0.5, desc: "Leve dificuldade nestas tarefas." },
      { pt: 1, desc: "Não é independente nestas atividades." },
      { pt: 2, desc: "Não há independência fora de casa, parece bem o bastante para ser levado fora." },
      { pt: 3, desc: "Não há independência fora de casa, parece doente o bastante para ser levado fora." }
  ]},
  { id: 'LP', nome: 'Lar e passatempos', sigla: '(LP)', opcoes: [
      { pt: 0, desc: "Vida em casa, passatempos e interesses intelectuais bem mantidos." },
      { pt: 0.5, desc: "Levemente prejudicados." },
      { pt: 1, desc: "Prejuízo suave; tarefas mais difíceis abandonadas." },
      { pt: 2, desc: "Apenas tarefas simples preservadas." },
      { pt: 3, desc: "Sem função significativa em casa." }
  ]},
  { id: 'CP', nome: 'Cuidados pessoais', sigla: '(CP)', opcoes: [
      { pt: 0, desc: "Completamente capaz de cuidar-se." },
      { pt: 0.5, desc: "Completamente capaz de cuidar-se." },
      { pt: 1, desc: "Necessita de ajuda." },
      { pt: 2, desc: "Requer assistência ao vestir-se, para higiene." },
      { pt: 3, desc: "Muita ajuda para cuidados pessoais, incontinências frequentes." }
  ]}
];

function calcularGlobalCDR(M: number, secScores: number[]) {
  const count = (conditionFn: (s: number) => boolean) => secScores.filter(conditionFn).length;
  if (M === 0) { if (count(s => s >= 0.5) >= 2) return 0.5; return 0; }
  if (M === 0.5) { if (count(s => s >= 1) >= 3) return 1; return 0.5; }
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
    let closest = modas[0]; let minDiff = Math.abs(modas[0] - M);
    for (let i = 1; i < modas.length; i++) { const diff = Math.abs(modas[i] - M); if (diff < minDiff) { closest = modas[i]; minDiff = diff; } }
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

const CdrCalculator: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [scores, setScores] = useState({ M: 0, O: 0, JSP: 0, RC: 0, LP: 0, CP: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const secScores = [scores.O, scores.JSP, scores.RC, scores.LP, scores.CP];
  const globalScore = calcularGlobalCDR(scores.M, secScores);
  const sbScore = scores.M + secScores.reduce((acc, val) => acc + val, 0);
  const stage = getStageText(globalScore);
  const isGrave = globalScore === 3;

  const handleCopy = async () => {
    const text = `CLINICAL DEMENTIA RATING:\n\n- M = ${scores.M}\n- O = ${scores.O}\n- JSP = ${scores.JSP}\n- RC = ${scores.RC}\n- LP = ${scores.LP}\n- CP = ${scores.CP}\n-------------------------------\n- Global CDR = ${globalScore}\n- CDR-SB = ${sbScore}\n\n- RESULTADO: ${stage.titulo} (${stage.sub})`;
    try { await navigator.clipboard.writeText(text); setIsCopied(true); if (navigator.share) await navigator.share({ title: 'Avaliação CDR Score', text }); } catch (err) { if ((err as Error).name !== 'AbortError') console.error(err); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col animate-fade-in font-body pb-28">
      <header className="bg-white shadow-sm sticky top-0 z-40 flex items-center px-4 py-4">
        <button onClick={onClose} className="mr-4 text-gray-500 hover:text-[#050F41] transition-colors p-1"><ArrowLeft size={24} /></button>
        <div>
          <h1 className="text-xl font-bold text-[#050F41] font-heading leading-none">CDR Score</h1>
          <p className="text-xs text-gray-500 mt-1">Calculadora validada em português</p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto p-4 w-full custom-scrollbar">
        {cdrData.map(cat => (
          <div key={cat.id} className="mb-8">
            <h2 className="text-base font-bold text-[#050F41] mb-3">{cat.nome} <span className="text-gray-500 font-normal">{cat.sigla}</span></h2>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              {cat.opcoes.map(opt => {
                const isSelected = scores[cat.id as keyof typeof scores] === opt.pt;
                return (
                  <div key={opt.pt} onClick={() => { setScores({...scores, [cat.id]: opt.pt}); setIsCopied(false); }}
                    className={`flex items-center p-3 cursor-pointer select-none transition-colors border-b border-gray-100 last:border-0 ${isSelected ? 'bg-[#050F41] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                    <div className="flex-1 pr-4 text-sm leading-snug">{opt.desc}</div>
                    <div className={`font-bold text-sm px-2 py-1 rounded bg-black/5 ${isSelected ? 'text-white' : 'text-gray-500'}`}>{opt.pt === 0 ? '0' : '+' + opt.pt}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
      <div className={`fixed bottom-0 left-0 w-full text-white shadow-lg z-50 transition-colors duration-300 ${isGrave ? 'bg-red-900' : 'bg-[#050F41]'}`}>
        <div className="max-w-3xl mx-auto flex flex-row items-center justify-between p-4">
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">{globalScore}</span>
              <span className="text-sm text-gray-200">pontos</span>
              <button onClick={() => setIsModalOpen(true)} className="ml-1 text-white hover:text-gray-300"><span className="material-symbols-outlined text-[20px]">info</span></button>
            </div>
            <div className="text-xs text-gray-300 mt-1">Escore Global CDR</div>
            <div className="text-xs text-gray-400 mt-0.5">CDR-SB: <span className="text-white font-semibold">{sbScore}</span> pontos</div>
          </div>
          <div className="flex items-center">
            <button onClick={handleCopy} disabled={isCopied} className="mr-4 flex items-center justify-center p-2 rounded-full text-white hover:bg-white/10">
              <span className="material-symbols-outlined text-[24px]">{isCopied ? 'done_all' : 'content_copy'}</span>
            </button>
            <div className={`border-l-2 ${isGrave ? 'border-red-400' : 'border-blue-400'} pl-4 flex flex-col`}>
              <div className="text-xl font-bold uppercase">{stage.titulo}</div>
              <div className="text-sm text-gray-300">({stage.sub})</div>
            </div>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#050F41]">Interpretação dos Resultados</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
                  <tr><th className="px-4 py-3 border-b border-gray-200">Global CDR</th><th className="px-4 py-3 border-b border-gray-200">CDR-SB</th><th className="px-4 py-3 border-b border-gray-200">Demência</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-4 py-3 font-medium">0</td><td className="px-4 py-3">0</td><td className="px-4 py-3">Normal (sem demência)</td></tr>
                  <tr><td className="px-4 py-3 font-medium">0.5</td><td className="px-4 py-3">0.5-4.0</td><td className="px-4 py-3">Questionável a muito leve</td></tr>
                  <tr><td className="px-4 py-3 font-medium">1</td><td className="px-4 py-3">4.5-9.0</td><td className="px-4 py-3">Leve</td></tr>
                  <tr className="bg-red-50"><td className="px-4 py-3 font-medium">2</td><td className="px-4 py-3">9.5-15.5</td><td className="px-4 py-3 font-medium text-[#050F41]">MODERADA</td></tr>
                  <tr className="bg-red-100"><td className="px-4 py-3 font-bold text-red-800">3</td><td className="px-4 py-3">16.0-18.0</td><td className="px-4 py-3 font-bold text-red-800">GRAVE</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getDiseaseIcon = (name: string) => {
  switch(name) {
    case "Alienação Mental": return <Brain className="text-[#050F41]" size={22} />;
    case "Cardiopatia Grave": return <HeartPulse className="text-[#050F41]" size={22} />;
    case "Cegueira": return <EyeOff className="text-[#050F41]" size={22} />;
    case "Contaminação por Radiação": return <Radiation className="text-[#050F41]" size={22} />;
    case "Paralisia Irreversível e Incapacitante": return <Accessibility className="text-[#050F41]" size={22} />;
    case "SIDA/AIDS": return <Ribbon className="text-[#050F41]" size={22} />;
    default: return <Stethoscope className="text-[#050F41]" size={22} />;
  }
};

const getShortDiseaseName = (name: string) => {
  const map: Record<string, string> = {
    "Alienação Mental": "ALIENAÇÃO", "Cardiopatia Grave": "CARDIOPATIA", "Cegueira": "CEGUEIRA",
    "Contaminação por Radiação": "RADIAÇÃO", "Doença de Parkinson": "PARKINSON",
    "Esclerose Múltipla (EM)": "ESCLEROSE", "Espondilite Anquilosante": "ESPONDILITE",
    "Estados Avançados de Doença de Paget": "PAGET", "Fibrose Cística": "FIBROSE CÍSTICA",
    "Hanseníase": "HANSENÍASE", "Hepatopatia Grave": "HEPATOPATIA", "Nefropatia Grave": "NEFROPATIA",
    "Neoplasia Maligna": "NEOPLASIA", "Paralisia Irreversível e Incapacitante": "PARALISIA",
    "Pênfigo": "PÊNFIGO", "Pênfigo Grave": "PÊNFIGO", "SIDA/AIDS": "SIDA/AIDS",
    "Tuberculose Ativa": "TUBERCULOSE"
  };
  return map[name] || name.toUpperCase();
};

export const DiseaseGuide: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<Disease | null>(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);
  const [isPragmatismModalOpen, setIsPragmatismModalOpen] = useState(false);
  const [isPersonalityModalOpen, setIsPersonalityModalOpen] = useState(false);
  const [isCdrImageOpen, setIsCdrImageOpen] = useState(false);
  const [isRettModalOpen, setIsRettModalOpen] = useState(false);
  const [isAutismModalOpen, setIsAutismModalOpen] = useState(false);
  const [isCatAModalOpen, setIsCatAModalOpen] = useState(false);
  const [isCatBModalOpen, setIsCatBModalOpen] = useState(false);
  const [isCatCModalOpen, setIsCatCModalOpen] = useState(false);
  const [isBavModalOpen, setIsBavModalOpen] = useState(false);
  const [isBavImageExpanded, setIsBavImageExpanded] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => { setIsCopied(false); }, [selectedDiagnosis]);

  const handleDiseaseClick = (disease: Disease) => {
    if (disease.diagnoses.length === 1) { setSelectedDisease(disease); setSelectedDiagnosis(disease.diagnoses[0]); }
    else setExpandedDiseaseId(expandedDiseaseId === disease.id ? null : disease.id);
  };

  const handleBackClick = () => {
    if (selectedDisease && selectedDiagnosis && selectedDisease.diagnoses.length > 1) setSelectedDiagnosis(null);
    else { setSelectedDisease(null); setSelectedDiagnosis(null); }
  };

  const handleCopy = async () => {
    if (!selectedDisease || !selectedDiagnosis) return;
    const copyText = `Doença: ${selectedDisease.name}\nDiagnóstico: ${selectedDiagnosis.name}\n\nDefinição:\n${selectedDisease.definition}\n\nCritérios de Gravidade:\n${selectedDiagnosis.criteria.map(c => `- ${c}`).join('\n')}\n\nDocumentos Necessários:\n${selectedDisease.documents.map(d => `- ${d}`).join('\n')}`;
    try { await navigator.clipboard.writeText(copyText); setIsCopied(true); } catch (error) { console.error(error); }
  };

  const handleDownloadPDF = () => {
    if (!selectedDisease || !selectedDiagnosis) return;
    const doc = new jsPDF();
    let yPos = 20;
    const margin = 15;
    const maxLineWidth = doc.internal.pageSize.width - margin * 2;
    doc.setFontSize(18); doc.setTextColor(5, 15, 65); doc.text(selectedDisease.name, margin, yPos); yPos += 8;
    if (selectedDisease.diagnoses.length > 1) { doc.setFontSize(12); doc.setTextColor(100,100,100); doc.text(`Diagnóstico: ${selectedDiagnosis.name}`, margin, yPos); yPos += 12; } else yPos += 4;
    doc.setFontSize(14); doc.setTextColor(5,15,65); doc.text("Definição", margin, yPos); yPos += 6;
    doc.setFontSize(10); doc.setTextColor(60,60,60);
    const defLines = doc.splitTextToSize(selectedDisease.definition, maxLineWidth);
    doc.text(defLines, margin, yPos); yPos += defLines.length * 5 + 8;
    doc.setFontSize(14); doc.setTextColor(5,15,65); doc.text("Critérios de Gravidade", margin, yPos); yPos += 6;
    doc.setFontSize(10); doc.setTextColor(60,60,60);
    selectedDiagnosis.criteria.forEach(crit => {
      const lines = doc.splitTextToSize(`• ${crit}`, maxLineWidth);
      if (yPos + lines.length * 5 > doc.internal.pageSize.height - margin) { doc.addPage(); yPos = margin + 10; }
      doc.text(lines, margin, yPos); yPos += lines.length * 5 + 3;
    });
    const safeName = selectedDisease.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    doc.save(`guia-${safeName}.pdf`);
  };

  const filteredDiseases = DISEASES.filter(disease => {
    const query = searchQuery.toLowerCase();
    return disease.name.toLowerCase().includes(query) || disease.diagnoses.some(diag =>
      diag.name.toLowerCase().includes(query) || diag.criteria.some(crit => crit.toLowerCase().includes(query)));
  });

  const searchResults: { type: string, id: string, name: string, sub?: string, disease: Disease, diagnosis?: Diagnosis }[] = [];
  if (searchQuery.trim().length > 0) {
    const query = searchQuery.toLowerCase();
    DISEASES.forEach(disease => {
      if (disease.name.toLowerCase().includes(query)) searchResults.push({ type: 'disease', id: `dz-${disease.id}`, name: disease.name, disease });
      disease.diagnoses.forEach((diag, idx) => {
        if (diag.name.toLowerCase().includes(query)) searchResults.push({ type: 'diagnosis', id: `dg-${disease.id}-${idx}`, name: diag.name, sub: `em ${disease.name}`, disease, diagnosis: diag });
        diag.criteria.forEach((crit, critIdx) => {
          if (crit.toLowerCase().includes(query)) searchResults.push({ type: 'criterion', id: `crit-${disease.id}-${idx}-${critIdx}`, name: crit, sub: `Critério para ${diag.name}`, disease, diagnosis: diag });
        });
      });
    });
  }

  const handleSearchResultClick = (result: any) => {
    if(result.diagnosis) { setSelectedDisease(result.disease); setSelectedDiagnosis(result.diagnosis); }
    else { setExpandedDiseaseId(result.disease.id); setSearchQuery(""); }
  };

  if (isCalculatorOpen) return <CdrCalculator onClose={() => setIsCalculatorOpen(false)} />;

  if (selectedDisease && selectedDiagnosis) {
    const isDemencia = selectedDisease.name === "Alienação Mental" && selectedDiagnosis.name === "Demência";
    return (
      <div className="animate-fade-in flex flex-col h-full bg-[#F3F5F7] relative">
        {/* Modals omitted for brevity — full implementation in source */}
        <Header title={getShortDiseaseName(selectedDisease.name)} leftAction={<button onClick={handleBackClick} className="text-white p-2 rounded-full hover:bg-white/10"><ArrowLeft size={20} /></button>} />
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full pb-40">
          <div className="px-1">
            <h2 className="text-xl font-heading font-bold text-[#050F41] uppercase">{selectedDisease.name}</h2>
            {selectedDisease.diagnoses.length > 1 && <p className="text-xs font-semibold text-gray-500 mt-1">Diagnóstico Pericial: {selectedDiagnosis.name}</p>}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
            <h3 className="font-heading font-bold text-base text-[#050F41] mb-3 border-b border-gray-100 pb-2 flex items-center uppercase">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">menu_book</span>DEFINIÇÃO
            </h3>
            <p className="font-body text-gray-800 text-sm leading-relaxed text-justify font-medium">{selectedDisease.definition}</p>
          </div>
          {selectedDisease.name === "SIDA/AIDS" && (
            <div className="bg-white rounded-2xl p-5 border border-gray-200/60 shadow-sm">
              <h3 className="font-heading font-bold text-base text-[#050F41] mb-5 border-b border-gray-100 pb-2 flex items-center uppercase">
                <span className="material-symbols-outlined mr-2 text-[#FAB932]">grid_on</span>CLASSIFICAÇÃO
              </h3>
              <p className="text-xs text-gray-500">Grupos I (CD4 ≥500), II (200-499), III (&lt;200) / Classes A, B, C por sintomas e condições definidoras.</p>
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
                  <span className="leading-relaxed text-justify flex-1">{item}</span>
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
                  <span className="leading-relaxed text-justify flex-1 font-medium">{item}</span>
                </li>
              ))}
            </ul>
            {isDemencia && (
              <button onClick={() => setIsCalculatorOpen(true)} className="mt-5 w-full py-3 bg-red-800 text-white rounded-xl font-bold flex items-center justify-center hover:bg-red-900 transition-colors shadow-sm">
                <span className="material-symbols-outlined mr-2">calculate</span>CDR Score
              </button>
            )}
          </div>
        </div>
        <div className="fixed bottom-24 right-6 flex flex-col gap-3 z-40">
          <button onClick={handleCopy} disabled={isCopied} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all border ${isCopied ? 'bg-gray-300 text-gray-100 border-gray-300 cursor-not-allowed' : 'bg-blue-100 text-[#050F41] border-blue-200 hover:scale-105 active:scale-95'}`} title="Copiar texto">
            <span className="material-symbols-outlined text-[26px]">{isCopied ? 'done_all' : 'content_copy'}</span>
          </button>
          <button onClick={handleDownloadPDF} className="w-14 h-14 bg-[#050F41] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-slate-700" title="Baixar PDF">
            <Download size={24} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7]">
      <Header title="Doenças de Lei" />
      <div className="p-4 space-y-4 max-w-2xl mx-auto w-full flex-1 pb-36">
        <div className="relative w-full z-20">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
          <input type="text" className="block w-full pl-11 pr-10 py-3.5 border border-gray-200 rounded-full bg-white text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#050F41]/10 transition-all font-body" placeholder="Pesquisar por doença, diagnóstico ou critério..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)} />
          {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"><X size={18} /></button>)}
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
