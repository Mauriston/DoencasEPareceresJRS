import { CidInaptidaoModal, CidPicker } from './CidInaptidaoModal';
import { MotivoIdmModal, IdmPicker } from './MotivoIdmModal';
import { ResponsavelTermoModal } from './ResponsavelTermoModal';
import type { UsuarioRecord } from '../services/firestoreUsuarios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Container, PageHeader } from './ui/Page';
import { useParams } from 'react-router-dom';
import { useBreadcrumbs } from '../context/BreadcrumbContext';
import { concursoPath, concursosDiaPath } from '../config/routes';
import { useDiasConcursos } from '../hooks/useDiasConcursos';
import { CalendarioConcursos } from './concursos/CalendarioConcursos';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import {
  listarConcursos, getConcurso, listarCandidatos, observarConcursos, observarConcurso, observarCandidatos, criarConcursoDaMensagem, novoConcursoId, importarConcursoDeCsv, atualizarCandidato,
  criarCandidato, reagendarCandidato, listarDatasAgendamento, obterContextoAgendamento, confirmarAgendamento,
  gerarMinutaResultados, abrirConcurso, voltarParaEmBreve, encerrarConcurso, salvarTermoRecurso, salvarTermoCientificacao, registrarSolicitacao, STATUS_PERMITEM_SOLICITACAO, reabrirIS, limparIS, type SolicitacaoDoc,
  listarMensagens, arquivarMensagem, obterEstatisticasAnuais, definirPeriodoAgendamento,
  STATUS_LABELS,
  type ConcursoRecord, type CandidatoRecord, type DataAgendamentoInfo, type MensagemRecord, type EstatisticasAnuais, type EstatisticaConcursoStatus,
} from '../services/firestoreConcursos';
import { SolicitarParecerModal, SolicitarExamesModal } from './SolicitacaoModais';
import { CandidatoDetalhe } from './concursos/CandidatoDetalhe';
import { EnviarExamesModal, ExamesTranscritosModal, type AlvoExames } from './concursos/ExamesCandidato';
import { juntarPdfsBase64 } from '../services/pdfMerge';
import {
  extrairMensagemComGemini, salvarMensagemNoDrive, salvarPdfCandidatoNoDrive, criarEstruturaConcursoNoDrive, abrirPdf, urlVisualizacao, anoDoConcurso,
  type PastaConcurso, type MensagemExtraida,
} from '../services/driveConcursos';
import {
  limparRuidoPaginacao, extrairCabecalhoMensagem, extrairCandidatosComAgendamento, extrairPeriodoJRS,
  extrairNomeConcurso, formatarChaveData, parseChaveData, interpretarCsvCandidatosDataBase,
  MAPA_LAUDO_POR_STATUS,
  type CabecalhoMensagem, type CandidatoBasico, type CandidatoImportadoCsv,
} from '../utils/concursosUtils';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { SheetArrastavel } from './ui/SheetArrastavel';
import { Dialog } from './ui/Dialog';
import { listarEventos, type EventoIS } from '../services/auditoriaIS';
import { EmptyState } from './ui/EmptyState';
import { AccessDenied } from './ui/AccessDenied';
import { controlClass } from './ui/Field';
import { ConfirmDialog } from './ui/Dialog';
import { Toast } from './ui/Toast';
import { KpiMini } from './ui/KpiMini';
import { ProgressBar } from './ui/ProgressBar';
import { CandidatoStatusTag, ConcursoStatusTag, StatusSelect } from './ui/statusTheme';
import { StatusTag } from './ui/StatusTag';
import { getScrollParent } from '../utils/dom';

// URL de implantação (aplicativo da web) do projeto Apps Script standalone
// mínimo "CodeConcursos.gs" (código-fonte também versionado neste
// repositório) — hoje responsável apenas por gerar o PDF do Termo de
// Cientificação de Recurso a partir do template Google Docs. Todo o resto
// do backend de Concursos vive no Firestore (ver services/firestoreConcursos.ts).
const GAS_URL_TERMO_RECURSO = 'https://script.google.com/macros/s/AKfycbx9FDjnQKRhu26z4VQRDRdHnAvKUaIfNaViEjHLHoX1St4sNyri6ppYTrgEg7ne869tnw/exec';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sem status' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'APTO', label: 'Apto' },
  { value: 'INAPTO', label: 'Inapto' },
  { value: 'FALTOU', label: 'Faltou' },
  { value: 'INSUF DOCUMENTAL', label: 'Insuf. Documental' },
  { value: 'Reagendado', label: 'Reagendado' },
];

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

/**
 * Converte o JSON lido pelo Gemini nas estruturas do app. A lista de candidatos vem do Gemini; se ele não
 * devolver nenhuma (PDF ilegível, formato fora do comum), cai na extração por regras sobre o texto transcrito.
 */
const interpretarMensagem = (m: MensagemExtraida): {
  cabecalho: CabecalhoMensagem; nomeConcurso: string; candidatos: CandidatoBasico[];
  modoAgendamento: boolean; periodo: { inicio: string; fim: string } | null; texto: string;
} => {
  const textoLimpo = limparRuidoPaginacao(m.texto);
  const cabecalho: CabecalhoMensagem = {
    dataHora: m.dataHora, sender: m.remetente, recipient: m.destinatario, info: m.info, subject: m.assunto,
    texto: textoLimpo,
    purpose: m.mensagemDeAgendamento ? 'Agendamento' : (/candidatos\s+abaixo\s+relacionados/i.test(textoLimpo) || m.candidatos.length > 0 ? 'Apresentação' : 'Outros'),
  };

  let candidatos: CandidatoBasico[] = m.candidatos
    .filter(c => /^\d{5,7}-\d$/.test(c.matricula) && c.nome)
    .map(c => ({ id: c.matricula, nome: c.nome, ...(c.dataAgendamento ? { dataAgendamento: c.dataAgendamento } : {}) }));
  let modoAgendamento = m.mensagemDeAgendamento && candidatos.some(c => c.dataAgendamento);
  let periodo = m.periodoJRS;

  if (candidatos.length === 0 && textoLimpo) {
    const mDtg = m.dataHora.match(/\/([A-ZÇ]{3})\/(\d{2,4})$/);
    const anoMsg = mDtg ? (mDtg[2].length === 2 ? 2000 + parseInt(mDtg[2], 10) : parseInt(mDtg[2], 10)) : undefined;
    const mesMsg = mDtg ? ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].indexOf(mDtg[1]) : -1;
    const extraido = extrairCandidatosComAgendamento(textoLimpo, { remetente: m.remetente, anoPadrao: anoMsg, mesReferencia: mesMsg >= 0 ? mesMsg : undefined });
    candidatos = extraido.candidatos;
    modoAgendamento = extraido.modoAgendamento;
    if (modoAgendamento) cabecalho.purpose = 'Agendamento';
  }
  if (!periodo && textoLimpo) {
    const p = extrairPeriodoJRS(textoLimpo);
    if (p) periodo = { inicio: formatarChaveData(p.inicio), fim: formatarChaveData(p.fim) };
  }
  // Apresentação: ordem alfabética (o agendamento automático distribui os candidatos nessa ordem).
  if (!modoAgendamento) candidatos = [...candidatos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  return { cabecalho, nomeConcurso: m.nomeConcurso || extrairNomeConcurso(m.assunto), candidatos, modoAgendamento, periodo, texto: textoLimpo };
};

interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Ação destrutiva: confirmação contornada em vinho. */
  destrutivo?: boolean;
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
      <div className="text-center py-8 text-ink-3">
        <span className="material-symbols-outlined animate-spin text-[28px] text-navy">progress_activity</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} aria-label="Mês anterior" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-thead text-ink-3">
          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
        </button>
        <span className="text-sm font-bold text-navy uppercase">
          {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={() => setMesAtual(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} aria-label="Próximo mês" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-thead text-ink-3">
          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-ink-3">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const info = mapaDatas[iso];
          const dia = Number(iso.split('-')[2]);
          if (!info) {
            return <div key={i} className="aspect-square flex items-center justify-center text-sm text-ink-4 rounded-lg">{dia}</div>;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(iso)}
              title={`${info.dataFormatada} — ${info.quantidadeAgendados} agendado(s)`}
              className="aspect-square min-h-[44px] flex flex-col items-center justify-center rounded-lg text-sm font-bold bg-navy text-white border border-navy hover:bg-navy-hover transition-colors cursor-pointer"
            >
              <span>{dia}</span>
              <span className="text-xs font-semibold">{info.quantidadeAgendados}</span>
            </button>
          );
        })}
      </div>

      {datas.length === 0 && <p className="text-sm text-ink-3 text-center py-4">Nenhuma data de agendamento configurada.</p>}
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
  // Texto transcrito do PDF — mostrado na revisão quando nada foi identificado, para diagnosticar o formato.
  const [textoTranscrito, setTextoTranscrito] = useState('');
  // Mensagem de agendamento (HOSRCF): candidatos agrupados por dia — o concurso já nasce com as datas.
  const [modoAgendamento, setModoAgendamento] = useState(false);

  const [processando, setProcessando] = useState(false);

  const handleProcessar = async () => {
    if (!file) return;
    setErro(null);
    setProcessando(true);
    setStep('processando');
    try {
      const lida = interpretarMensagem(await extrairMensagemComGemini(file));
      setTextoTranscrito(lida.texto);
      if (!lida.cabecalho.dataHora) {
        throw new Error('Não foi possível localizar o código Data-Hora (ID único) da mensagem no documento. Confira o arquivo e tente novamente.');
      }
      setModoAgendamento(lida.modoAgendamento);
      setCabecalho(lida.cabecalho);
      setNomeConcurso(lida.nomeConcurso);
      setCandidatos(lida.candidatos);
      setPeriodoInicio(lida.periodo?.inicio ?? '');
      setPeriodoFim(lida.periodo?.fim ?? '');
      setStep('revisao');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao processar o documento.');
      setStep('select');
    } finally {
      setProcessando(false);
    }
  };

  const atualizarCandidatoEditavel = (indice: number, campo: 'id' | 'nome' | 'dataAgendamento', valor: string) => {
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
      // O PDF vai para o Drive (CONCURSOS > ano atual > concurso > MENSAGENS; a estrutura de pastas é criada
      // aqui) e o upload é aguardado: o registro da mensagem precisa nascer já com a URL do arquivo.
      const novoId = novoConcursoId();
      const fileUrl = await salvarMensagemNoDrive({ nome: nomeConcurso.trim(), ano: new Date().getFullYear() }, file!);
      // A mensagem que cria o concurso é sempre do tipo "Apresentação",
      // independente do que a heurística de extração tenha identificado.
      await criarConcursoDaMensagem({
        concursoId: novoId,
        nome: nomeConcurso.trim(),
        cabecalho: { ...cabecalho, purpose: modoAgendamento ? 'Agendamento' : 'Apresentação' },
        candidatos: candidatosValidos,
        periodo,
        fileUrl,
      });
      setConcursoId(novoId);

      if (modoAgendamento) {
        // Já agendado pelas datas da mensagem: não há distribuição automática nem minuta.
        setSemPeriodo(!periodo);
        setStep('concluido');
      } else if (periodo) {
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
    <Container size="form" className="py-6 md:py-8 pb-10">
      <PageHeader title="Novo concurso" description="Registre a mensagem em PDF; o concurso nasce com os candidatos identificados." />
      {/* F60: etapas numeradas e escritas — 1 Mensagem · 2 Revisão · 3 Agendamento. */}
      <ol className="flex items-center gap-2 mb-5" aria-label="Etapas do novo concurso">
        {[
          { n: 1, rotulo: 'Mensagem', ativa: step === 'select' || step === 'processando' },
          { n: 2, rotulo: 'Revisão', ativa: step === 'revisao' },
          { n: 3, rotulo: 'Agendamento', ativa: step === 'agendamento' || step === 'concluido' },
        ].map((e, i, arr) => {
          const indiceAtual = arr.findIndex(x => x.ativa);
          const feita = i < indiceAtual;
          return (
            <li key={e.n} className="flex items-center gap-2 flex-1 last:flex-none" aria-current={e.ativa ? 'step' : undefined}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${e.ativa ? 'bg-navy text-white border-navy' : feita ? 'bg-white text-green-700 border-green-700' : 'bg-white text-ink-3 border-line'}`}>
                {feita ? <span className="material-symbols-outlined text-[18px]" aria-label="concluída">check</span> : e.n}
              </span>
              <span className={`text-sm font-semibold ${e.ativa ? 'text-navy' : 'text-ink-3'}`}>{e.rotulo}</span>
              {i < arr.length - 1 && <span className="flex-1 h-px bg-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
      <div className="bg-white rounded-xl border border-line">
        <div className="p-5 space-y-4">
          {erro && (
            <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>
          )}

          {step === 'select' && (
            <>
              <p className="text-sm text-ink-3">
                Envie o PDF (ou fotografe/escaneie) da mensagem administrativa de apresentação dos candidatos
                ou a mensagem de agendamento enviada pelo HNRe (candidatos agrupados por dia).
                O texto será transcrito por IA, os candidatos, as datas de agendamento (quando houver) e o período
                da JRS identificados automaticamente — você poderá revisar e corrigir tudo antes de criar o concurso.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-5 rounded-xl p-6 cursor-pointer hover:border-navy transition-colors">
                <span className="material-symbols-outlined text-[32px] text-ink-3">picture_as_pdf</span>
                <span className="text-sm font-bold text-ink">{file ? file.name : 'Clique para selecionar o PDF ou escanear um documento'}</span>
                <span className="text-xs text-ink-3">Máx. 15 MB</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={!file || processando}
                  onClick={handleProcessar}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center space-x-1 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  <span>Processar Mensagem</span>
                </button>
              </div>
            </>
          )}

          {step === 'processando' && (
            <div className="text-center py-8 text-ink-3 space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
              <p className="text-sm font-semibold">Transcrevendo o documento e identificando os candidatos...</p>
            </div>
          )}

          {step === 'revisao' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                Confira e corrija os dados extraídos antes de criar o concurso — a matrícula de cada candidato precisa estar correta.
              </div>
              {modoAgendamento && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                  <span className="font-bold">Mensagem de agendamento identificada:</span> os candidatos serão criados já agendados nas datas abaixo (ajuste a data de qualquer um, se necessário).
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-base font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período JRS — início</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período JRS — fim</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              {!periodoInicio && (
                <p className="text-sm text-gold-700">Período não identificado automaticamente — informe manualmente para já configurar o agendamento, ou deixe em branco para agendar depois.</p>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider">Candidatos ({candidatos.length})</label>
                  <button type="button" onClick={adicionarCandidatoEditavel} className="text-sm font-bold text-navy flex items-center space-x-1">
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Adicionar</span>
                  </button>
                </div>
                <div className="border border-line rounded-xl divide-y divide-line max-h-64 overflow-y-auto">
                  {candidatos.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 p-2">
                      <input
                        type="text"
                        value={c.id}
                        onChange={e => atualizarCandidatoEditavel(i, 'id', e.target.value)}
                        placeholder="Matrícula"
                        className="w-28 shrink-0 px-2 py-1.5 text-xs font-mono rounded-lg border border-line focus:outline-none focus:border-navy"
                      />
                      <input
                        type="text"
                        value={c.nome}
                        onChange={e => atualizarCandidatoEditavel(i, 'nome', e.target.value)}
                        placeholder="Nome do candidato"
                        className="flex-1 min-w-[140px] px-2 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:border-navy"
                      />
                      {modoAgendamento && (
                        <input
                          type="date"
                          value={c.dataAgendamento || ''}
                          onChange={e => atualizarCandidatoEditavel(i, 'dataAgendamento', e.target.value)}
                          aria-label="Data de agendamento"
                          className="w-[9.5rem] shrink-0 px-2 py-1.5 text-xs rounded-lg border border-line focus:outline-none focus:border-navy"
                        />
                      )}
                      <button type="button" onClick={() => removerCandidatoEditavel(i)} className="p-1.5 text-ink-3 hover:text-wine-600 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                  {candidatos.length === 0 && (
                    <div className="py-3 space-y-2">
                      <p className="text-sm text-ink-3 text-center">Nenhum candidato identificado.</p>
                      {textoTranscrito && (
                        <details className="text-xs text-ink-3">
                          <summary className="cursor-pointer font-semibold text-center">Ver texto transcrito do PDF</summary>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-paper border border-line p-2 font-mono">{textoTranscrito}</pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando}
                  onClick={handleConfirmarCriacao}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Criando concurso...' : 'Confirmar e Criar Concurso'}
                </button>
              </div>
            </>
          )}

          {step === 'agendamento' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-ink">
                <span className="font-bold">Candidatos a agendar:</span> {totalPendentes}
              </div>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Quantidade de IS por dia</label>
                <input
                  type="number"
                  min={1}
                  value={quantidadePorDia}
                  onChange={e => setQuantidadePorDia(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-2">Datas disponíveis (marque as que serão usadas)</label>
                <div className="border border-line rounded-xl divide-y divide-line max-h-56 overflow-y-auto">
                  {datasDisponiveis.length > 0 && (
                    <label className="flex items-center gap-2 p-2 text-sm font-bold text-navy cursor-pointer hover:bg-paper bg-paper/60">
                      <input
                        type="checkbox"
                        checked={todasDatasSelecionadas}
                        ref={el => { if (el) el.indeterminate = !todasDatasSelecionadas && datasSelecionadas.size > 0; }}
                        onChange={toggleTodasDatas}
                        className="accent-navy"
                      />
                      <span>{todasDatasSelecionadas ? 'Desmarcar todas' : 'Selecionar todas'}</span>
                    </label>
                  )}
                  {datasDisponiveis.map(d => (
                    <label key={d.data} className="flex items-center gap-2 p-2 text-sm cursor-pointer hover:bg-paper">
                      <input type="checkbox" checked={datasSelecionadas.has(d.data)} onChange={() => toggleData(d.data)} className="accent-navy" />
                      <span className="font-bold text-navy">{d.dataFormatada}</span>
                      <span className="text-ink-3">({d.diaSemana})</span>
                    </label>
                  ))}
                  {datasDisponiveis.length === 0 && <p className="text-sm text-ink-3 text-center py-4">Nenhuma data útil no período informado.</p>}
                </div>
              </div>

              <div className={`rounded-xl p-3 text-sm font-bold ${agendamentoViavel ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-gold-50 border border-gold-200 text-gold-800'}`}>
                {quantidadeCoberta} / {totalPendentes} candidatos cobertos com {datasSelecionadas.size} data(s) × {quantidadePorDia || 0} por dia
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Agendar Depois</button>
                <button
                  type="button"
                  disabled={!agendamentoViavel || processando}
                  onClick={handleConfirmarAgendamento}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {processando ? 'Confirmando...' : 'Confirmar Agendamento e Gerar Minuta'}
                </button>
              </div>
            </>
          )}

          {step === 'concluido' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">
                  Concurso "{nomeConcurso}" criado com sucesso{modoAgendamento ? ` com os ${candidatos.filter(c => c.id.trim() && c.nome.trim()).length} candidatos já agendados nas datas da mensagem${semPeriodo ? ' (defina o período de agendamento depois, se precisar reagendar).' : '.'}` : semPeriodo ? '.' : ' e agendamento confirmado.'}
                </p>
              </div>
              {minuta && (
                <>
                  <textarea readOnly value={minuta} rows={12} className="w-full px-3.5 py-2.5 rounded-lg border border-ink-5 text-sm font-mono text-navy focus:outline-none resize-none whitespace-pre-wrap" />
                  <button type="button" onClick={() => handleCopiarTexto(minuta)} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                </>
              )}
              {!isAdmin && (
                <p className="text-sm text-ink-3">O concurso ficará com status "Em Breve" até um Admin abri-lo.</p>
              )}
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoId || undefined)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Container>
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
      void criarEstruturaConcursoNoDrive({ nome: nomeConcurso.trim(), ano: new Date().getFullYear() });
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
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[22px] text-gold">table_view</span>
            <h3 className="font-heading font-bold text-sm">Importar Concurso (CSV)</h3>
          </div>
          <button onClick={() => onClose(concursoIdCriado || undefined)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {concursoIdCriado ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Concurso "{nomeConcurso}" importado com sucesso ({candidatos.length} candidato(s)).</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(concursoIdCriado)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Ver Concurso</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-3">
                Importa um concurso direto de um CSV no formato da aba "candidatosDataBase" (com a coluna do nome do
                candidato em qualquer posição). Não cria mensagem administrativa — se o concurso ainda terá
                candidatos reagendados pelo app, informe o período de IS abaixo para liberar o calendário de
                reagendamento; deixe em branco se ele não precisa mais ser agendado (normalmente já encerrados).
              </p>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Nome do concurso</label>
                <input
                  type="text"
                  value={nomeConcurso}
                  onChange={e => setNomeConcurso(e.target.value)}
                  placeholder="Ex.: CPAEAM/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-base font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Status inicial</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ConcursoRecord['status'])}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy"
                >
                  {STATUS_IMPORTACAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período IS — início (opcional)</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Período IS — fim (opcional)</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <p className="text-sm text-ink-3 -mt-2">Informe o período para liberar o calendário de reagendamento (gera os dias úteis automaticamente).</p>

              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Arquivo CSV</label>
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-5 rounded-xl p-6 cursor-pointer hover:border-navy transition-colors">
                  <span className="material-symbols-outlined text-[32px] text-ink-3">table_view</span>
                  <span className="text-sm font-bold text-ink">{fileName || 'Clique para selecionar o CSV'}</span>
                  <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => handleSelecionarArquivo(e.target.files?.[0] || null)} />
                </label>
                {candidatos.length > 0 && (
                  <p className="text-sm text-green-700 font-bold mt-1.5">{candidatos.length} candidato(s) identificado(s).</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button
                  type="button"
                  disabled={processando || candidatos.length === 0}
                  onClick={handleImportar}
                  className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
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
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <h3 className="font-heading font-bold text-sm">{titulo} — Top 4 Concursos</h3>
          <button onClick={onClose} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          {itens.length === 0 ? (
            <p className="text-sm text-ink-3 text-center py-6">Nenhuma ocorrência no ano corrente.</p>
          ) : itens.map(item => (
            <button key={item.concursoId} type="button" onClick={() => { onSelecionarConcurso(item.concursoId); onClose(); }} className="w-full text-left group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-navy group-hover:underline truncate pr-2">{item.concursoNome}</span>
                <span className="text-sm font-black text-ink shrink-0">{item.quantidade}</span>
              </div>
              <div className="h-3 bg-thead rounded-full overflow-hidden">
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
  concursoAno: number;
  onClose: () => void;
}

const ModalRegistrarMensagemArquivo: React.FC<ModalRegistrarMensagemArquivoProps> = ({ concursoId, concursoNome, concursoAno, onClose }) => {
  const pastaConcurso: PastaConcurso = { nome: concursoNome, ano: concursoAno };
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
      const cab = interpretarMensagem(await extrairMensagemComGemini(file)).cabecalho;
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
      const fileUrl = await salvarMensagemNoDrive(pastaConcurso, file);
      await arquivarMensagem(concursoId, cabecalho, fileUrl);
      setStep('concluido');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao arquivar a mensagem.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm truncate">Registrar Mensagem</h3>
            <p className="text-xs text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={onClose} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {step === 'select' && (
            <>
              <p className="text-sm text-ink-3">
                Envie o PDF de uma mensagem administrativa referente a este concurso (ex.: solicitação de
                reagendamento, resultado de recurso). Será arquivada com data-hora, remetente e assunto
                identificados automaticamente.
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink-5 rounded-xl p-6 cursor-pointer hover:border-navy transition-colors">
                <span className="material-symbols-outlined text-[32px] text-ink-3">picture_as_pdf</span>
                <span className="text-sm font-bold text-ink">{file ? file.name : 'Clique para selecionar o PDF'}</span>
                <span className="text-xs text-ink-3">Máx. 15 MB</span>
                <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={!file || processando} onClick={handleProcessar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">Processar Mensagem</button>
              </div>
            </>
          )}

          {step === 'processando' && (
            <div className="text-center py-8 text-ink-3 space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
              <p className="text-sm font-semibold">Transcrevendo o documento...</p>
            </div>
          )}

          {step === 'revisao' && cabecalho && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">Confira os dados extraídos antes de arquivar a mensagem.</div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Data-Hora</label>
                <input type="text" value={cabecalho.dataHora} onChange={e => setCabecalho({ ...cabecalho, dataHora: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-mono text-navy focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Remetente</label>
                <input type="text" value={cabecalho.sender} onChange={e => setCabecalho({ ...cabecalho, sender: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-navy focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Assunto</label>
                <input type="text" value={cabecalho.subject} onChange={e => setCabecalho({ ...cabecalho, subject: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-navy focus:outline-none focus:border-navy" />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Tipo</label>
                <select value={cabecalho.purpose || 'Outros'} onChange={e => setCabecalho({ ...cabecalho, purpose: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy">
                  {PROPOSITO_MENSAGEM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={processando} onClick={handleConfirmar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
                  {processando ? 'Arquivando...' : 'Arquivar Mensagem'}
                </button>
              </div>
            </>
          )}

          {step === 'concluido' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Mensagem arquivada com sucesso.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm">Concluir</button>
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
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 flex items-center gap-2">
            {selecionada && (
              <button onClick={() => setSelecionada(null)} className="p-1 rounded-lg hover:bg-white/10 shrink-0">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
            )}
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-sm truncate">Mensagens Arquivadas</h3>
              <p className="text-xs text-white/70 truncate">{concursoNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {selecionada ? (
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy truncate">{selecionada.subject || 'Sem assunto'}</p>
                  <p className="text-sm text-ink-3">{selecionada.sender} — {selecionada.dataHora}</p>
                </div>
                {selecionada.fileUrl && (
                  <a
                    href={selecionada.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center space-x-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                    <span>Abrir Mensagem</span>
                  </a>
                )}
              </div>
              {selecionada.texto ? (
                <>
                  <div className="w-full max-h-[60vh] overflow-y-auto rounded-xl border border-line bg-paper p-4">
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{selecionada.texto}</p>
                  </div>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleCopiarTexto}
                      title="Copiar texto da mensagem"
                      className="p-2 rounded-lg text-ink-3 hover:text-navy hover:bg-thead transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">{textoCopiado ? 'check' : 'content_copy'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-ink-3 text-center py-8">Texto da mensagem não disponível.</p>
              )}
            </div>
          ) : loading ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
            </div>
          ) : mensagens.length === 0 ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-ink-5">mail</span>
              <p className="text-sm font-bold text-ink">Nenhuma mensagem arquivada</p>
            </div>
          ) : (
            <div className="overflow-x-auto scroll-x-visible">
            <table className="w-full min-w-[520px] text-left border-collapse">
              <thead>
                <tr className="bg-paper/80 border-b border-line text-sm font-bold text-navy uppercase tracking-wider">
                  <th className="py-3 px-4">Data-Hora</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Remetente</th>
                  <th className="py-3 px-4">Assunto</th>
                  <th className="py-3 px-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {mensagens.map(m => (
                  <tr key={m.id} onClick={() => setSelecionada(m)} className="hover:bg-paper cursor-pointer transition-colors">
                    <td className="py-3 px-4 font-mono text-ink whitespace-nowrap">{m.dataHora}</td>
                    <td className="py-3 px-4 text-ink font-semibold whitespace-nowrap">{m.proposito || '-'}</td>
                    <td className="py-3 px-4 text-ink font-semibold">{m.sender || '-'}</td>
                    <td className="py-3 px-4 text-ink">{m.subject || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="material-symbols-outlined text-[18px] text-navy" title="Ver mensagem">
                        visibility
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
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
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm truncate">Definir Período de Agendamento</h3>
            <p className="text-xs text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={() => onClose(concluido)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {concluido ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Período definido com sucesso. O calendário de reagendamento já está liberado.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(true)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-3">
                Informe o período das IS deste concurso para gerar os dias úteis disponíveis para reagendamento. Se o
                concurso já tiver um calendário configurado, ele será substituído pelo novo período.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Início</label>
                  <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Fim</label>
                  <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-ink-5 text-sm focus:outline-none focus:border-navy" />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={processando} onClick={handleConfirmar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
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
    <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-navy text-white flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="font-heading font-bold text-sm truncate">Adicionar Candidato</h3>
            <p className="text-xs text-white/70 truncate">{concursoNome}</p>
          </div>
          <button onClick={() => onClose(concluido)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {erro && <div className="bg-wine-50 border border-wine-200 rounded-xl p-3 text-sm text-wine-700 font-semibold">{erro}</div>}

          {concluido ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm font-bold text-green-800">Candidato "{nome.trim().toUpperCase()}" adicionado com sucesso.</p>
              </div>
              <div className="pt-2 flex items-center justify-end">
                <button type="button" onClick={() => onClose(true)} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Concluir</button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Matrícula</label>
                <input
                  type="text"
                  value={matricula}
                  onChange={e => setMatricula(e.target.value)}
                  placeholder="Ex.: 550039-7"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-mono text-navy focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Nome do candidato</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  placeholder="NOME COMPLETO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm font-bold text-navy focus:outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-3 uppercase tracking-wider block mb-1">Data de agendamento</label>
                {loadingDatas ? (
                  <p className="text-sm text-ink-3">Carregando datas...</p>
                ) : datas.length === 0 ? (
                  <p className="text-sm text-gold-700">Este concurso ainda não tem datas configuradas — o candidato será adicionado sem agendamento (pode ser agendado depois).</p>
                ) : (
                  <select
                    value={dataAgendamento}
                    onChange={e => setDataAgendamento(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-navy focus:outline-none focus:border-navy"
                  >
                    <option value="">Agendar depois</option>
                    {datas.map(d => (
                      <option key={d.data} value={d.data}>{d.dataFormatada} ({d.diaSemana}) — {d.quantidadeAgendados} agendado(s)</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button type="button" onClick={() => onClose()} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors">Cancelar</button>
                <button type="button" disabled={salvando} onClick={handleSalvar} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50">
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
  podeEnviarExames: boolean;
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
  onEnviarExames: () => void;
}

const construirItensMenuConcurso = ({
  status, podeAbrirEncerrar, podeGerarMinutaResultados, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeEnviarExames,
  podeEncerrar, podeVoltarParaEmBreve, minutaHabilitada, temPeriodoConfigurado, temMensagensRegistradas,
  onAbrir, onVoltarParaEmBreve, onEncerrar, onMinutaResultados, onRegistrarMensagem, onListarMensagens, onDefinirPeriodoAgendamento, onAdicionarCandidato, onEnviarExames,
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
  // Minuta Resultados só aparece com o concurso "Em Andamento" — some tanto
  // da tabela quanto do menu de 3 pontos do card quando "Encerrado" (e
  // nunca apareceu quando "Em Breve").
  if (podeGerarMinutaResultados && status === 'em_andamento') {
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
  // Exames do candidato: só enquanto o concurso recebe candidatos (não faz
  // sentido anexar exames a um concurso encerrado).
  if (podeEnviarExames && status === 'em_andamento') {
    itens.push({ key: 'enviar-exames', label: 'Enviar Exames do Candidato', icon: 'lab_profile', onClick: onEnviarExames });
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
      <button ref={btnRef} type="button" aria-label="Ações do concurso" aria-haspopup="menu" aria-expanded={aberto} onClick={() => (aberto ? setAberto(false) : abrirMenu())} className="w-11 h-11 -m-2 flex items-center justify-center rounded-lg text-ink-3 hover:text-navy hover:bg-thead transition-colors">
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">more_vert</span>
      </button>
      {aberto && pos && createPortal(
        <>
          {/* Renderizado via portal (fora do card, que tem overflow-hidden para os
              cantos arredondados) e posicionado em "fixed" a partir do botão —
              senão o menu era cortado pela borda do próprio card. */}
          <div className="fixed inset-0 z-dropdown" onClick={() => setAberto(false)} />
          <div
            role="menu" className="fixed w-64 bg-white rounded-xl shadow-xl border border-line p-1.5 z-dropdown animate-fade-in space-y-0.5"
            style={{ top: pos.top, right: pos.right }}
          >
            {itens.map(item => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                title={item.title}
                onClick={() => { setAberto(false); item.onClick(); }}
                role="menuitem" className="w-full text-left px-3 min-h-[44px] rounded-lg text-sm font-semibold text-navy hover:bg-thead flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{item.icon}</span>
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
  perfil?: string;
  podeRegistrarMensagem: boolean;
  podeGerarMinutaResultados: boolean;
  podeImportarCsv: boolean;
  podeAbrirEncerrar: boolean;
  podeRegistrarMensagemArquivo: boolean;
  podeListarMensagens: boolean;
  podeAdicionarCandidato: boolean;
  podeEnviarExames: boolean;
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

// Concursos "Em Breve" ainda não têm movimentação — zero nessas colunas é
// apenas ausência de dado, então a célula fica em branco em vez de "0".
const celulaNumericaTabela = (valor: number, status: ConcursoRecord['status']): React.ReactNode =>
  valor === 0 && status === 'em_breve' ? '' : valor;

const ConcursosLista: React.FC<ConcursosListaProps> = ({ concursos, loading, perfil, podeRegistrarMensagem, podeGerarMinutaResultados, podeImportarCsv, podeAbrirEncerrar, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeEnviarExames, podeVisualizarTabela, onSelecionar, onNovoConcursoClick, onImportarCsvClick, onRecarregar }) => {
  const [contadores, setContadores] = useState<Record<string, { total: number; finalizados: number; temLancamento: boolean }>>({});
  const navLista = useNav();
  const { dias: diasConcursos } = useDiasConcursos();
  // Contagem de mensagens arquivadas por concurso — usada tanto para saber
  // se "Listar Mensagens" deve aparecer no menu quanto para o badge do
  // ícone na coluna Ações da visão em tabela (mobile).
  const [mensagensCount, setMensagensCount] = useState<Record<string, number>>({});
  // Filtros da lista: situação (padrão = em andamento, ou a primeira com itens),
  // ano e busca. A vista (cards × tabela) é preferência persistida, com rótulo.
  const [statusSel, setStatusSel] = useState<ConcursoRecord['status'] | null>(null);
  const [anoFiltro, setAnoFiltro] = useState('');
  const [busca, setBusca] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'tabela'>(() => {
    try { return localStorage.getItem('jrs.concursos.vista') === 'tabela' ? 'tabela' : 'cards'; } catch { return 'cards'; }
  });
  const definirViewMode = (v: 'cards' | 'tabela') => {
    setViewMode(v);
    try { localStorage.setItem('jrs.concursos.vista', v); } catch { /* preferência é opcional */ }
  };
  const [statusCounts, setStatusCounts] = useState<Record<string, { apto: number; inapto: number; faltou: number; idm: number }>>({});
  const [loadingStatusCounts, setLoadingStatusCounts] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  // No desktop a tabela é sempre opcional (alterna com o botão, começa em
  // cards). No mobile ela também fica disponível: perfil User Secretaria
  // vê a tabela direto, sem o botão de alternar (fica travado em tabela);
  // os demais perfis mantêm os cards como padrão, com o botão de alternar
  // agora também visível no mobile.
  const tabelaTravadaSecretaria = !isDesktop && perfil === 'user_secretaria';
  const efetivoViewMode: 'cards' | 'tabela' = !podeVisualizarTabela ? 'cards' : tabelaTravadaSecretaria ? 'tabela' : viewMode;

  const [estatisticas, setEstatisticas] = useState<EstatisticasAnuais | null>(null);
  const [loadingEstatisticas, setLoadingEstatisticas] = useState(true);
  const [kpiModal, setKpiModal] = useState<{ titulo: string; corBarra: string; itens: EstatisticaConcursoStatus[] } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [minutaResultados, setMinutaResultados] = useState<string | null>(null);
  const [pendentesFinalizacao, setPendentesFinalizacao] = useState<{ id: string; nome: string }[] | null>(null);
  const [gerandoMinuta, setGerandoMinuta] = useState(false);
  const [registrarMensagemAlvo, setRegistrarMensagemAlvo] = useState<{ id: string; nome: string; criadoEm?: string } | null>(null);
  const [listarMensagensAlvo, setListarMensagensAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [periodoAgendamentoAlvo, setPeriodoAgendamentoAlvo] = useState<{ id: string; nome: string } | null>(null);
  const [adicionarCandidatoAlvo, setAdicionarCandidatoAlvo] = useState<{ id: string; nome: string } | null>(null);
  // Envio dos exames de um candidato pelo menu ⋮ do concurso: o candidato é
  // escolhido no próprio diálogo (autocomplete com os candidatos do concurso).
  const [enviarExamesConcurso, setEnviarExamesConcurso] = useState<ConcursoRecord | null>(null);

  const anoCorrente = new Date().getFullYear();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Contadores em tempo real: uma assinatura por concurso em andamento.
  useEffect(() => {
    const base: Record<string, { total: number; finalizados: number; temLancamento: boolean }> = {};
    concursos.forEach(c => { if (c.status !== 'em_andamento') base[c.id] = { total: c.totalCandidatos, finalizados: 0, temLancamento: false }; });
    setContadores(prev => ({ ...prev, ...base }));
    const offs = concursos.filter(c => c.status === 'em_andamento').map(c =>
      observarCandidatos(c.id, candidatos => {
        const temLancamento = candidatos.some(x => x.status !== '' || x.numTIS !== '' || x.observacoes !== '');
        setContadores(prev => ({ ...prev, [c.id]: { total: candidatos.length, finalizados: candidatos.filter(x => x.finalizado).length, temLancamento } }));
      }),
    );
    return () => offs.forEach(off => off());
  }, [concursos]);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const entradas = await Promise.all(concursos.map(async c => [c.id, (await listarMensagens(c.id)).length] as const));
      if (!cancelado) setMensagensCount(Object.fromEntries(entradas));
    })();
    return () => { cancelado = true; };
  }, [concursos]);

  // Aptos/Inaptos/IDM/Faltas só são buscados quando a visão em tabela é
  // aberta (a visão em cards não precisa dessa quebra por status).
  useEffect(() => {
    if (efetivoViewMode !== 'tabela') return;
    setLoadingStatusCounts(true);
    let restantes = concursos.length;
    if (restantes === 0) setLoadingStatusCounts(false);
    const vistos = new Set<string>();
    const offs = concursos.map(c =>
      observarCandidatos(c.id, lista => {
        setStatusCounts(prev => ({ ...prev, [c.id]: {
          apto: lista.filter(x => x.status === 'APTO').length,
          inapto: lista.filter(x => x.status === 'INAPTO').length,
          faltou: lista.filter(x => x.status === 'FALTOU').length,
          idm: lista.filter(x => x.status === 'INSUF DOCUMENTAL').length,
        } }));
        if (!vistos.has(c.id)) { vistos.add(c.id); if (vistos.size === restantes) setLoadingStatusCounts(false); }
      }, () => setLoadingStatusCounts(false)),
    );
    return () => offs.forEach(off => off());
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

  const GRUPOS_STATUS_ORDEM: { status: ConcursoRecord['status']; titulo: string }[] = [
    { status: 'em_andamento', titulo: 'Em andamento' },
    { status: 'em_breve', titulo: 'Em breve' },
    { status: 'encerrado', titulo: 'Encerrados' },
  ];
  const contagemPorStatus = {
    em_andamento: concursos.filter(c => c.status === 'em_andamento').length,
    em_breve: concursos.filter(c => c.status === 'em_breve').length,
    encerrado: concursos.filter(c => c.status === 'encerrado').length,
  } as Record<ConcursoRecord['status'], number>;
  const statusPadrao: ConcursoRecord['status'] = contagemPorStatus.em_andamento ? 'em_andamento' : contagemPorStatus.em_breve ? 'em_breve' : 'encerrado';
  const statusAtivo = statusSel ?? statusPadrao;
  const anoDe = (c: ConcursoRecord) => (c.periodoInicioISO ? c.periodoInicioISO.slice(0, 4) : '');
  const anosDisponiveis = Array.from(new Set(concursos.map(anoDe).filter(Boolean))).sort().reverse();
  const itensFiltrados = concursos
    .filter(c => c.status === statusAtivo)
    .filter(c => !anoFiltro || anoDe(c) === anoFiltro)
    .filter(c => !busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .sort((a, b) => (a.periodoInicioISO || '9999-99-99').localeCompare(b.periodoInicioISO || '9999-99-99'));

  const montarMenuProps = (c: ConcursoRecord): MenuAcoesConcursoProps => {
    const contagem = contadores[c.id];
    const podeEncerrar = !!contagem && contagem.total > 0 && contagem.finalizados === contagem.total;
    const podeVoltarParaEmBreve = !contagem?.temLancamento;
    return {
      status: c.status,
      podeAbrirEncerrar, podeGerarMinutaResultados, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeEnviarExames,
      podeEncerrar, podeVoltarParaEmBreve,
      minutaHabilitada: c.status === 'encerrado' || podeEncerrar,
      temPeriodoConfigurado: !!c.periodoInicioISO,
      temMensagensRegistradas: !!mensagensCount[c.id],
      onAbrir: () => handleAbrir(c.id, c.nome),
      onVoltarParaEmBreve: () => handleVoltarParaEmBreve(c.id, c.nome),
      onEncerrar: () => handleEncerrar(c.id, c.nome),
      onMinutaResultados: () => handleMinutaResultados(c.id),
      onRegistrarMensagem: () => setRegistrarMensagemAlvo({ id: c.id, nome: c.nome, criadoEm: c.criadoEm }),
      onListarMensagens: () => setListarMensagensAlvo({ id: c.id, nome: c.nome }),
      onDefinirPeriodoAgendamento: () => setPeriodoAgendamentoAlvo({ id: c.id, nome: c.nome }),
      onAdicionarCandidato: () => setAdicionarCandidatoAlvo({ id: c.id, nome: c.nome }),
      onEnviarExames: () => setEnviarExamesConcurso(c),
    };
  };

  const kpiDefs = estatisticas ? [
    { key: 'finalizadas', label: 'IS Ingresso Finalizadas', value: String(estatisticas.totalFinalizadas), corTexto: 'text-green-700', corBarra: 'bg-green', itens: null as EstatisticaConcursoStatus[] | null },
    { key: 'faltas', label: '% de Faltas', value: `${estatisticas.percentualFaltas}%`, corTexto: 'text-gold-ink', corBarra: 'bg-gold', itens: estatisticas.topFaltas },
    { key: 'inaptos', label: '% de Inaptos', value: `${estatisticas.percentualInaptos}%`, corTexto: 'text-wine', corBarra: 'bg-wine', itens: estatisticas.topInaptos },
    { key: 'idm', label: '% de IDM', value: `${estatisticas.percentualIdm}%`, corTexto: 'text-ink-3', corBarra: 'bg-ink-3', itens: estatisticas.topIdm },
  ] : [];

  return (
    <div className="flex flex-col flex-1">

      <Toast message={toastMessage} />

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destrutivo}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => { setConfirmDialog(null); confirmDialog.onCancel?.(); }}
        />
      )}

      {(minutaResultados !== null || pendentesFinalizacao !== null || gerandoMinuta) && (
        <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-navy text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[22px] text-gold">summarize</span>
                <h3 className="font-heading font-bold text-sm">Minuta de Resultados da IS</h3>
              </div>
              <button onClick={() => { setMinutaResultados(null); setPendentesFinalizacao(null); }} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {gerandoMinuta ? (
                <div className="text-center py-8 text-ink-3">
                  <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
                </div>
              ) : pendentesFinalizacao && pendentesFinalizacao.length > 0 ? (
                <>
                  <div className="bg-gold-50 border border-gold-200 rounded-xl p-3">
                    <p className="text-sm font-bold text-gold-800">Ainda há {pendentesFinalizacao.length} candidato(s) não finalizado(s). Finalize todos antes de gerar a minuta de resultados.</p>
                  </div>
                  <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
                    {pendentesFinalizacao.map(p => (
                      <div key={p.id} className="p-2.5 text-sm flex items-center justify-between">
                        <span className="font-mono font-bold text-navy">{p.id}</span>
                        <span className="text-ink">{p.nome}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <textarea readOnly value={minutaResultados ?? ''} rows={16} className="w-full px-3.5 py-2.5 rounded-lg border border-ink-5 text-sm font-mono text-navy focus:outline-none resize-none whitespace-pre-wrap" />
              )}
              <div className="pt-2 flex items-center justify-end space-x-2">
                {minutaResultados && (
                  <button type="button" onClick={() => handleCopiarTexto(minutaResultados)} className="px-4 py-2.5 rounded-xl border border-line text-sm font-bold text-ink hover:bg-thead transition-colors flex items-center space-x-1">
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    <span>Copiar Minuta</span>
                  </button>
                )}
                <button type="button" onClick={() => { setMinutaResultados(null); setPendentesFinalizacao(null); }} className="px-5 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {registrarMensagemAlvo && (
        <ModalRegistrarMensagemArquivo
          concursoId={registrarMensagemAlvo.id}
          concursoNome={registrarMensagemAlvo.nome}
          concursoAno={anoDoConcurso(registrarMensagemAlvo.criadoEm)}
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
      {enviarExamesConcurso && (
        <EnviarExamesModal
          concursos={[enviarExamesConcurso]}
          usuarioNome={navLista?.authUser?.nome}
          onClose={() => setEnviarExamesConcurso(null)}
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

      <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
        <PageHeader
          title="Concursos"
          description="Planilhas de controle dos candidatos de cada concurso."
          actions={(podeRegistrarMensagem || podeImportarCsv) ? (
            <>
              {podeImportarCsv && <Button variant="secondary" icon="upload_file" onClick={onImportarCsvClick}>Importar CSV</Button>}
              {podeRegistrarMensagem && <Button icon="add" onClick={onNovoConcursoClick}>Novo concurso</Button>}
            </>
          ) : undefined}
        />

        {!loadingEstatisticas && estatisticas && (
          <div className="hidden md:grid grid-cols-4 gap-4">
            {kpiDefs.map(def => (
              <KpiMini
                key={def.key}
                label={def.label}
                value={def.value}
                valueClass={def.corTexto}
                onClick={def.itens !== null ? () => setKpiModal({ titulo: def.label, corBarra: def.corBarra, itens: def.itens }) : undefined}
              />
            ))}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
            <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
          </div>
        ) : concursos.length === 0 ? (
          <div className="bg-white rounded-xl border border-line">
            <EmptyState icon="fact_check" title="Nenhum concurso cadastrado" description={podeRegistrarMensagem ? 'Registre a mensagem administrativa inicial para criar o primeiro.' : undefined} />
          </div>
        ) : (
          <>
            {/* Filtros (F43/F46): status em Segmented (padrão: em andamento), ano e busca. */}
            <div className="bg-white rounded-xl border border-line p-4 space-y-3">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <Segmented
                  ariaLabel="Situação do concurso"
                  className="overflow-x-auto"
                  value={statusAtivo}
                  onChange={v => setStatusSel(v)}
                  options={GRUPOS_STATUS_ORDEM.map(g => ({ value: g.status, label: g.titulo, badge: contagemPorStatus[g.status], badgeTone: 'neutro' as const }))}
                />
                {podeVisualizarTabela && !tabelaTravadaSecretaria && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink-3">Visualização</span>
                    <Segmented
                      ariaLabel="Modo de visualização"
                      value={viewMode}
                      onChange={definirViewMode}
                      options={[{ value: 'cards', label: 'Cards', icon: 'grid_view' }, { value: 'tabela', label: 'Tabela', icon: 'table_rows' }]}
                    />
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
                  <input type="search" aria-label="Buscar concurso" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar concurso…" className={`${controlClass} pl-10`} autoComplete="off" />
                </div>
                <select aria-label="Filtrar por ano" value={anoFiltro} onChange={e => setAnoFiltro(e.target.value)} className={`${controlClass} sm:w-44`}>
                  <option value="">Todos os anos</option>
                  {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>

            {itensFiltrados.length === 0 ? (
              <div className="bg-white rounded-xl border border-line">
                <EmptyState icon="fact_check" title="Nenhum concurso neste filtro" description="Troque a situação, o ano ou a busca para ver outros concursos." />
              </div>
            ) : efetivoViewMode === 'tabela' ? (
              <div className="bg-white rounded-xl border border-line overflow-clip overflow-x-auto scroll-x-visible">
                <table className="w-full text-left border-collapse min-w-[860px]">
                  <thead>
                    <tr className="bg-thead border-b border-line text-xs font-semibold text-ink-3">
                      <th scope="col" className="py-3 px-4">Concurso</th>
                      <th scope="col" className="py-3 px-4">Situação</th>
                      <th scope="col" className="py-3 px-4">Período</th>
                      <th scope="col" className="py-3 px-4 text-center">Candidatos</th>
                      <th scope="col" className="py-3 px-4 text-center">Aptos</th>
                      <th scope="col" className="py-3 px-4 text-center">Inaptos</th>
                      <th scope="col" className="py-3 px-4 text-center">IDM</th>
                      <th scope="col" className="py-3 px-4 text-center">Faltas</th>
                      <th scope="col" className="py-3 px-4 text-right"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-sm">
                    {itensFiltrados.map(c => {
                      const sc = statusCounts[c.id];
                      return (
                        <tr key={c.id} onClick={() => onSelecionar(c.id)} className="hover:bg-thead cursor-pointer transition-colors">
                          <td className="py-2 px-4 font-bold text-navy">
                            <button type="button" onClick={e => { e.stopPropagation(); onSelecionar(c.id); }} className="text-left font-bold text-navy hover:underline min-h-[44px]">{c.nome}</button>
                          </td>
                          <td className="py-2 px-4"><ConcursoStatusTag status={c.status} /></td>
                          <td className="py-2 px-4 text-ink-2 whitespace-nowrap">{c.periodoInicioISO ? `${isoParaBR(c.periodoInicioISO)} a ${isoParaBR(c.periodoFimISO)}` : '—'}</td>
                          <td className="py-2 px-4 text-center font-bold text-navy">{celulaNumericaTabela(c.totalCandidatos, c.status)}</td>
                          <td className="py-2 px-4 text-center font-bold text-green-700">{sc ? celulaNumericaTabela(sc.apto, c.status) : (loadingStatusCounts ? '…' : '—')}</td>
                          <td className="py-2 px-4 text-center font-bold text-wine">{sc ? celulaNumericaTabela(sc.inapto, c.status) : (loadingStatusCounts ? '…' : '—')}</td>
                          <td className="py-2 px-4 text-center font-bold text-navy">{sc ? celulaNumericaTabela(sc.idm, c.status) : (loadingStatusCounts ? '…' : '—')}</td>
                          <td className="py-2 px-4 text-center font-bold text-navy">{sc ? celulaNumericaTabela(sc.faltou, c.status) : (loadingStatusCounts ? '…' : '—')}</td>
                          <td className="py-2 px-4 text-right" onClick={e => e.stopPropagation()}>
                            <MenuAcoesConcurso {...montarMenuProps(c)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:items-start">
              <div className="grid grid-cols-1 gap-3">
                {itensFiltrados.map(c => {
                  const contagem = contadores[c.id];
                  return (
                    <div key={c.id} className="rounded-xl border border-line bg-white overflow-clip flex flex-col">
                      <div className="flex items-stretch flex-1">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelecionar(c.id)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelecionar(c.id); }}
                          className="text-left p-4 flex-1 min-w-0 hover:bg-thead transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-heading font-bold text-h2 text-navy truncate">{c.nome}</h3>
                            <MenuAcoesConcurso {...montarMenuProps(c)} />
                          </div>
                          <div className="mb-2"><ConcursoStatusTag status={c.status} /></div>
                          <p className="text-base font-bold text-navy">{c.totalCandidatos} candidato(s)</p>
                          {c.status === 'em_andamento' && contagem && contagem.total > 0 && (
                            <ProgressBar className="mt-2" atual={contagem.finalizados} total={contagem.total} unidade="finalizados" />
                          )}
                          {c.periodoInicioISO && (
                            <p className="text-sm text-ink-2 mt-1">{isoParaBR(c.periodoInicioISO)} a {isoParaBR(c.periodoFimISO)}</p>
                          )}
                        </div>
                      </div>
                      {podeAbrirEncerrar && c.status === 'em_breve' && (
                        <button
                          type="button"
                          onClick={() => handleAbrir(c.id, c.nome)}
                          className="px-4 min-h-[44px] border-t border-line text-sm font-bold text-navy hover:bg-thead transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">play_circle</span>
                          <span>Abrir concurso</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="hidden lg:block lg:sticky lg:top-4">
                <CalendarioConcursos dias={diasConcursos} onSelecionarDia={d => navLista?.navigate(concursosDiaPath(d))} />
              </div>
              </div>
            )}
          </>
        )}
            </Container>
    </div>
  );
};

// =========================================================================
// DETALHE DO CONCURSO (tabela de candidatos)
// =========================================================================

// =========================================================================
// REGISTRO DE EVENTOS (log de auditoria da IS) — exclusivo do Admin
// =========================================================================

const formatarDataHora = (d: Date | null) =>
  d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

const ModalRegistroEventos: React.FC<{ concursoId: string; candidato: { id: string; nome: string }; onClose: () => void }> = ({ concursoId, candidato, onClose }) => {
  const [eventos, setEventos] = useState<EventoIS[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    listarEventos(concursoId, candidato.id)
      .then(l => { if (ativo) setEventos(l); })
      .catch(() => { if (ativo) setErro('Não foi possível carregar o registro de eventos.'); });
    return () => { ativo = false; };
  }, [concursoId, candidato.id]);

  return (
    <Dialog title={`Registro de Eventos — ${candidato.nome}`} icon="history" size="lg" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <p className="text-xs text-ink-3 mb-3">Matrícula {candidato.id}. Cada ação da IS é registrada com a data, a hora e o usuário.</p>
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>
      ) : eventos === null ? (
        <p className="py-6 text-center text-ink-3" role="status">Carregando…</p>
      ) : eventos.length === 0 ? (
        <EmptyState icon="history" title="Nenhum evento registrado" description="As ações feitas a partir de agora nesta IS aparecerão aqui." />
      ) : (
        <ul className="divide-y divide-line border border-line rounded-lg">
          {eventos.map(ev => (
            <li key={ev.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-bold text-navy">{ev.acao}</span>
                <span className="text-xs text-ink-3 whitespace-nowrap">{formatarDataHora(ev.em)}</span>
              </div>
              {ev.detalhe && <p className="text-sm text-ink-2 break-words mt-0.5">{ev.detalhe}</p>}
              <p className="text-xs text-ink-3 mt-0.5">por {ev.usuario || ev.nome || '—'}</p>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
};

interface ConcursoDetalheProps {
  concursoId: string;
  onVoltar: () => void;
  /** Abre já filtrado neste dia (AAAA-MM-DD). */
  dataFixa?: string;
  /** Dentro da página do dia: sem migalha própria nem toolbar fixa (várias tabelas empilhadas). */
  embutido?: boolean;
}

const ConcursoDetalhe: React.FC<ConcursoDetalheProps> = ({ concursoId, onVoltar, dataFixa, embutido = false }) => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const podeEditarInlineBase = canUseFeature('concursosJRS.editarDadosTabela', perfil);
  const podeReagendarBase = canUseFeature('concursosJRS.reagendar', perfil);
  const podeAbrirEncerrar = canUseFeature('concursosJRS.abrirEncerrarConcurso', perfil);
  // Só médicos (user_medicos/admin, ou MPI escolhendo o responsável) geram o termo; a secretaria só visualiza.
  const podeGerarTermoBase = canUseFeature('concursosJRS.gerarTermoRecurso', perfil);
  const [responsavelModal, setResponsavelModal] = useState<{ id: string; nome: string } | null>(null);
  // Matrículas com geração do termo em andamento (o ícone mostra um spinner).
  const [gerandoTermoIds, setGerandoTermoIds] = useState<Set<string>>(new Set());
  const marcarGerandoTermo = (id: string, gerando: boolean) =>
    setGerandoTermoIds(prev => {
      const proximo = new Set(prev);
      if (gerando) proximo.add(id); else proximo.delete(id);
      return proximo;
    });
  const [showDefinirPeriodoModal, setShowDefinirPeriodoModal] = useState(false);

  const [concurso, setConcurso] = useState<ConcursoRecord | null>(null);
  const [candidatos, setCandidatos] = useState<CandidatoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  useBreadcrumbs(embutido ? null : [{ label: concurso?.nome || 'Concurso' }]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);

  const [statusKpiFilter, setStatusKpiFilter] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'todos' | 'hoje' | 'semana' | 'personalizado'>(dataFixa ? 'personalizado' : 'todos');
  const [dateFilterCustom, setDateFilterCustom] = useState<string | null>(dataFixa ?? null);
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showDateCalendar, setShowDateCalendar] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  // Modal do motivo nas Observações: CID (Inapto) ou exames/documentos (Insuf. Documental).
  // obrigatorio: primeira marcação do status (não dá para dispensar).
  // numTIS: preenchido quando o modal foi aberto ao digitar o Nº TIS de uma IS sem motivo.
  const [motivoModal, setMotivoModal] = useState<{ candidato: CandidatoRecord; tipo: 'CID' | 'IDM'; obrigatorio: boolean; numTIS?: string } | null>(null);
  const [numTisResetKey, setNumTisResetKey] = useState(0);

  const [datasAgendamento, setDatasAgendamento] = useState<DataAgendamentoInfo[]>([]);
  const [loadingDatasAgendamento, setLoadingDatasAgendamento] = useState(false);

  const [reagendandoCandidato, setReagendandoCandidato] = useState<CandidatoRecord | null>(null);
  const [confirmandoReagendamento, setConfirmandoReagendamento] = useState(false);
  // Mobile: item da lista abre um modal full-screen com os detalhes da IS
  // (Status/Observações editáveis, Nº TIS somente leitura, ações) em vez da
  // edição inline usada no desktop.
  const [candidatoModalMobile, setCandidatoModalMobile] = useState<CandidatoRecord | null>(null);
  // Mobile: botão de voltar flutuante sobre a lista ao rolar + botão de
  // voltar ao topo (ver JSX mais abaixo).
  const isDesktop = useIsDesktop();
  // Pasta do concurso no Drive (CONCURSOS > ano > concurso): onde ficam os PDFs gerados.
  const pastaDrive = (): PastaConcurso => {
    if (!concurso) throw new Error('Concurso ainda não carregado. Aguarde um instante e tente de novo.');
    return { nome: concurso.nome, ano: anoDoConcurso(concurso.criadoEm) };
  };
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [mostrarBotaoTopo, setMostrarBotaoTopo] = useState(false);
  // Toolbar (busca + filtros) e cabeçalho de colunas ficam fixos ao rolar a
  // planilha; o cabeçalho precisa saber a altura da toolbar para encostar
  // logo abaixo dela, mesmo quando os filtros quebram de linha.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarAltura, setToolbarAltura] = useState(0);
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const medir = () => setToolbarAltura(el.offsetHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Accordion por data: uma data só vira accordion (recolhida por padrão)
  // quando todas as IS daquele dia estão finalizadas — e isso é desprezado
  // enquanto houver algum filtro ativo (busca, status ou data).
  const [openDateGroups, setOpenDateGroups] = useState<Set<string>>(new Set());

  // Quem rola a planilha é o ancestral de rolagem do app (o shell), não este
  // contêiner — por isso a toolbar e o cabeçalho de colunas usam `sticky`.
  const rolarAoTopo = () => {
    const el = getScrollParent(scrollContainerRef.current);
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    const el = getScrollParent(scrollContainerRef.current);
    const alvo: HTMLElement | Window = el ?? window;
    const handleScroll = () => setMostrarBotaoTopo((el ? el.scrollTop : window.scrollY) > 300);
    alvo.addEventListener('scroll', handleScroll);
    return () => alvo.removeEventListener('scroll', handleScroll);
  }, []);

  const podeEditar = podeEditarInlineBase && concurso?.status === 'em_andamento';
  const podeReagendar = podeReagendarBase && concurso?.status === 'em_andamento';
  // Reagendar só faz sentido enquanto a IS não tem laudo (Apto, Inapto, Insuf. Documental ou Faltou).
  const podeReagendarCandidato = (c: CandidatoRecord) =>
    podeReagendar && !c.finalizado && !MAPA_LAUDO_POR_STATUS[String(c.status || '').trim().toUpperCase()];
  // Nº TIS só é habilitado quando o Status já tem laudo associado (Apto,
  // Inapto, Faltou ou Insuf. Documental) — ver MAPA_LAUDO_POR_STATUS.
  const statusTemLaudo = (status: string) => !!MAPA_LAUDO_POR_STATUS[String(status || '').trim().toUpperCase()];

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

  // Tempo real: o concurso e os candidatos são assinados no Firestore, então
  // lançamentos de outros usuários aparecem sem recarregar a página.
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    let pendentes = 2;
    const pronto = () => { if (--pendentes === 0) setLoading(false); };
    let primeiroC = true, primeiroL = true;
    const erro = (e: Error) => { setLoadError(e?.message || 'Não foi possível carregar os candidatos.'); setLoading(false); };
    const offC = observarConcurso(concursoId, c => { setConcurso(c); if (primeiroC) { primeiroC = false; pronto(); } }, erro);
    const offL = observarCandidatos(concursoId, l => { setCandidatos(l); if (primeiroL) { primeiroL = false; pronto(); } }, erro);
    return () => { offC(); offL(); };
  }, [concursoId]);

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

  // Termo de Cientificação de Resultado: qualquer perfil gera/visualiza (só o candidato assina).
  // Apto/Insuf. Documental: ícone na planilha assim que o status cumpre as exigências.
  const [gerandoCientIds, setGerandoCientIds] = useState<Set<string>>(new Set());
  const marcarGerandoCient = (id: string, gerando: boolean) =>
    setGerandoCientIds(prev => {
      const proximo = new Set(prev);
      if (gerando) proximo.add(id); else proximo.delete(id);
      return proximo;
    });
  // Não espera o Nº TIS (que finaliza e trava a IS): basta o preenchimento exigido pelo Status —
  // Apto só o status; Insuf. Documental também o motivo nas Observações. Inapto não entra aqui:
  // o Termo de Cientificação vai anexado ao PDF do Termo de Recurso (ver gerarTermo).
  const podeGerarCientificacao = (c: CandidatoRecord) =>
    !c.termoCientificacaoUrl && (c.status === 'APTO' || (c.status === 'INSUF DOCUMENTAL' && !!c.observacoes.trim()));

  const pedirPdfCientificacao = async (id: string, nome: string, status: string): Promise<string> => {
    const res = await fetch(GAS_URL_TERMO_RECURSO, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'gerarTermoCientificacao',
        candidatoId: id,
        candidatoNome: nome,
        nomeConcurso: concurso?.nome || '',
        status,
      }),
    });
    const json = await res.json();
    if (!json.sucesso) throw new Error(json.erro || 'Erro ao gerar o Termo de Cientificação.');
    return json.dados.pdfBase64;
  };

  const gerarTermoCientificacao = async (id: string, nome: string, status: string, abrir: boolean) => {
    if (gerandoCientIds.has(id)) return;
    marcarGerandoCient(id, true);
    try {
      const pdfBase64 = await pedirPdfCientificacao(id, nome, status);
      const url = await salvarPdfCandidatoNoDrive({ pasta: pastaDrive(), candidatoId: id, candidatoNome: nome, tipo: 'termoCientificacao', pdfBase64 });
      await salvarTermoCientificacao(concursoId, id, url);
      setCandidatos(prev => prev.map(c => (c.id === id ? { ...c, termoCientificacaoUrl: url } : c)));
      showToast(`Termo de Cientificação gerado para ${nome}.`);
      if (abrir) abrirPdf(url);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar o Termo de Cientificação.');
    } finally {
      marcarGerandoCient(id, false);
    }
  };

  // Pedido de Parecer / Solicitação de Exames (menu ⋮ da coluna Ações). Quem pode: admin,
  // user_medicos e user_medicos_mpi — o próprio usuário assina; secretaria não vê o menu.
  const podeSolicitarBase = canUseFeature('concursosJRS.solicitarParecerExames', perfil);
  // Exames entregues pelo candidato (PDF no Drive + transcrição pelo Gemini): enviar
  // depende de permissão; ler a transcrição já enviada é liberado a quem abre a planilha.
  const podeEnviarExames = canUseFeature('concursosJRS.enviarExamesCandidato', perfil);
  const [enviarExamesAlvo, setEnviarExamesAlvo] = useState<AlvoExames | null>(null);
  const [verExamesAlvo, setVerExamesAlvo] = useState<CandidatoRecord | null>(null);
  const [solicitacaoModal, setSolicitacaoModal] = useState<{ tipo: 'parecer' | 'exames'; candidato: CandidatoRecord } | null>(null);
  const [gerandoSolicitacaoIds, setGerandoSolicitacaoIds] = useState<Set<string>>(new Set());
  const [menuAcoes, setMenuAcoes] = useState<{ id: string; top: number; right: number } | null>(null);
  // Desktop: clicar na linha (fora dos campos editáveis e dos botões) abre o detalhamento da IS à direita.
  const [detalheCandidatoId, setDetalheCandidatoId] = useState<string | null>(null);
  const abrirDetalheDaLinha = (e: React.MouseEvent<HTMLElement>, id: string) => {
    const alvo = e.target as HTMLElement;
    // Ignora cliques nos controles (inclusive menus em portal, que borbulham pela árvore do React).
    if (!e.currentTarget.contains(alvo) || alvo.closest('input, select, textarea, button, a, label, [role="combobox"], [role="listbox"], [role="option"], [role="menu"]')) return;
    setDetalheCandidatoId(id);
  };
  const [eventosAlvo, setEventosAlvo] = useState<{ id: string; nome: string } | null>(null);
  const statusPermiteSolicitacao = (c: CandidatoRecord) =>
    !c.finalizado && STATUS_PERMITEM_SOLICITACAO.includes(String(c.status || '').trim().toUpperCase());

  // Quem não gera (ex.: secretaria) só enxerga o menu quando há documento para visualizar.
  const qtdSolicitacoes = (c: CandidatoRecord) => c.solicitacoesParecer.length + c.solicitacoesExames.length;
  // Editar/Limpar: exclusivos do perfil Admin (nem desabilitados para os demais).
  const ehAdmin = perfil === 'admin';
  // Limpar só faz sentido se há algum PDF gerado (termos, pareceres ou exames).
  const temDocumentoGerado = (c: CandidatoRecord) =>
    !!(c.termoRecursoUrl || c.termoCientificacaoUrl) || qtdSolicitacoes(c) > 0 || c.examesQtd > 0;
  const temSolicitacaoGerada = (c: CandidatoRecord) => qtdSolicitacoes(c) > 0;
  const mostrarMenuAcoes = (c: CandidatoRecord) => podeSolicitarBase || temSolicitacaoGerada(c) || ehAdmin || podeEnviarExames;

  // Exames do candidato: a pasta no Drive sai do concurso, igual aos termos.
  const alvoExames = (c: CandidatoRecord): AlvoExames | null => {
    if (!concurso) return null;
    return {
      concursoId,
      concursoNome: concurso.nome,
      concursoAno: anoDoConcurso(concurso.criadoEm),
      candidatoId: c.id,
      candidatoNome: c.nome,
    };
  };
  const handleEnviarExames = (c: CandidatoRecord) => {
    setMenuAcoes(null);
    setCandidatoModalMobile(null);
    const alvo = alvoExames(c);
    if (!alvo) { showToast('Concurso ainda não carregado. Aguarde um instante e tente de novo.'); return; }
    setEnviarExamesAlvo(alvo);
  };
  const handleVerExames = (c: CandidatoRecord) => {
    setMenuAcoes(null);
    setCandidatoModalMobile(null);
    setVerExamesAlvo(c);
  };

  useEffect(() => {
    if (!menuAcoes) return;
    const fechar = () => setMenuAcoes(null);
    const aoTecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    window.addEventListener('keydown', aoTecla);
    return () => {
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
      window.removeEventListener('keydown', aoTecla);
    };
  }, [menuAcoes]);

  const abrirMenuAcoes = (e: React.MouseEvent<HTMLElement>, id: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenuAcoes(prev => (prev?.id === id ? null : { id, top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) }));
  };

  // Gerar abre o diálogo e continua disponível após gerar (uma IS pode precisar de vários pareceres/pedidos de exames).
  const handleGerarSolicitacao = (tipo: 'parecer' | 'exames', c: CandidatoRecord) => {
    setMenuAcoes(null);
    if (!statusPermiteSolicitacao(c) || gerandoSolicitacaoIds.has(c.id)) return;
    setSolicitacaoModal({ tipo, candidato: c });
  };

  const handleVerSolicitacao = (doc: SolicitacaoDoc) => {
    setMenuAcoes(null);
    abrirPdf(doc.url);
  };

  // Admin — Editar: reabre a IS finalizada (apaga o Nº TIS).
  const handleEditarIS = (c: CandidatoRecord) => {
    setMenuAcoes(null);
    setCandidatoModalMobile(null);
    setConfirmDialog({
      title: 'Editar IS',
      message: `Reabrir a IS de ${c.nome} para edição? O Nº TIS será apagado.`,
      confirmLabel: 'Reabrir IS',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const atualizado = await reabrirIS(concursoId, c.id);
          setCandidatos(prev => prev.map(x => (x.id === c.id ? atualizado : x)));
          showToast(`IS de ${c.nome} reaberta para edição.`);
        } catch (e: any) {
          showToast(e?.message || 'Erro ao reabrir a IS.');
        }
      },
    });
  };

  // Admin — Limpar: apaga todas as colunas da IS e todos os documentos gerados.
  const handleLimparIS = (c: CandidatoRecord) => {
    setMenuAcoes(null);
    setCandidatoModalMobile(null);
    setConfirmDialog({
      title: 'Limpar IS',
      message: `Limpar toda a IS de ${c.nome}? O Status volta a "Sem status" e serão apagados Observações, Nº TIS, laudo, todos os documentos gerados (termo de recurso, termo de cientificação, pareceres e pedidos de exames) e os exames entregues pelo candidato (PDF no Drive e transcrição). Esta ação não pode ser desfeita.`,
      confirmLabel: 'Limpar IS',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const atualizado = await limparIS(concursoId, c.id);
          setCandidatos(prev => prev.map(x => (x.id === c.id ? atualizado : x)));
          showToast(`IS de ${c.nome} limpa.`);
        } catch (e: any) {
          showToast(e?.message || 'Erro ao limpar a IS.');
        }
      },
    });
  };

  const gerarSolicitacao = async (
    tipo: 'parecer' | 'exames',
    candidato: CandidatoRecord,
    dados: { especialidade?: string; historico?: string; exames?: string },
  ) => {
    setSolicitacaoModal(null);
    const id = candidato.id;
    setGerandoSolicitacaoIds(prev => new Set(prev).add(id));
    try {
      const res = await fetch(GAS_URL_TERMO_RECURSO, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: tipo === 'parecer' ? 'gerarSolicitacaoParecer' : 'gerarSolicitacaoExames',
          candidatoId: id,
          candidatoNome: candidato.nome,
          nomeConcurso: concurso?.nome || '',
          ...dados,
          nomeUsuario: nav?.authUser?.nome || '',
          postoGraduacao: nav?.authUser?.postoGraduacao || '',
          cargo: nav?.authUser?.cargo || '',
          crmPe: nav?.authUser?.crmPe || '',
          email: nav?.authUser?.email || '',
        }),
      });
      const json = await res.json();
      if (!json.sucesso) throw new Error(json.erro || 'Erro ao gerar o documento.');

      const url = await salvarPdfCandidatoNoDrive({ pasta: pastaDrive(), candidatoId: id, candidatoNome: candidato.nome, tipo: tipo === 'parecer' ? 'solicitacaoParecer' : 'solicitacaoExames', pdfBase64: json.dados.pdfBase64 });
      const observacao = tipo === 'parecer'
        ? `SOLICITADO PARECER ${(dados.especialidade || '').toUpperCase()}`
        : `SOLICITADO ${(dados.exames || '').split(/\s*\n\s*/).filter(Boolean).join('; ')}`;
      const rotulo = tipo === 'parecer'
        ? (dados.especialidade || 'Parecer')
        : ((dados.exames || '').split(/\s*\n\s*/).filter(Boolean)[0] || 'Exames').slice(0, 40);
      const atualizado = await registrarSolicitacao(concursoId, id, tipo, { url, rotulo }, observacao);
      setCandidatos(prev => prev.map(c => (c.id === id ? atualizado : c)));
      const titulo = tipo === 'parecer' ? 'Pedido de Parecer' : 'Solicitação de Exames';
      showToast(`${titulo} gerado para ${candidato.nome}.`);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar o documento.');
    } finally {
      setGerandoSolicitacaoIds(prev => {
        const proximo = new Set(prev);
        proximo.delete(id);
        return proximo;
      });
    }
  };

  // Indicador de salvamento por linha (F52): salvando → salvo (some em 3 s) ou falhou (fica até a próxima tentativa).
  const [estadoSalvar, setEstadoSalvar] = useState<Record<string, 'salvando' | 'salvo' | 'falhou'>>({});
  const marcarSalvar = (id: string, estado: 'salvando' | 'salvo' | 'falhou' | null) =>
    setEstadoSalvar(prev => {
      const proximo = { ...prev };
      if (estado) proximo[id] = estado; else delete proximo[id];
      return proximo;
    });

  const salvarCampoCandidato = async (candidato: CandidatoRecord, patch: { status?: string; observacoes?: string; numTIS?: string }) => {
    marcarSalvar(candidato.id, 'salvando');
    try {
      const atualizado = await atualizarCandidato(concursoId, candidato.id, patch);
      setCandidatos(prev => prev.map(c => (c.id === atualizado.id ? atualizado : c)));
      marcarSalvar(candidato.id, 'salvo');
      window.setTimeout(() => setEstadoSalvar(prev => (prev[candidato.id] === 'salvo' ? (({ [candidato.id]: _omit, ...resto }) => resto)(prev) : prev)), 3000);
      return atualizado;
    } catch (e: any) {
      marcarSalvar(candidato.id, 'falhou');
      showToast(e?.message || 'Erro ao salvar alterações.');
      return null;
    }
  };

  type SignatarioTermo = { nome: string; postoGraduacao: string; cargo: string };

  // Ponto de entrada da geração do termo. Quem assina é sempre médico da JRS:
  // user_medicos/admin assinam com o próprio nome; o MPI escolhe, no modal, o
  // médico responsável pela IS.
  const handleGerarTermo = (id: string, nome: string) => {
    if (!podeGerarTermoBase) return;
    if (perfil === 'user_medicos_mpi') {
      setResponsavelModal({ id, nome });
      return;
    }
    gerarTermo(id, nome, {
      nome: nav?.authUser?.nome || '',
      postoGraduacao: nav?.authUser?.postoGraduacao || '',
      cargo: nav?.authUser?.cargo || '',
    });
  };

  const handleResponsavelEscolhido = (medico: UsuarioRecord) => {
    const alvo = responsavelModal;
    setResponsavelModal(null);
    if (!alvo) return;
    gerarTermo(alvo.id, alvo.nome, { nome: medico.nome, postoGraduacao: medico.postoGraduacao, cargo: medico.cargo });
  };

  const gerarTermo = async (id: string, nome: string, signatario: SignatarioTermo) => {
    if (gerandoTermoIds.has(id)) return;
    marcarGerandoTermo(id, true);
    try {
      const candidato = candidatos.find(c => c.id === id);
      // Inapto: o PDF único leva o Termo de Recurso (1ª página) e o Termo de Cientificação (anexado).
      const cientificacaoPromise = pedirPdfCientificacao(id, nome, 'INAPTO');
      cientificacaoPromise.catch(() => {}); // o erro é tratado quando a promise é aguardada abaixo
      const res = await fetch(GAS_URL_TERMO_RECURSO, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'gerarTermoRecurso',
          candidatoId: id,
          candidatoNome: nome,
          nomeConcurso: concurso?.nome || '',
          dataLaudo: candidato?.dataLaudo || '',
          nomeUsuario: signatario.nome,
          postoGraduacao: signatario.postoGraduacao,
          cargo: signatario.cargo,
        }),
      });
      const json = await res.json();
      if (!json.sucesso) throw new Error(json.erro || 'Erro ao gerar o Termo de Recurso.');

      const pdfUnico = await juntarPdfsBase64([json.dados.pdfBase64, await cientificacaoPromise]);
      const url = await salvarPdfCandidatoNoDrive({ pasta: pastaDrive(), candidatoId: id, candidatoNome: nome, tipo: 'termoRecurso', pdfBase64: pdfUnico });
      await salvarTermoRecurso(concursoId, id, url);
      setCandidatos(prev => prev.map(c => (c.id === id ? { ...c, recurso: true, termoRecursoUrl: url } : c)));
      showToast(`Termo de Recurso e Cientificação gerados para ${nome}.`);
    } catch (e: any) {
      showToast(e?.message || 'Erro ao gerar o Termo de Recurso.');
    } finally {
      marcarGerandoTermo(id, false);
    }
  };

  const handleStatusChange = (candidato: CandidatoRecord, novoStatus: string) => {
    // Já existe Termo de Cientificação (do status atual): confirma antes, pois ele será apagado.
    if ((candidato.termoCientificacaoUrl || candidato.termoRecursoUrl) && novoStatus !== candidato.status) {
      const termoApagado = candidato.termoRecursoUrl ? 'Termo de Recurso e Cientificação' : 'Termo de Cientificação de Resultado';
      setConfirmDialog({
        title: 'Alterar Status',
        message: `${candidato.nome} já possui ${termoApagado} gerado. Ao alterar o Status, o termo gerado será apagado. Deseja continuar?`,
        confirmLabel: 'Alterar e apagar termo',
        onConfirm: () => {
          setConfirmDialog(null);
          aplicarMudancaStatus(candidato, novoStatus);
        },
      });
      return;
    }
    aplicarMudancaStatus(candidato, novoStatus);
  };

  const aplicarMudancaStatus = (candidato: CandidatoRecord, novoStatus: string) => {
    if (novoStatus === 'INAPTO' && candidato.status !== 'INAPTO') {
      setConfirmDialog({
        title: 'Confirmar Status',
        message: `Registrar ${candidato.nome} como inapto hoje (${new Date().toLocaleDateString('pt-BR')})?`,
        confirmLabel: 'Confirmar',
        onConfirm: async () => {
          setConfirmDialog(null);
          // Vindo de Insuf. Documental, o motivo anterior perde o sentido: apaga.
          const patchInapto = candidato.status === 'INSUF DOCUMENTAL' ? { status: novoStatus, observacoes: '' } : { status: novoStatus };
          const atualizado = await salvarCampoCandidato(candidato, patchInapto);
          if (atualizado) {
            showToast(`Dados de ${atualizado.nome} atualizados com sucesso.`);
            if (!podeGerarTermoBase) {
              setMotivoModal({ candidato: atualizado, tipo: 'CID', obrigatorio: true });
              return;
            }
            setConfirmDialog({
              title: 'Gerar Termo de Recurso',
              message: `Gerar o termo de Cientificação de Recurso para ${atualizado.nome}?`,
              confirmLabel: 'Gerar Termo',
              onConfirm: () => { setConfirmDialog(null); handleGerarTermo(atualizado.id, atualizado.nome); setMotivoModal({ candidato: atualizado, tipo: 'CID', obrigatorio: true }); },
              onCancel: () => setMotivoModal({ candidato: atualizado, tipo: 'CID', obrigatorio: true }),
            });
          }
        },
      });
      return;
    }
    // Insuf. Documental: salva o status e pede o motivo (exames/documentos) no modal.
    if (novoStatus === 'INSUF DOCUMENTAL' && candidato.status !== 'INSUF DOCUMENTAL') {
      salvarCampoCandidato(candidato, { status: novoStatus, observacoes: '' }).then(atualizado => {
        if (!atualizado) return;
        showToast(`Dados de ${atualizado.nome} atualizados com sucesso.`);
        setMotivoModal({ candidato: atualizado, tipo: 'IDM', obrigatorio: true });
        // O Termo de Cientificação só depende do status: já é gerado em segundo plano (visualiza-se pelo ícone).
        gerarTermoCientificacao(atualizado.id, atualizado.nome, 'INSUF DOCUMENTAL', false);
      });
      return;
    }
    // Saindo de Inapto/Insuf. Documental, o CID ou motivo nas Observações perde o sentido: apaga.
    const saindoDeMotivo = (candidato.status === 'INAPTO' || candidato.status === 'INSUF DOCUMENTAL') && novoStatus !== candidato.status;
    const patch = saindoDeMotivo ? { status: novoStatus, observacoes: '' } : { status: novoStatus };
    salvarCampoCandidato(candidato, patch).then(atualizado => {
      if (!atualizado) return;
      showToast(`Dados de ${atualizado.nome} atualizados com sucesso.`);
      // Apto: o Termo de Cientificação é gerado em segundo plano (visualiza-se pelo ícone, sem abrir sozinho).
      if (atualizado.status === 'APTO' && candidato.status !== 'APTO') {
        gerarTermoCientificacao(atualizado.id, atualizado.nome, 'APTO', false);
      }
    });
  };

  // Escolha no modal de motivo: grava o texto (DESCRABREV do CID ou lista de
  // exames da IDM) nas Observações, sobrescrevendo o que houvesse (e o Nº TIS,
  // se o modal veio do campo Nº TIS).
  const handleMotivoSelecionado = (descrAbrev: string) => {
    if (!motivoModal) return;
    const { candidato, numTIS } = motivoModal;
    setMotivoModal(null);
    const patch = numTIS ? { observacoes: descrAbrev, numTIS } : { observacoes: descrAbrev };
    salvarCampoCandidato(candidato, patch).then(atualizado => {
      if (atualizado) showToast(atualizado.finalizado ? `IS de ${atualizado.nome} finalizada.` : `Dados de ${atualizado.nome} atualizados com sucesso.`);
    });
  };

  const handleMotivoFechado = () => {
    // Se o modal veio do Nº TIS, descarta o valor digitado (nada foi salvo).
    if (motivoModal?.numTIS) setNumTisResetKey(k => k + 1);
    setMotivoModal(null);
  };

  const handleObservacoesBlur = (candidato: CandidatoRecord, valor: string) => {
    if (valor === candidato.observacoes) return;
    salvarCampoCandidato(candidato, { observacoes: valor }).then(atualizado => {
      if (atualizado) showToast(atualizado.finalizado ? `IS de ${atualizado.nome} finalizada.` : `Dados de ${atualizado.nome} atualizados com sucesso.`);
    });
  };

  // Único lugar onde o Nº TIS é editável (desktop — ver "Mobile: Nº TIS
  // nunca editável"). Decide, a partir do Status atual, se finaliza de
  // imediato (Apto/Faltou — Observações são limpas automaticamente pelo
  // backend), se já finaliza porque já há Observações (Inapto/Insuf.
  // Documental), ou se precisa reter o valor e pedir o motivo.
  const handleNumTisBlur = (candidato: CandidatoRecord, valor: string) => {
    const trimmed = valor.trim();
    if (trimmed === (candidato.numTIS || '').trim()) return;

    const statusUpper = String(candidato.status || '').trim().toUpperCase();
    const temLaudo = !!MAPA_LAUDO_POR_STATUS[statusUpper];

    if (!trimmed || !temLaudo) {
      salvarCampoCandidato(candidato, { numTIS: trimmed });
      return;
    }

    if (statusUpper === 'APTO' || statusUpper === 'FALTOU') {
      salvarCampoCandidato(candidato, { numTIS: trimmed }).then(atualizado => {
        if (atualizado) showToast(`IS de ${atualizado.nome} finalizada.`);
      });
      return;
    }

    // INAPTO ou INSUF. DOCUMENTAL: só finaliza se já houver o motivo nas Observações.
    if ((candidato.observacoes || '').trim()) {
      salvarCampoCandidato(candidato, { numTIS: trimmed }).then(atualizado => {
        if (atualizado) showToast(`IS de ${atualizado.nome} finalizada.`);
      });
      return;
    }

    // Inapto sem CID / Insuf. Documental sem motivo: pede o motivo no modal e
    // grava Nº TIS + motivo juntos (se o modal for fechado, nada é salvo).
    setMotivoModal({ candidato, tipo: statusUpper === 'INAPTO' ? 'CID' : 'IDM', obrigatorio: false, numTIS: trimmed });
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
    { key: 'apto', label: 'Aptos', value: countApto, filterValue: 'APTO', corAtivo: 'bg-navy border-navy text-white' },
    { key: 'inapto', label: 'Inaptos', value: countInapto, filterValue: 'INAPTO', corAtivo: 'bg-navy border-navy text-white' },
    { key: 'insuf', label: 'IDM', value: countInsuf, filterValue: 'INSUF DOCUMENTAL', corAtivo: 'bg-navy border-navy text-white' },
    { key: 'faltou', label: 'Faltas', value: countFaltou, filterValue: 'FALTOU', corAtivo: 'bg-navy border-navy text-white' },
    { key: 'nao-finalizados', label: 'Não Finalizados', value: countNaoFinalizados, filterValue: 'nao-finalizados', corAtivo: 'bg-navy border-navy text-white' },
  ];

  const sugestoesCandidatos = useMemo(() => {
    if (!search.trim()) return [];
    const termo = search.toLowerCase();
    return candidatos
      .filter(c => c.nome.toLowerCase().includes(termo) || c.id.toLowerCase().includes(termo))
      .slice(0, 6);
  }, [candidatos, search]);

  // Nenhum filtro ativo = nenhuma busca, chip de status ou data selecionados
  // — condição para o grupo de uma data poder virar accordion (ver abaixo).
  const filtrosAtivos = !!search.trim() || !!statusKpiFilter || dateFilterMode !== 'todos';

  const gruposPorData = useMemo(() => {
    const grupos: { dataBR: string; itens: typeof filteredCandidatos; finalizado: boolean }[] = [];
    filteredCandidatos.forEach(c => {
      const label = c.dataAgendamentoBR || 'Sem data';
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dataBR === label) ultimo.itens.push(c);
      else grupos.push({ dataBR: label, itens: [c], finalizado: false });
    });
    grupos.forEach(g => { g.finalizado = g.itens.every(c => c.finalizado); });
    return grupos;
  }, [filteredCandidatos]);

  // F57: resumo do dia ("8 aptos · 1 inapto · 1 falta") e F59: próximo candidato a atender.
  const resumoDoGrupo = (itens: { status: string; finalizado: boolean }[]) => {
    const n = (st: string) => itens.filter(c => c.status === st).length;
    const partes: string[] = [];
    const add = (q: number, um: string, varios: string) => { if (q > 0) partes.push(`${q} ${q === 1 ? um : varios}`); };
    add(n('APTO'), 'apto', 'aptos');
    add(n('INAPTO'), 'inapto', 'inaptos');
    add(n('INSUF DOCUMENTAL'), 'IDM', 'IDM');
    add(n('FALTOU'), 'falta', 'faltas');
    add(itens.filter(c => !c.finalizado).length, 'pendente', 'pendentes');
    return partes.join(' · ');
  };
  const proximoCandidatoId = filteredCandidatos.find(c => !c.finalizado)?.id ?? null;

  const toggleDateGroup = (dataBR: string) => {
    setOpenDateGroups(prev => {
      const next = new Set(prev);
      if (next.has(dataBR)) next.delete(dataBR); else next.add(dataBR);
      return next;
    });
  };

  return (
    <div className="flex flex-col flex-1 relative">

      <Toast message={toastMessage} />

      {responsavelModal && (
        <ResponsavelTermoModal candidatoNome={responsavelModal.nome} onSelect={handleResponsavelEscolhido} onClose={() => setResponsavelModal(null)} />
      )}

      {detalheCandidatoId && isDesktop && (() => {
        const c = candidatos.find(x => x.id === detalheCandidatoId);
        if (!c) return null;
        return <CandidatoDetalhe candidato={c} concursoNome={concurso?.nome || ''} statusTag={<CandidatoStatusTag status={c.status} />} onClose={() => setDetalheCandidatoId(null)} />;
      })()}

      {menuAcoes && (() => {
        const c = candidatos.find(x => x.id === menuAcoes.id);
        if (!c) return null;
        const gerando = gerandoSolicitacaoIds.has(c.id);
        const classeItem = 'w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-left text-navy hover:bg-paper disabled:text-ink-5 disabled:cursor-not-allowed disabled:hover:bg-transparent';
        // Gerar Parecer/Exames só aparecem quando podem ser usados (nunca desabilitados).
        const mostrarGerar = podeSolicitarBase && statusPermiteSolicitacao(c) && !gerando;
        const docsVer = [
          ...c.solicitacoesParecer.map((d, i) => ({ tipo: 'parecer' as const, d, chave: `p${i}` })),
          ...c.solicitacoesExames.map((d, i) => ({ tipo: 'exames' as const, d, chave: `e${i}` })),
        ];
        const mostrarAdmin = ehAdmin;
        return (
          <>
            <div className="fixed inset-0 z-dropdown" onClick={() => setMenuAcoes(null)} />
            <div role="menu" className="fixed z-dropdown w-64 py-1 bg-white rounded-xl border border-line shadow-xl max-h-[70vh] overflow-y-auto" style={{ top: menuAcoes.top, right: menuAcoes.right }}>
              {!mostrarGerar && docsVer.length === 0 && !mostrarAdmin && !podeEnviarExames && (
                <p className="px-4 py-3 text-sm text-ink-3">Nenhuma ação disponível para este candidato agora.</p>
              )}
              {/* Ver os exames transcritos não entra aqui: o botão com badge na coluna Ações já faz isso. */}
              {podeEnviarExames && (
                <>
                  <button type="button" role="menuitem" onClick={() => handleEnviarExames(c)} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">lab_profile</span>
                    <span>Enviar Exames (PDF)</span>
                  </button>
                  {(mostrarGerar || docsVer.length > 0 || mostrarAdmin) && <div className="my-1 border-t border-ink-5" />}
                </>
              )}
              {mostrarGerar && (
                <>
                  <button type="button" role="menuitem" onClick={() => handleGerarSolicitacao('parecer', c)} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">stethoscope</span>
                    <span>Gerar Parecer</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => handleGerarSolicitacao('exames', c)} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">lab_research</span>
                    <span>Gerar Exames</span>
                  </button>
                </>
              )}
              {docsVer.length > 0 && (
                <>
                  {mostrarGerar && <div className="my-1 border-t border-ink-5" />}
                  {docsVer.map(({ tipo, d, chave }) => (
                    <button key={chave} type="button" role="menuitem" onClick={() => handleVerSolicitacao(d)} className={classeItem}>
                      <span className="material-symbols-outlined text-[20px] text-green-700">{tipo === 'parecer' ? 'clinical_notes' : 'lab_panel'}</span>
                      <span className="min-w-0 truncate">{tipo === 'parecer' ? 'Ver Parecer' : 'Ver Exames'} · {d.rotulo}</span>
                    </button>
                  ))}
                </>
              )}
              {mostrarAdmin && (
                <>
                  {(mostrarGerar || docsVer.length > 0) && <div className="my-1 border-t border-ink-5" />}
                  <button type="button" role="menuitem" onClick={() => { setMenuAcoes(null); setEventosAlvo({ id: c.id, nome: c.nome }); }} className={classeItem}>
                    <span className="material-symbols-outlined text-[20px]">history</span>
                    <span>Registro de Eventos</span>
                  </button>
                  {(c.finalizado || temDocumentoGerado(c)) && <div className="my-1 border-t border-ink-5" />}
                  {c.finalizado && (
                    <button type="button" role="menuitem" onClick={() => handleEditarIS(c)} className={classeItem}>
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                      <span>Editar</span>
                    </button>
                  )}
                  {temDocumentoGerado(c) && (
                    <button type="button" role="menuitem" onClick={() => handleLimparIS(c)} className={`${classeItem} !text-wine-700 hover:!bg-wine-50`}>
                      <span className="material-symbols-outlined text-[20px]">ink_eraser</span>
                      <span>Limpar</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        );
      })()}

      {eventosAlvo && ehAdmin && (
        <ModalRegistroEventos concursoId={concursoId} candidato={eventosAlvo} onClose={() => setEventosAlvo(null)} />
      )}

      {enviarExamesAlvo && (
        <EnviarExamesModal
          alvo={enviarExamesAlvo}
          usuarioNome={nav?.authUser?.nome}
          onClose={() => setEnviarExamesAlvo(null)}
          onEnviado={atualizado => setCandidatos(prev => prev.map(x => (x.id === atualizado.id ? atualizado : x)))}
        />
      )}

      {verExamesAlvo && (
        <ExamesTranscritosModal
          concursoId={concursoId}
          concursoNome={concurso?.nome || ''}
          candidatoId={verExamesAlvo.id}
          candidatoNome={verExamesAlvo.nome}
          onClose={() => setVerExamesAlvo(null)}
        />
      )}

      {solicitacaoModal?.tipo === 'parecer' && (
        <SolicitarParecerModal candidatoNome={solicitacaoModal.candidato.nome} onClose={() => setSolicitacaoModal(null)} onGerar={d => gerarSolicitacao('parecer', solicitacaoModal.candidato, d)} />
      )}
      {solicitacaoModal?.tipo === 'exames' && (
        <SolicitarExamesModal candidatoNome={solicitacaoModal.candidato.nome} onClose={() => setSolicitacaoModal(null)} onGerar={d => gerarSolicitacao('exames', solicitacaoModal.candidato, d)} />
      )}

      {motivoModal && (isDesktop || !candidatoModalMobile) && motivoModal.tipo === 'CID' && (
        <CidInaptidaoModal candidatoNome={motivoModal.candidato.nome} obrigatorio={motivoModal.obrigatorio} onSelect={handleMotivoSelecionado} onClose={handleMotivoFechado} />
      )}
      {motivoModal && (isDesktop || !candidatoModalMobile) && motivoModal.tipo === 'IDM' && (
        <MotivoIdmModal candidatoNome={motivoModal.candidato.nome} observacoesAtuais={motivoModal.candidato.observacoes || ''} obrigatorio={motivoModal.obrigatorio} onConfirm={handleMotivoSelecionado} onClose={handleMotivoFechado} />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destrutivo}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => { setConfirmDialog(null); confirmDialog.onCancel?.(); }}
        />
      )}

      {!isDesktop && mostrarBotaoTopo && (
        <button
          type="button"
          onClick={rolarAoTopo}
          className="md:hidden fixed bottom-6 right-4 z-sticky w-11 h-11 rounded-full bg-navy text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_upward</span>
        </button>
      )}

      <div ref={scrollContainerRef} style={{ '--toolbar-h': `${toolbarAltura}px` } as React.CSSProperties} className="pb-10 w-full flex-1">
        <Container size="data" className="pt-6 md:pt-8">
          {/* F49: título à esquerda, status por extenso e andamento escritos; sem hífen nem elementos absolutos. */}
          <PageHeader
            title={concurso?.nome || 'Concurso'}
            description={(
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                {concurso && <ConcursoStatusTag status={concurso.status} />}
                <span>{total} candidato{total === 1 ? '' : 's'}</span>
                <span aria-hidden="true">·</span>
                <span>{candidatos.filter(c => c.finalizado).length} de {total} finalizados</span>
              </span>
            )}
          />
        </Container>

        {/* Toolbar compacta e fixa no desktop: o título rola junto com a
            planilha, a busca e os filtros ficam.
            z-topbar (20), e não z-sticky (10): a toolbar cria um contexto de
            empilhamento, então o z-dropdown das sugestões da busca só vale
            dentro dela. Empatada em 10 com o cabeçalho de colunas, que vem
            depois no DOM, a lista de sugestões ficava POR BAIXO do cabeçalho.
            Não há risco de cobrir o Topbar do app: ele é irmão do <main> que
            rola, e a toolbar nunca sai da caixa do <main>. */}
        <div ref={toolbarRef} className={`${embutido ? '' : 'md:sticky md:top-0 md:z-topbar '}bg-canvas py-2`}>
        <Container size="data">
        <div className="bg-white p-2 rounded-xl border border-line">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
          <div className="relative md:w-72 md:shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
              placeholder="Buscar por matrícula ou nome"
              autoComplete="off"
              className="w-full pl-11 pr-11 h-11 md:h-10 text-sm font-body rounded-lg border border-line bg-paper focus:bg-white focus:outline-none focus:border-navy transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpar busca" className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 md:w-10 md:h-10 flex items-center justify-center text-ink-3 hover:text-navy">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
            {mostrarSugestoes && sugestoesCandidatos.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-line py-1.5 z-dropdown animate-fade-in max-h-64 overflow-y-auto">
                {sugestoesCandidatos.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => { setSearch(c.nome); setMostrarSugestoes(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-paper flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-semibold text-navy truncate">{c.nome}</span>
                    <span className="text-xs font-mono text-ink-3 shrink-0">{c.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chip filters: só no desktop (tabela) — na lista mobile ficam só
              a busca por nome e o filtro de data. */}
          <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible md:flex-wrap md:flex-1">
            {chipFilters.map(chip => {
              const isActive = statusKpiFilter === chip.filterValue;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => toggleStatusKpiFilter(chip.filterValue)}
                  className={`px-3 min-h-[44px] md:min-h-[40px] rounded-full text-sm font-bold border transition-all flex items-center gap-2 whitespace-nowrap ${isActive ? chip.corAtivo : 'bg-white text-ink border-line hover:border-ink-5'}`}
                >
                  <span>{chip.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isActive ? 'bg-white/25' : 'bg-thead'}`}>{chip.value}</span>
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0 md:w-40 md:ml-auto">
            <button
              type="button"
              onClick={() => setShowDateMenu(prev => !prev)}
              className={`w-full px-4 h-11 md:h-10 text-sm font-bold rounded-lg border flex items-center justify-center space-x-2 whitespace-nowrap ${dateFilterMode !== 'todos' ? 'bg-navy text-white border-navy' : 'bg-paper text-ink border-line hover:bg-thead'}`}
            >
              <span className="material-symbols-outlined text-[20px]">event</span>
              <span>{dateFilterLabel}</span>
            </button>
            {showDateMenu && (
              <>
                <div className="fixed inset-0 z-dropdown" onClick={() => setShowDateMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-line p-1.5 z-dropdown animate-fade-in space-y-0.5">
                  <button type="button" onClick={() => { setDateFilterMode('todos'); setDateFilterCustom(null); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Todos</button>
                  <button type="button" onClick={() => { setDateFilterMode('hoje'); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Hoje</button>
                  <button type="button" onClick={() => { setDateFilterMode('semana'); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Esta Semana</button>
                  <button type="button" onClick={() => { setShowDateMenu(false); setShowDateCalendar(true); loadDatasAgendamento(); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Personalizado...</button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
        </Container>
        </div>

        <Container size="data" className="pt-2 space-y-4">
        {showDateCalendar && (
          <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-navy text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[20px] text-gold">event</span>
                  <h3 className="font-heading font-bold text-sm">Escolher Data</h3>
                </div>
                <button onClick={() => setShowDateCalendar(false)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10">
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

        <div className="bg-white rounded-2xl shadow-sm border border-line/60 overflow-clip">
          {loading ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
              <p className="text-xs font-semibold">Carregando candidatos...</p>
            </div>
          ) : loadError ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-wine-500">error</span>
              <p className="text-sm font-bold text-ink">Não foi possível carregar os candidatos</p>
              <p className="text-xs text-ink-3 max-w-sm">{loadError}</p>
              <button type="button" onClick={carregarTudo} className="mt-2 px-4 py-2 bg-navy text-white rounded-lg text-xs font-bold">Tentar novamente</button>
            </div>
          ) : filteredCandidatos.length === 0 ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-ink-5">person_off</span>
              <p className="text-sm font-bold text-ink">Nenhum candidato encontrado</p>
              <p className="text-xs text-ink-3">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP: tabela, como sempre foi. */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '56px' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '20%' }} />
                    <col />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '176px' }} />
                  </colgroup>
                  <thead>
                    {/* Cabeçalho de colunas fixo logo abaixo da toolbar. */}
                    <tr className="text-xs font-bold text-navy uppercase tracking-wider">
                      {[
                        { rotulo: 'Candidato', colSpan: 2, alinhamento: '' },
                        { rotulo: 'Status', colSpan: 1, alinhamento: '' },
                        { rotulo: 'Observações', colSpan: 1, alinhamento: '' },
                        { rotulo: 'Nº TIS', colSpan: 1, alinhamento: '' },
                        { rotulo: 'Ações', colSpan: 1, alinhamento: 'text-right' },
                      ].map(col => (
                        <th key={col.rotulo} colSpan={col.colSpan} className={`${embutido ? '' : 'md:sticky md:top-[var(--toolbar-h)] '}z-10 bg-thead border-b border-line py-3 px-4 ${col.alinhamento}`}>{col.rotulo}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-sm">
                    {gruposPorData.map(grupo => {
                      // Um grupo só vira accordion (recolhido por padrão) quando
                      // todas as IS do dia já estão finalizadas — e isso é
                      // desprezado enquanto houver algum filtro ativo.
                      const grupoAccordion = grupo.finalizado && !filtrosAtivos;
                      const expandidoGrupo = !grupoAccordion || openDateGroups.has(grupo.dataBR);
                      return (
                        <React.Fragment key={grupo.dataBR}>
                          <tr
                            className={`bg-paper/60 ${grupoAccordion ? 'cursor-pointer select-none hover:bg-thead/70' : ''}`}
                            onClick={grupoAccordion ? () => toggleDateGroup(grupo.dataBR) : undefined}
                          >
                            <td colSpan={6} className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-navy">{grupo.dataBR}</span>
                                <span className="text-xs text-ink-3">{grupo.itens.length} candidato{grupo.itens.length === 1 ? '' : 's'}{resumoDoGrupo(grupo.itens) ? ` · ${resumoDoGrupo(grupo.itens)}` : ''}</span>
                                {grupoAccordion && (
                                  <span className={`material-symbols-outlined text-[20px] text-ink-3 ml-auto transition-transform duration-200 ${expandidoGrupo ? 'rotate-180' : ''}`}>expand_more</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandidoGrupo && grupo.itens.map((c, ordem) => {
                            const editavel = podeEditar && !c.finalizado;
                            const numTisHabilitado = editavel && statusTemLaudo(c.status);
                            const proximo = c.id === proximoCandidatoId;
                            return (
                              <tr key={c.id} onClick={e => abrirDetalheDaLinha(e, c.id)} className={`hover:bg-thead transition-colors cursor-pointer ${proximo ? 'bg-gold/10 shadow-[inset_4px_0_0_0_#FAB932]' : ''}`} aria-current={proximo ? 'true' : undefined}>
                                <td className="py-3.5 pl-4 pr-0">
                                  <span className="flex items-center gap-1">
                                    <span className="text-xs font-semibold text-ink-3 w-5 text-right" title="Ordem no dia">{ordem + 1}</span>
                                    {c.finalizado && (
                                      <span className="material-symbols-outlined text-[20px] text-green-700" style={{ fontVariationSettings: "'FILL' 1" }} aria-label="Finalizado">check_circle</span>
                                    )}
                                  </span>
                                </td>
                                <td className="py-3.5 pl-2 pr-4">
                                  <p className="font-semibold text-ink flex items-center gap-2 flex-wrap">
                                    <button type="button" onClick={() => setDetalheCandidatoId(c.id)} className="text-left" title="Ver detalhes da IS">{c.nome}</button>
                                    {proximo && <StatusTag tone="navyOutline" dot={false}>Próximo</StatusTag>}
                                  </p>
                                  <p className="text-xs font-mono text-ink-3 flex items-center gap-2">
                                    <span>{c.id}</span>
                                    <button type="button" onClick={() => handleCopiarNomeCandidato(c.nome)} aria-label={`Copiar nome de ${c.nome}`} title="Copiar nome" className="inline-flex items-center justify-center w-6 h-6 rounded text-navy hover:bg-thead">
                                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
                                    </button>
                                    {estadoSalvar[c.id] && (
                                      <span role="status" className={`font-sans font-semibold ${estadoSalvar[c.id] === 'falhou' ? 'text-wine' : 'text-ink-3'}`}>
                                        {estadoSalvar[c.id] === 'salvando' ? 'Salvando…' : estadoSalvar[c.id] === 'salvo' ? 'Salvo' : 'Falha ao salvar'}
                                      </span>
                                    )}
                                  </p>
                                </td>
                                <td className="py-3.5 px-4">
                                  {editavel ? (
                                    <StatusSelect value={c.status || ''} options={STATUS_OPTIONS} onChange={v => handleStatusChange(c, v)} className="w-full" />
                                  ) : <CandidatoStatusTag status={c.status} />}
                                </td>
                                <td className="py-3.5 px-4 text-ink">
                                  {editavel && (c.status === 'INAPTO' || c.status === 'INSUF DOCUMENTAL') ? (
                                    <button type="button" onClick={() => setMotivoModal({ candidato: c, tipo: c.status === 'INAPTO' ? 'CID' : 'IDM', obrigatorio: false })} title={c.status === 'INAPTO' ? 'Clique para escolher/trocar o CID da inaptidão' : 'Clique para escolher/trocar o motivo da IDM'} className="w-full text-left truncate px-2 py-1.5 text-sm rounded-lg border border-line bg-paper hover:bg-white hover:border-navy cursor-pointer transition-colors">
                                      {c.observacoes || <span className="text-ink-3">{c.status === 'INAPTO' ? 'Selecionar CID...' : 'Selecionar motivo...'}</span>}
                                    </button>
                                  ) : editavel ? (
                                    <input key={`obs-${c.id}-${c.observacoes}`} type="text" defaultValue={c.observacoes} onBlur={e => handleObservacoesBlur(c, e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-lg border border-line bg-paper focus:outline-none focus:border-navy focus:bg-white" placeholder="-" />
                                  ) : <span className="truncate block" title={c.observacoes}>{c.observacoes || '-'}</span>}
                                </td>
                                <td className="py-3.5 px-4 text-ink">
                                  {numTisHabilitado ? (
                                    <input key={`tis-${c.id}-${numTisResetKey}`} type="text" defaultValue={c.numTIS} onBlur={e => handleNumTisBlur(c, e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-lg border border-line bg-paper focus:outline-none focus:border-navy focus:bg-white" placeholder="-" />
                                  ) : editavel ? (
                                    c.numTIS ? <span className="block text-sm text-ink-2">{c.numTIS}</span> : null
                                  ) : (c.numTIS || '-')}
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {c.termoRecursoUrl ? (
                                    <button type="button" onClick={() => abrirPdf(c.termoRecursoUrl!)} className="p-2 text-green-800 bg-green-50 hover:bg-green-700 hover:text-white rounded-xl transition-colors cursor-pointer inline-flex" title="Visualizar Termo de Recurso e Cientificação">
                                      <span className="material-symbols-outlined text-[22px]">description</span>
                                    </button>
                                  ) : c.status === 'INAPTO' && podeGerarTermoBase ? (
                                    <button type="button" disabled={gerandoTermoIds.has(c.id)} onClick={() => handleGerarTermo(c.id, c.nome)} className="p-2 text-wine-800 bg-wine-50 hover:bg-wine-700 hover:text-white rounded-xl transition-colors cursor-pointer disabled:cursor-wait disabled:hover:bg-wine-50 disabled:hover:text-wine-800" title={gerandoTermoIds.has(c.id) ? 'Gerando o Termo de Recurso...' : 'Gerar Termo de Recurso'} aria-busy={gerandoTermoIds.has(c.id)}>
                                      <span className={`material-symbols-outlined text-[22px] ${gerandoTermoIds.has(c.id) ? 'animate-spin' : ''}`}>{gerandoTermoIds.has(c.id) ? 'progress_activity' : 'gavel'}</span>
                                    </button>
                                  ) : null}

                                  {c.termoCientificacaoUrl ? (
                                    <button type="button" onClick={() => abrirPdf(c.termoCientificacaoUrl)} className="p-2 ml-1 text-green-800 bg-green-50 hover:bg-green-700 hover:text-white rounded-xl transition-colors cursor-pointer inline-flex" title="Visualizar Termo de Cientificação de Resultado">
                                      <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                                    </button>
                                  ) : gerandoCientIds.has(c.id) ? (
                                    <span className="p-2 ml-1 text-wine-800 bg-wine-50 rounded-xl inline-flex cursor-wait" title="Gerando o Termo de Cientificação..." aria-busy="true">
                                      <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
                                    </span>
                                  ) : podeGerarCientificacao(c) ? (
                                    <button type="button" onClick={() => gerarTermoCientificacao(c.id, c.nome, c.status, true)} className="p-2 ml-1 text-wine-800 bg-wine-50 hover:bg-wine-700 hover:text-white rounded-xl transition-colors cursor-pointer" title="Gerar Termo de Cientificação de Resultado">
                                      <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                                    </button>
                                  ) : null}

                                  {podeReagendarCandidato(c) && (
                                    <button type="button" onClick={() => handleOpenReagendamento(c)} className="p-2 ml-1 text-green-700 bg-green-50 hover:bg-green-700 hover:text-white rounded-xl transition-colors cursor-pointer" title="Reagendar">
                                      <span className="material-symbols-outlined text-[22px]">event_repeat</span>
                                    </button>
                                  )}

                                  {/* Exames entregues pelo candidato: só aparece depois do envio, com o badge da quantidade transcrita. */}
                                  {c.examesQtd > 0 && (
                                    <button type="button" onClick={() => handleVerExames(c)} className="relative p-2 ml-1 text-blue-700 bg-blue-50 hover:bg-blue-700 hover:text-white rounded-xl transition-colors cursor-pointer inline-flex" title={`Ver os ${c.examesQtd} exame(s) transcrito(s)`}>
                                      <span className="material-symbols-outlined text-[22px]">lab_profile</span>
                                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-700 text-white text-xs font-bold leading-none flex items-center justify-center ring-2 ring-white">{c.examesQtd}</span>
                                    </button>
                                  )}

                                  {mostrarMenuAcoes(c) && (
                                    <button type="button" onClick={e => abrirMenuAcoes(e, c.id)} className="relative p-2 ml-1 text-ink bg-thead hover:bg-navy hover:text-white rounded-xl transition-colors cursor-pointer" title={qtdSolicitacoes(c) ? `Mais ações — ${qtdSolicitacoes(c)} documento(s) gerado(s)` : 'Mais ações'} aria-haspopup="menu" aria-expanded={menuAcoes?.id === c.id}>
                                      <span className={`material-symbols-outlined text-[22px] ${gerandoSolicitacaoIds.has(c.id) ? 'animate-spin' : ''}`}>{gerandoSolicitacaoIds.has(c.id) ? 'progress_activity' : 'more_vert'}</span>
                                      {qtdSolicitacoes(c) > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-green-700 text-white text-xs font-bold leading-none flex items-center justify-center ring-2 ring-white">{qtdSolicitacoes(c)}</span>
                                      )}
                                    </button>
                                  )}
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

              {/* MOBILE: lista Material Design 3 (sem tabela/rolagem horizontal). */}
              <div className="md:hidden divide-y divide-line">
                {gruposPorData.map(grupo => {
                  const grupoAccordion = grupo.finalizado && !filtrosAtivos;
                  const expandidoGrupo = !grupoAccordion || openDateGroups.has(grupo.dataBR);
                  return (
                    <div key={grupo.dataBR}>
                      <button
                        type="button"
                        disabled={!grupoAccordion}
                        onClick={grupoAccordion ? () => toggleDateGroup(grupo.dataBR) : undefined}
                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-paper/60 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-navy">{grupo.dataBR}</span>
                          <span className="block text-xs text-ink-3">{grupo.itens.length} candidato{grupo.itens.length === 1 ? '' : 's'}{resumoDoGrupo(grupo.itens) ? ` · ${resumoDoGrupo(grupo.itens)}` : ''}</span>
                        </span>
                        {grupoAccordion && (
                          <span className={`material-symbols-outlined text-[20px] text-ink-3 ml-auto transition-transform duration-200 ${expandidoGrupo ? 'rotate-180' : ''}`}>expand_more</span>
                        )}
                      </button>
                      {expandidoGrupo && grupo.itens.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCandidatoModalMobile(c)}
                          className="w-full flex items-center gap-3 px-4 py-3 border-t border-line text-left active:bg-paper transition-colors"
                        >
                          <span className="w-6 h-6 shrink-0 flex items-center justify-center">
                            {c.finalizado ? (
                              <span className="material-symbols-outlined text-[20px] text-green-700" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            ) : c.status === 'Reagendado' ? (
                              <span className="material-symbols-outlined text-[20px] text-ink-3">event_repeat</span>
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold text-ink truncate">{c.nome}</span>
                              {c.id === proximoCandidatoId && <StatusTag tone="navyOutline" dot={false}>Próximo</StatusTag>}
                            </span>
                            {c.observacoes && (
                              <span className="block text-xs text-ink-3 truncate">{c.observacoes}</span>
                            )}
                          </span>
                          <span className="shrink-0">{c.status ? <CandidatoStatusTag status={c.status} /> : null}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        </Container>
      </div>

      {reagendandoCandidato && (
        <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-navy text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-gold shrink-0">event_repeat</span>
                <h3 className="font-heading font-bold text-sm truncate">Reagendar {reagendandoCandidato.nome}</h3>
              </div>
              <button onClick={() => setReagendandoCandidato(null)} disabled={confirmandoReagendamento} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4">
              {!loadingDatasAgendamento && datasAgendamento.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-ink-3">
                    Este concurso ainda não tem um período de IS configurado, por isso não há datas disponíveis para reagendamento.
                  </p>
                  {podeAbrirEncerrar ? (
                    <button
                      type="button"
                      onClick={() => setShowDefinirPeriodoModal(true)}
                      className="px-4 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm inline-flex items-center space-x-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">event</span>
                      <span>Definir Período de Agendamento</span>
                    </button>
                  ) : (
                    <p className="text-sm text-ink-3">Peça a um Admin para configurar o período deste concurso.</p>
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

      {/* Mobile: modal full-screen com os detalhes da IS do candidato
          tocado na lista — Status/Observações editáveis conforme perfil e
          estado de finalização, Nº TIS sempre somente leitura (nunca
          editável no mobile) e as ações cabíveis (Termo de Recurso,
          Reagendar). No desktop a edição continua inline na própria tabela. */}
      {candidatoModalMobile && (() => {
        const c = candidatos.find(x => x.id === candidatoModalMobile.id) || candidatoModalMobile;
        const editavel = podeEditar && !c.finalizado;
        const podeGerarTermo = !c.termoRecursoUrl && c.status === 'INAPTO' && podeGerarTermoBase;
        // CID (Inapto) / exames da IDM: no mobile a escolha acontece dentro do próprio sheet.
        const motivoNoSheet = motivoModal && motivoModal.candidato.id === c.id ? motivoModal : null;
        const sheetTravado = !!motivoNoSheet?.obrigatorio;
        const fecharSheet = () => {
          if (sheetTravado) return;
          setMotivoModal(null);
          setCandidatoModalMobile(null);
        };
        return (
          <div className="md:hidden fixed inset-0 z-dialog flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50 animate-backdrop-in" onClick={fecharSheet} />
            <SheetArrastavel onClose={fecharSheet} ativo={!sheetTravado} className="relative bg-canvas rounded-t-3xl shadow-2xl flex flex-col animate-sheet-up" style={{ maxHeight: '92dvh' }}>
              <div className="pt-2.5 pb-1 flex justify-center shrink-0" onClick={fecharSheet}>
                <span className="w-10 h-1.5 rounded-full bg-ink-5" />
              </div>
              <div className="px-5 py-3 flex items-center justify-between gap-3 shrink-0 border-b border-line/70">
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base text-navy truncate">{c.nome}</h3>
                  <p className="text-xs text-ink-3 font-mono truncate">{c.id}{c.dataAgendamento ? ` · ${isoParaBR(c.dataAgendamento)}` : ''}</p>
                </div>
                {!sheetTravado && (
                  <button onClick={fecharSheet} aria-label="Fechar" className="text-ink-3 hover:text-navy p-1.5 rounded-lg hover:bg-line/60 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[24px]">close</span>
                  </button>
                )}
              </div>

              {motivoNoSheet ? (
                <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4">
                  {!motivoNoSheet.obrigatorio && (
                    <button type="button" onClick={handleMotivoFechado} className="flex items-center gap-1 text-sm font-bold text-navy">
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                      Voltar
                    </button>
                  )}
                  {motivoNoSheet.tipo === 'CID' ? (
                    <CidPicker candidatoNome={c.nome} onSelect={handleMotivoSelecionado} onClose={handleMotivoFechado} />
                  ) : (
                    <IdmPicker candidatoNome={c.nome} observacoesAtuais={c.observacoes || ''} onConfirm={handleMotivoSelecionado} />
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
                {c.finalizado && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-green-700" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <p className="text-xs font-bold text-green-800">IS finalizada — os dados não podem mais ser alterados.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5">Status</label>
                  {editavel ? (
                    <StatusSelect value={c.status || ''} options={STATUS_OPTIONS} onChange={v => handleStatusChange(c, v)} className="w-full" />
                  ) : (
                    <div>{<CandidatoStatusTag status={c.status} />}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5">Observações</label>
                  {editavel && (c.status === 'INAPTO' || c.status === 'INSUF DOCUMENTAL') ? (
                    <button type="button" onClick={() => setMotivoModal({ candidato: c, tipo: c.status === 'INAPTO' ? 'CID' : 'IDM', obrigatorio: false })} className="w-full text-left px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-ink bg-white">
                      {c.observacoes || <span className="text-ink-3">{c.status === 'INAPTO' ? 'Selecionar CID...' : 'Selecionar motivo...'}</span>}
                    </button>
                  ) : editavel ? (
                    <textarea
                      key={`obs-${c.id}-${c.observacoes}`}
                      defaultValue={c.observacoes}
                      onBlur={e => handleObservacoesBlur(c, e.target.value)}
                      rows={5}
                      placeholder="Sem observações."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-ink focus:outline-none focus:border-navy resize-none"
                    />
                  ) : (
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{c.observacoes || 'Sem observações.'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5">Nº TIS</label>
                  {/* Nunca editável no mobile — só é lançado na visão desktop. */}
                  <p className="text-sm font-semibold text-ink">{c.numTIS || '-'}</p>
                </div>

                {(podeGerarTermo || c.termoRecursoUrl || c.termoCientificacaoUrl || gerandoCientIds.has(c.id) || podeGerarCientificacao(c) || mostrarMenuAcoes(c) || podeReagendarCandidato(c)) && (
                  <div className="pt-2 space-y-2">
                    {c.termoRecursoUrl ? (
                      <a href={urlVisualizacao(c.termoRecursoUrl)} target="_blank" rel="noopener noreferrer" className="w-full px-4 py-3 bg-green-50 text-green-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                        <span>Visualizar Termo de Recurso e Cientificação</span>
                      </a>
                    ) : podeGerarTermo ? (
                      <button type="button" disabled={gerandoTermoIds.has(c.id)} onClick={() => handleGerarTermo(c.id, c.nome)} className="w-full px-4 py-3 bg-wine-50 text-wine-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80" aria-busy={gerandoTermoIds.has(c.id)}>
                        <span className={`material-symbols-outlined text-[20px] ${gerandoTermoIds.has(c.id) ? 'animate-spin' : ''}`}>{gerandoTermoIds.has(c.id) ? 'progress_activity' : 'gavel'}</span>
                        <span>{gerandoTermoIds.has(c.id) ? 'Gerando termo...' : 'Gerar Termo de Recurso'}</span>
                      </button>
                    ) : null}
                    {c.termoCientificacaoUrl ? (
                      <a href={urlVisualizacao(c.termoCientificacaoUrl)} target="_blank" rel="noopener noreferrer" className="w-full px-4 py-3 bg-green-50 text-green-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                        <span>Visualizar Termo de Cientificação</span>
                      </a>
                    ) : gerandoCientIds.has(c.id) ? (
                      <div className="w-full px-4 py-3 bg-wine-50 text-wine-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2 opacity-80" aria-busy="true">
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        <span>Gerando termo de cientificação...</span>
                      </div>
                    ) : podeGerarCientificacao(c) ? (
                      <button type="button" onClick={() => gerarTermoCientificacao(c.id, c.nome, c.status, false)} className="w-full px-4 py-3 bg-wine-50 text-wine-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                        <span>Gerar Termo de Cientificação</span>
                      </button>
                    ) : null}
                    {podeSolicitarBase && statusPermiteSolicitacao(c) && !gerandoSolicitacaoIds.has(c.id) && (['parecer', 'exames'] as const).map(tipo => {
                      return (
                        <button key={tipo} type="button" onClick={() => { setCandidatoModalMobile(null); handleGerarSolicitacao(tipo, c); }} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                          <span className="material-symbols-outlined text-[20px]">{tipo === 'parecer' ? 'stethoscope' : 'lab_research'}</span>
                          <span>{tipo === 'parecer' ? 'Gerar Parecer' : 'Gerar Exames'}</span>
                        </button>
                      );
                    })}
                    {[
                      ...c.solicitacoesParecer.map((d, i) => ({ tipo: 'parecer' as const, d, chave: `p${i}` })),
                      ...c.solicitacoesExames.map((d, i) => ({ tipo: 'exames' as const, d, chave: `e${i}` })),
                    ].map(({ tipo, d, chave }) => (
                      <button key={chave} type="button" onClick={() => handleVerSolicitacao(d)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-green-50 text-green-800">
                        <span className="material-symbols-outlined text-[20px]">{tipo === 'parecer' ? 'clinical_notes' : 'lab_panel'}</span>
                        <span className="min-w-0 truncate">{tipo === 'parecer' ? 'Ver Parecer' : 'Ver Exames'} · {d.rotulo}</span>
                      </button>
                    ))}
                    {/* Ler os exames transcritos é só no desktop (a tela cheia precisa da largura). */}
                    {podeEnviarExames && (
                      <button type="button" onClick={() => handleEnviarExames(c)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                        <span className="material-symbols-outlined text-[20px]">lab_profile</span>
                        <span>Enviar Exames (PDF)</span>
                      </button>
                    )}
                    {ehAdmin && (
                      <button type="button" onClick={() => { setCandidatoModalMobile(null); setEventosAlvo({ id: c.id, nome: c.nome }); }} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                        <span className="material-symbols-outlined text-[20px]">history</span>
                        <span>Registro de Eventos</span>
                      </button>
                    )}
                    {ehAdmin && c.finalizado && (
                      <button type="button" onClick={() => handleEditarIS(c)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                        <span>Editar</span>
                      </button>
                    )}
                    {ehAdmin && temDocumentoGerado(c) && (
                      <button type="button" onClick={() => handleLimparIS(c)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-wine-50 text-wine-700">
                        <span className="material-symbols-outlined text-[20px]">ink_eraser</span>
                        <span>Limpar</span>
                      </button>
                    )}
                    {podeReagendarCandidato(c) && (
                      <button type="button" onClick={() => { setCandidatoModalMobile(null); handleOpenReagendamento(c); }} className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">event_repeat</span>
                        <span>Reagendar</span>
                      </button>
                    )}
                  </div>
                )}
                </div>
              )}
            </SheetArrastavel>
          </div>
        );
      })()}

    </div>
  );
};

// =========================================================================
// DIA DE CONCURSO — candidatos agendados no dia, uma tabela por concurso (linhas agrupadas por concurso)
// =========================================================================

const ConcursosDia: React.FC<{ data: string }> = ({ data }) => {
  const nav = useNav();
  const { dias, concursosAtivos } = useDiasConcursos();
  useBreadcrumbs([{ label: isoParaBR(data) }]);
  const doDia = dias.filter(d => d.data === data);
  return (
    <div>
      {concursosAtivos === null ? (
        <div className="flex justify-center py-16" role="status" aria-label="Carregando"><span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span></div>
      ) : doDia.length === 0 ? (
        <Container size="data" className="pt-6 md:pt-8">
          <div className="bg-white rounded-xl border border-line">
            <EmptyState icon="event_busy" title={`Nenhum concurso agendado em ${isoParaBR(data)}`} description="Volte à lista e escolha um dia marcado no calendário." />
          </div>
        </Container>
      ) : (
        doDia.map(d => (
          <ConcursoDetalhe key={d.concursoId} concursoId={d.concursoId} dataFixa={data} embutido onVoltar={() => nav?.navigate('/concursos')} />
        ))
      )}
    </div>
  );
};

// =========================================================================
// COMPONENTE PRINCIPAL — alterna entre a lista de concursos e o detalhe
// =========================================================================

export const ConcursosJRS: React.FC = () => {
  const nav = useNav();
  // O concurso aberto é um nível da URL: /concursos/:concursoId (deep link e botão voltar).
  const { concursoId: concursoParam } = useParams();
  const { data: diaParam } = useParams();
  const selectedConcursoId = concursoParam ? decodeURIComponent(concursoParam) : null;
  const setSelectedConcursoId = (id: string | null) => nav?.navigate(id ? concursoPath(id) : '/concursos');
  const perfil = nav?.authUser?.perfil;
  const isAdmin = perfil === 'admin';
  const podeRegistrarMensagem = canUseFeature('concursosJRS.registrarMensagemPDF', perfil);
  const podeGerarMinutaResultados = canUseFeature('concursosJRS.gerarMinutaResultados', perfil);
  const podeImportarCsv = canUseFeature('concursosJRS.importarCsv', perfil);
  const podeAbrirEncerrar = canUseFeature('concursosJRS.abrirEncerrarConcurso', perfil);
  const podeRegistrarMensagemArquivo = canUseFeature('concursosJRS.registrarMensagemArquivo', perfil);
  const podeListarMensagens = canUseFeature('concursosJRS.listarMensagens', perfil);
  const podeAdicionarCandidato = canUseFeature('concursosJRS.adicionarCandidato', perfil);
  const podeEnviarExames = canUseFeature('concursosJRS.enviarExamesCandidato', perfil);
  const podeVisualizarTabela = canUseFeature('concursosJRS.visualizarTabela', perfil);

  const [concursos, setConcursos] = useState<ConcursoRecord[]>([]);
  const [loadingConcursos, setLoadingConcursos] = useState(true);
  const [showImportarCsvModal, setShowImportarCsvModal] = useState(false);

  const carregarConcursos = async () => {
    setLoadingConcursos(true);
    try {
      setConcursos(await listarConcursos());
    } finally {
      setLoadingConcursos(false);
    }
  };

  useEffect(() => {
    setLoadingConcursos(true);
    return observarConcursos(
      lista => { setConcursos(lista); setLoadingConcursos(false); },
      () => setLoadingConcursos(false),
    );
  }, []);

  const handleFecharModalUpload = (concursoIdCriado?: string) => {
    carregarConcursos();
    setSelectedConcursoId(concursoIdCriado ?? null);
  };

  const handleFecharModalImportarCsv = (concursoIdCriado?: string) => {
    setShowImportarCsvModal(false);
    carregarConcursos();
    if (concursoIdCriado) setSelectedConcursoId(concursoIdCriado);
  };

  // /concursos/novo: criação do concurso como página própria (F60), com a mesma permissão do botão.
  if (diaParam) return <ConcursosDia data={diaParam} />;

  if (selectedConcursoId === 'novo') {
    return podeRegistrarMensagem
      ? <ModalRegistrarMensagem onClose={handleFecharModalUpload} isAdmin={isAdmin} />
      : <AccessDenied pagina="Novo concurso" />;
  }

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
        perfil={perfil}
        podeRegistrarMensagem={podeRegistrarMensagem}
        podeGerarMinutaResultados={podeGerarMinutaResultados}
        podeImportarCsv={podeImportarCsv}
        podeAbrirEncerrar={podeAbrirEncerrar}
        podeRegistrarMensagemArquivo={podeRegistrarMensagemArquivo}
        podeListarMensagens={podeListarMensagens}
        podeAdicionarCandidato={podeAdicionarCandidato}
        podeEnviarExames={podeEnviarExames}
        podeVisualizarTabela={podeVisualizarTabela}
        onSelecionar={setSelectedConcursoId}
        onNovoConcursoClick={() => nav?.navigate('/concursos/novo')}
        onImportarCsvClick={() => setShowImportarCsvModal(true)}
        onRecarregar={carregarConcursos}
      />
      {showImportarCsvModal && <ModalImportarCsv onClose={handleFecharModalImportarCsv} />}
    </>
  );
};
