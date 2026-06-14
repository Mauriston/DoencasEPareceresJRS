// Ficheiro: components/PericiaMenor.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { Search, Loader2, AlertCircle, CheckCircle2, ChevronDown, CheckCircle, Camera, Crop as CropIcon, Sparkles, X } from 'lucide-react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface CidItem {
  SUBCAT: string;
  DESCRICAO: string;
  DESCRABREV: string;
}

interface ServicoItem {
  superior_direto: string;
  servico_id: string;
  servico: string;
  servico_label: string;
}

const EXTENSOS: Record<number, string> = {
  1: "um", 2: "dois", 3: "três", 4: "quatro", 5: "cinco", 6: "seis", 7: "sete", 8: "oito", 9: "nove", 10: "dez",
  11: "onze", 12: "doze", 13: "treze", 14: "catorze", 15: "quinze", 16: "dezesseis", 17: "dezessete", 18: "dezoito", 19: "dezenove", 20: "vinte"
};

const PG_OPTIONS = ["CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR", "ALUNO", "SCNS"];
const QUADROS = ["AA", "AFN", "CA", "CD", "CN", "EN", "FN", "IM", "Md", "QC-CA", "QC-FN", "QC-IM", "S", "T"];
const ESP_PRACAS = ["AD", "AH", "AM", "AR", "MC", "MT", "AT", "AV", "BA", "CA", "CP", "CI", "CN", "CL", "CT", "CO", "DA", "DM", "DT", "ED", "EP", "EL", "ET", "TE", "EF", "EG", "ES", "AE", "EN", "FR", "GC", "GR", "HN", "HD", "IF", "MR", "MA", "NA", "MI", "MG", "ML", "ME", "MO", "MS", "MU", "ND", "OR", "OS", "PL", "PC", "PD", "PT", "QI", "RM", "RB", "SC", "SI", "TC"];

const removeAcentos = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const PericiaMenor: React.FC = () => {
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
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}cid.json`); 
        if (res.ok) {
          const data = await res.json();
          setCidOptions(data);
        }
      } catch (err) {
        console.error('Erro ao carregar cid.json', err);
      }
    };

    const fetchServicos = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}servicosHNRe.json`); 
        if (res.ok) {
          const data = await res.json();
          setServicoOptions(data);
        }
      } catch (err) {
        console.error('Erro ao carregar servicosHNRe.json', err);
      }
    };

    fetchLookups();
    fetchCid();
    fetchServicos();
  }, []);

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
      setSearchError('');
    }
  };

  const searchNip = async (searchNip: string) => {
    setMilitarStatus("loading");
    setSearchError('');
    try {
      const res = await fetch(`${process.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec'}?action=getMilitar&nip=${searchNip}`);
      const data = await res.json();
      if (data.success && data.data) {
        setInspecionado(data.data.INSPECIONADO);
        setOmLeitura(data.data.OM);
        setMilitarStatus("found");
      } else {
        setMilitarStatus("not_found");
        setSearchError('Militar não encontrado. Preencha manualmente.');
      }
    } catch (err) {
      console.error(err);
      setMilitarStatus("not_found");
      setSearchError('Erro ao buscar militar. Verifique a conexão.');
    }
  };

  // Documentação: Modificado para aceitar o "initialTerm" vindo do Gemini!
  const abrirModalPesquisaNome = async (initialTerm: string = "") => {
    setShowPesquisarNomeModal(true);
    setPesquisarNomeTerm(initialTerm);
    if (militaresInfoList.length === 0) {
      setIsCarregandoMilitares(true);
      try {
        const resp = await fetch(`${process.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec'}?action=getMilitaresList`);
        const data = await resp.json();
        if (data.success && data.data) {
          setMilitaresInfoList(data.data);
        }
      } catch (err) {
        console.error("Erro ao carregar lista", err);
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
    if (["CMG", "CF", "SO", "1SG", "2SG"].includes(pg)) setSituacao("Carreira");
    else if (["2T", "GM"].includes(pg)) setSituacao("Temporário");
    else setSituacao("");

    if (["CMG", "CF", "CC", "CT", "1T", "2T", "GM"].includes(pg)) setCirculo("Oficial");
    else if (["SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR"].includes(pg)) setCirculo("Praça");
    else setCirculo("");
  }, [pg, militarStatus]);

  const handleServicoSearch = (text: string) => {
    setServicoQuery(text);
    setSelectedServico(null);
    
    if (text.trim().length > 1) {
      const querySemAcentos = removeAcentos(text.trim().toLowerCase());
      const filtered = servicoOptions.filter(s => {
        const superior = s.superior_direto ? removeAcentos(s.superior_direto.toLowerCase()) : '';
        const servicoName = s.servico ? removeAcentos(s.servico.toLowerCase()) : '';
        const label = s.servico_label ? removeAcentos(s.servico_label.toLowerCase()) : '';
        
        return superior.includes(querySemAcentos) || servicoName.includes(querySemAcentos) || label.includes(querySemAcentos);
      }).slice(0, 15);
      
      setFilteredServicos(filtered);
      setShowServicoDropdown(true);
    } else {
      setShowServicoDropdown(false);
    }
  };

  const handleCidSearch = (text: string) => {
    setCidQuery(text);
    setSelectedCid(null);
    if (text.length > 1) {
      const querySemAcentos = removeAcentos(text.toLowerCase());
      const filtered = cidOptions.filter(c => {
        const subcat = c.SUBCAT ? removeAcentos(c.SUBCAT.toLowerCase()) : '';
        const desc = c.DESCRICAO ? removeAcentos(c.DESCRICAO.toLowerCase()) : '';
        return subcat.includes(querySemAcentos) || desc.includes(querySemAcentos);
      }).slice(0, 15);
      
      setFilteredCids(filtered);
      setShowCidDropdown(true);
    } else {
      setShowCidDropdown(false);
    }
  };

  const handleTempoInput = (val: string, setter: (v: string) => void, maxLimit?: number) => {
    let numbersOnly = val.replace(/\D/g, ''); 
    if (numbersOnly !== '') {
      let num = parseInt(numbersOnly, 10);
      if (maxLimit && num > maxLimit) num = maxLimit; 
      if (num < 1) num = 1; 
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
    if (val) setter(val.replace(/\D/g, ''));
  };

  const handleDispensaToggle = (dispensa: string) => {
    if (dispensa === 'TODAS AS ATIVIDADES') {
      if (selectedDispensas.includes('TODAS AS ATIVIDADES')) setSelectedDispensas([]);
      else setSelectedDispensas(['TODAS AS ATIVIDADES']);
    } else {
      let newSelection = selectedDispensas.filter(d => d !== 'TODAS AS ATIVIDADES');
      if (newSelection.includes(dispensa)) newSelection = newSelection.filter(d => d !== dispensa);
      else newSelection.push(dispensa);
      setSelectedDispensas(newSelection);
    }
  };

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); 
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        setShowCropModal(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = () => {
    if (!imgRef.current || !completedCrop || completedCrop.width <= 0 || completedCrop.height <= 0) {
      setShowCropModal(false);
      return;
    }
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0,
      completedCrop.width,
      completedCrop.height
    );
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.6); 
    setCroppedImageUrl(base64Image);
    setShowCropModal(false);
    setImgSrc('');
  };

  const extractDataWithGemini = async () => {
    if (!croppedImageUrl) return;
    setIsExtracting(true);
    
    try {
      const base64Data = croppedImageUrl.split(',')[1];
      const payload = {
        action: 'extrair_dados_atestado',
        base64Image: base64Data
      };
      
      const response = await fetch(`${process.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec'}`, {
          method: 'POST',
          body: JSON.stringify(payload)
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        if (result.data.dataAtestado) setDataAtestado(result.data.dataAtestado);
        if (result.data.tempoAtestado) handleTempoInput(result.data.tempoAtestado.toString(), setTempoAtestado);
        
        if (result.data.cid) {
           const cidCode = result.data.cid.toLowerCase().replace(/[^a-z0-9]/g, '');
           const foundCid = cidOptions.find(c => {
             const subcat = c.SUBCAT ? c.SUBCAT.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
             return subcat === cidCode || subcat.includes(cidCode);
           });
           
           if (foundCid) {
               setSelectedCid(foundCid);
               setCidQuery('');
           } else {
               setCidQuery(result.data.cid); 
           }
        }

        // Documentação: Nova Lógica! Se houver nomeMilitar, salta direto para o modal de pesquisa
        if (result.data.nomeMilitar) {
            abrirModalPesquisaNome(result.data.nomeMilitar);
        }

      } else {
         alert(`Aviso da Inteligência Artificial: ${result.message || "Não foi possível ler o documento."}`);
      }
    } catch (err) {
       console.error(err);
       alert("Erro de comunicação com o servidor ao invocar a IA.");
    } finally {
       setIsExtracting(false);
    }
  };

  const handleReset = () => {
    setSuccessPdfUrl(null);
    setNip('');
    setMilitarStatus("");
    setSearchError('');
    setServicoQuery('');
    setSelectedServico(null);
    setDataAtestado('');
    setTempoAtestado('');
    setCidQuery('');
    setSelectedCid(null);
    setTempoHomologacao('');
    setSelectedDispensas([]);
    setVdf(null);
    setSelectedPerito('');
    setNomeMilitar('');
    setPosto('');
    setQuadro('');
    setEspecialidade('');
    setOm('');
    setSituacao('');
    setNome('');
    setPg('');
    setCirculo('');
    setEspPraca('');
    setOmLeitura('');
    setCroppedImageUrl('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (
      !nip || 
      !selectedServico ||
      !dataAtestado || 
      !tempoAtestado || 
      !selectedCid || 
      !tempoHomologacao || 
      selectedDispensas.length === 0 || 
      vdf === null || 
      !selectedPerito
    ) {
      alert("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }

    if (militarStatus === "not_found" && (!pg || !om || !nome)) {
      alert("Por favor, preencha os dados manuais do militar (Posto/Graduação, OM e Nome).");
      return;
    }

    setIsSubmitting(true);

    let militarIdentifier = "";
    if (militarStatus === "found") {
      militarIdentifier = inspecionado;
    } else {
      militarIdentifier = `${pg} ${quadro ? quadro + ' ' : ''}${espPraca ? espPraca + ' ' : ''}${nip} ${nome}`.trim().replace(/\s+/g, ' ');
    }

    const tempoHomologNumerico = parseInt(tempoHomologacao.replace(/\D/g, ''), 10);
    const tempoExtenso = EXTENSOS[tempoHomologNumerico] || tempoHomologNumerico.toString();

    const payload = {
      action: 'gerar_pericia_menor',
      inspecionado: militarIdentifier,
      om: militarStatus === "found" ? omLeitura : om,
      servico: selectedServico.servico_label,
      cid: `${selectedCid.SUBCAT} - ${selectedCid.DESCRICAO}`,
      dispensas: selectedDispensas.join(', '),
      dataAtestado: dataAtestado,
      tempoAtestado: tempoAtestado.replace(/\D/g, ''),
      tempoHomolog: tempoHomologNumerico,
      tempoExtenso: tempoExtenso,
      vdf: vdf,
      perito: selectedPerito,
      isNewMilitar: militarStatus === "not_found",
      nip: nip,
      pgq: `${pg} ${quadro ? quadro : ''}${espPraca ? espPraca : ''}`.trim(),
      nomeMilitar: nome,
      situacao: situacao,
      base64Image: croppedImageUrl ? croppedImageUrl.split(',')[1] : null 
    };

    try {
      const response = await fetch(`${process.env.VITE_APPSCRIPT_URL || 'https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec'}`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (data.success) {
        setSuccessPdfUrl(data.pdfUrl);
      } else {
        alert("Erro ao gerar Perícia Menor: " + data.message);
      }
    } catch (error) {
      console.error(error);
      alert("Falha na comunicação com o servidor. Verifique a sua conexão à internet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative">
      <Header title="Perícia Menor" />
      
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 w-full max-w-2xl mx-auto space-y-6">
        
        {/* ======================================================== */}
        {/* NOVA POSIÇÃO: SECÇÃO 0: INTELIGÊNCIA ARTIFICIAL E CÂMARA */}
        {/* ======================================================== */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 animate-fade-in shadow-inner">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#050F41] uppercase tracking-wider flex items-center gap-2">
              <Camera size={16} className="text-blue-600" /> Leitura Inteligente (IA)
            </h3>
          </div>
          
          {!croppedImageUrl ? (
            <div className="flex justify-center">
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                ref={fileInputRef} 
                onChange={onSelectFile} 
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 bg-white border border-blue-300 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Camera size={18} /> Fotografar Atestado
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-gray-100 relative">
                <img src={croppedImageUrl} alt="Atestado Recortado" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 overflow-hidden">
                  <p className="text-[11px] font-bold text-green-600 mb-2 flex items-center gap-1 uppercase tracking-wider"><CheckCircle2 size={14}/> Imagem Capturada</p>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={extractDataWithGemini}
                      disabled={isExtracting}
                      className="flex-1 py-2 bg-gradient-to-r from-[#050F41] to-blue-800 text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md whitespace-nowrap"
                    >
                      {isExtracting ? (
                        <span className="flex items-center gap-1.5"><Loader2 size={14} className="animate-spin"/> A analisar...</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-yellow-400"/> Extrair Dados</span>
                      )}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCroppedImageUrl('')}
                      disabled={isExtracting}
                      className="px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      Refazer
                    </button>
                  </div>
              </div>
            </div>
          )}
        </div>


        {/* SECÇÃO 1: DADOS DO MIL
