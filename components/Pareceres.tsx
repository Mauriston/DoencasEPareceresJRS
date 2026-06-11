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

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] relative">
      <Header title="PARECERES" rightAction={
        <button onClick={() => { setShowDriveModal(true); fetchDriveFiles(); }} className="text-white p-2 rounded-xl bg-white/10 hover:bg-white/20">
          <span className="material-symbols-outlined text-[20px]">folder</span>
        </button>
      }/>

      <div className="flex-1 overflow-y-auto px-4 py-6 w-full max-w-2xl mx-auto space-y-6 pb-36">
        <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/60 p-5 space-y-4 shadow-sm">
            <h2 className="font-heading font-bold text-[#050F41] text-sm border-b border-gray-100 pb-2 flex items-center">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">person</span>DADOS DA INSPEÇÃO
            </h2>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Perito responsável *</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPeritoSelecionado("MAURISTON")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${peritoSelecionado === "MAURISTON" ? "bg-[#050F41] text-white border-[#050F41]" : "bg-white text-gray-600 border-gray-200"}`}>CT Mauriston</button>
                <button type="button" onClick={() => setPeritoSelecionado("JULIO")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${peritoSelecionado === "JULIO" ? "bg-[#050F41] text-white border-[#050F41]" : "bg-white text-gray-600 border-gray-200"}`}>CT Júlio César</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Finalidade *</label>
                <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none" required>
                  <option value="">Selecione...</option>
                  {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Especialidade *</label>
                <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none" required>
                  <option value="">Selecione...</option>
                  {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Histórico Clínico</label>
              <textarea value={historico} onChange={(e) => setHistorico(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none min-h-[90px]" placeholder="Militar em LTS..." />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200/60 p-5 space-y-4 shadow-sm">
            <h2 className="font-heading font-bold text-[#050F41] text-sm border-b border-gray-100 pb-2 flex items-center">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">badge</span>DADOS DO MILITAR
            </h2>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">NIP do Inspecionado *</label>
              <input type="text" value={nip} onChange={handleNipChange} placeholder="00.0000.00" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none font-mono" required />
              {militarStatus === "loading" && <div className="absolute right-4 bottom-3.5 w-4 h-4 border-2 border-[#050F41] border-t-transparent rounded-full animate-spin" />}
            </div>
            <div className="text-right mt-1"><button type="button" onClick={abrirModalPesquisaNome} className="text-xs text-blue-600 underline">Pesquisar por nome</button></div>

            {militarStatus === "found" && (
              <div className="bg-blue-50/70 border-l-4 border-[#050F41] p-3.5 rounded-r-xl space-y-1">
                <p className="text-sm font-bold text-[#050F41]">{inspecionado}</p>
                <p className="text-xs text-gray-500 font-body">OM: {omLeitura}</p>
              </div>
            )}

            {militarStatus === "not_found" && (
              <div className="space-y-4 animate-fade-in border-t border-dashed border-gray-100 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Posto/Graduação *</label>
                    <select value={pg} onChange={(e) => setPg(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-2.5 focus:outline-none" required>
                      <option value="">Selecione...</option>
                      {PG_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">OM *</label>
                    <input type="text" list="om-options" value={om} onChange={(e) => setOm(e.target.value)} placeholder="Ex: HNRe" className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-2.5 focus:outline-none" required />
                    <datalist id="om-options">{omsOptions.map(opt => <option key={opt} value={opt} />)}</datalist>
                  </div>
                </div>
                {circulo === "Oficial" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Quadro *</label>
                    <select value={quadro} onChange={(e) => setQuadro(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-2.5 focus:outline-none" required>
                      <option value="">Selecione...</option>
                      {QUADROS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                )}
                {circulo === "Praça" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Especialidade *</label>
                    <select value={espPraca} onChange={(e) => setEspPraca(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-2.5 focus:outline-none" required>
                      <option value="">Selecione...</option>
                      {ESP_PRACAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">Nome Completo *</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-2.5 uppercase focus:outline-none" required />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="w-full bg-[#079551] text-white font-bold rounded-xl py-3.5 border-b-4 border-emerald-800 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">send</span>GERAR PARECER PERICIAL
          </button>
        </form>
      </div>

      {/* M3 COMPACT FAB NO CANTO INFERIOR DIREITO */}
      <button onClick={() => setShowHelpModal(true)} className="fixed bottom-24 right-6 bg-[#FAB932] text-[#050F41] shadow-2xl rounded-2xl p-4 hover:scale-105 active:scale-95 transition-all z-40 border border-amber-400 flex items-center justify-center">
        <span className="material-symbols-outlined text-[22px]">help</span>
      </button>

      {/* MODAL DIALOGS - EVITA ESTOUROS E USA GRUPOS DE BOTÕES MD3 */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-[#050F41]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-sm flex flex-col border border-gray-100 max-h-[80vh]">
            <h3 className="font-heading font-bold text-[#050F41] text-sm border-b pb-2 mb-4 uppercase tracking-wide">Instruções Periciais</h3>
            <p className="text-xs text-gray-600 font-body leading-relaxed text-justify mb-5">Preencha os dados obrigatórios e digite o NIP. O parecer gerado será convertido em PDF e enviado em formato digital e editável para o seu e-mail institucional.</p>
            <button onClick={() => setShowHelpModal(false)} className="w-full py-2.5 bg-[#050F41] text-white font-bold text-xs rounded-xl hover:bg-[#050F41]/95">Entendi</button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 bg-[#050F41]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-sm flex flex-col items-center border border-gray-100">
            <span className="material-symbols-outlined text-[36px] text-[#FAB932] mb-2">help_center</span>
            <h3 className="font-heading font-bold text-[#050F41] text-base mb-1">Geração de Parecer</h3>
            <p className="text-gray-500 text-xs text-center font-body mb-5 leading-relaxed">Confirma a compilação final do documento e a transmissão das cópias para os peritos?</p>
            <div className="flex w-full gap-2.5">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-500 font-bold rounded-xl text-xs hover:bg-gray-50">Mudar dados</button>
              <button onClick={executeSubmit} className="flex-1 py-2.5 bg-[#050F41] text-white font-bold rounded-xl text-xs hover:bg-[#050F41]/90">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PROCURAR NOME */}
      {showPesquisarNomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] shadow-2xl p-5 relative">
            <button onClick={() => setShowPesquisarNomeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            <h2 className="text-lg font-bold text-[#050F41] font-heading mb-4">Pesquisar Militar</h2>
            <input type="text" value={pesquisarNomeTerm} onChange={(e) => setPesquisarNomeTerm(e.target.value)} placeholder="Digite o nome..." className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl p-2.5 focus:outline-none mb-4" />
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50/50 max-h-[40vh]">
              {isCarregandoMilitares ? <div className="p-4 text-center text-xs">A carregar banco...</div> : (
                <div className="flex flex-col">
                  {militaresInfoList.filter(m => pesquisarNomeTerm && m.nome.toLowerCase().includes(pesquisarNomeTerm.toLowerCase())).slice(0, 30).map((m, idx) => (
                    <div key={idx} onClick={() => selecionarNomeNip(m.nip)} className="px-4 py-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer text-xs font-semibold text-gray-700">
                      <div>{m.nome}</div><div className="text-[10px] text-gray-400 font-mono mt-0.5">{m.nip}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DRIVE MODAL */}
      {showDriveModal && (
        <div className="fixed inset-0 bg-[#050F41]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-xl p-6 w-full max-w-lg flex flex-col max-h-[85vh] border border-gray-100">
            <div className="flex items-center justify-between w-full mb-4 shrink-0">
              <h2 className="font-heading text-sm font-bold text-[#050F41] uppercase flex items-center"><span className="material-symbols-outlined text-[#FAB932] mr-2">folder</span>Pareceres em Cloud</h2>
              <button onClick={() => setShowDriveModal(false)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <input type="text" placeholder="Filtrar por nome ou NIP..." value={driveSearchTerm} onChange={(e) => setDriveSearchTerm(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 mb-3 focus:outline-none" />
            <div className="w-full flex-1 overflow-y-auto rounded-xl bg-gray-50 p-2 border border-gray-100">
              {isLoadingDrive ? <div className="p-4 text-center text-xs">Buscando no Drive...</div> : (
                <ul className="space-y-1">
                  {filteredDriveFiles.map(file => (
                    <li key={file.id}>
                      <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" className="flex items-center w-full p-2.5 bg-white hover:bg-gray-100 rounded-xl border border-gray-200/50 transition-colors text-xs font-semibold text-gray-700 truncate">
                        <span className="material-symbols-outlined text-[#050F41] mr-2 text-[18px]">picture_as_pdf</span>{file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALERTA / SUCESSO MODAL */}
      {alertMessage && (
        <div className="fixed inset-0 bg-[#050F41]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-sm flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
            <p className="text-gray-800 text-xs font-semibold mb-5">{alertMessage}</p>
            <button onClick={() => setAlertMessage("")} className="w-full py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl">Voltar</button>
          </div>
        </div>
      )}

      {successPdfUrl && (
        <div className="fixed inset-0 bg-[#050F41]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-sm flex flex-col items-center border border-gray-100">
            <div className="w-12 h-12 bg-green-100 text-[#079551] rounded-full flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <h2 className="font-heading font-bold text-base text-gray-800 mb-1">SUCESSO!</h2>
            <p className="text-xs text-gray-500 mb-5 font-body text-center leading-relaxed">Pedido de parecer gerado e enviado para o seu e-mail institucional.</p>
            <button onClick={handleImprimir} disabled={isPrinting} className="w-full py-2.5 border border-[#050F41] text-[#050F41] font-bold rounded-xl text-xs mb-3 flex items-center justify-center gap-2 hover:bg-gray-50">{isPrinting ? "Enviando..." : <>Imprimir <span className="material-symbols-outlined text-sm">print</span></>}</button>
            <div className="flex w-full gap-2">
              <button onClick={() => setSuccessPdfUrl(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200">Fechar</button>
              <a href={successPdfUrl} target="_blank" rel="noopener noreferrer" onClick={() => setSuccessPdfUrl(null)} className="flex-1 py-2.5 bg-[#050F41] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1">Abrir PDF <span className="material-symbols-outlined text-sm">open_in_new</span></a>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FAB932] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs font-semibold text-[#050F41] animate-pulse">Gerando Parecer...</p>
        </div>
      )}
    </div>
  );
};