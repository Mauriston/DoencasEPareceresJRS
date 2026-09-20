import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';

// URL de implantação (aplicativo da web) do projeto Apps Script
// standalone "CodeConcursos.gs" (código-fonte também versionado neste
// repositório), que expõe a API de candidatos (candidatosDataBase/
// candidatos da planilha "TEMPLATE CONCURSOS") usada por esta tela.
const GAS_URL_CONCURSOS = 'https://script.google.com/macros/s/AKfycbzYl4OP22rwwotNOCx1U8JWwnkuacDUoDWPVvJe1BZHvRAyLHSCIrWJaSbyCML-KlXX/exec';

export type StatusCandidato = '' | 'Pendente' | 'APTO' | 'INAPTO' | 'FALTOU' | 'INSUF DOCUMENTAL' | 'Reagendado';

export interface CandidatoRecord {
  id: string;
  nome: string;
  dataAgendamento: string;
  status: StatusCandidato | string;
  observacoes: string;
  finalizado: boolean;
  recurso: boolean;
  dataLaudo: string;
  laudo: string;
  numTIS: string;
  termoRecursoUrl: string;
}

interface ResumoMensagemPDF {
  dataHora: string;
  candidatosNaMensagem: number;
  novosCandidatos: number;
  periodoInfo: string;
  diasUteisDisponiveis: number;
}

interface ContextoAgendamento {
  totalPendentes: number;
  periodoInicio: string;
  periodoFim: string;
  diasUteisDisponiveis: number;
}

interface ViabilidadeAgendamento {
  viavel: boolean;
  mensagem?: string;
  agendamento?: { dataFormatada: string; diaSemana: string; candidatos: string[] }[];
}

interface DataAgendamentoInfo {
  data: string; // AAAA-MM-DD
  dataFormatada: string;
  diaSemana: string;
  quantidadeAgendados: number;
}

const DIAS_SEMANA_UTEIS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

const STATUS_OPTIONS: { value: StatusCandidato; label: string }[] = [
  { value: '', label: 'Sem status' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'APTO', label: 'Apto' },
  { value: 'INAPTO', label: 'Inapto' },
  { value: 'FALTOU', label: 'Faltou' },
  { value: 'INSUF DOCUMENTAL', label: 'Insuf. Documental' },
  { value: 'Reagendado', label: 'Reagendado' },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APTO':
      return <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">APTO</span>;
    case 'INAPTO':
      return <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">INAPTO</span>;
    case 'FALTOU':
      return <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">FALTOU</span>;
    case 'INSUF DOCUMENTAL':
      return <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap">INSUF. DOC.</span>;
    case 'Pendente':
      return <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">PENDENTE</span>;
    case 'Reagendado':
      return <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">REAGENDADO</span>;
    default:
      return <span className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-gray-100 text-gray-500 border border-gray-200 border-dashed whitespace-nowrap">SEM STATUS</span>;
  }
};

const getStatusSelectClasses = (status: string) => {
  switch (status) {
    case 'APTO':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'INAPTO':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'FALTOU':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'INSUF DOCUMENTAL':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Pendente':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Reagendado':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default:
      return 'bg-white text-gray-500 border-gray-200';
  }
};

async function chamarApiConcursos<T = any>(action: string, params: Record<string, string> = {}): Promise<T> {
  const q = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${GAS_URL_CONCURSOS}?${q}`);
  const json = await res.json();
  if (!json.sucesso) throw new Error(json.erro || 'Erro desconhecido na API.');
  return json.dados as T;
}

async function chamarApiConcursosPost<T = any>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(GAS_URL_CONCURSOS, {
    method: 'POST',
    // text/plain evita o preflight CORS (OPTIONS), que o aplicativo da
    // web do Apps Script não trata; o corpo continua sendo JSON válido.
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.sucesso) throw new Error(json.erro || 'Erro desconhecido na API.');
  return json.dados as T;
}

const parseDataBR = (str: string): Date | null => {
  if (!str) return null;
  const partes = str.split('/');
  if (partes.length !== 3) return null;
  const [d, m, y] = partes.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const isoParaBR = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

interface CalendarioAgendamentoProps {
  datas: DataAgendamentoInfo[];
  onSelect: (dataISO: string) => void;
  loading?: boolean;
}

const CalendarioAgendamento: React.FC<CalendarioAgendamentoProps> = ({ datas, onSelect, loading }) => {
  const mapaDatas = useMemo(() => {
    const mapa: Record<string, DataAgendamentoInfo> = {};
    datas.forEach(d => { mapa[d.data] = d; });
    return mapa;
  }, [datas]);

  const mesInicial = datas.length ? new Date(datas[0].data + 'T00:00:00') : new Date();
  const [mesAtual, setMesAtual] = useState(new Date(mesInicial.getFullYear(), mesInicial.getMonth(), 1));

  const primeiroDiaSemana = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1).getDay();
  const diasNoMes = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();

  const celulas: (string | null)[] = [];
  for (let i = 0; i < primeiroDiaSemana; i++) celulas.push(null);
  for (let dia = 1; dia <= diasNoMes; dia++) {
    celulas.push(toISO(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia)));
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">
        <span className="material-symbols-outlined animate-spin text-[28px] text-[#050F41]">progress_activity</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span className="text-xs font-bold text-[#050F41] uppercase">
          {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button
          type="button"
          onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const info = mapaDatas[iso];
          const dia = Number(iso.split('-')[2]);
          if (!info) {
            return (
              <div key={i} className="aspect-square flex items-center justify-center text-[11px] text-gray-300 rounded-lg">
                {dia}
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              title={`${info.dataFormatada} — ${info.quantidadeAgendados} agendado(s)`}
              className="aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-bold bg-[#050F41]/5 text-[#050F41] border border-[#050F41]/20 hover:bg-[#050F41] hover:text-white transition-colors cursor-pointer"
            >
              <span>{dia}</span>
              <span className="text-[8px] font-semibold opacity-70">{info.quantidadeAgendados}</span>
            </button>
          );
        })}
      </div>

      {datas.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">Nenhuma data de agendamento configurada.</p>
      )}
    </div>
  );
};

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export const ConcursosJRS: React.FC = () => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeEditarInline = canUseFeature('concursosJRS.editarDadosTabela', perfil);
  const podeRegistrarMensagem = canUseFeature('concursosJRS.registrarMensagemPDF', perfil);
  const podeReagendar = canUseFeature('concursosJRS.reagendar', perfil);
  const podeGerarMinutaResultados = canUseFeature('concursosJRS.gerarMinutaResultados', perfil);

  const [candidatos, setCandidatos] = useState<CandidatoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [statusKpiFilter, setStatusKpiFilter] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'todos' | 'hoje' | 'semana' | 'personalizado'>('todos');
  const [dateFilterCustom, setDateFilterCustom] = useState<string | null>(null);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showDateCalendar, setShowDateCalendar] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const [datasAgendamento, setDatasAgendamento] = useState<DataAgendamentoInfo[]>([]);
  const [loadingDatasAgendamento, setLoadingDatasAgendamento] = useState(false);

  // --- Registrar Mensagem (PDF) + Agendamento (fluxo único) ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<'select' | 'summary' | 'agendamento' | 'concluido'>('select');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<ResumoMensagemPDF | null>(null);
  const [contextoAgendamento, setContextoAgendamento] = useState<ContextoAgendamento | null>(null);
  const [loadingContexto, setLoadingContexto] = useState(false);
  const [quantidadePorDia, setQuantidadePorDia] = useState('3');
  const [diasSemanaSelecionados, setDiasSemanaSelecionados] = useState<string[]>(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']);
  const [verificando, setVerificando] = useState(false);
  const [previaAgendamento, setPreviaAgendamento] = useState<ViabilidadeAgendamento | null>(null);
  const [confirmandoAgendamento, setConfirmandoAgendamento] = useState(false);
  const [minutaAgendamento, setMinutaAgendamento] = useState<string | null>(null);

  // --- Reagendamento individual ---
  const [reagendandoCandidato, setReagendandoCandidato] = useState<CandidatoRecord | null>(null);
  const [confirmandoReagendamento, setConfirmandoReagendamento] = useState(false);

  // --- Gerar Minuta de Resultados ---
  const [gerandoMinutaResultados, setGerandoMinutaResultados] = useState(false);
  const [minutaResultados, setMinutaResultados] = useState<string | null>(null);
  const [pendentesFinalizacao, setPendentesFinalizacao] = useState<{ id: string; nome: string }[] | null>(null);

  useEffect(() => {
    loadCandidatos();
  }, []);

  const loadCandidatos = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const dados = await chamarApiConcursos<CandidatoRecord[]>('listarCandidatos');
      setCandidatos(dados || []);
    } catch (e: any) {
      console.error('Erro ao carregar candidatos:', e);
      setLoadError(e?.message || 'Não foi possível carregar os candidatos.');
    } finally {
      setLoading(false);
    }
  };

  const loadDatasAgendamento = async () => {
    setLoadingDatasAgendamento(true);
    try {
      const dados = await chamarApiConcursos<DataAgendamentoInfo[]>('listarDatasAgendamento');
      setDatasAgendamento(dados || []);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao carregar as datas de agendamento.');
    } finally {
      setLoadingDatasAgendamento(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleGerarTermo = async (id: string, nome: string) => {
    try {
      const resultado = await chamarApiConcursosPost<{ candidato: string; url: string }>({
        action: 'gerarTermoRecurso',
        id,
      });
      setCandidatos(prev => prev.map(c => (c.id === id ? { ...c, recurso: true, termoRecursoUrl: resultado.url } : c)));
      showToast(`Termo de Recurso gerado para ${nome}.`);
      window.open(resultado.url, '_blank');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar o Termo de Recurso.');
    }
  };

  const salvarCampoCandidato = async (candidato: CandidatoRecord, patch: { status?: string; observacoes?: string; numTIS?: string }) => {
    try {
      const atualizado = await chamarApiConcursosPost<CandidatoRecord>({
        action: 'atualizarCandidato',
        id: candidato.id,
        ...patch,
      });
      setCandidatos(prev => prev.map(c => (c.id === atualizado.id ? atualizado : c)));
      return atualizado;
    } catch (e: any) {
      showToast(e?.message || 'Erro ao salvar alterações.');
      return null;
    }
  };

  const handleStatusChange = (candidato: CandidatoRecord, novoStatus: string) => {
    if (novoStatus === 'INAPTO' && candidato.status !== 'INAPTO') {
      setConfirmDialog({
        title: 'Confirmar Status',
        message: `Registrar ${candidato.nome} como inapto hoje (${new Date().toLocaleDateString('pt-BR')})?`,
        confirmLabel: 'Confirmar',
        onConfirm: async () => {
          setConfirmDialog(null);
          const atualizado = await salvarCampoCandidato(candidato, { status: novoStatus });
          if (atualizado) {
            showToast(`Dados de ${atualizado.nome} atualizados com sucesso.`);
            setConfirmDialog({
              title: 'Gerar Termo de Recurso',
              message: `Gerar o termo de Cientificação de Recurso para ${atualizado.nome}?`,
              confirmLabel: 'Gerar Termo',
              onConfirm: () => {
                setConfirmDialog(null);
                handleGerarTermo(atualizado.id, atualizado.nome);
              },
            });
          }
        },
      });
      return;
    }
    salvarCampoCandidato(candidato, { status: novoStatus }).then(atualizado => {
      if (atualizado) showToast(`Dados de ${atualizado.nome} atualizados com sucesso.`);
    });
  };

  const handleCampoBlur = (candidato: CandidatoRecord, campo: 'observacoes' | 'numTIS', valor: string) => {
    if (valor === candidato[campo]) return;
    salvarCampoCandidato(candidato, { [campo]: valor });
  };

  const fileParaBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result as string;
      resolve(resultado.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleOpenUploadModal = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploadStep('select');
    setPreviaAgendamento(null);
    setMinutaAgendamento(null);
    setShowUploadModal(true);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    loadDatasAgendamento();
  };

  const handleUploadMensagem = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const base64Data = await fileParaBase64(uploadFile);
      const resultado = await chamarApiConcursosPost<ResumoMensagemPDF>({
        action: 'processarMensagemPDF',
        base64Data,
        mimeType: uploadFile.type || 'application/pdf',
        nomeArquivo: uploadFile.name,
      });
      setUploadResult(resultado);
      setUploadStep('summary');
      showToast('Mensagem processada com sucesso.');
      await loadCandidatos();
    } catch (e: any) {
      showToast(e?.message || 'Erro ao processar a mensagem em PDF.');
    } finally {
      setUploading(false);
    }
  };

  const handleAvancarParaAgendamento = async () => {
    setUploadStep('agendamento');
    setLoadingContexto(true);
    try {
      const contexto = await chamarApiConcursos<ContextoAgendamento>('obterContextoAgendamento');
      setContextoAgendamento(contexto);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao carregar contexto de agendamento.');
    } finally {
      setLoadingContexto(false);
    }
  };

  const toggleDiaSemana = (dia: string) => {
    setDiasSemanaSelecionados(prev =>
      prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia]
    );
  };

  const handleVerificarViabilidade = async () => {
    setVerificando(true);
    setPreviaAgendamento(null);
    try {
      const resultado = await chamarApiConcursosPost<ViabilidadeAgendamento>({
        action: 'verificarViabilidadeAgendamento',
        quantidadePorDia: parseInt(quantidadePorDia, 10) || 0,
        diasSemanaSelecionados,
      });
      setPreviaAgendamento(resultado);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao verificar viabilidade do agendamento.');
    } finally {
      setVerificando(false);
    }
  };

  const handleConfirmarAgendamento = async () => {
    setConfirmandoAgendamento(true);
    try {
      const resultado = await chamarApiConcursosPost<{ minuta: string }>({
        action: 'confirmarAgendamento',
        quantidadePorDia: parseInt(quantidadePorDia, 10) || 0,
        diasSemanaSelecionados,
      });
      setMinutaAgendamento(resultado.minuta);
      setPreviaAgendamento(null);
      setUploadStep('concluido');
      showToast('Agendamento confirmado com sucesso.');
      await loadCandidatos();
    } catch (e: any) {
      showToast(e?.message || 'Erro ao confirmar o agendamento.');
    } finally {
      setConfirmandoAgendamento(false);
    }
  };

  const handleCopiarTexto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      showToast('Minuta copiada para a área de transferência.');
    } catch {
      showToast('Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.');
    }
  };

  const handleGerarMinutaResultados = async () => {
    setGerandoMinutaResultados(true);
    setMinutaResultados(null);
    setPendentesFinalizacao(null);
    try {
      const resultado = await chamarApiConcursos<{ bloqueado: boolean; pendentes?: { id: string; nome: string }[]; minuta?: string }>('gerarMinutaResultados');
      if (resultado.bloqueado) {
        setPendentesFinalizacao(resultado.pendentes || []);
      } else {
        setMinutaResultados(resultado.minuta || '');
      }
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar a minuta de resultados.');
    } finally {
      setGerandoMinutaResultados(false);
    }
  };

  const handleOpenReagendamento = (candidato: CandidatoRecord) => {
    setReagendandoCandidato(candidato);
    loadDatasAgendamento();
  };

  const handleSelecionarDataReagendamento = (dataISO: string) => {
    if (!reagendandoCandidato) return;
    const candidato = reagendandoCandidato;
    setConfirmDialog({
      title: 'Confirmar Reagendamento',
      message: `Reagendar ${candidato.nome} para ${isoParaBR(dataISO)}?`,
      confirmLabel: 'Reagendar',
      onConfirm: async () => {
        setConfirmDialog(null);
        setConfirmandoReagendamento(true);
        try {
          const atualizado = await chamarApiConcursosPost<CandidatoRecord>({
            action: 'reagendarCandidato',
            id: candidato.id,
            data: dataISO,
          });
          setCandidatos(prev => prev.map(c => (c.id === atualizado.id ? atualizado : c)));
          showToast(`${atualizado.nome} reagendado(a) para ${isoParaBR(dataISO)}.`);
          setReagendandoCandidato(null);
          loadDatasAgendamento();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao reagendar candidato.');
        } finally {
          setConfirmandoReagendamento(false);
        }
      },
    });
  };

  const toggleStatusKpiFilter = (status: string) => {
    setStatusKpiFilter(prev => (prev === status ? '' : status));
  };

  const hojeBR = new Date().toLocaleDateString('pt-BR');
  const inicioSemana = (() => {
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    const seg = new Date(hoje);
    seg.setDate(hoje.getDate() + diff);
    seg.setHours(0, 0, 0, 0);
    return seg;
  })();
  const fimSemana = (() => {
    const fim = new Date(inicioSemana);
    fim.setDate(inicioSemana.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return fim;
  })();

  const filteredCandidatos = useMemo(() => {
    return candidatos
      .filter(c => {
        const matchesSearch =
          c.id.toLowerCase().includes(search.toLowerCase()) ||
          c.nome.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        if (statusKpiFilter === 'nao-finalizados') {
          if (!(c.status === '' || c.status === 'Pendente' || c.status === 'Reagendado')) return false;
        } else if (statusKpiFilter && c.status !== statusKpiFilter) {
          return false;
        }

        if (dateFilterMode === 'hoje') {
          if (c.dataAgendamento !== hojeBR) return false;
        } else if (dateFilterMode === 'semana') {
          const data = parseDataBR(c.dataAgendamento);
          if (!data || data < inicioSemana || data > fimSemana) return false;
        } else if (dateFilterMode === 'personalizado' && dateFilterCustom) {
          if (c.dataAgendamento !== isoParaBR(dateFilterCustom)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const da = parseDataBR(a.dataAgendamento)?.getTime() ?? Infinity;
        const db = parseDataBR(b.dataAgendamento)?.getTime() ?? Infinity;
        if (da !== db) return da - db;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [candidatos, search, statusKpiFilter, dateFilterMode, dateFilterCustom]);

  const total = candidatos.length;
  const totalFinalizados = candidatos.filter(c => c.finalizado).length;
  const pctFinalizados = total > 0 ? Math.round((totalFinalizados / total) * 100) : 0;
  const countApto = candidatos.filter(c => c.status === 'APTO').length;
  const countInapto = candidatos.filter(c => c.status === 'INAPTO').length;
  const countInsuf = candidatos.filter(c => c.status === 'INSUF DOCUMENTAL').length;
  const countFaltou = candidatos.filter(c => c.status === 'FALTOU').length;
  const countNaoFinalizados = candidatos.filter(c => c.status === '' || c.status === 'Pendente' || c.status === 'Reagendado').length;

  const dateFilterLabel =
    dateFilterMode === 'hoje' ? 'Hoje' :
    dateFilterMode === 'semana' ? 'Esta Semana' :
    dateFilterMode === 'personalizado' && dateFilterCustom ? isoParaBR(dateFilterCustom) :
    'Data: Todos';

  const kpiCards: { key: string; label: string; value: number; icon: string; valueColorClass: string; iconColorClass: string; filterValue: string | null }[] = [
    { key: 'total', label: 'Total', value: total, icon: 'groups', valueColorClass: 'text-[#050F41]', iconColorClass: 'text-gray-500 bg-gray-100', filterValue: null },
    { key: 'apto', label: 'Apto', value: countApto, icon: 'check_circle', valueColorClass: 'text-[#079551]', iconColorClass: 'text-[#079551] bg-green-50', filterValue: 'APTO' },
    { key: 'inapto', label: 'Inapto', value: countInapto, icon: 'cancel', valueColorClass: 'text-red-600', iconColorClass: 'text-red-500 bg-red-50', filterValue: 'INAPTO' },
    { key: 'insuf', label: 'Insuf. Doc.', value: countInsuf, icon: 'description', valueColorClass: 'text-purple-700', iconColorClass: 'text-purple-600 bg-purple-50', filterValue: 'INSUF DOCUMENTAL' },
    { key: 'faltou', label: 'Faltou', value: countFaltou, icon: 'event_busy', valueColorClass: 'text-amber-600', iconColorClass: 'text-amber-500 bg-amber-50', filterValue: 'FALTOU' },
    { key: 'nao-finalizados', label: 'Não Finaliz.', value: countNaoFinalizados, icon: 'pending_actions', valueColorClass: 'text-blue-700', iconColorClass: 'text-blue-600 bg-blue-50', filterValue: 'nao-finalizados' },
  ];

  const renderKpiCard = (card: typeof kpiCards[number], areaKey?: string) => {
    const isActive = card.filterValue !== null && statusKpiFilter === card.filterValue;
    return (
      <button
        key={card.key}
        type="button"
        style={areaKey ? { gridArea: areaKey } : undefined}
        onClick={() => (card.filterValue === null ? setStatusKpiFilter('') : toggleStatusKpiFilter(card.filterValue))}
        className={`p-3.5 rounded-2xl border shadow-sm flex items-center justify-between transition-all text-left ${
          isActive ? 'bg-[#050F41] border-[#050F41]' : 'bg-white border-gray-200/60 hover:border-[#050F41]/40'
        }`}
      >
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{card.label}</p>
          <p className={`text-xl font-bold font-heading ${isActive ? 'text-white' : card.valueColorClass}`}>{card.value}</p>
        </div>
        <span className={`material-symbols-outlined text-[22px] p-1.5 rounded-xl ${isActive ? 'text-white bg-white/10' : card.iconColorClass}`}>{card.icon}</span>
      </button>
    );
  };

  const CIRCULO_RAIO = 36;
  const CIRCULO_CIRCUNFERENCIA = 2 * Math.PI * CIRCULO_RAIO;
  const circuloOffset = CIRCULO_CIRCUNFERENCIA - (pctFinalizados / 100) * CIRCULO_CIRCUNFERENCIA;

  const progressoCardContent = (
    <div className="flex items-center h-full w-full">
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Finalizados</p>
        <p className="text-2xl font-bold text-[#050F41] font-heading mt-1 leading-none">
          {totalFinalizados}<span className="text-sm text-gray-400 font-semibold">/{total}</span>
        </p>
      </div>
      <div className="shrink-0 relative w-[88px] h-[88px]">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={CIRCULO_RAIO} fill="none" stroke="#E5E7EB" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={CIRCULO_RAIO}
            fill="none"
            stroke="url(#concursosProgressGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCULO_CIRCUNFERENCIA}
            strokeDashoffset={circuloOffset}
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="concursosProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#079551" />
              <stop offset="100%" stopColor="#050F41" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-[#050F41] font-heading">{pctFinalizados}%</span>
        </div>
      </div>
    </div>
  );

  const handleCopiarNomeCandidato = async (nome: string) => {
    try {
      await navigator.clipboard.writeText(nome);
      showToast(`Nome "${nome}" copiado para a área de transferência.`);
    } catch {
      showToast('Não foi possível copiar automaticamente. Selecione e copie o nome manualmente.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header title="Planilhas de Controle" />

      {toastMessage && (
        <div className="fixed top-20 right-4 z-[100] bg-[#050F41] text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs border border-white/20 animate-fade-in max-w-[90vw]">
          <span className="material-symbols-outlined text-[18px] text-[#079551] shrink-0">check_circle</span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO (estilo do app, substitui window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
            <div className="p-4 bg-[#050F41] text-white flex items-center space-x-2">
              <span className="material-symbols-outlined text-[20px] text-[#FAB932]">help</span>
              <h3 className="font-heading font-bold text-sm uppercase">{confirmDialog.title}</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-700 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  {confirmDialog.confirmLabel || 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-6xl mx-auto w-full flex-1 space-y-4">
        {/* TOP BAR: BUSCA, FILTRO DE DATA E AÇÕES */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por matrícula ou nome..."
              className="w-full pl-10 pr-4 py-2.5 text-xs font-body rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#050F41] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDateMenu(prev => !prev)}
                className={`px-3 py-2.5 text-xs font-semibold rounded-xl border flex items-center space-x-1.5 whitespace-nowrap ${
                  dateFilterMode !== 'todos'
                    ? 'bg-[#050F41] text-white border-[#050F41]'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">event</span>
                <span>{dateFilterLabel}</span>
              </button>

              {showDateMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDateMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in space-y-0.5">
                    <button
                      type="button"
                      onClick={() => { setDateFilterMode('todos'); setDateFilterCustom(null); setShowDateMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Todos
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDateFilterMode('hoje'); setShowDateMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDateFilterMode('semana'); setShowDateMenu(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Esta Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDateMenu(false); setShowDateCalendar(true); loadDatasAgendamento(); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Personalizado...
                    </button>
                  </div>
                </>
              )}
            </div>

            {podeRegistrarMensagem && (
              <button
                type="button"
                onClick={handleOpenUploadModal}
                className="px-4 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Registrar Mensagem (PDF)</span>
              </button>
            )}

            {podeGerarMinutaResultados && (
              <button
                type="button"
                onClick={handleGerarMinutaResultados}
                disabled={gerandoMinutaResultados}
                className="px-4 py-2.5 bg-white hover:bg-gray-50 text-[#050F41] rounded-xl text-xs font-bold transition-colors shadow-sm border border-gray-200 flex items-center space-x-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {gerandoMinutaResultados ? 'progress_activity' : 'summarize'}
                </span>
                <span>Minuta de Resultados</span>
              </button>
            )}
          </div>
        </div>

        {/* CALENDÁRIO DO FILTRO PERSONALIZADO */}
        {showDateCalendar && (
          <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[20px] text-[#079551]">event</span>
                  <h3 className="font-heading font-bold text-sm uppercase">Escolher Data</h3>
                </div>
                <button onClick={() => setShowDateCalendar(false)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="p-4">
                <CalendarioAgendamento
                  datas={datasAgendamento}
                  loading={loadingDatasAgendamento}
                  onSelect={(dataISO) => {
                    setDateFilterMode('personalizado');
                    setDateFilterCustom(dataISO);
                    setShowDateCalendar(false);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* KPI CARDS */}
        {/* Mobile: barra de progresso empilhada + grade 2 colunas */}
        <div className="sm:hidden space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm">{progressoCardContent}</div>
          <div className="grid grid-cols-2 gap-3">
            {kpiCards.map(card => renderKpiCard(card))}
          </div>
        </div>

        {/* Desktop: progresso ocupa o espaço de 4 cards (2x2) à esquerda; os 6 KPIs em 3 colunas x 2 linhas à direita */}
        <div
          className="hidden sm:grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(2, 1fr)',
            gridTemplateAreas: '"progress progress k1 k2 k3" "progress progress k4 k5 k6"',
          }}
        >
          <div style={{ gridArea: 'progress' }} className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-center">
            {progressoCardContent}
          </div>
          {kpiCards.map((card, i) => renderKpiCard(card, `k${i + 1}`))}
        </div>

        {/* TABELA / LISTA DE CANDIDATOS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
              <p className="text-xs font-semibold">Carregando candidatos...</p>
            </div>
          ) : loadError ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-red-400">error</span>
              <p className="text-sm font-bold text-gray-700">Não foi possível carregar os candidatos</p>
              <p className="text-xs text-gray-400 max-w-sm">{loadError}</p>
              <button
                type="button"
                onClick={loadCandidatos}
                className="mt-2 px-4 py-2 bg-[#050F41] text-white rounded-xl text-xs font-bold"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredCandidatos.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-gray-300">person_off</span>
              <p className="text-sm font-bold text-gray-700">Nenhum candidato encontrado</p>
              <p className="text-xs text-gray-400">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[15px] font-bold text-[#050F41] uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-24 whitespace-nowrap">Data</th>
                      <th className="py-3.5 px-4 w-64">Candidato</th>
                      <th className="py-3.5 px-4 w-32">Status</th>
                      <th className="py-3.5 px-4 w-56">Observações</th>
                      <th className="py-3.5 px-4 w-24">Nº TIS</th>
                      <th className="py-3.5 px-4 w-24 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[14px]">
                    {filteredCandidatos.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{c.dataAgendamento || '-'}</td>
                        <td
                          className="py-3.5 px-4 cursor-pointer"
                          onClick={() => handleCopiarNomeCandidato(c.nome)}
                          title="Clique para copiar o nome do candidato"
                        >
                          <p className="font-semibold text-gray-800">{c.nome}</p>
                          <p className="text-[12px] font-mono text-gray-400">{c.id}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {podeEditarInline ? (
                            <select
                              value={c.status || ''}
                              onChange={e => handleStatusChange(c, e.target.value)}
                              className={`px-2 py-1.5 text-[13px] font-bold rounded-lg border focus:outline-none focus:border-[#050F41] cursor-pointer ${getStatusSelectClasses(c.status)}`}
                            >
                              {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          ) : getStatusBadge(c.status)}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">
                          {podeEditarInline ? (
                            <input
                              type="text"
                              defaultValue={c.observacoes}
                              onBlur={e => handleCampoBlur(c, 'observacoes', e.target.value)}
                              className="w-full px-2 py-1.5 text-[13px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#050F41] focus:bg-white"
                              placeholder="-"
                            />
                          ) : (
                            <span className="truncate block" title={c.observacoes}>{c.observacoes || '-'}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">
                          {podeEditarInline ? (
                            <input
                              type="text"
                              defaultValue={c.numTIS}
                              onBlur={e => handleCampoBlur(c, 'numTIS', e.target.value)}
                              className="w-24 px-2 py-1.5 text-[13px] font-mono rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#050F41] focus:bg-white"
                              placeholder="-"
                            />
                          ) : (c.numTIS || '-')}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {c.termoRecursoUrl ? (
                            <a
                              href={c.termoRecursoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-[#050F41] bg-gray-100 hover:bg-[#050F41] hover:text-white rounded-xl transition-colors cursor-pointer inline-flex"
                              title="Abrir Termo de Recurso"
                            >
                              <span className="material-symbols-outlined text-[22px]">description</span>
                            </a>
                          ) : c.status === 'INAPTO' ? (
                            <button
                              type="button"
                              onClick={() => handleGerarTermo(c.id, c.nome)}
                              className="p-2 text-[#050F41] bg-gray-100 hover:bg-[#050F41] hover:text-white rounded-xl transition-colors cursor-pointer"
                              title="Gerar Termo de Recurso"
                            >
                              <span className="material-symbols-outlined text-[22px]">gavel</span>
                            </button>
                          ) : null}

                          {podeReagendar && !c.finalizado && (
                            <button
                              type="button"
                              onClick={() => handleOpenReagendamento(c)}
                              className="p-2 ml-1 text-[#079551] bg-green-50 hover:bg-[#079551] hover:text-white rounded-xl transition-colors cursor-pointer"
                              title="Reagendar"
                            >
                              <span className="material-symbols-outlined text-[22px]">event_repeat</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS LIST */}
              <div className="block md:hidden divide-y divide-gray-100">
                {filteredCandidatos.map(c => (
                  <div key={c.id} className="p-4 flex flex-col space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-700 font-semibold truncate">{c.nome}</p>
                        <p className="text-[10px] font-mono text-gray-400">{c.id}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{c.dataAgendamento || 'Sem data'}</p>
                      </div>
                      <div className="shrink-0">{getStatusBadge(c.status)}</div>
                    </div>

                    {podeEditarInline && (
                      <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Status</span>
                          <select
                            value={c.status || ''}
                            onChange={e => handleStatusChange(c, e.target.value)}
                            className={`w-full px-2 py-1.5 text-[11px] font-bold rounded-lg border focus:outline-none ${getStatusSelectClasses(c.status)}`}
                          >
                            {STATUS_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Nº TIS</span>
                          <input
                            type="text"
                            defaultValue={c.numTIS}
                            onBlur={e => handleCampoBlur(c, 'numTIS', e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] font-mono rounded-lg border border-gray-200 bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Observações</span>
                          <input
                            type="text"
                            defaultValue={c.observacoes}
                            onBlur={e => handleCampoBlur(c, 'observacoes', e.target.value)}
                            className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                    {!podeEditarInline && c.observacoes && (
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Observações</span>
                        <span className="text-[11px] font-medium text-gray-600">{c.observacoes}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {c.termoRecursoUrl ? (
                        <a
                          href={c.termoRecursoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-[#050F41] underline flex items-center space-x-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">description</span>
                          <span>Termo de Recurso</span>
                        </a>
                      ) : c.status === 'INAPTO' ? (
                        <button
                          type="button"
                          onClick={() => handleGerarTermo(c.id, c.nome)}
                          className="text-[11px] font-bold text-[#050F41] underline flex items-center space-x-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">gavel</span>
                          <span>Gerar Termo</span>
                        </button>
                      ) : <span />}

                      {podeReagendar && !c.finalizado && (
                        <button
                          type="button"
                          onClick={() => handleOpenReagendamento(c)}
                          className="px-3 py-1.5 bg-[#050F41] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[14px]">event_repeat</span>
                          <span>Reagendar</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL DE REAGENDAMENTO */}
      {reagendandoCandidato && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-[#079551] shrink-0">event_repeat</span>
                <h3 className="font-heading font-bold text-sm uppercase truncate">Reagendar {reagendandoCandidato.nome}</h3>
              </div>
              <button
                onClick={() => setReagendandoCandidato(null)}
                disabled={confirmandoReagendamento}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4">
              <CalendarioAgendamento
                datas={datasAgendamento}
                loading={loadingDatasAgendamento || confirmandoReagendamento}
                onSelect={handleSelecionarDataReagendamento}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRAR MENSAGEM (PDF) + AGENDAMENTO */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">upload_file</span>
                <h3 className="font-heading font-bold text-sm uppercase">Registrar Mensagem (PDF)</h3>
              </div>
              <button
                onClick={handleCloseUploadModal}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {uploadStep === 'select' && (
                <>
                  <p className="text-xs text-gray-500">
                    Envie o PDF da mensagem inicial de apresentação dos candidatos. O texto será lido (OCR), os candidatos
                    extraídos e cadastrados, e o período de agendamento da JRS identificado automaticamente.
                  </p>
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#050F41] transition-colors">
                    <span className="material-symbols-outlined text-[32px] text-gray-400">picture_as_pdf</span>
                    <span className="text-xs font-bold text-gray-600">
                      {uploadFile ? uploadFile.name : 'Clique para selecionar o PDF'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    />
                  </label>

                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={handleCloseUploadModal}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!uploadFile || uploading}
                      onClick={handleUploadMensagem}
                      className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1 disabled:opacity-50"
                    >
                      {uploading ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">upload</span>
                          <span>Processar Mensagem</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {uploadStep === 'summary' && uploadResult && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2 text-xs text-gray-700">
                    <p><span className="font-bold">Data-Hora:</span> {uploadResult.dataHora}</p>
                    <p><span className="font-bold">Candidatos na mensagem:</span> {uploadResult.candidatosNaMensagem}</p>
                    <p><span className="font-bold">Novos candidatos cadastrados:</span> {uploadResult.novosCandidatos}</p>
                    <p><span className="font-bold">Período JRS:</span> {uploadResult.periodoInfo}</p>
                    <p><span className="font-bold">Dias úteis disponíveis:</span> {uploadResult.diasUteisDisponiveis}</p>
                  </div>
                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={handleCloseUploadModal}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Concluir sem Agendar
                    </button>
                    {uploadResult.diasUteisDisponiveis > 0 && (
                      <button
                        type="button"
                        onClick={handleAvancarParaAgendamento}
                        className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">event_available</span>
                        <span>Configurar Agendamento Agora</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {uploadStep === 'agendamento' && (
                loadingContexto ? (
                  <div className="text-center py-6 text-gray-500">
                    <span className="material-symbols-outlined animate-spin text-[28px] text-[#050F41]">progress_activity</span>
                  </div>
                ) : (
                  <>
                    {contextoAgendamento && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-gray-700 space-y-1">
                        <p><span className="font-bold">Candidatos pendentes de agendamento:</span> {contextoAgendamento.totalPendentes}</p>
                        <p><span className="font-bold">Período disponível:</span> {contextoAgendamento.periodoInicio} a {contextoAgendamento.periodoFim} ({contextoAgendamento.diasUteisDisponiveis} dias úteis)</p>
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                        Candidatos por dia
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={quantidadePorDia}
                        onChange={e => setQuantidadePorDia(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                        Dias da semana
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DIAS_SEMANA_UTEIS.map(dia => (
                          <button
                            key={dia}
                            type="button"
                            onClick={() => toggleDiaSemana(dia)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                              diasSemanaSelecionados.includes(dia)
                                ? 'bg-[#050F41] text-white border-[#050F41]'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}
                          >
                            {dia}
                          </button>
                        ))}
                      </div>
                    </div>

                    {previaAgendamento && (
                      previaAgendamento.viavel ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2 max-h-56 overflow-y-auto">
                          {previaAgendamento.agendamento?.map((item, i) => (
                            <div key={i} className="text-xs text-gray-700">
                              <p className="font-bold text-[#050F41]">{item.dataFormatada} ({item.diaSemana}) — {item.candidatos.length} candidato(s)</p>
                              <p className="text-[11px] text-gray-500">{item.candidatos.join(', ')}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800"
                          dangerouslySetInnerHTML={{ __html: previaAgendamento.mensagem || '' }}
                        />
                      )
                    )}

                    <div className="pt-2 flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={handleCloseUploadModal}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={verificando || !diasSemanaSelecionados.length}
                        onClick={handleVerificarViabilidade}
                        className="px-4 py-2.5 rounded-xl border border-[#050F41] text-xs font-bold text-[#050F41] hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {verificando ? 'Verificando...' : 'Verificar Viabilidade'}
                      </button>
                      {previaAgendamento?.viavel && (
                        <button
                          type="button"
                          disabled={confirmandoAgendamento}
                          onClick={handleConfirmarAgendamento}
                          className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                        >
                          {confirmandoAgendamento ? 'Confirmando...' : 'Confirmar Agendamento'}
                        </button>
                      )}
                    </div>
                  </>
                )
              )}

              {uploadStep === 'concluido' && minutaAgendamento && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-green-800">Agendamento confirmado com sucesso.</p>
                  </div>
                  <textarea
                    readOnly
                    value={minutaAgendamento}
                    rows={12}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-[11px] font-mono text-gray-800 focus:outline-none resize-none whitespace-pre-wrap"
                  />
                  <div className="pt-2 flex items-center justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => handleCopiarTexto(minutaAgendamento)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      <span>Copiar Minuta</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseUploadModal}
                      className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                      Concluir
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE MINUTA DE RESULTADOS */}
      {(minutaResultados !== null || pendentesFinalizacao !== null) && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">summarize</span>
                <h3 className="font-heading font-bold text-sm uppercase">Minuta de Resultados da IS</h3>
              </div>
              <button
                onClick={() => { setMinutaResultados(null); setPendentesFinalizacao(null); }}
                className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {pendentesFinalizacao && pendentesFinalizacao.length > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-800">
                      Ainda há {pendentesFinalizacao.length} candidato(s) não finalizado(s). Finalize todos antes de gerar a minuta de resultados.
                    </p>
                  </div>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {pendentesFinalizacao.map(p => (
                      <div key={p.id} className="p-2.5 text-xs flex items-center justify-between">
                        <span className="font-mono font-bold text-[#050F41]">{p.id}</span>
                        <span className="text-gray-600">{p.nome}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <textarea
                  readOnly
                  value={minutaResultados ?? ''}
                  rows={16}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-[11px] font-mono text-gray-800 focus:outline-none resize-none whitespace-pre-wrap"
                />
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                {minutaResultados && (
                  <button
                    type="button"
                    onClick={() => handleCopiarTexto(minutaResultados)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setMinutaResultados(null); setPendentesFinalizacao(null); }}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
