// Ficheiro: components/Pareceres.tsx
import React, { useState, useEffect } from "react";
import { Header } from "./Header";
import { NavItem } from "../types";
import { initAuth, googleSignIn, getAccessToken } from "../services/firebaseAuth";

export const Pareceres: React.FC = () => {
  const [peritoSelecionado, setPeritoSelecionado] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [historico, setHistorico] = useState("");

  const [nip, setNip] = useState("");
  const [militarStatus, setMilitarStatus] = useState<
    "" | "loading" | "found" | "not_found"
  >("");

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
  const [isLoading, setIsLoading] = useState(false);
  const [successPdfUrl, setSuccessPdfUrl] = useState<string | null>(null);
  const [successPdfId, setSuccessPdfId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [showPesquisarNomeModal, setShowPesquisarNomeModal] = useState(false);
  const [pesquisarNomeTerm, setPesquisarNomeTerm] = useState("");
  const [militaresInfoList, setMilitaresInfoList] = useState<{nome: string, nip: string}[]>([]);
  const [isCarregandoMilitares, setIsCarregandoMilitares] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveSearchTerm, setDriveSearchTerm] = useState("");
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    const unsubscribe = initAuth(
      () => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const PERITOS = {
    CT_MAURISTON: {
      perito: "CT MAURISTON",
      nomePerito: "MAURISTON RENAN MARTINS SILVA",
      posto: "Capitão-Tenente (Md)",
      cargo: "Presidente",
      email: "mauriston.martins@marinha.mil.br",
    },
    CT_JULIO: {
      perito: "CT JÚLIO CÉSAR",
      nomePerito: "JÚLIO CÉSAR XAVIER FILHO",
      posto: "Capitão-Tenente (RM2-Md)",
      cargo: "Membro",
      email: "julio.xavier@marinha.mil.br",
    },
  };

  const FINALIDADES = [
    "Verificação de Deficiência Funcional",
    "Término de Incapacidade",
    "Término de Restrições",
    "Missão no exterior (> 3m)",
    "Deixar o SMV",
    "Deixar o SAM",
    "Engajamento",
    "Reengajamento",
  ];

  const ESPECIALIDADES = [
    "CARDIOLOGIA",
    "HEPATOLOGIA",
    "NEUROLOGIA",
    "ONCOLOGIA",
    "PSICOLOGIA",
    "PSIQUIATRIA",
  ];

  const PG_OPTIONS = [
    "CMG", "CF", "CC", "CT", "1T", "2T", "GM", "SO", "1SG", "2SG", "3SG", "CB", "MN", "MN-RC", "SD", "GR", "ALUNO", "SCNS",
  ];

  const QUADROS = ["AA", "AFN", "CA", "CD", "CN", "EN", "FN", "IM", "Md", "QC-CA", "QC-FN", "QC-IM", "S", "T"];
  const ESP_PRACAS = [
    "AD", "AH", "AM", "AR", "MC", "MT", "AT", "AV", "BA", "CA", "CP", "CI", "CN", "CL", "CT", "CO", "DA", "DM", "DT", "ED", "EP", "EL", "ET", "TE", "EF", "EG", "ES", "AE", "EN", "FR", "GC", "GR", "HN", "HD", "IF", "MR", "MA", "NA", "MI", "MG", "ML", "ME", "MO", "MS", "MU", "ND", "OR", "OS", "PL", "PC", "PD", "PT", "QI", "RM", "RB", "SC", "SI", "TC",
  ];

  const GAS_URL =
    "https://script.google.com/macros/s/AKfycby2vz9KLrNFu_8dV85TFZt9hXemBbVn7ZMEPIn3C2tbhmhQ6I665ntfuSECO4TJqrs/exec";

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
        const resp = await fetch(`${GAS_URL}?action=getMilitaresList`);
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
    fetch(`${GAS_URL}?action=getLookups`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.OM) {
          setOmsOptions(data.data.OM.filter((o: string) => o.trim() !== ""));
        }
      })
      .catch((err) => console.error("Erro ao carregar OMs", err));
  }, []);

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

    if (oficialPg.includes(pg)) {
      setCirculo("Oficial");
    } else if (pracaPg.includes(pg)) {
      setCirculo("Praça");
    } else {
      setCirculo("");
    }
  }, [pg, militarStatus]);

  const generateInspecionado = () => {
    if (militarStatus === "found") return inspecionado;

    let result = "";
    const upperNome = nome.toUpperCase();

    if (pg === "CC" && situacao === "Temporário") {
      result = `CC (RM3-${quadro}) ${nip} ${upperNome}`;
    } else if (pg === "CC" && situacao === "Carreira") {
      result = `CC (${quadro}) ${nip} ${upperNome}`;
    } else if (["CT", "1T", "2T", "GM"].includes(pg) && situacao === "Temporário") {
      result = `${pg} (RM2-${quadro}) ${nip} ${upperNome}`;
    } else if (["CT", "1T", "CMG", "CF"].includes(pg) && situacao === "Carreira") {
      result = `${pg} (${quadro}) ${nip} ${upperNome}`;
    } else if (["SO", "1SG", "2SG"].includes(pg) && situacao === "Carreira") {
      result = `${pg}-${espPraca} ${nip} ${upperNome}`;
    } else if (["3SG", "CB", "MN"].includes(pg) && situacao === "Temporário") {
      result = `${pg}-RM2-${espPraca} ${nip} ${upperNome}`;
    } else if (["3SG", "CB", "MN"].includes(pg) && situacao === "Carreira") {
      result = `${pg}-${espPraca} ${nip} ${upperNome}`;
    } else if (["MN-RC", "SD", "GR", "ALUNO", "SCNS"].includes(pg)) {
      result = `${pg} ${nip} ${upperNome}`;
    }
    return result;
  };

  const resetForm = () => {
    setPeritoSelecionado("");
    setFinalidade("");
    setEspecialidade("");
    setHistorico("");
    setNip("");
    setMilitarStatus("");
    setInspecionado("");
    setOmLeitura("");
    setOm("");
    setPg("");
    setCirculo("");
    setQuadro("");
    setEspPraca("");
    setNome("");
    setSituacao("");
    setSuccessPdfUrl(null);
  };

  const getPgq = () => {
    if (pg === "CC" && situacao === "Temporário") {
      return `CC (RM3-${quadro})`;
    } else if (["CT", "1T", "2T", "GM"].includes(pg) && situacao === "Temporário") {
      return `${pg} (RM2-${quadro})`;
    } else if (["3SG", "CB", "MN"].includes(pg) && situacao === "Temporário") {
      return `${pg}-RM2-${espPraca}`;
    } else if (circulo === "Oficial") {
      return `${pg} (${quadro})`;
    } else if (circulo === "Praça") {
      return `${pg}-${espPraca}`;
    }
    return pg;
  };

  const filteredDriveFiles = driveFiles.filter((file) => 
    file.name.toUpperCase().includes(driveSearchTerm.toUpperCase()) && 
    file.mimeType.includes("pdf")
  );

  const FOLDER_ID = "176YQTOOWXuE78Xul49XYpJsVNyu-eZFi";

  const fetchDriveFiles = async () => {
    setIsLoadingDrive(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setIsLoadingDrive(false);
        return;
      }
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents&fields=files(id,name,mimeType,webViewLink)&orderBy=modifiedTime+desc`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setNeedsAuth(true);
        throw new Error('Falha ao carregar arquivos do Drive');
      }
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setAlertMessage("Erro ao carregar do Google Drive.");
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleOpenDriveModal = () => {
    setShowDriveModal(true);
    fetchDriveFiles();
  };

  const handleLogin = async () => {
    setIsLoadingDrive(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
        fetchDriveFiles();
      }
    } catch (err) {
      console.error('Login failed:', err);
      setAlertMessage("Falha ao autenticar com o Google.");
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!peritoSelecionado || !finalidade || !especialidade || !nip) {
      setAlertMessage("Preencha todos os campos obrigatórios.");
      return;
    }
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);

    const peritoInfo =
      peritoSelecionado === "MAURISTON"
        ? PERITOS["CT_MAURISTON"]
        : PERITOS["CT_JULIO"];
    const generatedInspecionado = generateInspecionado();

    setIsLoading(true);
    setSuccessPdfUrl(null);

    const payload = {
      isNewMilitar: militarStatus === "not_found",
      nip,
      om: militarStatus === "found" ? omLeitura : om,
      pgq: getPgq(),
      nomeMilitar: nome.toUpperCase(),
      situacao,
      inspecionado: generatedInspecionado,

      finalidade,
      especialidade,
      historico,

      peritoIdentifier: peritoInfo.perito,
      emailPerito: peritoInfo.email,
      nomePerito: peritoInfo.nomePerito,
      postoPerito: peritoInfo.posto,
      cargoPerito: peritoInfo.cargo,
    };

    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setSuccessPdfUrl(data.pdfUrl);
        setSuccessPdfId(data.pdfFileId);
      } else {
        setAlertMessage("Erro ao gerar parecer: " + data.message);
      }
    } catch (error) {
      console.error(error);
      setAlertMessage("Falha na comunicação com o servidor Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprimir = async () => {
    if (!successPdfId) return;
    setIsPrinting(true);
    try {
      const response = await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "imprimir",
          pdfId: successPdfId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setAlertMessage("Pedido de impressão enviado com sucesso.");
      } else {
        setAlertMessage("Erro ao solicitar impressão: " + data.message);
      }
    } catch (error) {
      console.error(error);
      setAlertMessage("Falha na comunicação com o servidor Google ao imprimir.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    // Note a remoção da classe pb-20 no contêiner raiz, movida para a div scrollável
    <div className="flex flex-col h-full bg-gray-50 relative">
      <Header 
        title="PARECERES" 
        rightAction={
          <div className="flex items-center space-x-2">
            <button 
              type="button" 
              onClick={handleOpenDriveModal} 
              className="text-white hover:text-gold transition-colors flex items-center justify-center p-1"
              title="Acessar Pareceres Salvos"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>folder</span>
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 w-full max-w-2xl mx-auto space-y-6">
        
        {/* FAB de Ajuda */}
        <button
          type="button"
          onClick={() => setShowHelpModal(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#050F41] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 border border-slate-700"
          title="Ajuda"
        >
          <span className="material-symbols-outlined text-[28px]">help</span>
        </button>

        {/* GOOGLE DRIVE MODAL */}
        {showDriveModal && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 w-full max-w-3xl flex flex-col items-center max-h-[90vh]">
              <div className="flex items-center justify-between w-full mb-4 shrink-0">
                <h2 className="font-heading text-lg font-bold text-navy flex items-center">
                  <span className="material-symbols-outlined text-gold mr-2">folder</span>
                  Pareceres Salvos
                </h2>
                <button
                  onClick={() => setShowDriveModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {!needsAuth && (
                <div className="w-full mb-4 shrink-0 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                  <input
                    type="text"
                    placeholder="Pesquisar por nome ou NIP..."
                    value={driveSearchTerm}
                    onChange={(e) => setDriveSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block pl-10 p-2.5 transition-colors"
                  />
                </div>
              )}

              {needsAuth ? (
                <div className="flex flex-col items-center justify-center w-full py-8 text-center shrink-0">
                  <p className="text-sm text-gray-600 mb-6">
                    É necessário fazer login com o Google para visualizar os pareceres salvos no Drive.
                  </p>
                  <button onClick={handleLogin} disabled={isLoadingDrive} className="gsi-material-button w-full max-w-md">
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper justify-center flex items-center py-2 px-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors bg-white">
                      <div className="gsi-material-button-icon mr-3">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{display: 'block', width: '20px', height: '20px'}}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents text-sm font-medium text-gray-700">Sign in with Google</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="w-full flex-1 overflow-y-auto mb-1 rounded-lg min-h-[300px]">
                  {isLoadingDrive ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <span className="material-symbols-outlined animate-spin mb-2" style={{fontSize: '32px'}}>sync</span>
                      <p className="text-sm">Carregando...</p>
                    </div>
                  ) : driveFiles.length > 0 ? (
                    filteredDriveFiles.length > 0 ? (
                      <div className="space-y-4 pr-1">
                        {Object.entries(
                          filteredDriveFiles.reduce((acc, file) => {
                            const espMatch = ESPECIALIDADES.find(esp => file.name.toUpperCase().includes(esp.toUpperCase()));
                            const category = espMatch || "OUTROS";
                            if (!acc[category]) acc[category] = [];
                            acc[category].push(file);
                            return acc;
                          }, {} as Record<string, any[]>)
                        )
                        .sort(([a], [b]) => a === "OUTROS" ? 1 : b === "OUTROS" ? -1 : a.localeCompare(b))
                        .map(([category, files]: [string, any[]]) => (
                          <div key={category} className="mb-4">
                            <h3 className="font-heading font-bold text-navy text-sm mb-2 px-2 border-b border-gray-100 pb-1 flex items-center">
                              <span className="material-symbols-outlined text-gold mr-2" style={{ fontSize: '18px' }}>
                                {category === "OUTROS" ? "folder_open" : "medical_services"}
                              </span>
                              {category}
                            </h3>
                            <ul className="space-y-1">
                              {files.map(file => (
                                <li key={file.id}>
                                  <a 
                                    href={file.webViewLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 group"
                                  >
                                    <span className="material-symbols-outlined text-navy mr-3 shrink-0 group-hover:text-gold transition-colors">
                                      {file.mimeType.includes("pdf") ? "picture_as_pdf" : "description"}
                                    </span>
                                    <span className="truncate text-sm font-medium text-gray-800 flex-1 min-w-0 text-left" title={file.name}>
                                      {file.name}
                                    </span>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                        <p className="text-sm">Nenhum arquivo encontrado na pesquisa.</p>
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <span className="material-symbols-outlined text-4xl mb-2">folder_open</span>
                      <p className="text-sm">Nenhum parecer encontrado.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HELP MODAL */}
        {showHelpModal && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 w-full max-w-md flex flex-col items-center text-center max-h-[90vh]">
              <span className="material-symbols-outlined text-4xl text-navy mb-4 shrink-0">
                info
              </span>
              <div className="text-gray-600 mb-6 text-sm text-left space-y-4 w-full overflow-y-auto pr-2">
                <p>
                  Preencha os dados da inspeção e do militar e gere um pedido de parecer a partir de templates com perguntas padrão para as especialidades:
                </p>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  <ul className="list-disc space-y-1">
                    <li>CARDIOLOGIA</li>
                    <li>HEPATOLOGIA</li>
                    <li>NEUROLOGIA</li>
                  </ul>
                  <ul className="list-disc space-y-1">
                    <li>ONCOLOGIA</li>
                    <li>PSICOLOGIA</li>
                    <li>PSIQUIATRIA</li>
                  </ul>
                </div>
                <p>
                  No final receba o parecer no seu zimbra em PDF e editável no formato .odt
                </p>
                <p>
                  Opcionalmente um zimbra com o PDF gerado é enviado ao SO Giorginis para que ele imprima colorido.
                </p>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full px-4 py-2 bg-navy text-white font-medium rounded-lg hover:bg-navy/90 transition-colors shrink-0"
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        {/* ALERT MODAL */}
        {alertMessage && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 w-full max-w-sm flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-red-500 mb-4">
                error
              </span>
              <p className="text-gray-800 font-medium mb-6">{alertMessage}</p>
              <button
                onClick={() => setAlertMessage("")}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 w-full max-w-sm flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-gold mb-4">
                help_center
              </span>
              <h2 className="font-heading text-lg font-bold text-navy mb-2">Confirmação</h2>
              <p className="text-gray-600 mb-6 font-medium">
                Confirma o envio e a geração do parecer pericial?
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeSubmit}
                  className="flex-1 px-4 py-2 bg-navy text-white font-medium rounded-lg hover:bg-navy/90 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS MODAL (Botões transformados em Icon Buttons alinhados na horizontal) */}
        {successPdfUrl && (
          <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 w-full max-w-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-4xl">
                  check_circle
                </span>
              </div>
              <h2 className="font-heading text-xl font-bold text-navy mb-2">
                Sucesso!
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Parecer gerado e enviado para o seu e-mail.
              </p>

              <div className="flex justify-center items-center gap-6 w-full mt-2">
                <button
                  onClick={resetForm}
                  className="w-12 h-12 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors shadow-sm"
                  title="Fechar"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
                
                <button
                  onClick={handleImprimir}
                  disabled={isPrinting}
                  className="w-16 h-16 rounded-full bg-navy text-white flex items-center justify-center hover:bg-navy/90 disabled:opacity-50 shadow-md transition-all active:scale-95"
                  title="Imprimir Colorido na Secretaria"
                >
                  {isPrinting ? (
                    <span className="material-symbols-outlined animate-spin text-[28px]">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[28px]">print</span>
                  )}
                </button>
                
                <a
                  href={successPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={resetForm}
                  className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200 transition-colors shadow-sm"
                  title="Abrir PDF no Drive"
                >
                  <span className="material-symbols-outlined">open_in_new</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* LOADING SHADOW */}
        {isLoading && (
          <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-navy font-medium animate-pulse">
              Gerando Parecer...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
            <h2 className="font-heading font-bold text-navy text-lg flex items-center border-b border-gray-100 pb-2">
              <span className="material-symbols-outlined mr-2 text-gold">
                person
              </span>
              DADOS DA INSPEÇÃO
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Perito <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPeritoSelecionado("MAURISTON")}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${peritoSelecionado === "MAURISTON" ? "bg-navy text-white border-navy shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >
                  CT Mauriston
                </button>
                <button
                  type="button"
                  onClick={() => setPeritoSelecionado("JULIO")}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${peritoSelecionado === "JULIO" ? "bg-navy text-white border-navy shadow-sm" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                >
                  CT Júlio César
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Finalidade <span className="text-red-500">*</span>
              </label>
              <select
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5 transition-colors"
                required
              >
                <option value="">Selecione...</option>
                {FINALIDADES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Especialidade <span className="text-red-500">*</span>
              </label>
              <select
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5 transition-colors"
                required
              >
                <option value="">Selecione...</option>
                {ESPECIALIDADES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Histórico
              </label>
              <textarea
                value={historico}
                onChange={(e) => setHistorico(e.target.value)}
                placeholder="Militar em LTS há xx dias pelo CID X00.0..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5 transition-colors min-h-[100px]"
              />
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
            <h2 className="font-heading font-bold text-navy text-lg flex items-center border-b border-gray-100 pb-2">
              <span className="material-symbols-outlined mr-2 text-gold">
                badge
              </span>
              DADOS DO MILITAR
            </h2>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                NIP <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nip}
                  onChange={handleNipChange}
                  placeholder="00.0000.00"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5 transition-colors font-mono"
                  required
                />
                {militarStatus === "loading" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <div className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {militarStatus === "found" && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-green-500">
                    <span className="material-symbols-outlined text-lg">
                      check_circle
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-1 text-right">
                <button
                  type="button"
                  onClick={() => abrirModalPesquisaNome()}
                  className="text-[10px] text-blue-600 underline hover:text-blue-800 transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  Pesquisar pelo nome
                </button>
              </div>
            </div>

            {militarStatus === "found" && (
              <div className="bg-blue-50 border-l-4 border-navy p-3 rounded-r-lg space-y-2 animate-fade-in mt-4">
                <div>
                  <label className="block text-xs font-bold text-navy/70 uppercase">
                    Inspecionado
                  </label>
                  <p className="text-sm font-medium text-navy">
                    {inspecionado}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy/70 uppercase">
                    OM
                  </label>
                  <p className="text-sm font-medium text-navy">{omLeitura}</p>
                </div>
              </div>
            )}

            {militarStatus === "not_found" && (
              <div className="space-y-4 animate-fade-in border-t border-dashed border-gray-200 pt-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Posto/Graduação <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={pg}
                      onChange={(e) => setPg(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5"
                      required
                    >
                      <option value="">Sel...</option>
                      {PG_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      OM <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      list="om-options"
                      value={om}
                      onChange={(e) => setOm(e.target.value)}
                      placeholder="Ex: HNRe"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5"
                      required
                    />
                    <datalist id="om-options">
                      {omsOptions.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {circulo === "Oficial" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Quadro <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={quadro}
                      onChange={(e) => setQuadro(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5"
                      required
                    >
                      <option value="">Sel...</option>
                      {QUADROS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {circulo === "Praça" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                      Especialidade <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={espPraca}
                      onChange={(e) => setEspPraca(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5"
                      required
                    >
                      <option value="">Sel...</option>
                      {ESP_PRACAS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value.toUpperCase())}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-navy focus:border-navy block p-2.5 uppercase"
                    required
                  />
                </div>

                {/* SITUAÇÃO (Condicional) */}
                {["CC", "CT", "1T", "MN", "CB", "3SG"].includes(pg) && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Situação <span className="text-red-500">*</span>
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setSituacao("Carreira")}
                        className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-colors ${situacao === "Carreira" ? "bg-navy/10 text-navy border-navy" : "bg-white text-gray-600 border-gray-300"}`}
                      >
                        Carreira
                      </button>
                      <button
                        type="button"
                        onClick={() => setSituacao("Temporário")}
                        className={`flex-1 py-1.5 px-3 rounded-lg border text-sm font-medium transition-colors ${situacao === "Temporário" ? "bg-navy/10 text-navy border-navy" : "bg-white text-gray-600 border-gray-300"}`}
                      >
                        Temporário
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ÁREA DE BOTÕES DO FORMULÁRIO */}
          <div className="flex justify-end items-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="w-12 h-12 bg-gray-100 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center justify-center transition-all shadow-sm border border-gray-200"
              title="Limpar Formulário"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
            <button
              type="submit"
              className="w-14 h-14 bg-[#079551] text-white rounded-full flex items-center justify-center transition-all hover:bg-green-700 shadow-md active:scale-95"
              title="Gerar Parecer Pericial"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </form>
      </div>

      {showPesquisarNomeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPesquisarNomeModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="p-6 bg-navy text-white shrink-0">
              <h2 className="text-xl font-bold tracking-tight">
                Pesquisar Militar
              </h2>
              <p className="text-navy-100 text-sm mt-1">Busque pelo nome completo</p>
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
                          <div className="font-bold text-navy text-sm">{m.nome}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">{m.nip}</div>
                        </div>
                      ))}
                    {pesquisarNomeTerm &&
                      militaresInfoList.filter((m) =>
                        m.nome.toLowerCase().includes(pesquisarNomeTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="p-8 text-center text-gray-500 text-sm">
                          Nenhum militar encontrado com esse nome.
                        </div>
                      )}
                    {/* A frase "Digite para buscar" foi removida daqui! */}
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