import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Header } from './Header';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import {
  listarConcursos, getConcurso, listarCandidatos, criarConcursoDaMensagem, novoConcursoId, importarConcursoDeCsv, atualizarCandidato,
  criarCandidato, reagendarCandidato, listarDatasAgendamento, obterContextoAgendamento, confirmarAgendamento,
  gerarMinutaResultados, abrirConcurso, voltarParaEmBreve, encerrarConcurso, salvarTermoRecurso,
  listarMensagens, arquivarMensagem, obterEstatisticasAnuais, definirPeriodoAgendamento,
  STATUS_LABELS,
  type ConcursoRecord, type CandidatoRecord, type DataAgendamentoInfo, type MensagemRecord, type EstatisticasAnuais, type EstatisticaConcursoStatus,
} from '../services/firestoreConcursos';
import { uploadMensagemPdf, uploadTermoRecursoPdf } from '../services/firebaseStorageConcursos';
import {
  limparRuidoPaginacao, extrairCabecalhoMensagem, extrairCandidatos, extrairPeriodoJRS,
  extrairNomeConcurso, formatarChaveData, parseChaveData, interpretarCsvCandidatosDataBase,
  type CabecalhoMensagem, type CandidatoBasico, type CandidatoImportadoCsv,
} from '../utils/concursosUtils';
import { apiUrl } from '../utils/apiBase';
import { useIsDesktop } from '../hooks/useIsDesktop';

// URL de implantação (aplicativo da web) do projeto Apps Script standalone
// mínimo "CodeConcursos.gs" (código-fonte também versionado neste
// repositório) — hoje responsável apenas por gerar o PDF do Termo de
// Cientificação de Recurso a partir do template Google Docs. Todo o resto
// do backend de Concursos vive no Firestore (ver services/firestoreConcursos.ts).
const GAS_URL_TERMO_RECURSO = 'https://script.google.com/macros/s/AKfycbzYl4OP22rwwotNOCx1U8JWwnkuacDUoDWPVvJe1BZHvRAyLHSCIrWJaSbyCML-KlXX/exec';

const STATUS_OPTIONS: { value: string; label: string }[] = [
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
    case 'APTO': return 'bg-green-100 text-green-800 border-green-200';
    case 'INAPTO': return 'bg-red-100 text-red-800 border-red-200';
    case 'FALTOU': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'INSUF DOCUMENTAL': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'Pendente': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Reagendado': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    default: return 'bg-white text-gray-500 border-gray-200';
  }
};

const getConcursoStatusClasses = (status: ConcursoRecord['status']) => {
  switch (status) {
    case 'em_andamento': return 'bg-green-100 text-green-800 border-green-200';
    case 'encerrado': return 'bg-gray-200 text-gray-600 border-gray-300';
    default: return 'bg-amber-100 text-amber-800 border-amber-200';
  }
};

const parseDataBR = (str: string): Date | null => {
  if (!str) return null;
  const partes = str.split('/');
  if (partes.length !== 3) return null;
  const [d, m, y] = partes.map(Number);
  if (!d || !m || !y) return null;
  return new Date(y, m - 1, d);
};

const isoParaBR = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
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

// Acima disso o arquivo costuma estourar o limite de tamanho de requisição
// do servidor/infra antes mesmo de chegar à IA, retornando uma página de
// erro em HTML em vez de JSON (ver transcreverPdfViaOcr).
const TAMANHO_MAXIMO_PDF_OCR = 15 * 1024 * 1024; // 15 MB

/**
 * Envia um PDF (ou foto/scan) ao endpoint de transcrição por IA e devolve o
 * texto transcrito. Centraliza a checagem de tamanho do arquivo e o
 * tratamento de respostas que não são JSON — isso acontece quando a
 * requisição é grande demais e a infra devolve uma página de erro em HTML
 * (o sintoma típico é "Unexpected token '<' ... is not valid JSON").
 */
const transcreverPdfViaOcr = async (file: File): Promise<string> => {
  if (file.size > TAMANHO_MAXIMO_PDF_OCR) {
    const tamanhoMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `O arquivo tem ${tamanhoMB} MB — acima do limite de ${TAMANHO_MAXIMO_PDF_OCR / (1024 * 1024)} MB aceito para transcrição automática. ` +
      'Tente um PDF menor (reduza a resolução do scan ou separe-o em partes), ou use a importação por CSV para concursos já encerrados.'
    );
  }

  const fileBase64 = await fileParaBase64(file);
  let res: Response;
  try {
    res = await fetch(apiUrl('/api/concursos/ocr-pdf'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64, mimeType: file.type || 'application/pdf' }),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor para transcrever o PDF. Verifique sua conexão e tente novamente.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok
        ? 'O servidor respondeu em um formato inesperado ao transcrever o PDF.'
        : `O servidor retornou um erro inesperado (código ${res.status}) ao transcrever o PDF — isso costuma acontecer quando o arquivo é grande demais. Tente um PDF menor.`
    );
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao transcrever o documento.');
  return json.texto || '';
};

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

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
    celulas.push(formatarChaveData(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), dia)));
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
        <button type="button" onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span className="text-xs md:text-sm font-bold text-[#050F41] uppercase">
          {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] md:text-xs font-bold text-gray-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const info = mapaDatas[iso];
          const dia = Number(iso.split('-')[2]);
          if (!info) {
            return <div key={i} className="aspect-square flex items-center justify-center text-[11px] md:text-sm text-gray-300 rounded-lg">{dia}</div>;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              title={`${info.dataFormatada} — ${info.quantidadeAgendados} agendado(s)`}
              className="aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] md:text-sm font-bold bg-[#050F41]/5 text-[#050F41] border border-[#050F41]/20 hover:bg-[#050F41] hover:text-white transition-colors cursor-pointer"
            >
              <span>{dia}</span>
              <span className="text-[8px] md:text-[10px] font-semibold opacity-70">{info.quantidadeAgendados}</span>
            </button>
          );
        })}
      </div>

      {datas.length === 0 && <p className="text-xs md:text-sm text-gray-400 text-center py-4">Nenhuma data de agendamento configurada.</p>}
    </div>
  );
};

// =========================================================================
// MODAL "REGISTRAR MENSAGEM (PDF)" — cria um novo concurso do zero
// =========================================================================

type UploadStep = 'select' | 'processando' | 'revisao' | 'agendamento' | 'concluido';

interface ModalRegistrarMensagemProps {
  onClose: (concursoIdCriado?: string) => void;
  isAdmin: boolean;
}

const ModalRegistrarMensagem: React.FC<ModalRegistrarMensagemProps> = ({ onClose, isAdmin }) => {
  const [step, setStep] = useState<UploadStep>('select');
  const [file, setFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [cabecalho, setCabecalho] = useState<CabecalhoMensagem | null>(null);
  const [nomeConcurso, setNomeConcurso] = useState('');
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [candidatos, setCandidatos] = useState<CandidatoBasico[]>([]);

  const [concursoId, setConcursoId] = useState<string | null>(null);
  const [datasDisponiveis, setDatasDisponiveis] = useState<DataAgendamentoInfo[]>([]);
  const [datasSelecionadas, setDatasSelecionadas] = useState<Set<string>>(new Set());
  const [quantidadePorDia, setQuantidadePorDia] = useState('3');
  const [totalPendentes, setTotalPendentes] = useState(0);
  const [minuta, setMinuta] = useState<string | null>(null);
  const [semPeriodo, setSemPeriodo] = useState(false);

  const [processando, setProcessando] = useState(false);

  const handleProcessar = async () => {
    if (!file) return;
    setErro(null);
    setProcessando(true);
    setStep('processando');
    try {
      const texto = await transcreverPdfViaOcr(file);
      const textoLimpo = limparRuidoPaginacao(texto);
      const cab = extrairCabecalhoMensagem(textoLimpo);
      if (!cab.dataHora) {
        throw new Error('Não foi possível localizar o código Data-Hora (ID único) da mensagem no documento. Confira o arquivo e tente novamente.');
      }

      const candidatosExtraidos = extrairCandidatos(cab.texto || textoLimpo);
      const periodo = extrairPeriodoJRS(cab.texto || textoLimpo);

      setCabecalho(cab);
      setNomeConcurso(extrairNomeConcurso(cab.subject));
      setCandidatos(candidatosExtraidos);
      setPeriodoInicio(periodo ? formatarChaveData(periodo.inicio) : '');
      setPeriodoFim(periodo ? formatarChaveData(periodo.fim) : '');
      setStep('revisao');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao processar o documento.');
      setStep('select');
    } finally {
      setProcessando(false);
    }
  };

  const atualizarCandidatoEditavel = (indice: number, campo: 'id' | 'nome', valor: string) => {
    setCandidatos(prev => prev.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)));
  };

  const removerCandidatoEditavel = (indice: number) => {
    setCandidatos(prev => prev.filter((_, i) => i !== indice));
  };

  const adicionarCandidatoEditavel = () => {
    setCandidatos(prev => [...prev, { id: '', nome: '' }]);
  };

  const handleConfirmarCriacao = async () => {
    if (!cabecalho) return;
    if (!nomeConcurso.trim()) { setErro('Informe o nome do concurso.'); return; }
    const candidatosValidos = candidatos.filter(c => c.id.trim() && c.nome.trim());
    if (candidatosValidos.length === 0) { setErro('Adicione ao menos um candidato válido (matrícula e nome).'); return; }

    setErro(null);
    setProcessando(true);
    try {
      const periodo = periodoInicio && periodoFim ? { inicio: parseChaveData(periodoInicio), fim: parseChaveData(periodoFim) } : null;
      // O Storage exige o ID do concurso no caminho do arquivo, então o ID é
      // gerado antes e o upload é aguardado aqui — se não, o registro da
      // mensagem ficava com fileUrl vazio para sempre (o upload rodava em
      // paralelo com o resultado descartado), e o PDF nunca aparecia depois.
      const novoId = novoConcursoId();
      const fileUrl = await uploadMensagemPdf(novoId, file!);
      // A mensagem que cria o concurso é sempre do tipo "Apresentação",
      // independente do que a heurística de extração tenha identificado.
      await criarConcursoDaMensagem({
        concursoId: novoId,
        nome: nomeConcurso.trim(),
        cabecalho: { ...cabecalho, purpose: 'Apresentação' },
        candidatos: candidatosValidos,
        periodo,
        fileUrl,
      });
      setConcursoId(novoId);

      if (periodo) {
        const [contexto, datas] = await Promise.all([obterContextoAgendamento(novoId), listarDatasAgendamento(novoId)]);
        setTotalPendentes(contexto.totalPendentes);
        setDatasDisponiveis(datas);
        setDatasSelecionadas(new Set(datas.map(d => d.data)));
        setStep('agendamento');
      } else {
        setSemPeriodo(true);
        setStep('concluido');
      }
    } catch (e: any) {
      setErro(e?.message || 'Erro ao criar o concurso.');
    } finally {
      setProcessando(false);
    }
  };

  const toggleData = (dataISO: string) => {
    setDatasSelecionadas(prev => {
      const proximo = new Set(prev);
      if (proximo.has(dataISO)) proximo.delete(dataISO); else proximo.add(dataISO);
      return proximo;
    });
  };

  const todasDatasSelecionadas = datasDisponiveis.length > 0 && datasDisponiveis.every(d => datasSelecionadas.has(d.data));
  const toggleTodasDatas = () => {
    setDatasSelecionadas(todasDatasSelecionadas ? new Set() : new Set(datasDisponiveis.map(d => d.data)));
  };

  const quantidadeCoberta = datasSelecionadas.size * (parseInt(quantidadePorDia, 10) || 0);
  const agendamentoViavel = quantidadeCoberta >= totalPendentes && totalPendentes > 0;

  const handleConfirmarAgendamento = async () => {
    if (!concursoId) return;
    setErro(null);
    setProcessando(true);
    try {
      const resultado = await confirmarAgendamento(concursoId, Array.from(datasSelecionadas), parseInt(quantidadePorDia, 10) || 0);
      setMinuta(resultado.minuta);
      setStep('concluido');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao confirmar o agendamento.');
    } finally {
      setProcessando(false);
    }
  };

  const handleCopiarTexto = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); } catch { /* ignora falha de clipboard */ }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[22px] text-[#079551]">upload_file</span>
            <h3 className="font-heading font-bold text-sm uppercase">Registrar Mensagem (PDF) — Novo Concurso</h3>
          </div>
          <button onClick={() => onClose(step === 'concluido' ? concursoId || undefined : undefined)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs md:text-sm text-red-700 font-semibold">{erro}</div>
          )}

          {step === 'select' && (
            <>
              <p className="text-xs md:text-sm text-gray-500">
                Envie o PDF (ou fotografe/escaneie) da mensagem administrativa inicial de apresentação dos candidatos.
                O texto será transcrito por IA, os candidatos e o período de agendamento identificados automaticamente
                — você poderá revisar e corrigir tudo antes de criar o concurso.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#050F41] transition-colors">
                <span className="material-symbols-outlined text-[32px] text-gray-400">picture_as_pdf</span>
                <span className="text-xs md:text-sm font-bold text-gray-600">{file ? file.name : 'Clique para selecionar o PDF ou escanear um documento'}</span>
                <span className="text-[10px] md:text-xs text-gray-400">Máx. 15 MB</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={!file || processando}
                  onClick={handleProcessar}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center space-x-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  <span>Processar Mensagem</span>
                </button>
              </div>
            </>
          )}

          {step === 'processando' && (
            <div className="text-center py-8 text-gray-500 space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
              <p className="text-xs md:text-sm font-semibold">Transcrevendo o documento e identificando os candidatos...</p>
            </div>
          )}

          {step === 'revisao' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs md:text-sm text-blue-800">
                Confira e corrija os dados extraídos antes de criar o concurso — a matrícula de cada candidato precisa estar correta.
              </div>

              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm md:text-base font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Período JRS — início</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm focus:outline-none focus:border-[#050F41]" />
                </div>
                <div>
                  <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Período JRS — fim</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm focus:outline-none focus:border-[#050F41]" />
                </div>
              </div>
              {!periodoInicio && (
                <p className="text-[11px] md:text-sm text-amber-700">Período não identificado automaticamente — informe manualmente para já configurar o agendamento, ou deixe em branco para agendar depois.</p>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider">Candidatos ({candidatos.length})</label>
                  <button type="button" onClick={adicionarCandidatoEditavel} className="text-[11px] md:text-sm font-bold text-[#050F41] flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Adicionar</span>
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {candidatos.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 p-2">
                      <input
                        type="text"
                        value={c.id}
                        onChange={e => atualizarCandidatoEditavel(i, 'id', e.target.value)}
                        placeholder="Matrícula"
                        className="w-28 shrink-0 px-2 py-1.5 text-[12px] font-mono rounded-lg border border-gray-200 focus:outline-none focus:border-[#050F41]"
                      />
                      <input
                        type="text"
                        value={c.nome}
                        onChange={e => atualizarCandidatoEditavel(i, 'nome', e.target.value)}
                        placeholder="Nome do candidato"
                        className="flex-1 px-2 py-1.5 text-[12px] rounded-lg border border-gray-200 focus:outline-none focus:border-[#050F41]"
                      />
                      <button type="button" onClick={() => removerCandidatoEditavel(i)} className="p-1.5 text-gray-400 hover:text-red-600 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                  {candidatos.length === 0 && <p className="text-xs md:text-sm text-gray-400 text-center py-4">Nenhum candidato identificado.</p>}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando}
                  onClick={handleConfirmarCriacao}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Criando concurso...' : 'Confirmar e Criar Concurso'}
                </button>
              </div>
            </>
          )}

          {step === 'agendamento' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs md:text-sm text-gray-700">
                <span className="font-bold">Candidatos a agendar:</span> {totalPendentes}
              </div>

              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Quantidade de IS por dia</label>
                <input
                  type="number"
                  min={1}
                  value={quantidadePorDia}
                  onChange={e => setQuantidadePorDia(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>

              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-2">Datas disponíveis (marque as que serão usadas)</label>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {datasDisponiveis.length > 0 && (
                    <label className="flex items-center gap-2 p-2 text-xs md:text-sm font-bold text-[#050F41] cursor-pointer hover:bg-gray-50 bg-gray-50/60">
                      <input
                        type="checkbox"
                        checked={todasDatasSelecionadas}
                        ref={el => { if (el) el.indeterminate = !todasDatasSelecionadas && datasSelecionadas.size > 0; }}
                        onChange={toggleTodasDatas}
                        className="accent-[#050F41]"
                      />
                      <span>{todasDatasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}</span>
                    </label>
                  )}
                  {datasDisponiveis.map(d => (
                    <label key={d.data} className="flex items-center gap-2 p-2 text-xs md:text-sm cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={datasSelecionadas.has(d.data)} onChange={() => toggleData(d.data)} className="accent-[#050F41]" />
                      <span className="font-bold text-[#050F41]">{d.dataFormatada}</span>
                      <span className="text-gray-500">({d.diaSemana})</span>
                    </label>
                  ))}
                  {datasDisponiveis.length === 0 && <p className="text-xs md:text-sm text-gray-400 text-center py-4">Nenhuma data útil no período informado.</p>}
                </div>
              </div>

              <div className={`rounded-xl p-3 text-xs md:text-sm font-bold ${agendamentoViavel ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                {quantidadeCoberta} / {totalPendentes} candidatos cobertos com {datasSelecionadas.size} data(s) × {quantidadePorDia || 0} por dia
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Agendar Depois</button>
                <button
                  type="button"
                  disabled={!agendamentoViavel || processando}
                  onClick={handleConfirmarAgendamento}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Confirmando...' : 'Confirmar Agendamento e Gerar Minuta'}
                </button>
              </div>
            </>
          )}

          {step === 'concluido' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs md:text-sm font-bold text-green-800">
                  Concurso "{nomeConcurso}" criado com sucesso{semPeriodo ? '.' : ' e agendamento confirmado.'}
                </p>
              </div>
              {minuta && (
                <>
                  <textarea readOnly value={minuta} rows={12} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-[11px] md:text-sm font-mono text-gray-800 focus:outline-none resize-none whitespace-pre-wrap" />
                  <button type="button" onClick={() => handleCopiarTexto(minuta)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                </>
              )}
              {!isAdmin && (
                <p className="text-[11px] md:text-sm text-gray-500">O concurso ficará com status "Em Breve" até um Admin abri-lo.</p>
              )}
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// MODAL "IMPORTAR CONCURSO (CSV)" — cria um concurso direto de um CSV no
// formato da aba "candidatosDataBase" (uso do Admin, sem mensagem/agendamento)
// =========================================================================

interface ModalImportarCsvProps {
  onClose: (concursoIdCriado?: string) => void;
}

const STATUS_IMPORTACAO_OPTIONS: { value: ConcursoRecord['status']; label: string }[] = [
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'em_breve', label: 'Em Breve' },
];

const ModalImportarCsv: React.FC<ModalImportarCsvProps> = ({ onClose }) => {
  const [nomeConcurso, setNomeConcurso] = useState('');
  const [status, setStatus] = useState<ConcursoRecord['status']>('encerrado');
  const [fileName, setFileName] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoImportadoCsv[]>([]);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [concursoIdCriado, setConcursoIdCriado] = useState<string | null>(null);

  const handleSelecionarArquivo = async (file: File | null) => {
    setErro(null);
    setCandidatos([]);
    setFileName(file?.name || null);
    if (!file) return;
    try {
      const texto = await file.text();
      const lista = interpretarCsvCandidatosDataBase(texto);
      if (lista.length === 0) throw new Error('Nenhum candidato encontrado no CSV.');
      setCandidatos(lista);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao ler o CSV.');
    }
  };

  const handleImportar = async () => {
    if (!nomeConcurso.trim()) { setErro('Informe o nome do concurso.'); return; }
    if (candidatos.length === 0) { setErro('Selecione um CSV válido com ao menos um candidato.'); return; }
    if ((periodoInicio && !periodoFim) || (!periodoInicio && periodoFim)) {
      setErro('Informe as duas datas do período (início e fim), ou deixe ambas em branco.');
      return;
    }
    setErro(null);
    setProcessando(true);
    try {
      const { concursoId } = await importarConcursoDeCsv(nomeConcurso.trim(), status, candidatos);
      if (periodoInicio && periodoFim) {
        await definirPeriodoAgendamento(concursoId, parseChaveData(periodoInicio), parseChaveData(periodoFim));
      }
      setConcursoIdCriado(concursoId);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao importar o concurso.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[22px] text-[#079551]">table_view</span>
            <h3 className="font-heading font-bold text-sm uppercase">Importar Concurso (CSV)</h3>
          </div>
          <button onClick={() => onClose(concursoIdCriado || undefined)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs md:text-sm text-red-700 font-semibold">{erro}</div>}

          {concursoIdCriado ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs md:text-sm font-bold text-green-800">Concurso "{nomeConcurso}" importado com sucesso ({candidatos.length} candidato(s)).</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoIdCriado)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">Ver Concurso</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs md:text-sm text-gray-500">
                Importa um concurso direto de um CSV no formato da aba "candidatosDataBase" (com a coluna do nome do
                candidato em qualquer posição). Não cria mensagem administrativa — se o concurso ainda terá
                candidatos reagendados pelo app, informe o período de IS abaixo para liberar o calendário de
                reagendamento; deixe em branco se ele não precisa mais ser agendado (normalmente já encerrados).
              </p>

              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEAM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm md:text-base font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>

              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Status inicial</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ConcursoRecord['status'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                >
                  {STATUS_IMPORTACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Período IS — início (opcional)</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm focus:outline-none focus:border-[#050F41]" />
                </div>
                <div>
                  <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Período IS — fim (opcional)</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm focus:outline-none focus:border-[#050F41]" />
                </div>
              </div>
              <p className="text-[11px] md:text-sm text-gray-400 -mt-2">Informe o período para liberar o calendário de reagendamento (gera os dias úteis automaticamente).</p>

              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Arquivo CSV</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#050F41] transition-colors">
                  <span className="material-symbols-outlined text-[32px] text-gray-400">table_view</span>
                  <span className="text-xs md:text-sm font-bold text-gray-600">{fileName || 'Clique para selecionar o CSV'}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleSelecionarArquivo(e.target.files?.[0] || null)} />
                </label>
                {candidatos.length > 0 && (
                  <p className="text-[11px] md:text-sm text-green-700 font-bold mt-1.5">{candidatos.length} candidato(s) identificado(s).</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando || candidatos.length === 0}
                  onClick={handleImportar}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Importando...' : 'Importar Concurso'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// LISTA DE CONCURSOS
// =========================================================================

const getConcursoCardBg = (status: ConcursoRecord['status']) => {
  switch (status) {
    case 'encerrado': return 'bg-green-100';
    case 'em_andamento': return 'bg-red-100';
    default: return 'bg-amber-100';
  }
};

const CircularMini: React.FC<{ pct: number }> = ({ pct }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#FFFFFF" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="#079551" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-base font-black text-[#050F41]">{pct}%</span>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal do gráfico de barras (clique nos KPIs anuais de Faltas/Inaptos/IDM)
// -------------------------------------------------------------------------
interface ModalKpiBarChartProps {
  titulo: string;
  corBarra: string;
  itens: EstatisticaConcursoStatus[];
  onSelecionarConcurso: (id: string) => void;
  onClose: () => void;
}

const ModalKpiBarChart: React.FC<ModalKpiBarChartProps> = ({ titulo, corBarra, itens, onSelecionarConcurso, onClose }) => {
  const max = Math.max(1, ...itens.map(i => i.quantidade));
  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
          <h3 className="font-heading font-bold text-sm uppercase">{titulo} — Top 4 Concursos</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="text-xs md:text-sm text-gray-400 text-center py-6">Nenhuma ocorrência no ano corrente.</p>
          ) : itens.map(item => (
            <button key={item.concursoId} type="button" onClick={() => { onSelecionarConcurso(item.concursoId); onClose(); }} className="w-full text-left group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs md:text-sm font-bold text-[#050F41] group-hover:underline truncate pr-2">{item.concursoNome}</span>
                <span className="text-xs md:text-sm font-black text-gray-700 shrink-0">{item.quantidade}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${corBarra}`} style={{ width: `${(item.quantidade / max) * 100}%` }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Registrar Mensagem" — arquiva UMA mensagem qualquer de um concurso
// já existente (reagendamento, resultado de recurso etc.), diferente do
// fluxo que cria um concurso novo a partir da mensagem de apresentação.
// -------------------------------------------------------------------------
const PROPOSITO_MENSAGEM_OPTIONS = ['Agendamento', 'Reagendamento', 'Solicitação de Reagendamento', 'Resultado de Recurso', 'Outros'];

interface ModalRegistrarMensagemArquivoProps {
  concursoId: string;
  concursoNome: string;
  onClose: () => void;
}

const ModalRegistrarMensagemArquivo: React.FC<ModalRegistrarMensagemArquivoProps> = ({ concursoId, concursoNome, onClose }) => {
  const [step, setStep] = useState<'select' | 'processando' | 'revisao' | 'concluido'>('select');
  const [file, setFile] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [cabecalho, setCabecalho] = useState<CabecalhoMensagem | null>(null);
  const [processando, setProcessando] = useState(false);

  const handleProcessar = async () => {
    if (!file) return;
    setErro(null);
    setProcessando(true);
    setStep('processando');
    try {
      const texto = await transcreverPdfViaOcr(file);
      const textoLimpo = limparRuidoPaginacao(texto);
      const cab = extrairCabecalhoMensagem(textoLimpo);
      if (!cab.dataHora) {
        throw new Error('Não foi possível localizar o código Data-Hora (ID único) da mensagem no documento.');
      }
      setCabecalho(cab);
      setStep('revisao');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao processar o documento.');
      setStep('select');
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmar = async () => {
    if (!cabecalho || !file) return;
    setErro(null);
    setProcessando(true);
    try {
      const fileUrl = await uploadMensagemPdf(concursoId, file);
      await arquivarMensagem(concursoId, cabecalho, fileUrl);
      setStep('concluido');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao arquivar a mensagem.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm uppercase truncate">Registrar Mensagem</h3>
            <p className="text-[11px] text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs md:text-sm text-red-700 font-semibold">{erro}</div>}

          {step === 'select' && (
            <>
              <p className="text-xs md:text-sm text-gray-500">
                Envie o PDF de uma mensagem administrativa referente a este concurso (ex.: solicitação de
                reagendamento, resultado de recurso). Será arquivada com data-hora, remetente e assunto
                identificados automaticamente.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#050F41] transition-colors">
                <span className="material-symbols-outlined text-[32px] text-gray-400">picture_as_pdf</span>
                <span className="text-xs md:text-sm font-bold text-gray-600">{file ? file.name : 'Clique para selecionar o PDF'}</span>
                <span className="text-[10px] md:text-xs text-gray-400">Máx. 15 MB</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="button" disabled={!file || processando} onClick={handleProcessar} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-50">Processar Mensagem</button>
              </div>
            </>
          )}

          {step === 'processando' && (
            <div className="text-center py-8 text-gray-500 space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
              <p className="text-xs md:text-sm font-semibold">Transcrevendo o documento...</p>
            </div>
          )}

          {step === 'revisao' && cabecalho && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs md:text-sm text-blue-800">Confira os dados extraídos antes de arquivar a mensagem.</div>
              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Data-Hora</label>
                <input type="text" value={cabecalho.dataHora} onChange={e => setCabecalho({ ...cabecalho, dataHora: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm font-mono text-[#050F41] focus:outline-none focus:border-[#050F41]" />
              </div>
              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Remetente</label>
                <input type="text" value={cabecalho.sender} onChange={e => setCabecalho({ ...cabecalho, sender: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm text-[#050F41] focus:outline-none focus:border-[#050F41]" />
              </div>
              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Assunto</label>
                <input type="text" value={cabecalho.subject} onChange={e => setCabecalho({ ...cabecalho, subject: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm text-[#050F41] focus:outline-none focus:border-[#050F41]" />
              </div>
              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Tipo</label>
                <select value={cabecalho.purpose || 'Outros'} onChange={e => setCabecalho({ ...cabecalho, purpose: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]">
                  {PROPOSITO_MENSAGEM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="button" disabled={processando} onClick={handleConfirmar} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {processando ? 'Arquivando...' : 'Arquivar Mensagem'}
                </button>
              </div>
            </>
          )}

          {step === 'concluido' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs md:text-sm font-bold text-green-800">Mensagem arquivada com sucesso.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Listar Mensagens" — mensagens arquivadas de um concurso
// -------------------------------------------------------------------------
interface ModalListarMensagensProps {
  concursoId: string;
  concursoNome: string;
  onClose: () => void;
}

const ModalListarMensagens: React.FC<ModalListarMensagensProps> = ({ concursoId, concursoNome, onClose }) => {
  const [mensagens, setMensagens] = useState<MensagemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState<MensagemRecord | null>(null);
  const [textoCopiado, setTextoCopiado] = useState(false);

  const handleCopiarTexto = async () => {
    if (!selecionada?.texto) return;
    try {
      await navigator.clipboard.writeText(selecionada.texto);
      setTextoCopiado(true);
      setTimeout(() => setTextoCopiado(false), 2000);
    } catch {
      // Copiar é um atalho de conveniência — falha silenciosa não impede o uso do modal.
    }
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const lista = await listarMensagens(concursoId);
        if (!cancelado) setMensagens(lista);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [concursoId]);

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            {selecionada && (
              <button onClick={() => setSelecionada(null)} className="p-1 rounded-lg hover:bg-white/10 shrink-0">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
            )}
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-sm uppercase truncate">Mensagens Arquivadas</h3>
              <p className="text-[11px] text-white/70 truncate">{concursoNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {selecionada ? (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-bold text-[#050F41] truncate">{selecionada.subject || 'Sem assunto'}</p>
                  <p className="text-[11px] md:text-sm text-gray-500">{selecionada.sender} — {selecionada.dataHora}</p>
                </div>
                {selecionada.fileUrl && (
                  <a
                    href={selecionada.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-[#079551] hover:bg-[#067a43] text-white rounded-xl text-[11px] md:text-sm font-bold transition-colors shadow-sm flex items-center space-x-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download Mensagem</span>
                  </a>
                )}
              </div>
              {selecionada.texto ? (
                <>
                  <div className="w-full max-h-[60vh] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs md:text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selecionada.texto}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleCopiarTexto}
                      title="Copiar texto da mensagem"
                      className="p-2 rounded-lg text-gray-500 hover:text-[#050F41] hover:bg-gray-100 transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">{textoCopiado ? 'check' : 'content_copy'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs md:text-sm text-gray-400 text-center py-8">Texto da mensagem não disponível.</p>
              )}
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
            </div>
          ) : mensagens.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-gray-300">mail</span>
              <p className="text-sm font-bold text-gray-700">Nenhuma mensagem arquivada</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] md:text-sm font-bold text-[#050F41] uppercase tracking-wider">
                  <th className="py-3 px-4">Data-Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Remetente</th>
                  <th className="py-3 px-4">Assunto</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                {mensagens.map(m => (
                  <tr key={m.id} onClick={() => setSelecionada(m)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-600 whitespace-nowrap">{m.dataHora}</td>
                    <td className="py-3 px-4 text-gray-700 font-semibold whitespace-nowrap">{m.proposito || '-'}</td>
                    <td className="py-3 px-4 text-gray-700 font-semibold">{m.sender || '-'}</td>
                    <td className="py-3 px-4 text-gray-700">{m.subject || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="material-symbols-outlined text-[18px] text-[#050F41]" title="Ver mensagem">
                        visibility
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Definir Período de Agendamento" — gera (ou regenera) o calendário de
// dias úteis de um concurso; necessário para concursos importados via CSV,
// que não têm essa subcoleção e por isso não permitem reagendar candidatos.
// -------------------------------------------------------------------------
interface ModalDefinirPeriodoAgendamentoProps {
  concursoId: string;
  concursoNome: string;
  onClose: (atualizado?: boolean) => void;
}

const ModalDefinirPeriodoAgendamento: React.FC<ModalDefinirPeriodoAgendamentoProps> = ({ concursoId, concursoNome, onClose }) => {
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  const handleConfirmar = async () => {
    if (!periodoInicio || !periodoFim) { setErro('Informe as duas datas do período.'); return; }
    setErro(null);
    setProcessando(true);
    try {
      await definirPeriodoAgendamento(concursoId, parseChaveData(periodoInicio), parseChaveData(periodoFim));
      setConcluido(true);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao definir o período de agendamento.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm uppercase truncate">Definir Período de Agendamento</h3>
            <p className="text-[11px] text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={() => onClose(concluido)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs md:text-sm text-red-700 font-semibold">{erro}</div>}

          {concluido ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs md:text-sm font-bold text-green-800">Período definido com sucesso. O calendário de reagendamento já está liberado.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(true)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs md:text-sm text-gray-500">
                Informe o período das IS deste concurso para gerar os dias úteis disponíveis para reagendamento. Se o
                concurso já tiver um calendário configurado, ele será substituído pelo novo período.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Início</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm focus:outline-none focus:border-[#050F41]" />
                </div>
                <div>
                  <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Fim</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm focus:outline-none focus:border-[#050F41]" />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="button" disabled={processando} onClick={handleConfirmar} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {processando ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Modal "Adicionar Candidato" — inclui manualmente um candidato num
// concurso já Em Andamento ou Em Breve, perguntando a data de agendamento
// dentre as já configuradas (calendário de dias úteis do período).
// -------------------------------------------------------------------------
interface ModalAdicionarCandidatoProps {
  concursoId: string;
  concursoNome: string;
  onClose: (atualizado?: boolean) => void;
}

const ModalAdicionarCandidato: React.FC<ModalAdicionarCandidatoProps> = ({ concursoId, concursoNome, onClose }) => {
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [datas, setDatas] = useState<DataAgendamentoInfo[]>([]);
  const [loadingDatas, setLoadingDatas] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoadingDatas(true);
      try {
        const lista = await listarDatasAgendamento(concursoId);
        if (!cancelado) setDatas(lista);
      } finally {
        if (!cancelado) setLoadingDatas(false);
      }
    })();
    return () => { cancelado = true; };
  }, [concursoId]);

  const handleSalvar = async () => {
    if (!matricula.trim() || !nome.trim()) { setErro('Informe a matrícula e o nome do candidato.'); return; }
    setErro(null);
    setSalvando(true);
    try {
      await criarCandidato(concursoId, matricula.trim(), nome.trim().toUpperCase(), dataAgendamento);
      setConcluido(true);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao adicionar o candidato.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm uppercase truncate">Adicionar Candidato</h3>
            <p className="text-[11px] text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={() => onClose(concluido)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs md:text-sm text-red-700 font-semibold">{erro}</div>}

          {concluido ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs md:text-sm font-bold text-green-800">Candidato "{nome.trim().toUpperCase()}" adicionado com sucesso.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(true)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Matrícula</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ex.: 550039-7"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm font-mono text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>
              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Nome do candidato</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  placeholder="NOME COMPLETO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>
              <div>
                <label className="text-[11px] md:text-sm font-bold text-gray-500 uppercase tracking-wider block mb-1">Data de agendamento</label>
                {loadingDatas ? (
                  <p className="text-xs md:text-sm text-gray-400">Carregando datas...</p>
                ) : datas.length === 0 ? (
                  <p className="text-[11px] md:text-sm text-amber-700">Este concurso ainda não tem datas configuradas — o candidato será adicionado sem agendamento (pode ser agendado depois).</p>
                ) : (
                  <select
                    value={dataAgendamento}
                    onChange={e => setDataAgendamento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs md:text-sm text-[#050F41] focus:outline-none focus:border-[#050F41]"
                  >
                    <option value="">Agendar depois</option>
                    {datas.map(d => (
                      <option key={d.data} value={d.data}>{d.dataFormatada} ({d.diaSemana}) — {d.quantidadeAgendados} agendado(s)</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="button" disabled={salvando} onClick={handleSalvar} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {salvando ? 'Adicionando...' : 'Adicionar Candidato'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------
// Menu de 3 pontos (ações do concurso) exibido em cada card — a lógica de
// construção dos itens é compartilhada com a coluna "Ações" da visão em
// tabela (ver TabelaConcursos), que reaproveita a mesma habilitação mas
// omite por completo os itens desabilitados.
// -------------------------------------------------------------------------
interface ItemMenuAcao {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

interface MenuAcoesConcursoProps {
  status: ConcursoRecord['status'];
  podeAbrirEncerrar: boolean;
  podeGerarMinutaResultados: boolean;
  podeRegistrarMensagemArquivo: boolean;
  podeListarMensagens: boolean;
  podeAdicionarCandidato: boolean;
  podeEncerrar: boolean;
  podeVoltarParaEmBreve: boolean;
  minutaHabilitada: boolean;
  temPeriodoConfigurado: boolean;
  temMensagensRegistradas: boolean;
  onAbrir: () => void;
  onVoltarParaEmBreve: () => void;
  onEncerrar: () => void;
  onMinutaResultados: () => void;
  onRegistrarMensagem: () => void;
  onListarMensagens: () => void;
  onDefinirPeriodoAgendamento: () => void;
  onAdicionarCandidato: () => void;
}

const construirItensMenuConcurso = ({
  status, podeAbrirEncerrar, podeGerarMinutaResultados, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato,
  podeEncerrar, podeVoltarParaEmBreve, minutaHabilitada, temPeriodoConfigurado, temMensagensRegistradas,
  onAbrir, onVoltarParaEmBreve, onEncerrar, onMinutaResultados, onRegistrarMensagem, onListarMensagens, onDefinirPeriodoAgendamento, onAdicionarCandidato,
}: MenuAcoesConcursoProps): ItemMenuAcao[] => {
  const itens: ItemMenuAcao[] = [];
  if (podeAbrirEncerrar && status === 'encerrado') {
    itens.push({ key: 'abrir', label: 'Reabrir Concurso', icon: 'play_circle', onClick: onAbrir });
  }
  // Para "Em Breve" o card já tem um botão próprio ("Abrir Concurso") logo
  // abaixo — o menu de 3 pontos não repete essa ação.
  if (podeAbrirEncerrar && status === 'em_andamento') {
    // Itens sem utilidade no momento (sem lançamento para voltar, ou nem
    // todos finalizados para encerrar) não aparecem — diferente da Minuta
    // Resultados, que continua sendo mostrada desabilitada com o motivo.
    if (podeVoltarParaEmBreve) {
      itens.push({ key: 'em-breve', label: 'Em Breve', icon: 'undo', onClick: onVoltarParaEmBreve });
    }
    if (podeEncerrar) {
      itens.push({ key: 'encerrar', label: 'Encerrar Concurso', icon: 'stop_circle', onClick: onEncerrar });
    }
  }
  // Status "encerrado": o menu mostra apenas Reabrir/Minuta/Listar Mensagens
  // (não é exibir desabilitado — os demais itens nem entram na lista).
  if (podeGerarMinutaResultados && status !== 'em_breve') {
    itens.push({
      key: 'minuta', label: 'Minuta Resultados', icon: 'outgoing_mail', onClick: onMinutaResultados,
      disabled: !minutaHabilitada, title: minutaHabilitada ? undefined : 'Só é possível gerar a minuta quando todos os candidatos estiverem finalizados.',
    });
  }
  // "Editar" (período já configurado) só aparece enquanto o concurso não
  // tiver lançamentos de dados — mudar o período depois disso invalidaria
  // os dados já lançados. "Definir" (primeira vez) não tem essa restrição.
  if (podeAbrirEncerrar && status !== 'encerrado' && (!temPeriodoConfigurado || podeVoltarParaEmBreve)) {
    itens.push({
      key: 'periodo-agendamento',
      label: temPeriodoConfigurado ? 'Editar Período de Agendamento' : 'Definir Período de Agendamento',
      icon: temPeriodoConfigurado ? 'edit_calendar' : 'calendar_add_on', onClick: onDefinirPeriodoAgendamento,
    });
  }
  if (podeAdicionarCandidato && (status === 'em_andamento' || status === 'em_breve')) {
    itens.push({ key: 'adicionar-candidato', label: 'Adicionar Candidato', icon: 'person_add', onClick: onAdicionarCandidato });
  }
  if (podeRegistrarMensagemArquivo && status !== 'encerrado') {
    itens.push({ key: 'registrar-msg', label: 'Registrar Mensagem', icon: 'upload', onClick: onRegistrarMensagem });
  }
  // "Listar Mensagens" não aparece desabilitado: só entra no menu quando já
  // existe pelo menos uma mensagem arquivada para o concurso.
  if (podeListarMensagens && temMensagensRegistradas) {
    itens.push({ key: 'listar-msg', label: 'Listar Mensagens', icon: 'stacked_email', onClick: onListarMensagens });
  }
  return itens;
};

const MenuAcoesConcurso: React.FC<MenuAcoesConcursoProps> = (props) => {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto]);

  const itens = construirItensMenuConcurso(props);

  if (itens.length === 0) return null;

  const abrirMenu = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setAberto(true);
  };

  return (
    <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
      <button ref={btnRef} type="button" onClick={() => (aberto ? setAberto(false) : abrirMenu())} className="p-1 rounded-lg text-gray-400 hover:text-[#050F41] hover:bg-black/5 transition-colors">
        <span className="material-symbols-outlined text-[20px]">more_vert</span>
      </button>
      {aberto && pos && createPortal(
        <>
          {/* Renderizado via portal (fora do card, que tem overflow-hidden para os
              cantos arredondados) e posicionado em "fixed" a partir do botão —
              senão o menu era cortado pela borda do próprio card. */}
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div
            className="fixed w-52 md:w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in space-y-0.5"
            style={{ top: pos.top, right: pos.right }}
          >
            {itens.map(item => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                title={item.title}
                onClick={() => { setAberto(false); item.onClick(); }}
                className="w-full text-left px-3 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span className="material-symbols-outlined text-[16px] md:text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

interface ConcursosListaProps {
  concursos: ConcursoRecord[];
  loading: boolean;
  podeRegistrarMensagem: boolean;
  podeGerarMinutaResultados: boolean;
  podeImportarCsv: boolean;
  podeAbrirEncerrar: boolean;
  podeRegistrarMensagemArquivo: boolean;
  podeListarMensagens: boolean;
  podeAdicionarCandidato: boolean;
  podeVisualizarTabela: boolean;
  onSelecionar: (id: string) => void;
  onNovoConcursoClick: () => void;
  onImportarCsvClick: () => void;
  onRecarregar: () => void;
}

const GRUPOS_STATUS: { status: ConcursoRecord['status']; titulo: string }[] = [
  { status: 'encerrado', titulo: 'Encerrados' },
  { status: 'em_andamento', titulo: 'Em Andamento' },
  { status: 'em_breve', titulo: 'Em Breve' },
];

const ICONE_STATUS_CONCURSO: Record<ConcursoRecord['status'], string> = {
  encerrado: 'select_check_box',
  em_andamento: 'patient_list',
  em_breve: 'event_upcoming',
};

// Cores dos ícones de status na visão em tabela (pedido específico do
// usuário — não seguem o padrão semântico usual de verde/vermelho).
const COR_ICONE_STATUS_CONCURSO: Record<ConcursoRecord['status'], string> = {
  encerrado: 'text-[#079551]',
  em_andamento: 'text-red-700',
  em_breve: 'text-amber-700',
};

// Concursos "Em Breve" ainda não têm movimentação — zero nessas colunas é
// apenas ausência de dado, então a célula fica em branco em vez de "0".
const celulaNumericaTabela = (valor: number, status: ConcursoRecord['status']): React.ReactNode =>
  valor === 0 && status === 'em_breve' ? '' : valor;

const ConcursosLista: React.FC<ConcursosListaProps> = ({ concursos, loading, podeRegistrarMensagem, podeGerarMinutaResultados, podeImportarCsv, podeAbrirEncerrar, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeVisualizarTabela, onSelecionar, onNovoConcursoClick, onImportarCsvClick, onRecarregar }) => {
  const [contadores, setContadores] = useState<Record<string, { total: number; finalizados: number; temLancamento: boolean }>>({});
  const [temMensagens, setTemMensagens] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Set<ConcursoRecord['status']>>(new Set(['em_andamento', 'em_breve']));
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>('cards');
  const [statusCounts, setStatusCounts] = useState<Record<string, { apto: number; inapto: number; faltou: number; idm: number }>>({});
  const [loadingStatusCounts, setLoadingStatusCounts] = useState(false);
  // A visão em tabela é um recurso de desktop — no mobile os cards sempre
  // aparecem, mesmo que o usuário tenha deixado a tabela ativa antes de
  // reduzir a janela/girar o aparelho.
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const efetivoViewMode: 'cards' | 'tabela' = isDesktop && podeVisualizarTabela ? viewMode : 'cards';

  const [estatisticas, setEstatisticas] = useState<EstatisticasAnuais | null>(null);
  const [loadingEstatisticas, setLoadingEstatisticas] = useState(true);
  const [kpiModal, setKpiModal] = useState<{ titulo: string; corBarra: string; itens: EstatisticaConcursoStatus[] } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [minutaResultados, setMinutaResultados] = useState<string | null>(null);
  const [pendentesFinalizacao, setPendentesFinalizacao] = useState<{ id: string; nome: string }[] | null>(null);
  const [gerandoMinuta, setGerandoMinuta] = useState(false);
  const [registrarMensagemAlvo, setRegistrarMensagemAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [listarMensagensAlvo, setListarMensagensAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [periodoAgendamentoAlvo, setPeriodoAgendamentoAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [adicionarCandidatoAlvo, setAdicionarCandidatoAlvo] = useState<{ id: string; nome: string } | null>(null);

  const anoCorrente = new Date().getFullYear();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const entradas = await Promise.all(concursos.map(async c => {
        if (c.status !== 'em_andamento') return [c.id, { total: c.totalCandidatos, finalizados: 0, temLancamento: false }] as const;
        const candidatos = await listarCandidatos(c.id);
        const temLancamento = candidatos.some(x => x.status !== '' || x.numTIS !== '' || x.observacoes !== '');
        return [c.id, { total: candidatos.length, finalizados: candidatos.filter(x => x.finalizado).length, temLancamento }] as const;
      }));
      if (!cancelado) setContadores(Object.fromEntries(entradas));
    })();
    return () => { cancelado = true; };
  }, [concursos]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const entradas = await Promise.all(concursos.map(async c => [c.id, (await listarMensagens(c.id)).length > 0] as const));
      if (!cancelado) setTemMensagens(Object.fromEntries(entradas));
    })();
    return () => { cancelado = true; };
  }, [concursos]);

  // Aptos/Inaptos/IDM/Faltas só são buscados quando a visão em tabela é
  // aberta (a visão em cards não precisa dessa quebra por status).
  useEffect(() => {
    if (efetivoViewMode !== 'tabela') return;
    let cancelado = false;
    (async () => {
      setLoadingStatusCounts(true);
      try {
        const entradas = await Promise.all(concursos.map(async c => {
          const candidatosDoConcurso = await listarCandidatos(c.id);
          return [c.id, {
            apto: candidatosDoConcurso.filter(x => x.status === 'APTO').length,
            inapto: candidatosDoConcurso.filter(x => x.status === 'INAPTO').length,
            faltou: candidatosDoConcurso.filter(x => x.status === 'FALTOU').length,
            idm: candidatosDoConcurso.filter(x => x.status === 'INSUF DOCUMENTAL').length,
          }] as const;
        }));
        if (!cancelado) setStatusCounts(Object.fromEntries(entradas));
      } finally {
        if (!cancelado) setLoadingStatusCounts(false);
      }
    })();
    return () => { cancelado = true; };
  }, [efetivoViewMode, concursos]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoadingEstatisticas(true);
      try {
        const est = await obterEstatisticasAnuais(anoCorrente);
        if (!cancelado) setEstatisticas(est);
      } finally {
        if (!cancelado) setLoadingEstatisticas(false);
      }
    })();
    return () => { cancelado = true; };
  }, [concursos]);

  const handleAbrir = (id: string, nome: string) => {
    setConfirmDialog({
      title: 'Abrir Concurso',
      message: `Deseja abrir o concurso "${nome}" agora? Ele ficará com status "Em Andamento".`,
      confirmLabel: 'Abrir Concurso',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await abrirConcurso(id);
          showToast('Concurso aberto.');
          onRecarregar();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao abrir o concurso.');
        }
      },
    });
  };

  const handleVoltarParaEmBreve = (id: string, nome: string) => {
    setConfirmDialog({
      title: 'Voltar para Em Breve',
      message: `Deseja alterar o concurso "${nome}" para o status "Em Breve"?`,
      confirmLabel: 'Confirmar',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await voltarParaEmBreve(id);
          showToast('Concurso alterado para "Em Breve".');
          onRecarregar();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao alterar o status do concurso.');
        }
      },
    });
  };

  const handleEncerrar = (id: string, nome: string) => {
    setConfirmDialog({
      title: 'Encerrar Concurso',
      message: `Deseja encerrar o concurso "${nome}" agora? Ele ficará com status "Encerrado".`,
      confirmLabel: 'Encerrar Concurso',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await encerrarConcurso(id);
          showToast('Concurso encerrado.');
          onRecarregar();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao encerrar o concurso.');
        }
      },
    });
  };

  const handleMinutaResultados = async (id: string) => {
    setGerandoMinuta(true);
    setMinutaResultados(null);
    setPendentesFinalizacao(null);
    try {
      const resultado = await gerarMinutaResultados(id);
      if ('minuta' in resultado) setMinutaResultados(resultado.minuta);
      else setPendentesFinalizacao(resultado.pendentes);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar a minuta de resultados.');
    } finally {
      setGerandoMinuta(false);
    }
  };

  const handleCopiarTexto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      showToast('Minuta copiada para a área de transferência.');
    } catch {
      showToast('Não foi possível copiar automaticamente.');
    }
  };

  const kpiDefs = estatisticas ? [
    { key: 'finalizadas', label: 'IS Ingresso Finalizadas', value: String(estatisticas.totalFinalizadas), corBorda: 'border-l-[#079551]', corTexto: 'text-[#079551]', corBarra: 'bg-[#079551]', itens: null as EstatisticaConcursoStatus[] | null },
    { key: 'faltas', label: '% de Faltas', value: `${estatisticas.percentualFaltas}%`, corBorda: 'border-l-amber-400', corTexto: 'text-amber-600', corBarra: 'bg-amber-400', itens: estatisticas.topFaltas },
    { key: 'inaptos', label: '% de Inaptos', value: `${estatisticas.percentualInaptos}%`, corBorda: 'border-l-red-500', corTexto: 'text-red-600', corBarra: 'bg-red-500', itens: estatisticas.topInaptos },
    { key: 'idm', label: '% de IDM', value: `${estatisticas.percentualIdm}%`, corBorda: 'border-l-gray-500', corTexto: 'text-gray-600', corBarra: 'bg-gray-500', itens: estatisticas.topIdm },
  ] : [];

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      <Header title="Planilhas de Controle" />

      {toastMessage && (
        <div className="fixed top-20 right-4 z-[100] bg-[#050F41] text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs border border-white/20 animate-fade-in max-w-[90vw]">
          <span className="material-symbols-outlined text-[18px] text-[#079551] shrink-0">check_circle</span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
            <div className="p-4 bg-[#050F41] text-white flex items-center space-x-2">
              <span className="material-symbols-outlined text-[20px] text-[#FAB932]">help</span>
              <h3 className="font-heading font-bold text-sm uppercase">{confirmDialog.title}</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setConfirmDialog(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="button" onClick={confirmDialog.onConfirm} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">{confirmDialog.confirmLabel || 'Confirmar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(minutaResultados !== null || pendentesFinalizacao !== null || gerandoMinuta) && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">summarize</span>
                <h3 className="font-heading font-bold text-sm uppercase">Minuta de Resultados da IS</h3>
              </div>
              <button onClick={() => { setMinutaResultados(null); setPendentesFinalizacao(null); }} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {gerandoMinuta ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
                </div>
              ) : pendentesFinalizacao && pendentesFinalizacao.length > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs md:text-sm font-bold text-amber-800">Ainda há {pendentesFinalizacao.length} candidato(s) não finalizado(s). Finalize todos antes de gerar a minuta de resultados.</p>
                  </div>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {pendentesFinalizacao.map(p => (
                      <div key={p.id} className="p-2.5 text-xs md:text-sm flex items-center justify-between">
                        <span className="font-mono font-bold text-[#050F41]">{p.id}</span>
                        <span className="text-gray-600">{p.nome}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <textarea readOnly value={minutaResultados ?? ''} rows={16} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-[11px] md:text-sm font-mono text-gray-800 focus:outline-none resize-none whitespace-pre-wrap" />
              )}
              <div className="pt-2 flex items-center justify-end space-x-2">
                {minutaResultados && (
                  <button type="button" onClick={() => handleCopiarTexto(minutaResultados)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                )}
                <button type="button" onClick={() => { setMinutaResultados(null); setPendentesFinalizacao(null); }} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {registrarMensagemAlvo && (
        <ModalRegistrarMensagemArquivo
          concursoId={registrarMensagemAlvo.id}
          concursoNome={registrarMensagemAlvo.nome}
          onClose={() => setRegistrarMensagemAlvo(null)}
        />
      )}
      {listarMensagensAlvo && (
        <ModalListarMensagens
          concursoId={listarMensagensAlvo.id}
          concursoNome={listarMensagensAlvo.nome}
          onClose={() => setListarMensagensAlvo(null)}
        />
      )}
      {periodoAgendamentoAlvo && (
        <ModalDefinirPeriodoAgendamento
          concursoId={periodoAgendamentoAlvo.id}
          concursoNome={periodoAgendamentoAlvo.nome}
          onClose={() => setPeriodoAgendamentoAlvo(null)}
        />
      )}
      {adicionarCandidatoAlvo && (
        <ModalAdicionarCandidato
          concursoId={adicionarCandidatoAlvo.id}
          concursoNome={adicionarCandidatoAlvo.nome}
          onClose={atualizado => { setAdicionarCandidatoAlvo(null); if (atualizado) onRecarregar(); }}
        />
      )}
      {kpiModal && (
        <ModalKpiBarChart
          titulo={kpiModal.titulo}
          corBarra={kpiModal.corBarra}
          itens={kpiModal.itens}
          onSelecionarConcurso={onSelecionar}
          onClose={() => setKpiModal(null)}
        />
      )}

      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-[1200px] mx-auto w-full flex-1 space-y-6">
        {!loadingEstatisticas && estatisticas && (
          <div className="hidden md:flex bg-gray-100 border border-gray-200/80 rounded-2xl p-4 gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
              {kpiDefs.map(def => (
                <button
                  key={def.key}
                  type="button"
                  disabled={def.itens === null}
                  onClick={() => def.itens !== null && setKpiModal({ titulo: def.label, corBarra: def.corBarra, itens: def.itens })}
                  className={`text-left bg-white rounded-xl border-l-4 ${def.corBorda} border-t border-r border-b border-gray-200 p-3.5 shadow-sm transition-all ${def.itens !== null ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}
                >
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{def.label}</p>
                  <p className={`text-2xl font-black font-heading mt-1 ${def.corTexto}`}>{def.value}</p>
                </button>
              ))}
            </div>
            {(podeRegistrarMensagem || podeImportarCsv) && (
              <div className="flex md:flex-col gap-2 md:w-44 shrink-0">
                {podeRegistrarMensagem && (
                  <button
                    type="button"
                    onClick={onNovoConcursoClick}
                    className="flex-1 px-4 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center space-x-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>add</span>
                    <span>Concurso</span>
                  </button>
                )}
                {podeImportarCsv && (
                  <button
                    type="button"
                    onClick={onImportarCsvClick}
                    className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-[#050F41] rounded-xl text-xs font-bold transition-colors shadow-sm border border-gray-200 flex items-center justify-center space-x-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 700" }}>arrow_upward</span>
                    <span>CSV</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
            <span className="material-symbols-outlined animate-spin text-[32px] text-[#050F41]">progress_activity</span>
          </div>
        ) : concursos.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl border border-gray-200/60 shadow-sm text-center text-gray-500">
            <span className="material-symbols-outlined text-[36px] text-gray-300">fact_check</span>
            <p className="text-sm font-bold text-gray-700 mt-2">Nenhum concurso cadastrado</p>
            {podeRegistrarMensagem && <p className="text-xs text-gray-400 mt-1">Registre a mensagem administrativa inicial para criar o primeiro.</p>}
          </div>
        ) : (
          <>
            {podeVisualizarTabela && (
              <div className="hidden md:flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setViewMode(v => (v === 'cards' ? 'tabela' : 'cards'))}
                  title={viewMode === 'cards' ? 'Ver em modo tabela' : 'Ver em modo cards'}
                  className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-[#050F41] hover:bg-gray-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{viewMode === 'cards' ? 'table_rows' : 'grid_view'}</span>
                </button>
              </div>
            )}
            {efetivoViewMode === 'tabela' ? (
              <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[860px]">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[13px] font-bold text-[#050F41] uppercase tracking-wider">
                      <th className="py-3 px-4">Concurso</th>
                      <th className="py-3 px-4">Período</th>
                      <th className="py-3 px-4 text-center">Candidatos</th>
                      <th className="py-3 px-4 text-center">Aptos</th>
                      <th className="py-3 px-4 text-center">Inaptos</th>
                      <th className="py-3 px-4 text-center">IDM</th>
                      <th className="py-3 px-4 text-center">Faltas</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                    {GRUPOS_STATUS.map(grupo => {
                      const itensGrupo = concursos
                        .filter(c => c.status === grupo.status)
                        .sort((a, b) => (a.periodoInicioISO || '9999-99-99').localeCompare(b.periodoInicioISO || '9999-99-99'));
                      if (itensGrupo.length === 0) return null;
                      return (
                        <React.Fragment key={grupo.status}>
                          <tr className="bg-gray-100/70">
                            <td colSpan={8} className="py-2 px-4 text-[11px] font-bold text-gray-500 uppercase tracking-wider">{grupo.titulo} ({itensGrupo.length})</td>
                          </tr>
                          {itensGrupo.map(c => {
                            const contagem = contadores[c.id];
                            const podeEncerrar = !!contagem && contagem.total > 0 && contagem.finalizados === contagem.total;
                            const podeVoltarParaEmBreve = !contagem?.temLancamento;
                            const minutaHabilitada = c.status === 'encerrado' || podeEncerrar;
                            const temPeriodoConfigurado = !!c.periodoInicioISO;
                            const temMensagensRegistradas = !!temMensagens[c.id];
                            const sc = statusCounts[c.id];
                            const itensAcoes = construirItensMenuConcurso({
                              status: c.status,
                              podeAbrirEncerrar, podeGerarMinutaResultados, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato,
                              podeEncerrar, podeVoltarParaEmBreve, minutaHabilitada, temPeriodoConfigurado, temMensagensRegistradas,
                              onAbrir: () => handleAbrir(c.id, c.nome),
                              onVoltarParaEmBreve: () => handleVoltarParaEmBreve(c.id, c.nome),
                              onEncerrar: () => handleEncerrar(c.id, c.nome),
                              onMinutaResultados: () => handleMinutaResultados(c.id),
                              onRegistrarMensagem: () => setRegistrarMensagemAlvo({ id: c.id, nome: c.nome }),
                              onListarMensagens: () => setListarMensagensAlvo({ id: c.id, nome: c.nome }),
                              onDefinirPeriodoAgendamento: () => setPeriodoAgendamentoAlvo({ id: c.id, nome: c.nome }),
                              onAdicionarCandidato: () => setAdicionarCandidatoAlvo({ id: c.id, nome: c.nome }),
                            }).filter(item => !item.disabled);
                            return (
                              <tr key={c.id} onClick={() => onSelecionar(c.id)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                <td className="py-3 px-4 font-bold text-[#050F41]">
                                  <span
                                    className={`material-symbols-outlined text-[20px] align-middle mr-1.5 ${COR_ICONE_STATUS_CONCURSO[c.status]}`}
                                    style={{ fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' 200, 'opsz' 24" }}
                                  >
                                    {ICONE_STATUS_CONCURSO[c.status]}
                                  </span>
                                  {c.nome}
                                </td>
                                <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{c.periodoInicioISO ? `${isoParaBR(c.periodoInicioISO)} a ${isoParaBR(c.periodoFimISO)}` : '-'}</td>
                                <td className="py-3 px-4 text-center font-bold text-[#050F41]">{celulaNumericaTabela(c.totalCandidatos, c.status)}</td>
                                <td className="py-3 px-4 text-center font-bold text-[#079551]">{sc ? celulaNumericaTabela(sc.apto, c.status) : (loadingStatusCounts ? '…' : '-')}</td>
                                <td className="py-3 px-4 text-center font-bold text-red-800">{sc ? celulaNumericaTabela(sc.inapto, c.status) : (loadingStatusCounts ? '…' : '-')}</td>
                                <td className="py-3 px-4 text-center font-bold text-[#050F41]">{sc ? celulaNumericaTabela(sc.idm, c.status) : (loadingStatusCounts ? '…' : '-')}</td>
                                <td className="py-3 px-4 text-center font-bold text-[#050F41]">{sc ? celulaNumericaTabela(sc.faltou, c.status) : (loadingStatusCounts ? '…' : '-')}</td>
                                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    {itensAcoes.map(item => (
                                      <button
                                        key={item.key}
                                        type="button"
                                        title={item.label}
                                        onClick={item.onClick}
                                        className="p-1.5 rounded-lg text-gray-600 hover:text-[#050F41] hover:bg-black/5 transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'wght' 600" }}>{item.icon}</span>
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              GRUPOS_STATUS.map(grupo => {
            const itens = concursos
              .filter(c => c.status === grupo.status)
              .sort((a, b) => (a.periodoInicioISO || '9999-99-99').localeCompare(b.periodoInicioISO || '9999-99-99'));
            if (itens.length === 0) return null;
            const expandido = openGroups.has(grupo.status);
            return (
              <div key={grupo.status}>
                <button
                  type="button"
                  onClick={() => setOpenGroups(new Set([grupo.status]))}
                  className="w-full flex items-center justify-between mb-2 py-1 group"
                >
                  <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{grupo.titulo} ({itens.length})</h2>
                  <span className={`material-symbols-outlined text-[22px] text-gray-400 group-hover:text-[#050F41] transition-transform ${expandido ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {expandido && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {itens.map(c => {
                      const contagem = contadores[c.id];
                      const pct = contagem && contagem.total > 0 ? Math.round((contagem.finalizados / contagem.total) * 100) : null;
                      const podeEncerrar = !!contagem && contagem.total > 0 && contagem.finalizados === contagem.total;
                      const podeVoltarParaEmBreve = !contagem?.temLancamento;
                      const minutaHabilitada = c.status === 'encerrado' || podeEncerrar;
                      const temPeriodoConfigurado = !!c.periodoInicioISO;
                      const temMensagensRegistradas = !!temMensagens[c.id];
                      return (
                        <div key={c.id} className={`rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col ${getConcursoCardBg(c.status)}`}>
                          <div className="flex items-stretch flex-1">
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => onSelecionar(c.id)}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelecionar(c.id); }}
                              className="text-left p-4 flex-1 min-w-0 hover:bg-black/[0.03] transition-colors cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-heading font-bold text-lg text-[#050F41] truncate">{c.nome}</h3>
                                <MenuAcoesConcurso
                                  status={c.status}
                                  podeAbrirEncerrar={podeAbrirEncerrar}
                                  podeGerarMinutaResultados={podeGerarMinutaResultados}
                                  podeRegistrarMensagemArquivo={podeRegistrarMensagemArquivo}
                                  podeListarMensagens={podeListarMensagens}
                                  podeAdicionarCandidato={podeAdicionarCandidato}
                                  podeEncerrar={podeEncerrar}
                                  podeVoltarParaEmBreve={podeVoltarParaEmBreve}
                                  minutaHabilitada={minutaHabilitada}
                                  temPeriodoConfigurado={temPeriodoConfigurado}
                                  temMensagensRegistradas={temMensagensRegistradas}
                                  onAbrir={() => handleAbrir(c.id, c.nome)}
                                  onVoltarParaEmBreve={() => handleVoltarParaEmBreve(c.id, c.nome)}
                                  onEncerrar={() => handleEncerrar(c.id, c.nome)}
                                  onMinutaResultados={() => handleMinutaResultados(c.id)}
                                  onRegistrarMensagem={() => setRegistrarMensagemAlvo({ id: c.id, nome: c.nome })}
                                  onListarMensagens={() => setListarMensagensAlvo({ id: c.id, nome: c.nome })}
                                  onDefinirPeriodoAgendamento={() => setPeriodoAgendamentoAlvo({ id: c.id, nome: c.nome })}
                                  onAdicionarCandidato={() => setAdicionarCandidatoAlvo({ id: c.id, nome: c.nome })}
                                />
                              </div>
                              <p className="text-base font-bold text-[#050F41]">{c.totalCandidatos} candidato(s)</p>
                              {c.periodoInicioISO && (
                                <p className="text-sm text-gray-500">{isoParaBR(c.periodoInicioISO)} a {isoParaBR(c.periodoFimISO)}</p>
                              )}
                            </div>
                            {c.status === 'em_andamento' && pct !== null && (
                              <div className="flex items-center justify-center pr-4 pl-1 shrink-0">
                                <CircularMini pct={pct} />
                              </div>
                            )}
                          </div>
                          {podeAbrirEncerrar && c.status === 'em_breve' && (
                            <button
                              type="button"
                              onClick={() => handleAbrir(c.id, c.nome)}
                              className="px-4 py-2.5 border-t border-black/5 text-xs font-bold text-[#079551] hover:bg-black/[0.03] transition-colors flex items-center justify-center space-x-1.5"
                            >
                              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>play_circle</span>
                              <span>Abrir Concurso</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
            )}
          </>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// DETALHE DO CONCURSO (tabela de candidatos)
// =========================================================================

interface ConcursoDetalheProps {
  concursoId: string;
  onVoltar: () => void;
}

const ConcursoDetalhe: React.FC<ConcursoDetalheProps> = ({ concursoId, onVoltar }) => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeEditarInlineBase = canUseFeature('concursosJRS.editarDadosTabela', perfil);
  const podeReagendarBase = canUseFeature('concursosJRS.reagendar', perfil);
  const podeAbrirEncerrar = canUseFeature('concursosJRS.abrirEncerrarConcurso', perfil);
  const [showDefinirPeriodoModal, setShowDefinirPeriodoModal] = useState(false);

  const [concurso, setConcurso] = useState<ConcursoRecord | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [statusKpiFilter, setStatusKpiFilter] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'todos' | 'hoje' | 'semana' | 'personalizado'>('todos');
  const [dateFilterCustom, setDateFilterCustom] = useState<string | null>(null);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showDateCalendar, setShowDateCalendar] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const [datasAgendamento, setDatasAgendamento] = useState<DataAgendamentoInfo[]>([]);
  const [loadingDatasAgendamento, setLoadingDatasAgendamento] = useState(false);

  const [reagendandoCandidato, setReagendandoCandidato] = useState<CandidatoRecord | null>(null);
  const [confirmandoReagendamento, setConfirmandoReagendamento] = useState(false);
  // Mobile: célula de Observações abre um modal ampliado (ler/editar) em vez
  // do input inline usado no desktop.
  const [observacaoModalCandidato, setObservacaoModalCandidato] = useState<CandidatoRecord | null>(null);
  // Mobile: botão de voltar flutuante sobre a tabela ao rolar + botão de
  // voltar ao topo (ver JSX mais abaixo).
  const isDesktop = useIsDesktop();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => setMostrarBotaoTopo(el.scrollTop > 300);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const podeEditar = podeEditarInlineBase && concurso?.status === 'em_andamento';
  const podeReagendar = podeReagendarBase && concurso?.status === 'em_andamento';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const carregarTudo = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [c, lista] = await Promise.all([getConcurso(concursoId), listarCandidatos(concursoId)]);
      setConcurso(c);
      setCandidatos(lista);
    } catch (e: any) {
      setLoadError(e?.message || 'Não foi possível carregar os candidatos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarTudo(); }, [concursoId]);

  const loadDatasAgendamento = async () => {
    setLoadingDatasAgendamento(true);
    try {
      setDatasAgendamento(await listarDatasAgendamento(concursoId));
    } catch (e: any) {
      showToast(e?.message || 'Erro ao carregar as datas de agendamento.');
    } finally {
      setLoadingDatasAgendamento(false);
    }
  };

  const salvarCampoCandidato = async (candidato: CandidatoRecord, patch: { status?: string; observacoes?: string; numTIS?: string }) => {
    try {
      const atualizado = await atualizarCandidato(concursoId, candidato.id, patch);
      setCandidatos(prev => prev.map(c => (c.id === atualizado.id ? atualizado : c)));
      return atualizado;
    } catch (e: any) {
      showToast(e?.message || 'Erro ao salvar alterações.');
      return null;
    }
  };

  const handleGerarTermo = async (id: string, nome: string) => {
    try {
      const candidato = candidatos.find(c => c.id === id);
      const res = await fetch(GAS_URL_TERMO_RECURSO, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'gerarTermoRecurso', candidato: nome, dataLaudo: candidato?.dataLaudo || '' }),
      });
      const json = await res.json();
      if (!json.sucesso) throw new Error(json.erro || 'Erro ao gerar o Termo de Recurso.');

      const url = await uploadTermoRecursoPdf(concursoId, id, json.dados.pdfBase64);
      await salvarTermoRecurso(concursoId, id, url);
      setCandidatos(prev => prev.map(c => (c.id === id ? { ...c, recurso: true, termoRecursoUrl: url } : c)));
      showToast(`Termo de Recurso gerado para ${nome}.`);
      window.open(url, '_blank');
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar o Termo de Recurso.');
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
              onConfirm: () => { setConfirmDialog(null); handleGerarTermo(atualizado.id, atualizado.nome); },
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
          const atualizado = await reagendarCandidato(concursoId, candidato.id, dataISO);
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

  const handleCopiarNomeCandidato = async (nome: string) => {
    try {
      await navigator.clipboard.writeText(nome);
      showToast(`Nome "${nome}" copiado para a área de transferência.`);
    } catch {
      showToast('Não foi possível copiar automaticamente. Selecione e copie o nome manualmente.');
    }
  };

  const toggleStatusKpiFilter = (status: string) => setStatusKpiFilter(prev => (prev === status ? '' : status));

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

  const candidatosComDataBR = useMemo(() => candidatos.map(c => ({
    ...c,
    dataAgendamentoBR: c.dataAgendamento ? isoParaBR(c.dataAgendamento) : '',
  })), [candidatos]);

  const filteredCandidatos = useMemo(() => {
    return candidatosComDataBR
      .filter(c => {
        const matchesSearch = c.id.toLowerCase().includes(search.toLowerCase()) || c.nome.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        if (statusKpiFilter === 'nao-finalizados') {
          if (!(c.status === '' || c.status === 'Pendente' || c.status === 'Reagendado')) return false;
        } else if (statusKpiFilter && c.status !== statusKpiFilter) {
          return false;
        }

        if (dateFilterMode === 'hoje') {
          if (c.dataAgendamentoBR !== hojeBR) return false;
        } else if (dateFilterMode === 'semana') {
          const data = parseDataBR(c.dataAgendamentoBR);
          if (!data || data < inicioSemana || data > fimSemana) return false;
        } else if (dateFilterMode === 'personalizado' && dateFilterCustom) {
          if (c.dataAgendamento !== dateFilterCustom) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const da = a.dataAgendamento || '9999';
        const db = b.dataAgendamento || '9999';
        if (da !== db) return da.localeCompare(db);
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
  }, [candidatosComDataBR, search, statusKpiFilter, dateFilterMode, dateFilterCustom, hojeBR]);

  const total = candidatos.length;
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

  const chipFilters: { key: string; label: string; value: number; filterValue: string; corAtivo: string }[] = [
    { key: 'apto', label: 'Aptos', value: countApto, filterValue: 'APTO', corAtivo: 'bg-[#079551] border-[#079551] text-white' },
    { key: 'inapto', label: 'Inaptos', value: countInapto, filterValue: 'INAPTO', corAtivo: 'bg-red-600 border-red-600 text-white' },
    { key: 'insuf', label: 'IDM', value: countInsuf, filterValue: 'INSUF DOCUMENTAL', corAtivo: 'bg-purple-600 border-purple-600 text-white' },
    { key: 'faltou', label: 'Faltas', value: countFaltou, filterValue: 'FALTOU', corAtivo: 'bg-amber-500 border-amber-500 text-white' },
    { key: 'nao-finalizados', label: 'Não Finalizados', value: countNaoFinalizados, filterValue: 'nao-finalizados', corAtivo: 'bg-blue-600 border-blue-600 text-white' },
  ];

  const sugestoesCandidatos = useMemo(() => {
    if (!search.trim()) return [];
    const termo = search.toLowerCase();
    return candidatos
      .filter(c => c.nome.toLowerCase().includes(termo) || c.id.toLowerCase().includes(termo))
      .slice(0, 6);
  }, [candidatos, search]);

  const gruposPorData = useMemo(() => {
    const grupos: { dataBR: string; itens: typeof filteredCandidatos }[] = [];
    filteredCandidatos.forEach(c => {
      const label = c.dataAgendamentoBR || 'Sem data';
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dataBR === label) ultimo.itens.push(c);
      else grupos.push({ dataBR: label, itens: [c] });
    });
    return grupos;
  }, [filteredCandidatos]);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      {/* No mobile o botão de voltar da topbar (sticky, flutua sobre a
          tabela ao rolar) assume essa função; no desktop o botão próprio
          desta página (dentro do título) continua como estava. */}
      <Header title={concurso?.nome || 'Planilhas de Controle'} desktopTitle={concurso?.nome} onBack={!isDesktop ? onVoltar : undefined} />

      {toastMessage && (
        <div className="fixed top-20 right-4 z-[100] bg-[#050F41] text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 text-xs border border-white/20 animate-fade-in max-w-[90vw]">
          <span className="material-symbols-outlined text-[18px] text-[#079551] shrink-0">check_circle</span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
            <div className="p-4 bg-[#050F41] text-white flex items-center space-x-2">
              <span className="material-symbols-outlined text-[20px] text-[#FAB932]">help</span>
              <h3 className="font-heading font-bold text-sm uppercase">{confirmDialog.title}</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs md:text-sm text-gray-700 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setConfirmDialog(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs md:text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="button" onClick={confirmDialog.onConfirm} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm">{confirmDialog.confirmLabel || 'Confirmar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isDesktop && mostrarBotaoTopo && (
        <button
          type="button"
          onClick={() => scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          className="md:hidden fixed bottom-6 right-4 z-[90] w-11 h-11 rounded-full bg-[#050F41] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_upward</span>
        </button>
      )}

      <div ref={scrollContainerRef} className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-[1600px] mx-auto w-full flex-1 space-y-4">
        <div className="relative flex flex-col items-center gap-1.5 min-h-[40px] md:flex-row md:justify-center md:gap-0 px-2 md:px-16">
          {/* Desktop: botão de voltar próprio desta página (some no mobile
              — lá quem flutua sobre a tabela é o botão sticky do Header). */}
          <button
            type="button"
            onClick={onVoltar}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 shrink-0 items-center justify-center w-9 h-9 rounded-full bg-white text-[#050F41] shadow-sm border border-gray-200/70 hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Voltar"
            title="Voltar"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          {/* Mobile: nome e contagem em linhas separadas (sem o hífen, que
              estourava sem espaço) e chip de status centralizado abaixo. */}
          <h1 className="md:hidden font-heading font-bold text-xl text-[#050F41] text-center truncate w-full px-10">
            {concurso?.nome || 'Concurso'}<br />
            {total} Candidato{total === 1 ? '' : 's'}
          </h1>
          {concurso && (
            <span className={`md:hidden shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getConcursoStatusClasses(concurso.status)}`}>
              {STATUS_LABELS[concurso.status]}
            </span>
          )}
          {/* Desktop: layout original, em uma linha só com o chip à direita. */}
          <h1 className="hidden md:block font-heading font-bold text-xl sm:text-2xl text-[#050F41] text-center truncate">
            {concurso?.nome || 'Concurso'} <span className="text-gray-400 font-semibold">-</span> {total} Candidato{total === 1 ? '' : 's'}
          </h1>
          {concurso && (
            <span className={`hidden md:inline-block absolute right-0 top-1/2 -translate-y-1/2 shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getConcursoStatusClasses(concurso.status)}`}>
              {STATUS_LABELS[concurso.status]}
            </span>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 flex-wrap">
          <div className="relative lg:flex-1 lg:max-w-md min-w-[220px]">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-[24px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
              placeholder="Buscar por matrícula ou nome..."
              autoComplete="off"
              className="w-full pl-12 pr-10 py-3.5 text-base font-body rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#050F41] transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
            {mostrarSugestoes && sugestoesCandidatos.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fade-in max-h-64 overflow-y-auto">
                {sugestoesCandidatos.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => { setSearch(c.nome); setMostrarSugestoes(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-semibold text-gray-800 truncate">{c.nome}</span>
                    <span className="text-xs font-mono text-gray-400 shrink-0">{c.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:flex-1">
            {chipFilters.map(chip => {
              const isActive = statusKpiFilter === chip.filterValue;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => toggleStatusKpiFilter(chip.filterValue)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition-all flex items-center gap-2 ${isActive ? chip.corAtivo : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                >
                  <span>{chip.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isActive ? 'bg-white/25' : 'bg-gray-100'}`}>{chip.value}</span>
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0 md:w-56">
            <button
              type="button"
              onClick={() => setShowDateMenu(prev => !prev)}
              className={`w-full px-4 py-3.5 text-sm font-bold rounded-xl border flex items-center justify-center space-x-2 whitespace-nowrap ${dateFilterMode !== 'todos' ? 'bg-[#050F41] text-white border-[#050F41]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
            >
              <span className="material-symbols-outlined text-[20px]">event</span>
              <span>{dateFilterLabel}</span>
            </button>
            {showDateMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDateMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in space-y-0.5">
                  <button type="button" onClick={() => { setDateFilterMode('todos'); setDateFilterCustom(null); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">Todos</button>
                  <button type="button" onClick={() => { setDateFilterMode('hoje'); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">Hoje</button>
                  <button type="button" onClick={() => { setDateFilterMode('semana'); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">Esta Semana</button>
                  <button type="button" onClick={() => { setShowDateMenu(false); setShowDateCalendar(true); loadDatasAgendamento(); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">Personalizado...</button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>

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
                  onSelect={(dataISO) => { setDateFilterMode('personalizado'); setDateFilterCustom(dataISO); setShowDateCalendar(false); }}
                />
              </div>
            </div>
          </div>
        )}

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
              <button type="button" onClick={carregarTudo} className="mt-2 px-4 py-2 bg-[#050F41] text-white rounded-xl text-xs font-bold">Tentar novamente</button>
            </div>
          ) : filteredCandidatos.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-gray-300">person_off</span>
              <p className="text-sm font-bold text-gray-700">Nenhum candidato encontrado</p>
              <p className="text-xs text-gray-400">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto pb-2">
                <table className="w-full min-w-[780px] text-left border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '3%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100 text-[15px] font-bold text-[#050F41] uppercase tracking-wider">
                      <th className="py-3.5 px-4" colSpan={2}>Candidato</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Observações</th>
                      <th className="py-3.5 px-4">Nº TIS</th>
                      <th className="py-3.5 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[14px]">
                    {gruposPorData.map(grupo => (
                      <React.Fragment key={grupo.dataBR}>
                        <tr className="bg-gray-50/60">
                          <td colSpan={6} className="py-2 px-4 text-sm font-bold text-[#050F41] uppercase tracking-wider">{grupo.dataBR}</td>
                        </tr>
                        {grupo.itens.map(c => (
                          <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-3.5 pl-4 pr-0 w-8">
                              {c.finalizado && (
                                <span className="material-symbols-outlined text-[20px] text-[#079551]" style={{ fontVariationSettings: "'FILL' 1" }} title="Finalizado">check_circle</span>
                              )}
                            </td>
                            <td className="py-3.5 pl-2 pr-4 cursor-pointer" onClick={() => handleCopiarNomeCandidato(c.nome)} title="Clique para copiar o nome do candidato">
                              <p className="font-semibold text-gray-800">{c.nome}</p>
                              <p className="text-[12px] font-mono text-gray-400">{c.id}</p>
                            </td>
                            <td className="py-3.5 px-4">
                              {podeEditar ? (
                                <select value={c.status || ''} onChange={e => handleStatusChange(c, e.target.value)} className={`px-2 py-1.5 text-[13px] font-bold rounded-lg border focus:outline-none focus:border-[#050F41] cursor-pointer ${getStatusSelectClasses(c.status)}`}>
                                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              ) : getStatusBadge(c.status)}
                            </td>
                            <td className="py-3.5 px-4 text-gray-600">
                              {/* Desktop: input inline, como sempre foi. */}
                              <div className="hidden md:block">
                                {podeEditar ? (
                                  <input type="text" defaultValue={c.observacoes} onBlur={e => handleCampoBlur(c, 'observacoes', e.target.value)} className="w-full px-2 py-1.5 text-[13px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#050F41] focus:bg-white" placeholder="-" />
                                ) : <span className="truncate block" title={c.observacoes}>{c.observacoes || '-'}</span>}
                              </div>
                              {/* Mobile: abre um modal ampliado para ler/editar. */}
                              <button
                                type="button"
                                onClick={() => setObservacaoModalCandidato(c)}
                                className="md:hidden w-full text-left truncate text-[13px] text-gray-600 underline decoration-dotted underline-offset-2"
                              >
                                {c.observacoes || '-'}
                              </button>
                            </td>
                            <td className="py-3.5 px-4 text-gray-600">
                              {podeEditar ? (
                                <input type="text" defaultValue={c.numTIS} onBlur={e => handleCampoBlur(c, 'numTIS', e.target.value)} className="w-full px-2 py-1.5 text-[13px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#050F41] focus:bg-white" placeholder="-" />
                              ) : (c.numTIS || '-')}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {c.termoRecursoUrl ? (
                                <a href={c.termoRecursoUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-[#050F41] bg-gray-100 hover:bg-[#050F41] hover:text-white rounded-xl transition-colors cursor-pointer inline-flex" title="Abrir Termo de Recurso">
                                  <span className="material-symbols-outlined text-[22px]">description</span>
                                </a>
                              ) : c.status === 'INAPTO' ? (
                                <button type="button" onClick={() => handleGerarTermo(c.id, c.nome)} className="p-2 text-[#050F41] bg-gray-100 hover:bg-[#050F41] hover:text-white rounded-xl transition-colors cursor-pointer" title="Gerar Termo de Recurso">
                                  <span className="material-symbols-outlined text-[22px]">gavel</span>
                                </button>
                              ) : null}

                              {podeReagendar && !c.finalizado && (
                                <button type="button" onClick={() => handleOpenReagendamento(c)} className="p-2 ml-1 text-[#079551] bg-green-50 hover:bg-[#079551] hover:text-white rounded-xl transition-colors cursor-pointer" title="Reagendar">
                                  <span className="material-symbols-outlined text-[22px]">event_repeat</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {reagendandoCandidato && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-[#079551] shrink-0">event_repeat</span>
                <h3 className="font-heading font-bold text-sm uppercase truncate">Reagendar {reagendandoCandidato.nome}</h3>
              </div>
              <button onClick={() => setReagendandoCandidato(null)} disabled={confirmandoReagendamento} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4">
              {!loadingDatasAgendamento && datasAgendamento.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-xs md:text-sm text-gray-500">
                    Este concurso ainda não tem um período de IS configurado, por isso não há datas disponíveis para reagendamento.
                  </p>
                  {podeAbrirEncerrar ? (
                    <button
                      type="button"
                      onClick={() => setShowDefinirPeriodoModal(true)}
                      className="px-4 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs md:text-sm font-bold transition-colors shadow-sm inline-flex items-center space-x-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">event</span>
                      <span>Definir Período de Agendamento</span>
                    </button>
                  ) : (
                    <p className="text-[11px] md:text-sm text-gray-400">Peça a um Admin para configurar o período deste concurso.</p>
                  )}
                </div>
              ) : (
                <CalendarioAgendamento datas={datasAgendamento} loading={loadingDatasAgendamento || confirmandoReagendamento} onSelect={handleSelecionarDataReagendamento} />
              )}
            </div>
          </div>
        </div>
      )}

      {showDefinirPeriodoModal && (
        <ModalDefinirPeriodoAgendamento
          concursoId={concursoId}
          concursoNome={concurso?.nome || ''}
          onClose={atualizado => {
            setShowDefinirPeriodoModal(false);
            if (atualizado) {
              loadDatasAgendamento();
              carregarTudo();
            }
          }}
        />
      )}

      {/* Mobile: modal ampliado para ler/editar a célula Observações
          (no desktop a edição continua inline na própria tabela). */}
      {observacaoModalCandidato && (
        <div className="md:hidden fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-sm uppercase truncate">Observações</h3>
                <p className="text-[11px] text-white/70 truncate">{observacaoModalCandidato.nome}</p>
              </div>
              <button onClick={() => setObservacaoModalCandidato(null)} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {podeEditar ? (
                <textarea
                  defaultValue={observacaoModalCandidato.observacoes}
                  onBlur={e => handleCampoBlur(observacaoModalCandidato, 'observacoes', e.target.value)}
                  rows={6}
                  placeholder="Sem observações."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-700 focus:outline-none focus:border-[#050F41] resize-none"
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{observacaoModalCandidato.observacoes || 'Sem observações.'}</p>
              )}
              <div className="flex items-center justify-end">
                <button type="button" onClick={() => setObservacaoModalCandidato(null)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// =========================================================================
// COMPONENTE PRINCIPAL — alterna entre a lista de concursos e o detalhe
// =========================================================================

export const ConcursosJRS: React.FC = () => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const isAdmin = perfil === 'admin';
  const podeRegistrarMensagem = canUseFeature('concursosJRS.registrarMensagemPDF', perfil);
  const podeGerarMinutaResultados = canUseFeature('concursosJRS.gerarMinutaResultados', perfil);
  const podeImportarCsv = canUseFeature('concursosJRS.importarCsv', perfil);
  const podeAbrirEncerrar = canUseFeature('concursosJRS.abrirEncerrarConcurso', perfil);
  const podeRegistrarMensagemArquivo = canUseFeature('concursosJRS.registrarMensagemArquivo', perfil);
  const podeListarMensagens = canUseFeature('concursosJRS.listarMensagens', perfil);
  const podeAdicionarCandidato = canUseFeature('concursosJRS.adicionarCandidato', perfil);
  const podeVisualizarTabela = canUseFeature('concursosJRS.visualizarTabela', perfil);

  const [concursos, setConcursos] = useState<ConcursoRecord[]>([]);
  const [loadingConcursos, setLoadingConcursos] = useState(true);
  const [selectedConcursoId, setSelectedConcursoId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImportarCsvModal, setShowImportarCsvModal] = useState(false);

  const carregarConcursos = async () => {
    setLoadingConcursos(true);
    try {
      setConcursos(await listarConcursos());
    } finally {
      setLoadingConcursos(false);
    }
  };

  useEffect(() => { carregarConcursos(); }, []);

  const handleFecharModalUpload = (concursoIdCriado?: string) => {
    setShowUploadModal(false);
    carregarConcursos();
    if (concursoIdCriado) setSelectedConcursoId(concursoIdCriado);
  };

  const handleFecharModalImportarCsv = (concursoIdCriado?: string) => {
    setShowImportarCsvModal(false);
    carregarConcursos();
    if (concursoIdCriado) setSelectedConcursoId(concursoIdCriado);
  };

  if (selectedConcursoId) {
    return (
      <ConcursoDetalhe
        concursoId={selectedConcursoId}
        onVoltar={() => { setSelectedConcursoId(null); carregarConcursos(); }}
      />
    );
  }

  return (
    <>
      <ConcursosLista
        concursos={concursos}
        loading={loadingConcursos}
        podeRegistrarMensagem={podeRegistrarMensagem}
        podeGerarMinutaResultados={podeGerarMinutaResultados}
        podeImportarCsv={podeImportarCsv}
        podeAbrirEncerrar={podeAbrirEncerrar}
        podeRegistrarMensagemArquivo={podeRegistrarMensagemArquivo}
        podeListarMensagens={podeListarMensagens}
        podeAdicionarCandidato={podeAdicionarCandidato}
        podeVisualizarTabela={podeVisualizarTabela}
        onSelecionar={setSelectedConcursoId}
        onNovoConcursoClick={() => setShowUploadModal(true)}
        onImportarCsvClick={() => setShowImportarCsvModal(true)}
        onRecarregar={carregarConcursos}
      />
      {showUploadModal && <ModalRegistrarMensagem onClose={handleFecharModalUpload} isAdmin={isAdmin} />}
      {showImportarCsvModal && <ModalImportarCsv onClose={handleFecharModalImportarCsv} />}
    </>
  );
};
