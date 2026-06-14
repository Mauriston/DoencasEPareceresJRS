// Ficheiro: components/PericiaMenor.tsx
import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

// Documentação: Tipagem adaptada para o formato do teu JSON
interface CidItem {
  SUBCAT: string;
  DESCRICAO: string;
  DESCRABREV: string;
}

const PG_OPTIONS = ["CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR", "ALUNO", "SCNS"];
const QUADROS = ["AA", "AFN", "CA", "CD", "CN", "EN", "FN", "IM", "Md", "QC-CA", "QC-FN", "QC-IM", "S", "T"];
const ESP_PRACAS = ["AD", "AH", "AM", "AR", "MC", "MT", "AT", "AV", "BA", "CA", "CP", "CI", "CN", "CL", "CT", "CO", "DA", "DM", "DT", "ED", "EP", "EL", "ET", "TE", "EF", "EG", "ES", "AE", "EN", "FR", "GC", "GR", "HN", "HD", "IF", "MR", "MA", "NA", "MI", "MG", "ML", "ME", "MO", "MS", "MU", "ND", "OR", "OS", "PL", "PC", "PD", "PT", "QI", "RM", "RB", "SC", "SI", "TC"];

export const PericiaMenor: React.FC = () => {
  // === ESTADOS: DADOS DO MILITAR (IDÊNTICO A PARECERES) ===
  const [nip, setNip] = useState('');
  const [militarStatus, setMilitarStatus] = useState<"" | "loading" | "found" | "not_found">("");
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

  // === ESTADOS: DADOS DO ATESTADO ===
  const [dataAtestado, setDataAtestado] = useState('');
  const [tempoAtestado, setTempoAtestado] = useState('');
  const [cidQuery, setCidQuery] = useState('');
  const [cidOptions, setCidOptions] = useState<CidItem[]>([]);
  const [filteredCids, setFilteredCids] = useState<CidItem[]>([]);
  const [selectedCid, setSelectedCid] = useState<CidItem | null>(null);
  const [showCidDropdown, setShowCidDropdown] = useState(false);

  // === ESTADOS: HOMOLOGAÇÃO ===
  const [tempoHomologacao, setTempoHomologacao] = useState('');
  const [selectedDispensas, setSelectedDispensas] = useState<string[]>([]);
  const [vdf, setVdf] = useState<boolean | null>(null);
  const [selectedPerito, setSelectedPerito] = useState('');

  // === ESTADOS: LOOKUPS (Google Sheets) ===
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [omsOptions, setOmsOptions] = useState<string[]>([]);
  const [dispensasDisponiveis, setDispensasDisponiveis] = useState<string[]>([]);
  const [peritosDisponiveis, setPeritosDisponiveis] = useState<any[]>([]);

  // === CARREGAMENTO INICIAL ===
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const res = await fetch(`${process.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec'}?action=getLookups`);
        const json = await res.json();
        if (json.success) {
          setDispensasDisponiveis(json.data.DISPENSAS.filter(Boolean) || []);
          setPeritosDisponiveis(json.data.PERITOS || []);
          setOmsOptions(json.data.OM.filter(Boolean) || []);
        }
      } catch (err) {
        console.error('Erro ao carregar lookups', err);
      } finally {
        setIsLoadingLookups(false);
      }
    };

    const fetchCid = async () => {
      try {
        const res = await fetch('./cid.json'); // Documentação: Acesso direto à pasta public
        if (res.ok) {
          const data = await res.json();
          setCidOptions(data);
        }
      } catch (err) {
        console.error('Erro ao carregar cid.json', err);
      }
    };

    fetchLookups();
    fetchCid();
  }, []);

  // === LÓGICAS: DADOS DO MILITAR (IDÊNTICO A PARECERES) ===
  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 6) {
      value = `${value.slice(0, 2)}.${value.slice(2, 6)}.${value.slice(6)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}.${value.slice(2)}`;
    }
    setNip(value);

    if (value.length === 10) {
      searchNip(value);
    } else {
      setMilitarStatus("");
    }
  };

  const searchNip = async (searchNip: string) => {
    setMilitarStatus("loading");
    try {
      const res = await fetch(`${process.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec'}?action=getMilitar&nip=${searchNip}`);
      const data = await res.json();
      if (data.success && data.data) {
        setInspecionado(data.data.INSPECIONADO);
        setOmLeitura(data.data.OM);
        setMilitarStatus("found");
      } else {
        setMilitarStatus("not_found");
      }
    } catch (err) {
      console.error(err);
      setMilitarStatus("not_found");
    }
  };

  const abrirModalPesquisaNome = async () => {
    setShowPesquisarNomeModal(true);
    setPesquisarNomeTerm("");
    if (militaresInfoList.length === 0) {
      setIsCarregandoMilitares(true);
      try {
        const resp = await fetch(`${process.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec'}?action=getMilitaresList`);
        const data = await resp.json();
        if (data.success && data.data) {
          setMilitaresInfoList(data.data);
        }
      } catch (err) {
        console.error("Erro ao carregar lista de militares", err);
      } finally {
        setIsCarregandoMilitares(false);
      }
    }
  };

  const selecionarNomeNip = (selectedNip: string) => {
    setNip(selectedNip);
    setShowPesquisarNomeModal(false);
    searchNip(selectedNip);
  };

  useEffect(() => {
    if (militarStatus !== "not_found" || !pg) return;
    if (["CMG", "CF", "SO", "1SG", "2SG"].includes(pg)) {
      setSituacao("Carreira");
    } else if (["2T", "GM"].includes(pg)) {
      setSituacao("Temporário");
    } else if (["MN-RC", "SD", "GR", "ALUNO", "SCNS"].includes(pg)) {
      setSituacao("");
    } else {
      setSituacao("");
    }

    const oficialPg = ["CMG", "CF", "CC", "CT", "1T", "2T", "GM"];
    const pracaPg = ["SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR"];
    if (oficialPg.includes(pg)) setCirculo("Oficial");
    else if (pracaPg.includes(pg)) setCirculo("Praça");
    else setCirculo("");
  }, [pg, militarStatus]);


  // === LÓGICAS DE MÁSCARA E INTERAÇÃO (ATESTADO E HOMOLOGAÇÃO) ===
  const handleCidSearch = (text: string) => {
    setCidQuery(text);
    setSelectedCid(null);
    if (text.length > 1) {
      const lower = text.toLowerCase();
      // Documentação: Adaptado para pesquisar SUBCAT e DESCRICAO
      const filtered = cidOptions.filter(c => 
        (c.SUBCAT && c.SUBCAT.toLowerCase().includes(lower)) || 
        (c.DESCRICAO && c.DESCRICAO.toLowerCase().includes(lower))
      ).slice(0, 15);
      setFilteredCids(filtered);
      setShowCidDropdown(true);
    } else {
      setShowCidDropdown(false);
    }
  };

  const handleTempoInput = (val: string, setter: (v: string) => void) => {
    let numbersOnly = val.replace(/\D/g, ''); 
    if (numbersOnly !== '') {
      let num = parseInt(numbersOnly, 10);
      if (num > 20) num = 20; 
      setter(num.toString());
    } else {
      setter('');
    }
  };

  const formatTempoBlur = (val: string, setter: (v: string) => void) => {
    if (val) {
      let num = parseInt(val.replace(/\D/g, ''), 10);
      if (isNaN(num) || num < 1) num = 1;
      setter(`${num} dia${num > 1 ? 's' : ''}`);
    }
  };

  const formatTempoFocus = (val: string, setter: (v: string) => void) => {
    if (val) {
      setter(val.replace(/\D/g, ''));
    }
  };

  const handleDispensaToggle = (dispensa: string) => {
    if (dispensa === 'TODAS AS ATIVIDADES') {
      if (selectedDispensas.includes('TODAS AS ATIVIDADES')) {
        setSelectedDispensas([]);
      } else {
        setSelectedDispensas(['TODAS AS ATIVIDADES']);
      }
    } else {
      let newSelection = selectedDispensas.filter(d => d !== 'TODAS AS ATIVIDADES');
      if (newSelection.includes(dispensa)) {
        newSelection = newSelection.filter(d => d !== dispensa);
      } else {
        newSelection.push(dispensa);
      }
      setSelectedDispensas(newSelection);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-32">
      <Header title="Perícia Menor" />
      
      <div className="p-4 max-w-2xl mx-auto w-full space-y-6">
        
        {/* SECÇÃO 1: DADOS DO MILITAR */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#050F41] uppercase mb-4 font-heading border-b border-gray-100 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FAB932]">person</span>
            Dados do Militar
          </h2>

          <div className="space-y-4 font-body">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">NIP *</label>
              <div className="relative">
                <input
                  type="text"
                  value={nip}
                  onChange={handleNipChange}
                  placeholder="00.0000.00"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-navy focus:border-navy block p-3 transition-colors font-mono"
                  required
                />
                {militarStatus === "loading" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {militarStatus === "found" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500">
                    <CheckCircle2 size={18} />
                  </div>
                )}
              </div>
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={() => abrirModalPesquisaNome()}
                  className="text-[10px] text-blue-600 underline hover:text-blue-800 transition-colors bg-transparent border-none p-0 cursor-pointer uppercase font-bold tracking-wider"
                >
                  Pesquisar pelo nome
                </button>
              </div>
            </div>

            {militarStatus === "found" && (
              <div className="bg-blue-50 border-l-4 border-navy p-3 rounded-r-lg space-y-2 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-navy/70 uppercase">Inspecionado</label>
                  <p className="text-sm font-medium text-navy">{inspecionado}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-navy/70 uppercase">OM</label>
                  <p className="text-sm font-medium text-navy">{omLeitura}</p>
                </div>
              </div>
            )}

            {militarStatus === "not_found" && (
              <div className="space-y-4 animate-fade-in border-t border-dashed border-gray-200 pt-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Posto/Graduação *</label>
                    <select value={pg} onChange={(e) => setPg(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-navy focus:border-navy p-3">
                      <option value="">Sel...</option>
                      {PG_OPTIONS.map((o) => (<option key={o} value={o}>{o}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">OM *</label>
                    <input type="text" list="om-options" value={om} onChange={(e) => setOm(e.target.value)} placeholder="Ex: HNRe" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-navy focus:border-navy p-3" />
                    <datalist id="om-options">
                      {omsOptions.map((opt) => (<option key={opt} value={opt} />))}
                    </datalist>
                  </div>
                </div>

                {circulo === "Oficial" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Quadro *</label>
                    <select value={quadro} onChange={(e) => setQuadro(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-navy focus:border-navy p-3">
                      <option value="">Sel...</option>
                      {QUADROS.map((q) => (<option key={q} value={q}>{q}</option>))}
                    </select>
                  </div>
                )}

                {circulo === "Praça" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Especialidade *</label>
                    <select value={espPraca} onChange={(e) => setEspPraca(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-navy focus:border-navy p-3">
                      <option value="">Sel...</option>
                      {ESP_PRACAS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Nome Completo *</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-navy focus:border-navy p-3 uppercase" />
                </div>

                {["CC", "CT", "1T", "MN", "CB", "3SG"].includes(pg) && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Situação *</label>
                    <div className="flex space-x-2">
                      <button type="button" onClick={() => setSituacao("Carreira")} className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold transition-colors ${situacao === "Carreira" ? "bg-navy/10 text-navy border-navy" : "bg-white text-gray-600 border-gray-300"}`}>Carreira</button>
                      <button type="button" onClick={() => setSituacao("Temporário")} className={`flex-1 py-2 px-3 rounded-xl border text-sm font-bold transition-colors ${situacao === "Temporário" ? "bg-navy/10 text-navy border-navy" : "bg-white text-gray-600 border-gray-300"}`}>Temporário</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* SECÇÃO 2: DADOS DO ATESTADO */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#050F41] uppercase mb-4 font-heading border-b border-gray-100 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FAB932]">medical_information</span>
            Dados do Atestado
          </h2>

          <div className="space-y-4 font-body">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Data Atestado *</label>
                <input
                  type="date"
                  value={dataAtestado}
                  onChange={(e) => setDataAtestado(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#050F41]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Tempo Atestado *</label>
                <input
                  type="text"
                  value={tempoAtestado}
                  onChange={(e) => handleTempoInput(e.target.value, setTempoAtestado)}
                  onBlur={() => formatTempoBlur(tempoAtestado, setTempoAtestado)}
                  onFocus={() => formatTempoFocus(tempoAtestado, setTempoAtestado)}
                  placeholder="Máx: 20 dias"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#050F41]"
                />
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">CID *</label>
              <input
                type="text"
                value={selectedCid ? selectedCid.DESCRABREV : cidQuery}
                onChange={(e) => handleCidSearch(e.target.value)}
                placeholder="Busque por código ou doença..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#050F41]"
              />
              {showCidDropdown && filteredCids.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-50">
                  {filteredCids.map((cid, idx) => (
                    <li 
                      key={idx} 
                      onClick={() => { setSelectedCid(cid); setShowCidDropdown(false); setCidQuery(''); }}
                      className="px-4 py-3 text-sm hover:bg-blue-50 cursor-pointer"
                    >
                      <span className="font-bold text-[#050F41] block">{cid.DESCRABREV}</span>
                      <span className="text-xs text-gray-500">{cid.DESCRICAO}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {/* SECÇÃO 3: HOMOLOGAÇÃO */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-[#050F41] uppercase mb-4 font-heading border-b border-gray-100 pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FAB932]">verified</span>
            Homologação
          </h2>

          <div className="space-y-6 font-body">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wider">Tempo Homologado *</label>
              <input
                type="text"
                value={tempoHomologacao}
                onChange={(e) => handleTempoInput(e.target.value, setTempoHomologacao)}
                onBlur={() => formatTempoBlur(tempoHomologacao, setTempoHomologacao)}
                onFocus={() => formatTempoFocus(tempoHomologacao, setTempoHomologacao)}
                placeholder="Ex: 5 dias"
                className="w-full sm:w-1/2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#050F41]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Dispensas *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isLoadingLookups ? (
                  <p className="text-xs text-gray-400 col-span-2">A carregar dispensas...</p>
                ) : (
                  dispensasDisponiveis.map((disp, idx) => {
                    const isTodas = disp === 'TODAS AS ATIVIDADES';
                    const isSelected = selectedDispensas.includes(disp);
                    const isDisabled = 
                      (isTodas && selectedDispensas.length > 0 && !isSelected) || 
                      (!isTodas && selectedDispensas.includes('TODAS AS ATIVIDADES'));

                    return (
                      <button
                        key={idx}
                        onClick={() => handleDispensaToggle(disp)}
                        disabled={isDisabled}
                        className={`flex items-center justify-start text-left p-3 rounded-xl border text-sm transition-all ${
                          isSelected ? 'bg-blue-50 border-blue-200 text-[#050F41] font-bold shadow-sm' : 
                          isDisabled ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed opacity-60' : 
                          'bg-white border-gray-200 text-gray-700 hover:border-blue-200'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded shrink-0 mr-3 flex items-center justify-center border ${isSelected ? 'bg-[#050F41] border-[#050F41]' : 'border-gray-300'}`}>
                          {isSelected && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <span className="leading-snug">{disp}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">VDF *</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setVdf(true)}
                  className={`flex-1 py-3 rounded-xl font-bold border transition-colors ${vdf === true ? 'bg-[#050F41] text-white border-[#050F41]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  SIM
                </button>
                <button 
                  onClick={() => setVdf(false)}
                  className={`flex-1 py-3 rounded-xl font-bold border transition-colors ${vdf === false ? 'bg-[#050F41] text-white border-[#050F41]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  NÃO
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wider">Perito *</label>
              <div className="flex flex-wrap gap-2">
                {isLoadingLookups ? (
                  <p className="text-xs text-gray-400">A carregar peritos...</p>
                ) : (
                  peritosDisponiveis.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPerito(p.PERITO)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border ${
                        selectedPerito === p.PERITO
                          ? 'bg-[#050F41] text-white border-[#050F41] shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[#050F41]/30'
                      }`}
                    >
                      {p.PERITO}
                    </button>
                  ))
                )}
              </div>
            </div>

          </div>
        </section>

        {/* ÁREA DE BOTÕES DO FORMULÁRIO */}
        <div className="flex justify-end items-center gap-4 pt-4">
          <button
            type="submit"
            className="w-14 h-14 bg-[#079551] text-white rounded-full flex items-center justify-center transition-all hover:bg-green-700 shadow-md active:scale-95 focus:outline-none"
            title="Gerar Documento (Em breve)"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>

      </div>

      {/* MODAL DE PESQUISA POR NOME (CÓPIA DE PARECERES) */}
      {showPesquisarNomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPesquisarNomeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="p-6 bg-[#050F41] text-white shrink-0">
              <h2 className="text-xl font-bold tracking-tight">Pesquisar Militar</h2>
              <p className="text-blue-100 text-sm mt-1">Busque pelo nome completo</p>
            </div>
            
            <div className="p-6 flex-1 flex flex-col min-h-0">
              <div className="relative shrink-0 mb-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <span className="material-symbols-outlined">search</span>
                </div>
                <input
                  type="text"
                  value={pesquisarNomeTerm}
                  onChange={(e) => setPesquisarNomeTerm(e.target.value)}
                  placeholder="Ex: João da Silva..."
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block pl-10 p-2.5 transition-colors"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[50px] border border-gray-100 rounded-lg bg-gray-50/50">
                {isCarregandoMilitares ? (
                  <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                    <div className="w-6 h-6 border-2 border-navy border-t-transparent rounded-full animate-spin mb-2"></div>
                    <p className="text-sm">Carregando base de dados...</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {militaresInfoList
                      .filter((m) =>
                        pesquisarNomeTerm && m.nome.toLowerCase().includes(pesquisarNomeTerm.toLowerCase())
                      )
                      .slice(0, 50)
                      .map((m, idx) => (
                        <div
                          key={idx}
                          onClick={() => selecionarNomeNip(m.nip)}
                          className="px-4 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <div className="font-bold text-[#050F41] text-sm">{m.nome}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">{m.nip}</div>
                        </div>
                      ))}
                    {pesquisarNomeTerm &&
                      militaresInfoList.filter((m) =>
                        m.nome.toLowerCase().includes(pesquisarNomeTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">
                          Nenhum militar encontrado.
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};