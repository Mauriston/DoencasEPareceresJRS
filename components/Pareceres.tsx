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
  
  // Fields if not found
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
  
  const [successPdfUrl, setSuccessPdfUrl] = useState<string | null>(null);
  const [successPdfId, setSuccessPdfId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const PERITOS = {
    CT_MAURISTON: { perito: "CT MAURISTON", nomePerito: "MAURISTON RENAN MARTINS SILVA", posto: "Capitão-Tenente (Md)", cargo: "Presidente", email: "mauriston.martins@marinha.mil.br" },
    CT_JULIO: { perito: "CT JÚLIO CÉSAR", nomePerito: "JÚLIO CÉSAR XAVIER FILHO", posto: "Capitão-Tenente (RM2-Md)", cargo: "Membro", email: "julio.xavier@marinha.mil.br" }
  };

  const FINALIDADES = [
    "Verificação de Deficiência Funcional",
    "Término de Incapacidade",
    "Término de Restrições",
    "Missão no exterior (> 3m)",
    "Deixar o SMV",
    "Deixar o SAM",
    "Engajamento",
    "Reengajamento"
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

  const handleNipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 6) value = `${value.slice(0, 2)}.${value.slice(2, 6)}.${value.slice(6)}`;
    else if (value.length > 2) value = `${value.slice(0, 2)}.${value.slice(2)}`;
    setNip(value);
    
    if (value.length === 10) {
      setMilitarStatus("loading");
      // Simulação da chamada de API para manter fidelidade estrutural
      setTimeout(() => { 
        setInspecionado(`SO-RM2-HN ${value} JOSÉ DA SILVA`); 
        setOmLeitura("HNRe"); 
        setMilitarStatus("found"); 
      }, 500);
    } else {
      setMilitarStatus("");
    }
  };

  useEffect(() => {
    if (militarStatus !== "not_found" || !pg) return;
    if (["CMG", "CF", "SO", "1SG", "2SG"].includes(pg)) setSituacao("Carreira");
    else if (["2T", "GM"].includes(pg)) setSituacao("Temporário");
    setCirculo(["CMG", "CF", "CC", "CT", "1T", "2T", "GM"].includes(pg) ? "Oficial" : "Praça");
  }, [pg, militarStatus]);

  const executeSubmit = () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    setTimeout(() => { 
      setIsLoading(false); 
      setSuccessPdfUrl("#"); 
      setSuccessPdfId("dummy-id"); 
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] relative">
      <Header title="PARECERES" />

      <div className="flex-1 overflow-y-auto px-4 py-6 w-full max-w-2xl mx-auto space-y-6">
        <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="space-y-5">
          
          {/* Card 1: Dados da Inspeção */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5 space-y-4">
            <h2 className="font-heading font-bold text-[#050F41] text-base flex items-center border-b border-gray-100 pb-2">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">person</span> DADOS DA INSPEÇÃO
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase">Perito responsável *</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPeritoSelecionado("MAURISTON")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${peritoSelecionado === "MAURISTON" ? "bg-[#050F41] text-white border-[#050F41]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>CT Mauriston</button>
                <button type="button" onClick={() => setPeritoSelecionado("JULIO")} className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all ${peritoSelecionado === "JULIO" ? "bg-[#050F41] text-white border-[#050F41]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>CT Júlio César</button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Finalidade *</label>
                <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none cursor-pointer font-body" required>
                  <option value="">Selecione...</option>
                  {FINALIDADES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Especialidade *</label>
                <select value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none cursor-pointer font-body" required>
                  <option value="">Selecione...</option>
                  {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Breve Histórico Clínico</label>
              <textarea value={historico} onChange={(e) => setHistorico(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none min-h-[90px] font-body" placeholder="Militar em LTS há xx dias pelo CID..." />
            </div>
          </div>

          {/* Card 2: Dados do Militar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5 space-y-4">
            <h2 className="font-heading font-bold text-[#050F41] text-base flex items-center border-b border-gray-100 pb-2">
              <span className="material-symbols-outlined mr-2 text-[#FAB932]">badge</span> DADOS DO MILITAR
            </h2>
            <div className="relative">
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">NIP do Inspecionado *</label>
              <input type="text" value={nip} onChange={handleNipChange} placeholder="00.0000.00" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-3 focus:outline-none font-mono" required />
              {militarStatus === "loading" && <div className="absolute right-4 bottom-3.5 w-4 h-4 border-2 border-[#050F41] border-t-transparent rounded-full animate-spin" />}
            </div>

            {militarStatus === "found" && (
              <div className="bg-blue-50/70 border-l-4 border-[#050F41] p-3.5 rounded-r-xl space-y-1.5 animate-fade-in">
                <p className="text-xs font-bold text-gray-400 uppercase">Inspecionado Identificado</p>
                <p className="text-sm font-bold text-[#050F41] font-heading">{inspecionado}</p>
                <p className="text-xs font-semibold text-gray-600 font-body">OM de Origem: {omLeitura}</p>
              </div>
            )}

            {militarStatus === "not_found" && (
              <div className="space-y-4 animate-fade-in border-t border-dashed border-gray-100 pt-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Posto/Graduação *</label>
                    <select value={pg} onChange={(e) => setPg(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 focus:outline-none" required>
                      <option value="">Selecione...</option>
                      {PG_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">OM *</label>
                    <input type="text" value={om} onChange={(e) => setOm(e.target.value)} placeholder="Ex: HNRe" className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 focus:outline-none" required />
                  </div>
                </div>

                {circulo === "Oficial" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Quadro do Oficial *</label>
                    <select value={quadro} onChange={(e) => setQuadro(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 focus:outline-none" required>
                      <option value="">Selecione...</option>
                      {QUADROS.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>
                )}

                {circulo === "Praça" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Especialidade da Praça *</label>
                    <select value={espPraca} onChange={(e) => setEspPraca(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 focus:outline-none" required>
                      <option value="">Selecione...</option>
                      {ESP_PRACAS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Nome Completo *</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value.toUpperCase())} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl p-2.5 uppercase focus:outline-none" required />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="w-full bg-[#079551] text-white font-bold rounded-xl py-3.5 border-b-4 border-emerald-800 shadow-md active:scale-95 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">send</span> GERAR PARECER PERICIAL
          </button>
        </form>
      </div>

      {/* M3 COMPACT FLOATING ACTION BUTTON (FAB) PARA AJUDA NO CANTO INFERIOR DIREITO */}
      <button 
        onClick={() => setShowHelpModal(true)}
        className="fixed bottom-24 right-6 bg-[#FAB932] text-[#050F41] shadow-2xl rounded-2xl p-4 hover:scale-105 active:scale-95 transition-all z-40 border border-amber-400 flex items-center justify-center"
        title="Ajuda e Instruções"
      >
        <span className="material-symbols-outlined text-[22px]">help</span>
      </button>

      {/* MODAL AJUDA - COM DESIGN ARREDONDADO MD3 PREVENINDO ESTOUROS NAS LATERAIS */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-[#050F41]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-sm flex flex-col border border-gray-100 max-h-[80vh] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2 mb-4 shrink-0">
              <span className="material-symbols-outlined text-[#FAB932]">info</span>
              <h3 className="font-heading font-bold text-[#050F41] text-sm uppercase">Instruções Técnicas</h3>
            </div>
            <div className="overflow-y-auto text-xs text-gray-600 font-body space-y-3 pr-1 leading-relaxed text-justify flex-1">
              <p>Preencha os dados obrigatórios da inspeção clínica e digite o NIP do militar. O sistema tentará localizar o registro automaticamente no banco em nuvem.</p>
              <p>O parecer gerado será convertido em PDF definitivo e em formato editável (.odt), sendo enviado diretamente para o seu e-mail funcional.</p>
            </div>
            <button onClick={() => setShowHelpModal(false)} className="w-full mt-5 py-2.5 bg-[#050F41] text-white font-bold text-xs rounded-xl hover:bg-[#050F41]/95 shrink-0">Entendi</button>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO - COM BUTTON GROUPS ASSIMÉTRICOS MD3 */}
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

      {/* MODAL SUCESSO - TOTALMENTE ALINHADA COM O PADRÃO CLARO E COMPACTO DO QUARTO PRINT */}
      {successPdfUrl && (
        <div className="fixed inset-0 bg-[#050F41]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-5 animate-fade-in">
          <div className="bg-white rounded-[28px] shadow-2xl p-6 w-full max-w-sm flex flex-col items-center border border-gray-100">
            <div className="w-12 h-12 bg-green-100 text-[#079551] rounded-full flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-[28px]">check_circle</span>
            </div>
            <h2 className="font-heading font-bold text-base text-gray-800 mb-1">SUCESSO!</h2>
            <p className="text-xs text-gray-500 mb-5 font-body text-center leading-relaxed">Pedido de parecer gerado e enviado para o seu e-mail institucional.</p>
            
            <button className="w-full py-2.5 border border-[#050F41] text-[#050F41] font-bold rounded-xl text-xs mb-3 flex items-center justify-center gap-2 hover:bg-gray-50">
              Imprimir <span className="material-symbols-outlined text-sm">print</span>
            </button>
            <div className="flex w-full gap-2">
              <button onClick={() => setSuccessPdfUrl(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200">Fechar</button>
              <button onClick={() => setSuccessPdfUrl(null)} className="flex-1 py-2.5 bg-[#050F41] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1">Abrir PDF <span className="material-symbols-outlined text-sm">open_in_new</span></button>
            </div>
          </div>
        </div>
      )}

      {/* LOADING */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FAB932] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs font-semibold text-[#050F41] animate-pulse">Gerando Parecer...</p>
        </div>
      )}
    </div>
  );
};