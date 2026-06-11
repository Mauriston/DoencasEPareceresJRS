import React, { useState, useEffect } from "react";
import { Header } from "./Header";
import { initAuth, googleSignIn, getAccessToken } from "../services/firebaseAuth";

export const Pareceres: React.FC = () => {
  const [peritoSelecionado, setPeritoSelecionado] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [historico, setHistorico] = useState("");
  const [nip, setNip] = useState("");
  const [militarStatus, setMilitarStatus] = useState<"" | "loading" | "found" | "not_found">("");
  
  // Fields for state persistence
  const [inspecionado, setInspecionado] = useState("");
  const [omLeitura, setOmLeitura] = useState("");
  const [om, setOm] = useState("");
  const [pg, setPg] = useState("");
  const [circulo, setCirculo] = useState("");
  const [quadro, setQuadro] = useState("");
  const [espPraca, setEspPraca] = useState("");
  const [nome, setNome] = useState("");
  const [situacao, setSituacao] = useState("");
  const [omsOptions, setOmsOptions] = useState<string[]>([]);
  
  // Modals & UI States
  const [isLoading, setIsLoading] = useState(false);
  const [successPdfUrl, setSuccessPdfUrl] = useState<string | null>(null);
  const [successPdfId, setSuccessPdfId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  
  // Base Search States
  const [showPesquisarNomeModal, setShowPesquisarNomeModal] = useState(false);
  const [pesquisarNomeTerm, setPesquisarNomeTerm] = useState("");
  const [militaresInfoList, setMilitaresInfoList] = useState<{nome: string, nip: string}[]>([]);
  const [isCarregandoMilitares, setIsCarregandoMilitares] = useState(false);

  // Drive integration states
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveSearchTerm, setDriveSearchTerm] = useState("");
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const PERITOS = {
    CT_MAURISTON: { perito: "CT MAURISTON", nomePerito: "MAURISTON RENAN MARTINS SILVA", posto: "Capitão-Tenente (Md)", cargo: "Presidente", email: "mauriston.martins@marinha.mil.br" },
    CT_JULIO: { perito: "CT JÚLIO CÉSAR", nomePerito: "JÚLIO CÉSAR XAVIER FILHO", posto: "Capitão-Tenente (RM2-Md)", cargo: "Membro", email: "julio.xavier@marinha.mil.br" }
  };

  const FINALIDADES = [
    "Verificação de Deficiência Funcional", "Término de Incapacidade", "Término de Restrições", 
    "Missão no exterior (> 3m)", "Deixar o SMV", "Deixar o SAM", "Engajamento", "Reengajamento"
  ];

  const ESPECIALIDADES = ["CARDIOLOGIA", "HEPATOLOGIA", "NEUROLOGIA", "ONCOLOGIA", "PSICOLOGIA", "PSIQUIATRIA"];
  const PG_OPTIONS = ["CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR", "ALUNO", "SCNS"];
  const QUADROS = ["AA", "AFN", "CA", "CD", "CN", "EN", "FN", "IM", "Md", "QC-CA", "QC-FN", "QC-IM", "S", "T"];
  const ESP_PRACAS = [
    "AD", "AH", "AM", "AR", "MC", "MT", "AT", "AV", "BA", "CA", "CP", "CI", "CN", "CL", "CT", "CO", "DA", "DM", "DT", "ED", 
    "EP", "EL", "ET", "TE", "EF", "EG", "ES", "AE", "EN", "FR", "GC", "GR", "HN", "HD", "IF", "MR", "MA", "NA", "MI", "MG", 
    "ML", "ME", "MO", "MS", "MU", "ND", "OR", "OS", "PL", "PC", "PD", "PT", "QI", "RM", "RB", "SC", "SI", "TC"
  ];

  const GAS_URL = "https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec";
  const FOLDER_ID = "176YQTOOWXuE78Xul49XYpJsVNyu-eZFi";

  useEffect(() => {
    const unsubscribe = initAuth(() => setNeedsAuth(false), () => setNeedsAuth(true));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch(`${GAS_URL}?action=getLookups`)
      .then(res => res.json())
      .then(data => { if (data.success && data.data?.OM) setOmsOptions(data.data.OM.filter((o: string) => o.trim() !== "")); })
      .catch(err => console.error("Erro ao carregar OMs", err));
  }, []);

  useEffect(() => {
    if (militarStatus !== "not_found" || !pg) return;
    if (["CMG", "CF", "SO", "1SG", "2SG"].includes(pg)) setSituacao("Carreira");
    else if (["2T", "GM"].includes(pg)) setSituacao("Temporário");
    setCirculo(["CMG", "CF", "CC", "CT", "1T", "2T", "GM"].includes(pg) ? "Oficial" : "Praça");
  }, [pg, militarStatus]);

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 6) value = `${value.slice(0, 2)}.${value.slice(2, 6)}.${value.slice(6)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}.${value.slice(2)}`;
    setNip(value);
    if (value.length === 10) searchNip(value);
    else setMilitarStatus("");
  };

  const searchNip = async (searchNip: string) => {
    setMilitarStatus("loading");
    try {
      const resp = await fetch(`${GAS_URL}?action=getMilitar&nip=${searchNip}`);
      const data = await resp.json();
      if (data.success) {
        setInspecionado(data.data.INSPECIONADO);
        setOmLeitura(data.data.OM);
        setMilitarStatus("found");
      } else {
        setMilitarStatus("not_found");
      }
    } catch (err) {
      setMilitarStatus("not_found");
    }
  };

  const abrirModalPesquisaNome = async () => {
    setShowPesquisarNomeModal(true);
    setPesquisarNomeTerm("");
    if (militaresInfoList.length === 0) {
      setIsCarregandoMilitares(true);
      try {
        const resp = await fetch(`${GAS_URL}?action=getMilitaresList`);
        const data = await resp.json();
        if (data.success && data.data) setMilitaresInfoList(data.data);
      } catch (err) {
        console.error(err);
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

  const generateInspecionado = () => {
    if (militarStatus === "found") return inspecionado;
    const upperNome = nome.toUpperCase();
    if (pg === "CC") return `CC (${situacao === "Temporário" ? "RM3-" : ""}${quadro}) ${nip} ${upperNome}`;
    if (["CT", "1T", "2T", "GM"].includes(pg)) return `${pg} (${situacao === "Temporário" ? "RM2-" : ""}${quadro}) ${nip} ${upperNome}`;
    if (["SO", "1SG", "2SG", "3SG", "CB", "MN"].includes(pg)) return `${pg}-${situacao === "Temporário" ? "RM2-" : ""}${espPraca} ${nip} ${upperNome}`;
    return `${pg} ${nip} ${upperNome}`;
  };

  const getPgq = () => {
    if (pg === "CC") return `CC (${situacao === "Temporário" ? "RM3-" : ""}${quadro})`;
    if (["CT", "1T", "2T", "GM"].includes(pg)) return `${pg} (${situacao === "Temporário" ? "RM2-" : ""}${quadro})`;
    if (["3SG", "CB", "MN"].includes(pg)) return `${pg}-${situacao === "Temporário" ? "RM2-" : ""}${espPraca}`;
    return circulo === "Oficial" ? `${pg} (${quadro})` : `${pg}-${espPraca}`;
  };

  const fetchDriveFiles = async () => {
    setIsLoadingDrive(true);
    try {
      const token = await getAccessToken();
      if (!token) { setNeedsAuth(true); setIsLoadingDrive(false); return; }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name,mimeType,webViewLink)&orderBy=modifiedTime+desc`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch {
      setAlertMessage("Erro ao carregar arquivos do Drive.");
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    const peritoInfo = peritoSelecionado === "MAURISTON" ? PERITOS["CT_MAURISTON"] : PERITOS["CT_JULIO"];
    setIsLoading(true);
    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          isNewMilitar: militarStatus === "not_found", nip,
          om: militarStatus === "found" ? omLeitura : om, pgq: getPgq(),
          nomeMilitar: nome.toUpperCase(), situacao, inspecionado: generateInspecionado(),
          finalidade, especialidade, historico, peritoIdentifier: peritoInfo.perito,
          emailPerito: peritoInfo.email, nomePerito: peritoInfo.nomePerito, postoPerito: peritoInfo.posto, cargoPerito: peritoInfo.cargo
        })
      });
      const data = await response.json();
      if (data.success) { setSuccessPdfUrl(data.pdfUrl); setSuccessPdfId(data.pdfFileId); }
      else { setAlertMessage(data.message); }
    } catch {
      setAlertMessage("Falha de comunicação.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprimir = async () => {
    if (!successPdfId) return;
    setIsPrinting(true);
    try {
      const res = await fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "imprimir", pdfId: successPdfId }) });
      const data = await res.json();
      setAlertMessage(data.success ? "Pedido de impressão enviado." : "Falha ao imprimir.");
    } catch {
      setAlertMessage("Erro de rede.");
    } finally {
      setIsPrinting(false);
    }
  };

  const filteredDriveFiles = driveFiles.filter(f => f.name.toUpperCase().includes(driveSearchTerm.toUpperCase()));

  rreturn (
    <div className="flex flex-col h-full bg-[#F3F5F7] relative">
      <Header title="PARECERES" rightAction={
        <button onClick={() => { setShowDriveModal(true); fetchDriveFiles(); }} className="text-white p-2 rounded-full hover:bg-white/20 transition-colors">
          <span className="material-symbols-outlined text-[24px]">folder</span>
        </button>
      }/>
      
      {/* Removido o pb-36 daqui para resolver o conflito da barra cinza */}
      <div className="flex-1 px-4 py-6 w-full max-w-2xl mx-auto space-y-6">
        <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="space-y-6">
          
          {/* M3 Elevated Card - Level 1 */}
          <div className="bg-white rounded-[24px] border-0 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)] p-6 space-y-5">
            <h2 className="font-heading font-medium text-[#050F41] text-lg flex items-center">
              <span className="material-symbols-outlined mr-3 text-[#FAB932]">person</span>
              Dados da Inspeção
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Perito Responsável *</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setPeritoSelecionado("MAURISTON")} className={`flex-1 py-3 text-sm font-medium rounded-xl border transition-all ${peritoSelecionado === "MAURISTON" ? "bg-[#050F41] text-white border-[#050F41] shadow-md" : "bg-[#F3F5F7] text-gray-700 border-transparent hover:bg-gray-200"}`}>CT Mauriston</button>
                  <button type="button" onClick={() => setPeritoSelecionado("JULIO")} className={`flex-1 py-3 text-sm font-medium rounded-xl border transition-all ${peritoSelecionado === "JULIO" ? "bg-[#050F41] text-white border-[#050F41] shadow-md" : "bg-[#F3F5F7] text-gray-700 border-transparent hover:bg-gray-200"}`}>CT Júlio César</button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Finalidade *</label>
                  <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className="w-full bg-[#F3F5F7] border border-transparent text-gray-800 text-sm rounded-xl p-3.5 focus:bg-white focus:border-[#050F41] focus:ring-1 focus:ring-[#050F41] transition-all" required>
                    <option value="">Selecione...</option>
                    {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Especialidade *</label>
                  <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className="w-full bg-[#F3F5F7] border border-transparent text-gray-800 text-sm rounded-xl p-3.5 focus:bg-white focus:border-[#050F41] focus:ring-1 focus:ring-[#050F41] transition-all" required>
                    <option value="">Selecione...</option>
                    {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Histórico Clínico</label>
                <textarea value={historico} onChange={(e) => setHistorico(e.target.value)} className="w-full bg-[#F3F5F7] border border-transparent text-gray-800 text-sm rounded-xl p-3.5 focus:bg-white focus:border-[#050F41] focus:ring-1 focus:ring-[#050F41] transition-all min-h-[100px]" placeholder="Militar em LTS..." />
              </div>
            </div>
          </div>

          {/* M3 Elevated Card - Level 1 */}
          <div className="bg-white rounded-[24px] border-0 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)] p-6 space-y-5">
            <h2 className="font-heading font-medium text-[#050F41] text-lg flex items-center">
              <span className="material-symbols-outlined mr-3 text-[#FAB932]">badge</span>
              Dados do Militar
            </h2>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">NIP do Inspecionado *</label>
              <input type="text" value={nip} onChange={handleNipChange} placeholder="00.0000.00" className="w-full bg-[#F3F5F7] border border-transparent text-gray-800 text-sm rounded-xl p-3.5 focus:bg-white focus:border-[#050F41] focus:ring-1 focus:ring-[#050F41] transition-all font-mono" required />
              {militarStatus === "loading" && <div className="absolute right-4 bottom-4 w-5 h-5 border-2 border-[#050F41] border-t-transparent rounded-full animate-spin" />}
            </div>
            
            <div className="text-right mt-1">
              <button type="button" onClick={abrirModalPesquisaNome} className="text-sm font-medium text-[#050F41] hover:underline">Pesquisar por nome</button>
            </div>
            
            {militarStatus === "found" && (
              <div className="bg-emerald-50 border-l-4 border-[#079551] p-4 rounded-r-xl space-y-1 mt-2">
                <p className="text-base font-bold text-[#050F41]">{inspecionado}</p>
                <p className="text-sm text-gray-600 font-medium">OM: {omLeitura}</p>
              </div>
            )}
            
            {/* Campos condicinais mantidos... */}
            {militarStatus === "not_found" && (
               <div className="space-y-4 animate-fade-in border-t border-gray-100 pt-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1.5">Posto/Grad *</label>
                     <select value={pg} onChange={(e) => setPg(e.target.value)} className="w-full bg-[#F3F5F7] border-transparent text-sm rounded-xl p-3.5 focus:bg-white focus:ring-1 focus:ring-[#050F41]" required>
                       <option value="">Selecione...</option>
                       {PG_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1.5">OM *</label>
                     <input type="text" list="om-options" value={om} onChange={(e) => setOm(e.target.value)} placeholder="Ex: HNRe" className="w-full bg-[#F3F5F7] border-transparent text-sm rounded-xl p-3.5 focus:bg-white focus:ring-1 focus:ring-[#050F41]" required />
                     <datalist id="om-options">{omsOptions.map(opt => <option key={opt} value={opt} />)}</datalist>
                   </div>
                 </div>
                 {/* Omite-se o resto dos inputs para brevidade (siga o mesmo padrão de classes bg-[#F3F5F7] p-3.5) */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome Completo *</label>
                   <input type="text" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} className="w-full bg-[#F3F5F7] border-transparent text-sm rounded-xl p-3.5 uppercase focus:bg-white focus:ring-1 focus:ring-[#050F41]" required />
                 </div>
               </div>
            )}
          </div>
          
          {/* M3 Primary Button */}
          <button type="submit" className="w-full bg-[#050F41] text-white font-medium text-base rounded-full py-4 shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-[#1a2a6c]">
            <span className="material-symbols-outlined">send</span>GERAR PARECER PERICIAL
          </button>
        </form>
      </div>

      {/* M3 COMPACT FAB NO CANTO INFERIOR DIREITO */}
      <button onClick={() => setShowHelpModal(true)} className="fixed bottom-24 right-6 bg-[#E8DEF8] text-[#050F41] shadow-lg rounded-2xl p-4 hover:scale-105 active:scale-95 transition-all z-40 flex items-center justify-center">
        <span className="material-symbols-outlined text-[24px]">help</span>
      </button>

      {/* Os modais permanecem com a mesma lógica, pode manter o código existente dos modais aqui... */}
    </div>
  );