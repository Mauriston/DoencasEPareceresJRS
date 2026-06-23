// Ficheiro: components/PericiaMenor.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { PericiaMenorDetalhe } from './PericiaMenorDetalhe';
import { Search, Loader2, AlertCircle, CheckCircle2, ChevronDown, CheckCircle, Camera, Crop as CropIcon, Sparkles, X } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface PericiaMenorRecord {
  inspecionado: string;
  om: string;
  cid: string;
  dispensas: string;
  dataAtestado: string;
  dataAtestadoTs: number;
  tempoAtestado: string;
  tempoHomolog: string;
  vigente: boolean;
  concluido: boolean;
  vdf: boolean;
  link: string;
}

interface CidItem { SUBCAT: string; DESCRICAO: string; DESCRABREV: string; }
interface ServicoItem { superior_direto: string; servico_id: string; servico: string; servico_label: string; }

const EXTENSOS: Record<number, string> = {
  1: "um", 2: "dois", 3: "três", 4: "quatro", 5: "cinco", 6: "seis", 7: "sete", 8: "oito", 9: "nove", 10: "dez",
  11: "onze", 12: "doze", 13: "treze", 14: "catorze", 15: "quinze", 16: "dezesseis", 17: "dezessete", 18: "dezoito", 19: "dezenove", 20: "vinte"
};

const PG_OPTIONS = ["CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR", "ALUNO", "SCNS"];
const QUADROS = ["AA", "AFN", "CA", "CD", "CN", "EN", "FN", "IM", "Md", "QC-CA", "QC-FN", "QC-IM", "S", "T"];
const ESP_PRACAS = ["AD", "AH", "AM", "AR", "MC", "MT", "AT", "AV", "BA", "CA", "CP", "CI", "CN", "CL", "CT", "CO", "DA", "DM", "DT", "ED", "EP", "EL", "ET", "TE", "EF", "EG", "ES", "AE", "EN", "FR", "GC", "GR", "HN", "HD", "IF", "MR", "MA", "NA", "MI", "MG", "ML", "ME", "MO", "MS", "MU", "ND", "OR", "OS", "PL", "PC", "PD", "PT", "QI", "RM", "RB", "SC", "SI", "TC"];

const removeAcentos = (str: string) => str.normalize("NFD").replace(/[̀-ͯ]/g, "");

const GAS_URL = "https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec";

export const PericiaMenor: React.FC = () => {
  const [nip, setNip] = useState('');
  const [militarStatus, setMilitarStatus] = useState<"" | "loading" | "found" | "not_found">(" ");
  const [inspecionado, setInspecionado] = useState("");
  const [omLeitura, setOmLeitura] = useState("");
  const [om, setOm] = useState("");
  const [pg, setPg] = useState("");
  const [circulo, setCirculo] = useState("");
  const [quadro, setQuadro] = useState("");
  const [espPraca, setEspPraca] = useState("");
  const [nome, setNome] = useState("");
  const [situacao, setSituacao] = useState("");

  const [showPesquisarNomeModal, setShowPesquisarNomeModal] = useState(false);
  const [pesquisarNomeTerm, setPesquisarNomeTerm] = useState("");
  const [militaresInfoList, setMilitaresInfoList] = useState<{nome: string, nip: string}[]>([]);
  const [isCarregandoMilitares, setIsCarregandoMilitares] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [servicoQuery, setServicoQuery] = useState('');
  const [servicoOptions, setServicoOptions] = useState<ServicoItem[]>([]);
  const [filteredServicos, setFilteredServicos] = useState<ServicoItem[]>([]);
  const [selectedServico, setSelectedServico] = useState<ServicoItem | null>(null);
  const [showServicoDropdown, setShowServicoDropdown] = useState(false);

  const [dataAtestado, setDataAtestado] = useState('');
  const [tempoAtestado, setTempoAtestado] = useState('');
  const [cidQuery, setCidQuery] = useState('');
  const [cidOptions, setCidOptions] = useState<CidItem[]>([]);
  const [filteredCids, setFilteredCids] = useState<CidItem[]>([]);
  const [selectedCid, setSelectedCid] = useState<CidItem | null>(null);
  const [showCidDropdown, setShowCidDropdown] = useState(false);

  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropModal, setShowCropModal] = useState(false);
  const [croppedImageUrl, setCroppedImageUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tempoHomologacao, setTempoHomologacao] = useState('');
  const [selectedDispensas, setSelectedDispensas] = useState<string[]>([]);
  const [showDispensasDropdown, setShowDispensasDropdown] = useState(false);
  const [vdf, setVdf] = useState<boolean | null>(null);
  const [selectedPerito, setSelectedPerito] = useState('');

  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [omsOptions, setOmsOptions] = useState<string[]>([]);
  const [dispensasDisponiveis, setDispensasDisponiveis] = useState<string[]>([]);
  const [peritosDisponiveis, setPeritosDisponiveis] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successPdfUrl, setSuccessPdfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'novo' | 'historico'>('novo');
  const [history, setHistory] = useState<PericiaMenorRecord[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [filterVigente, setFilterVigente] = useState(true);
  const [filterConcluido, setFilterConcluido] = useState(false);
  const [filterLts, setFilterLts] = useState(false);
  const [filterRestricoes, setFilterRestricoes] = useState(false);
  const [sortCol, setSortCol] = useState<'data' | 'inspecionado'>('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [vigentesCount, setVigentesCount] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const res = await fetch(`${GAS_URL}?action=getLookups`);
        const json = await res.json();
        if (json.success) {
          setDispensasDisponiveis(json.data.DISPENSAS.filter(Boolean) || []);
          setPeritosDisponiveis(json.data.PERITOS || []);
          setOmsOptions(json.data.OM.filter(Boolean) || []);
        }
      } catch (err) { console.error(err); } finally { setIsLoadingLookups(false); }
    };
    const fetchCid = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}cid.json`);
        if (res.ok) setCidOptions(await res.json());
      } catch (err) { console.error(err); }
    };
    const fetchServicos = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}servicosHNRe.json`);
        if (res.ok) setServicoOptions(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchLookups(); fetchCid(); fetchServicos();
  }, []);

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 6) value = `${value.slice(0,2)}.${value.slice(2,6)}.${value.slice(6)}`;
    else if (value.length > 2) value = `${value.slice(0,2)}.${value.slice(2)}`;
    setNip(value);
    if (value.length === 10) searchNip(value);
    else { setMilitarStatus(""); setSearchError(''); }
  };

  const searchNip = async (nipVal: string) => {
    setMilitarStatus("loading"); setSearchError('');
    try {
      const res = await fetch(`${GAS_URL}?action=getMilitar&nip=${nipVal}`);
      const data = await res.json();
      if (data.success && data.data) { setInspecionado(data.data.INSPECIONADO); setOmLeitura(data.data.OM); setMilitarStatus("found"); }
      else { setMilitarStatus("not_found"); setSearchError('Militar não encontrado. Preencha manualmente.'); }
    } catch (err) { console.error(err); setMilitarStatus("not_found"); setSearchError('Erro ao buscar militar.'); }
  };

  const abrirModalPesquisaNome = async (initialTerm: string = "", autoSelect: boolean = false) => {
    let currentList = militaresInfoList;
    setPesquisarNomeTerm(initialTerm);
    if (currentList.length === 0) {
      if (!autoSelect) setShowPesquisarNomeModal(true);
      setIsCarregandoMilitares(true);
      try {
        const resp = await fetch(`${GAS_URL}?action=getMilitaresList`);
        const data = await resp.json();
        if (data.success && data.data) { setMilitaresInfoList(data.data); currentList = data.data; }
      } catch (err) { console.error(err); } finally { setIsCarregandoMilitares(false); }
    } else { if (!autoSelect) setShowPesquisarNomeModal(true); }
    if (autoSelect && initialTerm) {
      const terms = removeAcentos(initialTerm.toLowerCase()).split(/\s+/).filter(Boolean);
      const filtered = currentList.filter(m => { const n = removeAcentos(m.nome.toLowerCase()); return terms.every(t => n.includes(t)); });
      if (filtered.length === 1) selecionarNomeNip(filtered[0].nip);
      else setShowPesquisarNomeModal(true);
    } else if (!autoSelect) setShowPesquisarNomeModal(true);
  };

  const selecionarNomeNip = (selectedNip: string) => { setNip(selectedNip); setShowPesquisarNomeModal(false); searchNip(selectedNip); };

  useEffect(() => {
    if (militarStatus !== "not_found" || !pg) return;
    if (["CMG", "CF", "SO", "1SG", "2SG"].includes(pg)) setSituacao("Carreira");
    else if (["2T", "GM"].includes(pg)) setSituacao("Temporário");
    else setSituacao("");
    if (["CMG", "CF", "CC", "CT", "1T", "2T", "GM"].includes(pg)) setCirculo("Oficial");
    else if (["SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR"].includes(pg)) setCirculo("Praça");
    else setCirculo("");
  }, [pg, militarStatus]);

  const handleServicoSearch = (text: string) => {
    setServicoQuery(text); setSelectedServico(null);
    if (text.trim().length > 1) {
      const q = removeAcentos(text.trim().toLowerCase());
      const filtered = servicoOptions.filter(s => {
        const sup = removeAcentos((s.superior_direto || '').toLowerCase());
        const sv = removeAcentos((s.servico || '').toLowerCase());
        const lb = removeAcentos((s.servico_label || '').toLowerCase());
        return sup.includes(q) || sv.includes(q) || lb.includes(q);
      }).slice(0, 15);
      setFilteredServicos(filtered); setShowServicoDropdown(true);
    } else setShowServicoDropdown(false);
  };

  const handleCidSearch = (text: string) => {
    setCidQuery(text); setSelectedCid(null);
    if (text.length > 1) {
      const q = removeAcentos(text.toLowerCase());
      const filtered = cidOptions.filter(c => {
        const sub = removeAcentos((c.SUBCAT || '').toLowerCase());
        const desc = removeAcentos((c.DESCRICAO || '').toLowerCase());
        return sub.includes(q) || desc.includes(q);
      }).slice(0, 15);
      setFilteredCids(filtered); setShowCidDropdown(true);
    } else setShowCidDropdown(false);
  };

  const handleTempoInput = (val: string, setter: (v: string) => void, maxLimit?: number) => {
    let n = val.replace(/\D/g, '');
    if (n !== '') {
      let num = parseInt(n, 10);
      if (maxLimit && num > maxLimit) num = maxLimit;
      if (num < 1) num = 1;
      setter(num.toString());
    } else setter('');
  };

  const formatTempoBlur = (val: string, setter: (v: string) => void) => {
    if (val) { let num = parseInt(val.replace(/\D/g, ''), 10); if (isNaN(num) || num < 1) num = 1; setter(`${num} dia${num > 1 ? 's' : ''}`); }
  };

  const formatTempoFocus = (val: string, setter: (v: string) => void) => { if (val) setter(val.replace(/\D/g, '')); };

  const handleDispensaToggle = (dispensa: string) => {
    if (dispensa === 'TODAS AS ATIVIDADES') {
      if (selectedDispensas.includes('TODAS AS ATIVIDADES')) setSelectedDispensas([]);
      else setSelectedDispensas(['TODAS AS ATIVIDADES']);
    } else {
      let ns = selectedDispensas.filter(d => d !== 'TODAS AS ATIVIDADES');
      if (ns.includes(dispensa)) ns = ns.filter(d => d !== dispensa);
      else ns.push(dispensa);
      setSelectedDispensas(ns);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => { setImgSrc(reader.result?.toString() || ''); setShowCropModal(true); });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = () => {
    if (!imgRef.current || !completedCrop || completedCrop.width <= 0) { setShowCropModal(false); return; }
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width; canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
    setCroppedImageUrl(canvas.toDataURL('image/jpeg', 0.6));
    setShowCropModal(false); setImgSrc('');
  };

  const extractDataWithGemini = async () => {
    if (!croppedImageUrl) return;
    setIsExtracting(true);
    try {
      const base64Data = croppedImageUrl.split(',')[1];
      const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'extrair_dados_atestado', base64Image: base64Data }) });
      const result = await response.json();
      if (result.success && result.data) {
        if (result.data.dataAtestado) setDataAtestado(result.data.dataAtestado);
        if (result.data.tempoAtestado) handleTempoInput(result.data.tempoAtestado.toString(), setTempoAtestado);
        if (result.data.cid) {
          const cidCode = result.data.cid.toLowerCase().replace(/[^a-z0-9]/g, '');
          const foundCid = cidOptions.find(c => { const sub = (c.SUBCAT || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return sub === cidCode || sub.includes(cidCode); });
          if (foundCid) { setSelectedCid(foundCid); setCidQuery(''); } else setCidQuery(result.data.cid);
        }
        if (result.data.nomeMilitar) await abrirModalPesquisaNome(result.data.nomeMilitar, true);
      } else alert(`Aviso: ${result.message || "Não foi possível ler o documento."}`);
    } catch (err) { console.error(err); alert("Erro de comunicação com o servidor ao invocar a IA."); }
    finally { setIsExtracting(false); }
  };

  const handleReset = () => {
    setSuccessPdfUrl(null); setNip(''); setMilitarStatus(""); setSearchError(''); setServicoQuery(''); setSelectedServico(null);
    setDataAtestado(''); setTempoAtestado(''); setCidQuery(''); setSelectedCid(null); setTempoHomologacao('');
    setSelectedDispensas([]); setVdf(null); setSelectedPerito(''); setNome(''); setPg(''); setQuadro('');
    setEspPraca(''); setOm(''); setSituacao(''); setCirculo(''); setOmLeitura(''); setCroppedImageUrl('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!nip || !selectedServico || !dataAtestado || !tempoAtestado || !selectedCid || !tempoHomologacao || selectedDispensas.length === 0 || vdf === null || !selectedPerito) {
      alert("Por favor, preencha todos os campos obrigatórios (*)"); return;
    }
    if (militarStatus === "not_found" && (!pg || !om || !nome)) { alert("Preencha os dados manuais do militar."); return; }
    setIsSubmitting(true);
    let militarIdentifier = militarStatus === "found" ? inspecionado : `${pg} ${quadro ? quadro + ' ' : ''}${espPraca ? espPraca + ' ' : ''}${nip} ${nome}`.trim().replace(/\s+/g, ' ');
    const tempoHomologNumerico = parseInt(tempoHomologacao.replace(/\D/g, ''), 10);
    const payload = {
      action: 'gerar_pericia_menor', inspecionado: militarIdentifier, om: militarStatus === "found" ? omLeitura : om,
      servico: selectedServico.servico_label, cid: `${selectedCid.SUBCAT} - ${selectedCid.DESCRICAO}`,
      dispensas: selectedDispensas.join(', '), dataAtestado, tempoAtestado: tempoAtestado.replace(/\D/g, ''),
      tempoHomolog: tempoHomologNumerico, tempoExtenso: EXTENSOS[tempoHomologNumerico] || tempoHomologNumerico.toString(),
      vdf, perito: selectedPerito, isNewMilitar: militarStatus === "not_found", nip,
      pgq: `${pg} ${quadro ? quadro : ''}${espPraca ? espPraca : ''}`.trim(), nomeMilitar: nome, situacao,
      base64Image: croppedImageUrl ? croppedImageUrl.split(',')[1] : null
    };
    try {
      const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      if (data.success) setSuccessPdfUrl(data.pdfUrl);
      else alert("Erro ao gerar Perícia Menor: " + data.message);
    } catch (error) { console.error(error); alert("Falha na comunicação com o servidor."); }
    finally { setIsSubmitting(false); }
  };

  const fetchHistory = async () => {
    if (history.length > 0) return;
    setIsFetchingHistory(true);
    try {
      const res = await fetch(`${GAS_URL}?action=getPericiaMenorList`);
      const json = await res.json();
      if (json.success) { setHistory(json.data); setVigentesCount(json.data.filter((r: PericiaMenorRecord) => r.vigente).length); }
    } catch (e) { console.error(e); } finally { setIsFetchingHistory(false); }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isRestricao = (r: PericiaMenorRecord) => r.dispensas.trim() !== '' && !r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES');
  const vigentesTotal = history.filter(r => r.vigente).length;
  const concluidosTotal = history.filter(r => r.concluido).length;
  const ltsTotal = history.filter(r => r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES')).length;
  const restricoesTotal = history.filter(isRestricao).length;

  const parseDate = (str: string): number => { const [d, m, y] = str.split('/'); return new Date(Number(y), Number(m) - 1, Number(d)).getTime(); };
  const handleSort = (col: 'data' | 'inspecionado') => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } };

  const filteredHistory = history
    .filter(r => filterVigente ? r.vigente : true)
    .filter(r => filterConcluido ? r.concluido : true)
    .filter(r => filterLts ? r.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES') : true)
    .filter(r => filterRestricoes ? isRestricao(r) : true)
    .filter(r => historySearch === '' || r.inspecionado.toLowerCase().includes(historySearch.toLowerCase()))
    .sort((a, b) => { let cmp = sortCol === 'data' ? parseDate(a.dataAtestado) - parseDate(b.dataAtestado) : a.inspecionado.localeCompare(b.inspecionado, 'pt-BR'); return sortDir === 'asc' ? cmp : -cmp; });

  const searchSuggestions = historySearch.length >= 1
    ? [...new Set(history.map(r => r.inspecionado))].filter(n => n.toLowerCase().includes(historySearch.toLowerCase())).slice(0, 8)
    : [];

  if (selectedPerson !== null) {
    const personRecords = history.filter(r => r.inspecionado === selectedPerson);
    return <PericiaMenorDetalhe person={selectedPerson} records={personRecords} onBack={() => setSelectedPerson(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <Header title="Perícia Menor" />
      <div className="bg-[#050F41] px-2 pt-1 flex justify-around z-10 flex-shrink-0">
        <button onClick={() => setActiveTab('novo')} className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 mx-0.5 text-sm font-bold transition-all focus:outline-none rounded-t-2xl ${activeTab === 'novo' ? 'bg-[#079551] text-white' : 'text-white/50 hover:text-white/80'}`}>
          <span className="material-symbols-outlined text-[18px]">add_circle</span><span>Novo</span>
        </button>
        <button onClick={() => { setActiveTab('historico'); fetchHistory(); }} className={`flex items-center justify-center gap-2 flex-1 pb-3 pt-2 mx-0.5 text-sm font-bold transition-all focus:outline-none rounded-t-2xl ${activeTab === 'historico' ? 'bg-[#079551] text-white' : 'text-white/50 hover:text-white/80'}`}>
          <span className="material-symbols-outlined text-[18px]">history</span><span>Histórico</span>
          {vigentesCount > 0 && (<span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">{vigentesCount}</span>)}
        </button>
      </div>

      {activeTab === 'novo' && (
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 w-full max-w-2xl mx-auto space-y-6">
        {/* IA Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 animate-fade-in shadow-inner">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#050F41] uppercase tracking-wider flex items-center gap-2"><Camera size={16} className="text-blue-600" /> Leitura Inteligente (IA)</h3>
          </div>
          {!croppedImageUrl ? (
            <div className="flex justify-center">
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={onSelectFile} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full py-3.5 bg-white border border-blue-300 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-sm"><Camera size={18} /> Fotografar Atestado</button>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200"><img src={croppedImageUrl} alt="Atestado Recortado" className="w-full h-full object-cover" /></div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-green-600 mb-2 flex items-center gap-1 uppercase"><CheckCircle2 size={14}/> Imagem Capturada</p>
                <div className="flex gap-2">
                  <button type="button" onClick={extractDataWithGemini} disabled={isExtracting} className="flex-1 py-2 bg-gradient-to-r from-[#050F41] to-blue-800 text-white text-xs font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {isExtracting ? <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin"/> A analisar...</span> : <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-yellow-400"/> Extrair Dados</span>}
                  </button>
                  <button type="button" onClick={() => setCroppedImageUrl('')} disabled={isExtracting} className="px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 disabled:opacity-50">Refazer</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Militar Section */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#050F41] uppercase mb-4 font-heading border-b border-gray-100 pb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[#FAB932]">person</span>Dados do Militar</h2>
          <div className="space-y-4">
            <div className="relative z-[100] mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Serviço *</label>
              <input type="text" value={selectedServico ? selectedServico.servico_label : servicoQuery} onChange={(e) => handleServicoSearch(e.target.value)} placeholder="Busque pelo nome do serviço..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#050F41]" />
              {showServicoDropdown && filteredServicos.length > 0 && (
                <ul className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {filteredServicos.map((s, idx) => (<li key={idx} onClick={() => { setSelectedServico(s); setShowServicoDropdown(false); setServicoQuery(''); }} className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer"><span className="font-bold text-[#050F41] block">{s.servico_label}</span><span className="text-xs text-gray-500">{s.superior_direto}</span></li>))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">NIP *</label>
              <div className="relative">
                <input type="text" value={nip} onChange={handleNipChange} placeholder="00.0000.00" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-navy focus:border-navy block p-3 font-mono" required />
                {militarStatus === "loading" && (<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin"></div></div>)}
                {militarStatus === "found" && (<div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500"><CheckCircle2 size={18} /></div>)}
              </div>
              {searchError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><AlertCircle size={12} /> {searchError}</p>}
              <div className="mt-1.5 text-right"><button type="button" onClick={() => abrirModalPesquisaNome()} className="text-[10px] text-blue-600 underline hover:text-blue-800 uppercase font-bold">Pesquisar pelo nome</button></div>
            </div>
            {militarStatus === "found" && (<div className="bg-blue-50 border-l-4 border-navy p-3 rounded-r-lg space-y-2 animate-fade-in"><div><label className="block text-[10px] font-bold text-navy/70 uppercase">Inspecionado</label><p className="text-sm font-medium text-navy">{inspecionado}</p></div><div><label className="block text-[10px] font-bold text-navy/70 uppercase">OM</label><p className="text-sm font-medium text-navy">{omLeitura}</p></div></div>)}
            {militarStatus === "not_found" && (
              <div className="space-y-4 animate-fade-in border-t border-dashed border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Posto/Graduação *</label><select value={pg} onChange={(e) => setPg(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-3"><option value="">Sel...</option>{PG_OPTIONS.map(o => (<option key={o} value={o}>{o}</option>))}</select></div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">OM *</label><input type="text" list="om-options-pm" value={om} onChange={(e) => setOm(e.target.value)} placeholder="Ex: HNRe" className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-3" /><datalist id="om-options-pm">{omsOptions.map(opt => (<option key={opt} value={opt} />))}</datalist></div>
                </div>
                {circulo === "Oficial" && (<div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Quadro *</label><select value={quadro} onChange={(e) => setQuadro(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-3"><option value="">Sel...</option>{QUADROS.map(q => (<option key={q} value={q}>{q}</option>))}</select></div>)}
                {circulo === "Praça" && (<div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Especialidade *</label><select value={espPraca} onChange={(e) => setEspPraca(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-3"><option value="">Sel...</option>{ESP_PRACAS.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>)}
                <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Nome Completo *</label><input type="text" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-3 uppercase" /></div>
              </div>
            )}
          </div>
        </section>

        {/* Atestado Section */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#050F41] uppercase mb-4 font-heading border-b border-gray-100 pb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[#FAB932]">medical_information</span>Dados do Atestado</h2>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full"><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Data Atestado *</label><input type="date" value={dataAtestado} onChange={(e) => setDataAtestado(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" /></div>
              <div className="w-full"><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Tempo Atestado *</label><input type="text" value={tempoAtestado} onChange={(e) => handleTempoInput(e.target.value, setTempoAtestado)} onBlur={() => formatTempoBlur(tempoAtestado, setTempoAtestado)} onFocus={() => formatTempoFocus(tempoAtestado, setTempoAtestado)} placeholder="Ex.: 5 dias" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" /></div>
            </div>
            <div className="relative z-[90]">
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">CID *</label>
              <input type="text" value={selectedCid ? selectedCid.DESCRABREV : cidQuery} onChange={(e) => handleCidSearch(e.target.value)} placeholder="Busque por código ou doença..." className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" />
              {showCidDropdown && filteredCids.length > 0 && (<ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-50">{filteredCids.map((cid, idx) => (<li key={idx} onClick={() => { setSelectedCid(cid); setShowCidDropdown(false); setCidQuery(''); }} className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer"><span className="font-bold text-[#050F41] block">{cid.DESCRABREV}</span><span className="text-xs text-gray-500">{cid.DESCRICAO}</span></li>))}</ul>)}
            </div>
          </div>
        </section>

        {/* Homologacao Section */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#050F41] uppercase mb-4 font-heading border-b border-gray-100 pb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[#FAB932]">verified</span>Homologação</h2>
          <div className="space-y-6">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1 uppercase">Tempo Homologado *</label><input type="text" value={tempoHomologacao} onChange={(e) => handleTempoInput(e.target.value, setTempoHomologacao, 20)} onBlur={() => formatTempoBlur(tempoHomologacao, setTempoHomologacao)} onFocus={() => formatTempoFocus(tempoHomologacao, setTempoHomologacao)} placeholder="Máx: 20 dias" className="w-full sm:w-1/2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm" /></div>
            <div className="relative z-[80]">
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Dispensas *</label>
              <button type="button" onClick={() => setShowDispensasDropdown(!showDispensasDropdown)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm flex justify-between items-center">
                <span className={`truncate font-medium ${selectedDispensas.length > 0 ? 'text-[#050F41]' : 'text-gray-400'}`}>{selectedDispensas.length === 0 ? 'Selecione as dispensas...' : selectedDispensas.includes('TODAS AS ATIVIDADES') ? 'TODAS AS ATIVIDADES' : `${selectedDispensas.length} dispensa(s) selecionada(s)`}</span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${showDispensasDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showDispensasDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fade-in">
                  {isLoadingLookups ? (<p className="text-xs text-gray-400 col-span-2 text-center py-4 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> A carregar dispensas...</p>) : (
                    dispensasDisponiveis.map((disp, idx) => {
                      const isTodas = disp === 'TODAS AS ATIVIDADES';
                      const isSelected = selectedDispensas.includes(disp);
                      const isDisabled = (isTodas && selectedDispensas.length > 0 && !isSelected) || (!isTodas && selectedDispensas.includes('TODAS AS ATIVIDADES'));
                      return (
                        <button key={idx} onClick={() => handleDispensaToggle(disp)} disabled={isDisabled} type="button" className={`flex items-center text-left p-3 rounded-xl border text-xs transition-all ${isSelected ? 'bg-blue-50 border-blue-200 text-[#050F41] font-bold' : isDisabled ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60' : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                          <div className={`w-4 h-4 rounded-md shrink-0 mr-3 flex items-center justify-center border ${isSelected ? 'bg-[#050F41] border-[#050F41]' : 'border-gray-300 bg-white'}`}>{isSelected && <CheckCircle2 size={12} strokeWidth={3} className="text-white" />}</div>
                          <span>{disp}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">VDF *</label><div className="flex space-x-2"><button type="button" onClick={() => setVdf(true)} className={`flex-1 py-2.5 rounded-xl font-bold border ${vdf === true ? 'bg-[#050F41] text-white border-[#050F41]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>SIM</button><button type="button" onClick={() => setVdf(false)} className={`flex-1 py-2.5 rounded-xl font-bold border ${vdf === false ? 'bg-[#050F41] text-white border-[#050F41]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>NÃO</button></div></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-2 uppercase">Perito *</label><div className="flex space-x-2">{isLoadingLookups ? (<p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> A carregar peritos...</p>) : (peritosDisponiveis.map((p, idx) => (<button type="button" key={idx} onClick={() => setSelectedPerito(p.PERITO)} className={`flex-1 px-2 py-2.5 rounded-xl text-sm font-bold border ${selectedPerito === p.PERITO ? 'bg-[#050F41] text-white border-[#050F41]' : 'bg-white text-gray-600 border-gray-200'}`}>{p.PERITO}</button>)))}</div></div>
          </div>
        </section>

        <div className="flex justify-end items-center gap-4 pt-4 pb-8">
          <button type="button" onClick={handleReset} className="w-14 h-14 bg-white text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center shadow-md border border-gray-200 active:scale-95" title="Limpar"><span className="material-symbols-outlined text-[26px]">delete</span></button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-14 h-14 bg-[#079551] text-white rounded-full flex items-center justify-center shadow-md hover:shadow-xl active:scale-95 disabled:opacity-50" title="Gerar Perícia Menor">{isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <span className="material-symbols-outlined text-[26px]">send</span>}</button>
        </div>
      </div>
      )}

      {/* Name search modal */}
      {showPesquisarNomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowPesquisarNomeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"><span className="material-symbols-outlined">close</span></button>
            <div className="p-6 bg-[#050F41] text-white shrink-0"><h2 className="text-xl font-bold">Pesquisar Militar</h2><p className="text-blue-100 text-sm mt-1">Busque pelo nome completo</p></div>
            <div className="p-6 flex-1 flex flex-col min-h-0">
              <div className="relative shrink-0 mb-4"><div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><span className="material-symbols-outlined">search</span></div><input type="text" value={pesquisarNomeTerm} onChange={(e) => setPesquisarNomeTerm(e.target.value)} placeholder="Ex: João da Silva..." className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block pl-10 p-2.5" autoFocus /></div>
              <div className="flex-1 overflow-y-auto min-h-[50px] border border-gray-100 rounded-lg bg-gray-50/50">
                {isCarregandoMilitares ? (<div className="p-8 text-center flex flex-col items-center"><div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mb-2"></div><p className="text-sm">Carregando...</p></div>) : (
                  <div className="flex flex-col">
                    {militaresInfoList.filter(m => { if (!pesquisarNomeTerm) return false; const terms = removeAcentos(pesquisarNomeTerm.toLowerCase()).split(/\s+/).filter(Boolean); const name = removeAcentos(m.nome.toLowerCase()); return terms.every(t => name.includes(t)); }).slice(0, 50).map((m, idx) => (<div key={idx} onClick={() => selecionarNomeNip(m.nip)} className="px-4 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer"><div className="font-bold text-[#050F41] text-sm">{m.nome}</div><div className="text-xs text-gray-500 font-mono mt-0.5">{m.nip}</div></div>))}
                    {pesquisarNomeTerm && militaresInfoList.filter(m => { const terms = removeAcentos(pesquisarNomeTerm.toLowerCase()).split(/\s+/).filter(Boolean); return terms.every(t => removeAcentos(m.nome.toLowerCase()).includes(t)); }).length === 0 && (<div className="p-8 text-center text-gray-500 text-sm">Nenhum militar encontrado.</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col animate-fade-in backdrop-blur-sm">
          <div className="p-4 bg-black flex justify-between items-center text-white shrink-0 border-b border-gray-800"><h3 className="font-bold flex items-center gap-2"><CropIcon size={20} className="text-[#FAB932]" /> Recortar Atestado</h3><button onClick={() => { setShowCropModal(false); setImgSrc(''); }} className="p-2 text-gray-400 hover:text-white"><X size={24} /></button></div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">{imgSrc && (<ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={(c) => setCompletedCrop(c)}><img ref={imgRef} src={imgSrc} alt="Crop" style={{ maxHeight: '70vh', objectFit: 'contain' }} /></ReactCrop>)}</div>
          <div className="p-4 bg-black shrink-0 pb-10"><p className="text-gray-400 text-xs text-center mb-4">Arraste os cantos para selecionar nome, datas e o CID.</p><button onClick={handleCropComplete} className="w-full py-4 bg-[#079551] hover:bg-green-600 text-white font-bold rounded-xl flex justify-center items-center gap-2"><CheckCircle2 size={20} /> Confirmar Recorte</button></div>
        </div>
      )}

      {/* Submit overlay */}
      {(isSubmitting || successPdfUrl) && (
        <div className="fixed inset-0 z-[200] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6">
          {!successPdfUrl ? (
            <div className="flex flex-col items-center text-center space-y-4"><Loader2 className="animate-spin text-[#050F41]" size={48} /><h2 className="text-xl font-bold text-[#050F41]">A gerar Perícia Menor...</h2><p className="text-sm text-gray-500 max-w-xs">O documento está a ser processado e salvo no Google Drive.</p></div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-5 max-w-sm">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2"><CheckCircle className="text-green-600" size={40} /></div>
              <h2 className="text-2xl font-black text-[#050F41]">Sucesso!</h2>
              <p className="text-sm text-gray-600">A perícia foi gerada e a planilha atualizada.</p>
              <div className="flex flex-col w-full gap-3 mt-4">
                <a href={successPdfUrl} target="_blank" rel="noopener noreferrer" onClick={handleReset} className="w-full py-3.5 bg-[#050F41] text-white rounded-xl font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[20px]">picture_as_pdf</span> Ver PDF Gerado</a>
                <button onClick={handleReset} className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[20px]">add_circle</span> Nova Perícia Menor</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 w-full max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4 space-y-3">
            <div className="relative" ref={searchRef}>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">search</span>
              <input type="text" placeholder="Buscar por inspecionado..." value={historySearch} onChange={e => { setHistorySearch(e.target.value); setShowSearchDropdown(true); }} onFocus={() => setShowSearchDropdown(true)} className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#050F41] bg-gray-50" />
              {showSearchDropdown && searchSuggestions.length > 0 && (<div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">{searchSuggestions.map((name, i) => (<button key={i} type="button" onMouseDown={() => { setHistorySearch(name); setShowSearchDropdown(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">{name}</button>))}</div>)}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => { setFilterVigente(v => { const next = !v; if (next) setFilterConcluido(false); return next; }); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${filterVigente ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300'}`}>{filterVigente && <span className="material-symbols-outlined text-[13px]">check</span>}Vigentes{vigentesTotal > 0 && (<span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${filterVigente ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'}`}>{vigentesTotal}</span>)}</button>
              <button type="button" onClick={() => { setFilterConcluido(v => { const next = !v; if (next) setFilterVigente(false); return next; }); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${filterConcluido ? 'bg-[#079551] text-white border-[#079551]' : 'bg-white text-gray-600 border-gray-300'}`}>{filterConcluido && <span className="material-symbols-outlined text-[13px]">check</span>}Concluídos{concluidosTotal > 0 && (<span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${filterConcluido ? 'bg-white/25 text-white' : 'bg-green-100 text-green-700'}`}>{concluidosTotal}</span>)}</button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" onClick={() => { setFilterLts(v => { const next = !v; if (next) setFilterRestricoes(false); return next; }); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${filterLts ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300'}`}>{filterLts && <span className="material-symbols-outlined text-[13px]">check</span>}LTS{ltsTotal > 0 && (<span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${filterLts ? 'bg-white/25 text-white' : 'bg-red-100 text-red-600'}`}>{ltsTotal}</span>)}</button>
              <button type="button" onClick={() => { setFilterRestricoes(v => { const next = !v; if (next) setFilterLts(false); return next; }); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${filterRestricoes ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-gray-600 border-gray-300'}`}>{filterRestricoes && <span className="material-symbols-outlined text-[13px]">check</span>}Restrições{restricoesTotal > 0 && (<span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${filterRestricoes ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>{restricoesTotal}</span>)}</button>
            </div>
          </div>
          {filteredHistory.length > 0 && (<div className="flex justify-end mb-3 px-1"><span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{filteredHistory.length} registro{filteredHistory.length !== 1 ? 's' : ''}</span></div>)}
          {isFetchingHistory ? (<div className="flex items-center justify-center py-12 gap-3 text-gray-400"><span className="w-5 h-5 border-2 border-gray-300 border-t-[#050F41] rounded-full animate-spin" /><span className="text-sm">Carregando histórico...</span></div>) : filteredHistory.length === 0 ? (<div className="text-center py-12 text-gray-400 text-sm">Nenhum registro encontrado.</div>) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-[#050F41]/5 border-b border-gray-100"><th className="text-left px-3 py-2.5 font-bold text-[#050F41] w-[30%] cursor-pointer select-none" onClick={() => handleSort('data')}><span className="flex items-center gap-1">Data<span className="material-symbols-outlined text-[13px] text-gray-400">{sortCol === 'data' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}</span></span></th><th className="text-left px-3 py-2.5 font-bold text-[#050F41] cursor-pointer select-none" onClick={() => handleSort('inspecionado')}><span className="flex items-center gap-1">Inspecionado<span className="material-symbols-outlined text-[13px] text-gray-400">{sortCol === 'inspecionado' ? (sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more'}</span></span></th></tr></thead>
                <tbody>{filteredHistory.map((rec, i) => (<tr key={i} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}><td className="px-3 py-2.5 align-top"><span className="font-semibold text-gray-800 block">{rec.dataAtestado}</span>{rec.tempoAtestado && (<span className="text-[10px] text-gray-400 mt-0.5 block">{String(rec.tempoAtestado).replace(/^(\d+)$/, '$1 dias')}</span>)}<div className="flex gap-1 mt-1 flex-wrap">{rec.vigente && <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">V</span>}{rec.concluido && !rec.vigente && <span className="bg-green-100 text-green-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">C</span>}{rec.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES') && <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">LTS</span>}{(rec.dispensas.trim() !== '' && !rec.dispensas.toUpperCase().includes('TODAS AS ATIVIDADES')) && (<span className="bg-amber-100 text-amber-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">R</span>)}</div></td><td className="px-3 py-2.5 align-top"><button type="button" onClick={() => setSelectedPerson(rec.inspecionado)} className="font-semibold text-[#050F41] hover:text-[#079551] transition-colors flex items-start gap-1 text-left w-full"><span className="flex-1">{rec.inspecionado}</span><span className="material-symbols-outlined text-[13px] text-gray-400 shrink-0 mt-0.5">chevron_right</span></button>{rec.cid && (<span className="text-[10px] text-gray-400 mt-0.5 block">{rec.cid}</span>)}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
