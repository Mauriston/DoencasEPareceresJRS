// Ficheiro: components/concursos/ConcursosLista.tsx
// Lista de concursos: cards com o calendário dos dias de concurso, visão em tabela, KPIs anuais e
// os modais de cada concurso.
import React, { useEffect, useState } from 'react';
import { Container, PageHeader } from '../ui/Page';
import { concursosDiaPath } from '../../config/routes';
import { useDiasConcursos } from '../../hooks/useDiasConcursos';
import { CalendarioConcursos } from './CalendarioConcursos';
import { useNav } from '../../context/NavContext';
import { observarCandidatos, gerarMinutaResultados, abrirConcurso, voltarParaEmBreve, encerrarConcurso, listarMensagens, obterEstatisticasAnuais, type ConcursoRecord, type EstatisticasAnuais, type EstatisticaConcursoStatus } from '../../services/firestoreConcursos';
import { EnviarExamesModal } from './ExamesCandidato';
import { anoDoConcurso } from '../../services/driveConcursos';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { EmptyState } from '../ui/EmptyState';
import { controlClass } from '../ui/Field';
import { ConfirmDialog } from '../ui/Dialog';
import { Toast } from '../ui/Toast';
import { KpiMini } from '../ui/KpiMini';
import { ProgressBar } from '../ui/ProgressBar';
import { ConcursoStatusTag } from '../ui/statusTheme';
import { ConfirmDialogState, isoParaBR } from './compartilhado';
import { ModalAdicionarCandidato, ModalDefinirPeriodoAgendamento, ModalKpiBarChart, ModalListarMensagens, ModalRegistrarMensagemArquivo } from './ModaisConcurso';
import { MenuAcoesConcurso, MenuAcoesConcursoProps } from './MenuAcoesConcurso';

export interface ConcursosListaProps {
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

export const GRUPOS_STATUS: { status: ConcursoRecord['status']; titulo: string }[] = [
  { status: 'encerrado', titulo: 'Encerrados' },
  { status: 'em_andamento', titulo: 'Em Andamento' },
  { status: 'em_breve', titulo: 'Em Breve' },
];

// Concursos "Em Breve" ainda não têm movimentação — zero nessas colunas é
// apenas ausência de dado, então a célula fica em branco em vez de "0".
export const celulaNumericaTabela = (valor: number, status: ConcursoRecord['status']): React.ReactNode =>
  valor === 0 && status === 'em_breve' ? '' : valor;

export const ConcursosLista: React.FC<ConcursosListaProps> = ({ concursos, loading, perfil, podeRegistrarMensagem, podeGerarMinutaResultados, podeImportarCsv, podeAbrirEncerrar, podeRegistrarMensagemArquivo, podeListarMensagens, podeAdicionarCandidato, podeEnviarExames, podeVisualizarTabela, onSelecionar, onNovoConcursoClick, onImportarCsvClick, onRecarregar }) => {
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
