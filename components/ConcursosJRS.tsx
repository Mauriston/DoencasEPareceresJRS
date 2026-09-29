import React, { useEffect, useMemo, useState } from 'react';
import { Header } from './Header';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import {
  listarConcursos, getConcurso, listarCandidatos, criarConcursoDaMensagem, importarConcursoDeCsv, atualizarCandidato,
  reagendarCandidato, listarDatasAgendamento, obterContextoAgendamento, confirmarAgendamento,
  gerarMinutaResultados, abrirConcurso, encerrarConcurso, salvarTermoRecurso,
  STATUS_LABELS,
  type ConcursoRecord, type CandidatoRecord, type DataAgendamentoInfo,
} from '../services/firestoreConcursos';
import { uploadMensagemPdf, uploadTermoRecursoPdf } from '../services/firebaseStorageConcursos';
import {
  limparRuidoPaginacao, extrairCabecalhoMensagem, extrairCandidatos, extrairPeriodoJRS,
  extrairNomeConcurso, formatarChaveData, parseChaveData, interpretarCsvCandidatosDataBase,
  type CabecalhoMensagem, type CandidatoBasico, type CandidatoImportadoCsv,
} from '../utils/concursosUtils';

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
        <span className="text-xs font-bold text-[#050F41] uppercase">
          {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
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
            return <div key={i} className="aspect-square flex items-center justify-center text-[11px] text-gray-300 rounded-lg">{dia}</div>;
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

      {datas.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhuma data de agendamento configurada.</p>}
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
      const fileBase64 = await fileParaBase64(file);
      const res = await fetch('/api/concursos/ocr-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, mimeType: file.type || 'application/pdf' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erro ao transcrever o documento.');

      const textoLimpo = limparRuidoPaginacao(json.texto || '');
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
      const { concursoId: novoId } = await criarConcursoDaMensagem({
        nome: nomeConcurso.trim(),
        cabecalho,
        candidatos: candidatosValidos,
        periodo,
        fileUrl: '',
      });
      setConcursoId(novoId);
      uploadMensagemPdf(novoId, file!).catch(() => {});

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
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-semibold">{erro}</div>
          )}

          {step === 'select' && (
            <>
              <p className="text-xs text-gray-500">
                Envie o PDF (ou fotografe/escaneie) da mensagem administrativa inicial de apresentação dos candidatos.
                O texto será transcrito por IA, os candidatos e o período de agendamento identificados automaticamente
                — você poderá revisar e corrigir tudo antes de criar o concurso.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#050F41] transition-colors">
                <span className="material-symbols-outlined text-[32px] text-gray-400">picture_as_pdf</span>
                <span className="text-xs font-bold text-gray-600">{file ? file.name : 'Clique para selecionar o PDF ou escanear um documento'}</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={!file || processando}
                  onClick={handleProcessar}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1 disabled:opacity-50"
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
              <p className="text-xs font-semibold">Transcrevendo o documento e identificando os candidatos...</p>
            </div>
          )}

          {step === 'revisao' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                Confira e corrija os dados extraídos antes de criar o concurso — a matrícula de cada candidato precisa estar correta.
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Período JRS — início</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#050F41]" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Período JRS — fim</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#050F41]" />
                </div>
              </div>
              {!periodoInicio && (
                <p className="text-[11px] text-amber-700">Período não identificado automaticamente — informe manualmente para já configurar o agendamento, ou deixe em branco para agendar depois.</p>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Candidatos ({candidatos.length})</label>
                  <button type="button" onClick={adicionarCandidatoEditavel} className="text-[11px] font-bold text-[#050F41] flex items-center space-x-1">
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
                  {candidatos.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhum candidato identificado.</p>}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando}
                  onClick={handleConfirmarCriacao}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Criando concurso...' : 'Confirmar e Criar Concurso'}
                </button>
              </div>
            </>
          )}

          {step === 'agendamento' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-gray-700">
                <span className="font-bold">Candidatos a agendar:</span> {totalPendentes}
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Quantidade de IS por dia</label>
                <input
                  type="number"
                  min={1}
                  value={quantidadePorDia}
                  onChange={e => setQuantidadePorDia(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Datas disponíveis (marque as que serão usadas)</label>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {datasDisponiveis.map(d => (
                    <label key={d.data} className="flex items-center gap-2 p-2 text-xs cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={datasSelecionadas.has(d.data)} onChange={() => toggleData(d.data)} className="accent-[#050F41]" />
                      <span className="font-bold text-[#050F41]">{d.dataFormatada}</span>
                      <span className="text-gray-500">({d.diaSemana})</span>
                    </label>
                  ))}
                  {datasDisponiveis.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nenhuma data útil no período informado.</p>}
                </div>
              </div>

              <div className={`rounded-xl p-3 text-xs font-bold ${agendamentoViavel ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                {quantidadeCoberta} / {totalPendentes} candidatos cobertos com {datasSelecionadas.size} data(s) × {quantidadePorDia || 0} por dia
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Agendar Depois</button>
                <button
                  type="button"
                  disabled={!agendamentoViavel || processando}
                  onClick={handleConfirmarAgendamento}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Confirmando...' : 'Confirmar Agendamento e Gerar Minuta'}
                </button>
              </div>
            </>
          )}

          {step === 'concluido' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs font-bold text-green-800">
                  Concurso "{nomeConcurso}" criado com sucesso{semPeriodo ? '.' : ' e agendamento confirmado.'}
                </p>
              </div>
              {minuta && (
                <>
                  <textarea readOnly value={minuta} rows={12} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-[11px] font-mono text-gray-800 focus:outline-none resize-none whitespace-pre-wrap" />
                  <button type="button" onClick={() => handleCopiarTexto(minuta)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                </>
              )}
              {!isAdmin && (
                <p className="text-[11px] text-gray-500">O concurso ficará com status "Em Breve" até um Admin abri-lo.</p>
              )}
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm">Concluir</button>
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
    setErro(null);
    setProcessando(true);
    try {
      const { concursoId } = await importarConcursoDeCsv(nomeConcurso.trim(), status, candidatos);
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
          {erro && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 font-semibold">{erro}</div>}

          {concursoIdCriado ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs font-bold text-green-800">Concurso "{nomeConcurso}" importado com sucesso ({candidatos.length} candidato(s)).</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoIdCriado)} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm">Ver Concurso</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Importa um concurso direto de um CSV no formato da aba "candidatosDataBase" (com a coluna do nome do
                candidato em qualquer posição). Não cria mensagem nem calendário de agendamento — use para concursos
                que não precisam mais ser agendados pelo app (normalmente já encerrados).
              </p>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEAM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Status inicial</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ConcursoRecord['status'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-bold text-[#050F41] focus:outline-none focus:border-[#050F41]"
                >
                  {STATUS_IMPORTACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Arquivo CSV</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-[#050F41] transition-colors">
                  <span className="material-symbols-outlined text-[32px] text-gray-400">table_view</span>
                  <span className="text-xs font-bold text-gray-600">{fileName || 'Clique para selecionar o CSV'}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleSelecionarArquivo(e.target.files?.[0] || null)} />
                </label>
                {candidatos.length > 0 && (
                  <p className="text-[11px] text-green-700 font-bold mt-1.5">{candidatos.length} candidato(s) identificado(s).</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando || candidatos.length === 0}
                  onClick={handleImportar}
                  className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
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

interface ConcursosListaProps {
  concursos: ConcursoRecord[];
  loading: boolean;
  isAdmin: boolean;
  podeRegistrarMensagem: boolean;
  onSelecionar: (id: string) => void;
  onNovoConcursoClick: () => void;
  onImportarCsvClick: () => void;
  onAbrir: (id: string, nome: string) => void;
}

const GRUPOS_STATUS: { status: ConcursoRecord['status']; titulo: string }[] = [
  { status: 'em_andamento', titulo: 'Em Andamento' },
  { status: 'em_breve', titulo: 'Em Breve' },
  { status: 'encerrado', titulo: 'Encerrado' },
];

const ConcursosLista: React.FC<ConcursosListaProps> = ({ concursos, loading, isAdmin, podeRegistrarMensagem, onSelecionar, onNovoConcursoClick, onImportarCsvClick, onAbrir }) => {
  const [contadores, setContadores] = useState<Record<string, { total: number; finalizados: number }>>({});

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const entradas = await Promise.all(concursos.map(async c => {
        if (c.status !== 'em_andamento') return [c.id, { total: c.totalCandidatos, finalizados: 0 }] as const;
        const candidatos = await listarCandidatos(c.id);
        return [c.id, { total: candidatos.length, finalizados: candidatos.filter(x => x.finalizado).length }] as const;
      }));
      if (!cancelado) setContadores(Object.fromEntries(entradas));
    })();
    return () => { cancelado = true; };
  }, [concursos]);

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in">
      <Header title="Planilhas de Controle" />
      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-[1200px] mx-auto w-full flex-1 space-y-6">
        {(podeRegistrarMensagem || isAdmin) && (
          <div className="flex justify-end gap-2 flex-wrap">
            {podeRegistrarMensagem && (
              <button
                type="button"
                onClick={onNovoConcursoClick}
                className="px-4 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Registrar Mensagem (PDF) — Novo Concurso</span>
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={onImportarCsvClick}
                className="px-4 py-2.5 bg-white hover:bg-gray-50 text-[#050F41] rounded-xl text-xs font-bold transition-colors shadow-sm border border-gray-200 flex items-center space-x-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">table_view</span>
                <span>Importar Concurso (CSV)</span>
              </button>
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
          GRUPOS_STATUS.map(grupo => {
            const itens = concursos.filter(c => c.status === grupo.status);
            if (itens.length === 0) return null;
            return (
              <div key={grupo.status}>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{grupo.titulo} ({itens.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {itens.map(c => {
                    const contagem = contadores[c.id];
                    const pct = contagem && contagem.total > 0 ? Math.round((contagem.finalizados / contagem.total) * 100) : null;
                    return (
                      <div key={c.id} className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelecionar(c.id)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelecionar(c.id); }}
                          className="text-left p-4 flex-1 hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-heading font-bold text-sm text-[#050F41]">{c.nome}</h3>
                            {isAdmin && c.status === 'encerrado' ? (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onAbrir(c.id, c.nome); }}
                                title="Reabrir concurso (Em Andamento)"
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap hover:brightness-95 transition-all ${getConcursoStatusClasses(c.status)}`}
                              >
                                {STATUS_LABELS[c.status]}
                              </button>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${getConcursoStatusClasses(c.status)}`}>{STATUS_LABELS[c.status]}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500">{c.totalCandidatos} candidato(s)</p>
                          {c.periodoInicioISO && (
                            <p className="text-[11px] text-gray-500">{isoParaBR(c.periodoInicioISO)} a {isoParaBR(c.periodoFimISO)}</p>
                          )}
                          {pct !== null && (
                            <div className="mt-2">
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#079551]" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">{pct}% IS finalizadas</p>
                            </div>
                          )}
                        </div>
                        {isAdmin && c.status === 'em_breve' && (
                          <button
                            type="button"
                            onClick={() => onAbrir(c.id, c.nome)}
                            className="px-4 py-2 border-t border-gray-100 text-[11px] font-bold text-[#079551] hover:bg-green-50 transition-colors flex items-center justify-center space-x-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">play_circle</span>
                            <span>Abrir Concurso</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
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
  isAdmin: boolean;
  onVoltar: () => void;
}

const ConcursoDetalhe: React.FC<ConcursoDetalheProps> = ({ concursoId, isAdmin, onVoltar }) => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeEditarInlineBase = canUseFeature('concursosJRS.editarDadosTabela', perfil);
  const podeReagendarBase = canUseFeature('concursosJRS.reagendar', perfil);
  const podeGerarMinutaResultados = canUseFeature('concursosJRS.gerarMinutaResultados', perfil);

  const [concurso, setConcurso] = useState<ConcursoRecord | null>(null);
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

  const [reagendandoCandidato, setReagendandoCandidato] = useState<CandidatoRecord | null>(null);
  const [confirmandoReagendamento, setConfirmandoReagendamento] = useState(false);

  const [gerandoMinutaResultados, setGerandoMinutaResultados] = useState(false);
  const [minutaResultados, setMinutaResultados] = useState<string | null>(null);
  const [pendentesFinalizacao, setPendentesFinalizacao] = useState<{ id: string; nome: string }[] | null>(null);

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

  const handleGerarMinutaResultados = async () => {
    setGerandoMinutaResultados(true);
    setMinutaResultados(null);
    setPendentesFinalizacao(null);
    try {
      const resultado = await gerarMinutaResultados(concursoId);
      if ('minuta' in resultado) setMinutaResultados(resultado.minuta);
      else setPendentesFinalizacao(resultado.pendentes);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar a minuta de resultados.');
    } finally {
      setGerandoMinutaResultados(false);
    }
  };

  const handleFecharMinutaResultados = () => {
    const mostrarPrompt = isAdmin && minutaResultados !== null && concurso?.status === 'em_andamento';
    setMinutaResultados(null);
    setPendentesFinalizacao(null);
    if (mostrarPrompt) {
      setConfirmDialog({
        title: 'Encerrar Concurso',
        message: 'Deseja encerrar este concurso agora? Ele ficará com status "Encerrado".',
        confirmLabel: 'Encerrar Concurso',
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await encerrarConcurso(concursoId);
            showToast('Concurso encerrado.');
            carregarTudo();
          } catch (e: any) {
            showToast(e?.message || 'Erro ao encerrar o concurso.');
          }
        },
      });
    }
  };

  const handleEncerrarManual = () => {
    setConfirmDialog({
      title: 'Encerrar Concurso',
      message: 'Deseja encerrar este concurso agora? Ele ficará com status "Encerrado".',
      confirmLabel: 'Encerrar Concurso',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await encerrarConcurso(concursoId);
          showToast('Concurso encerrado.');
          carregarTudo();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao encerrar o concurso.');
        }
      },
    });
  };

  const handleAbrirManual = () => {
    setConfirmDialog({
      title: 'Abrir Concurso',
      message: 'Deseja abrir este concurso agora? Ele ficará com status "Em Andamento" e liberado para edição.',
      confirmLabel: 'Abrir Concurso',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await abrirConcurso(concursoId);
          showToast('Concurso aberto.');
          carregarTudo();
        } catch (e: any) {
          showToast(e?.message || 'Erro ao abrir o concurso.');
        }
      },
    });
  };

  const handleCopiarTexto = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      showToast('Minuta copiada para a área de transferência.');
    } catch {
      showToast('Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.');
    }
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
  const totalFinalizados = candidatos.filter(c => c.finalizado).length;
  const pctFinalizados = total > 0 ? Math.round((totalFinalizados / total) * 100) : 0;
  const countApto = candidatos.filter(c => c.status === 'APTO').length;
  const countInapto = candidatos.filter(c => c.status === 'INAPTO').length;
  const countInsuf = candidatos.filter(c => c.status === 'INSUF DOCUMENTAL').length;
  const countFaltou = candidatos.filter(c => c.status === 'FALTOU').length;
  const countNaoFinalizados = candidatos.filter(c => c.status === '' || c.status === 'Pendente' || c.status === 'Reagendado').length;
  const todosFinalizados = total > 0 && totalFinalizados === total;

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
        className={`p-3.5 rounded-2xl border shadow-sm flex items-center justify-between transition-all text-left ${isActive ? 'bg-[#050F41] border-[#050F41]' : 'bg-white border-gray-200/60 hover:border-[#050F41]/40'}`}
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
          <circle cx="44" cy="44" r={CIRCULO_RAIO} fill="none" stroke="url(#concursosProgressGradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray={CIRCULO_CIRCUNFERENCIA} strokeDashoffset={circuloOffset} className="transition-all duration-500" />
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

  return (
    <div className="flex flex-col h-full bg-[#F3F5F7] animate-fade-in relative">
      <Header title={concurso?.nome || 'Planilhas de Controle'} desktopTitle={concurso?.nome} onBack={onVoltar} />

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
              <p className="text-xs text-gray-700 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex items-center justify-end space-x-2">
                <button type="button" onClick={() => setConfirmDialog(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
                <button type="button" onClick={confirmDialog.onConfirm} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm">{confirmDialog.confirmLabel || 'Confirmar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 overflow-y-auto pb-24 max-w-[1600px] mx-auto w-full flex-1 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {concurso && (
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap ${getConcursoStatusClasses(concurso.status)}`}>
                {STATUS_LABELS[concurso.status]}
              </span>
            )}
            <div className="relative flex-1 min-w-[180px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por matrícula ou nome..."
                className="w-full pl-10 pr-4 py-2.5 text-xs font-body rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-[#050F41] transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDateMenu(prev => !prev)}
                className={`px-3 py-2.5 text-xs font-semibold rounded-xl border flex items-center space-x-1.5 whitespace-nowrap ${dateFilterMode !== 'todos' ? 'bg-[#050F41] text-white border-[#050F41]' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
              >
                <span className="material-symbols-outlined text-[16px]">event</span>
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

            {podeGerarMinutaResultados && (
              <button
                type="button"
                onClick={handleGerarMinutaResultados}
                disabled={gerandoMinutaResultados}
                className="px-4 py-2.5 bg-white hover:bg-gray-50 text-[#050F41] rounded-xl text-xs font-bold transition-colors shadow-sm border border-gray-200 flex items-center space-x-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px]">{gerandoMinutaResultados ? 'progress_activity' : 'summarize'}</span>
                <span>Minuta de Resultados</span>
              </button>
            )}

            {isAdmin && concurso?.status === 'em_breve' && (
              <button type="button" onClick={handleAbrirManual} className="px-4 py-2.5 bg-[#079551] hover:bg-[#067a43] text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 whitespace-nowrap">
                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                <span>Abrir Concurso</span>
              </button>
            )}
            {isAdmin && concurso?.status === 'em_andamento' && (
              <button
                type="button"
                onClick={handleEncerrarManual}
                disabled={!todosFinalizados}
                title={todosFinalizados ? '' : 'Só é possível encerrar quando todos os candidatos estiverem finalizados.'}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                <span>Encerrar Concurso</span>
              </button>
            )}
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

        <div className="sm:hidden space-y-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm">{progressoCardContent}</div>
          <div className="grid grid-cols-2 gap-3">{kpiCards.map(card => renderKpiCard(card))}</div>
        </div>

        <div className="hidden sm:grid gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gridTemplateRows: 'repeat(2, 1fr)', gridTemplateAreas: '"progress progress k1 k2 k3" "progress progress k4 k5 k6"' }}>
          <div style={{ gridArea: 'progress' }} className="bg-white p-4 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-center">{progressoCardContent}</div>
          {kpiCards.map((card, i) => renderKpiCard(card, `k${i + 1}`))}
        </div>

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
                        <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{c.dataAgendamentoBR || '-'}</td>
                        <td className="py-3.5 px-4 cursor-pointer" onClick={() => handleCopiarNomeCandidato(c.nome)} title="Clique para copiar o nome do candidato">
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
                          {podeEditar ? (
                            <input type="text" defaultValue={c.observacoes} onBlur={e => handleCampoBlur(c, 'observacoes', e.target.value)} className="w-full px-2 py-1.5 text-[13px] rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#050F41] focus:bg-white" placeholder="-" />
                          ) : <span className="truncate block" title={c.observacoes}>{c.observacoes || '-'}</span>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">
                          {podeEditar ? (
                            <input type="text" defaultValue={c.numTIS} onBlur={e => handleCampoBlur(c, 'numTIS', e.target.value)} className="w-24 px-2 py-1.5 text-[13px] font-mono rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-[#050F41] focus:bg-white" placeholder="-" />
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
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden divide-y divide-gray-100">
                {filteredCandidatos.map(c => (
                  <div key={c.id} className="p-4 flex flex-col space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] text-gray-700 font-semibold truncate">{c.nome}</p>
                        <p className="text-[10px] font-mono text-gray-400">{c.id}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{c.dataAgendamentoBR || 'Sem data'}</p>
                      </div>
                      <div className="shrink-0">{getStatusBadge(c.status)}</div>
                    </div>

                    {podeEditar && (
                      <div className="grid grid-cols-1 gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Status</span>
                          <select value={c.status || ''} onChange={e => handleStatusChange(c, e.target.value)} className={`w-full px-2 py-1.5 text-[11px] font-bold rounded-lg border focus:outline-none ${getStatusSelectClasses(c.status)}`}>
                            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Nº TIS</span>
                          <input type="text" defaultValue={c.numTIS} onBlur={e => handleCampoBlur(c, 'numTIS', e.target.value)} className="w-full px-2 py-1.5 text-[11px] font-mono rounded-lg border border-gray-200 bg-white focus:outline-none" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Observações</span>
                          <input type="text" defaultValue={c.observacoes} onBlur={e => handleCampoBlur(c, 'observacoes', e.target.value)} className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-gray-200 bg-white focus:outline-none" />
                        </div>
                      </div>
                    )}
                    {!podeEditar && c.observacoes && (
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 uppercase block">Observações</span>
                        <span className="text-[11px] font-medium text-gray-600">{c.observacoes}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {c.termoRecursoUrl ? (
                        <a href={c.termoRecursoUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#050F41] underline flex items-center space-x-1">
                          <span className="material-symbols-outlined text-[14px]">description</span>
                          <span>Termo de Recurso</span>
                        </a>
                      ) : c.status === 'INAPTO' ? (
                        <button type="button" onClick={() => handleGerarTermo(c.id, c.nome)} className="text-[11px] font-bold text-[#050F41] underline flex items-center space-x-1">
                          <span className="material-symbols-outlined text-[14px]">gavel</span>
                          <span>Gerar Termo</span>
                        </button>
                      ) : <span />}

                      {podeReagendar && !c.finalizado && (
                        <button type="button" onClick={() => handleOpenReagendamento(c)} className="px-3 py-1.5 bg-[#050F41] text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm">
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
              <CalendarioAgendamento datas={datasAgendamento} loading={loadingDatasAgendamento || confirmandoReagendamento} onSelect={handleSelecionarDataReagendamento} />
            </div>
          </div>
        </div>
      )}

      {(minutaResultados !== null || pendentesFinalizacao !== null) && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-[#050F41] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-[#079551]">summarize</span>
                <h3 className="font-heading font-bold text-sm uppercase">Minuta de Resultados da IS</h3>
              </div>
              <button onClick={handleFecharMinutaResultados} className="text-gray-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {pendentesFinalizacao && pendentesFinalizacao.length > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-800">Ainda há {pendentesFinalizacao.length} candidato(s) não finalizado(s). Finalize todos antes de gerar a minuta de resultados.</p>
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
                <textarea readOnly value={minutaResultados ?? ''} rows={16} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-[11px] font-mono text-gray-800 focus:outline-none resize-none whitespace-pre-wrap" />
              )}

              <div className="pt-2 flex items-center justify-end space-x-2">
                {minutaResultados && (
                  <button type="button" onClick={() => handleCopiarTexto(minutaResultados)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                )}
                <button type="button" onClick={handleFecharMinutaResultados} className="px-5 py-2.5 bg-[#050F41] hover:bg-[#079551] text-white rounded-xl text-xs font-bold transition-colors shadow-sm">Fechar</button>
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

  const handleAbrirDaLista = async (id: string) => {
    await abrirConcurso(id);
    carregarConcursos();
  };

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
        isAdmin={isAdmin}
        onVoltar={() => { setSelectedConcursoId(null); carregarConcursos(); }}
      />
    );
  }

  return (
    <>
      <ConcursosLista
        concursos={concursos}
        loading={loadingConcursos}
        isAdmin={isAdmin}
        podeRegistrarMensagem={podeRegistrarMensagem}
        onSelecionar={setSelectedConcursoId}
        onNovoConcursoClick={() => setShowUploadModal(true)}
        onImportarCsvClick={() => setShowImportarCsvModal(true)}
        onAbrir={handleAbrirDaLista}
      />
      {showUploadModal && <ModalRegistrarMensagem onClose={handleFecharModalUpload} isAdmin={isAdmin} />}
      {showImportarCsvModal && <ModalImportarCsv onClose={handleFecharModalImportarCsv} />}
    </>
  );
};
