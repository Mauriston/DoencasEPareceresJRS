// Ficheiro: components/concursos/useConcursoDetalhe.tsx
// Estado, assinaturas do Firestore e handlers da planilha de candidatos de um concurso.
import type { UsuarioRecord } from '../../services/firestoreUsuarios';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBreadcrumbs } from '../../context/BreadcrumbContext';
import { hojeISO } from '../../utils/inspecoes';
import { useNav } from '../../context/NavContext';
import { canUseFeature } from '../../config/permissions';
import { getConcurso, salvarTriagem, listarCandidatos, observarConcurso, observarCandidatos, atualizarCandidato, reagendarCandidato, listarDatasAgendamento, salvarTermoRecurso, salvarTermoCientificacao, registrarSolicitacao, STATUS_PERMITEM_SOLICITACAO, reabrirIS, limparIS, type SolicitacaoDoc, type ConcursoRecord, type CandidatoRecord, type DataAgendamentoInfo } from '../../services/firestoreConcursos';
import { type AlvoExames } from './ExamesCandidato';
import { juntarPdfsBase64 } from '../../services/pdfMerge';
import { salvarPdfCandidatoNoDrive, abrirPdf, anoDoConcurso, enviarTermoRecursoParaImpressao, enviarSolicitacaoParaImpressao, type PastaConcurso } from '../../services/driveConcursos';
import { registrarDocumentoGerado } from '../../services/documentosGerados';
import { MAPA_LAUDO_POR_STATUS } from '../../utils/concursosUtils';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { getScrollParent } from '../../utils/dom';
import { ConfirmDialogState, isoParaBR, parseDataBR } from './compartilhado';
import { GAS_URL_CONCURSOS } from '../../config/endpoints';

export interface ConcursoDetalheProps {
  concursoId: string;
  onVoltar: () => void;
  /** Abre já filtrado neste dia (AAAA-MM-DD). */
  dataFixa?: string;
  /** Dentro da página do dia: sem migalha própria nem toolbar fixa (várias tabelas empilhadas). */
  embutido?: boolean;
  /** Só as IS atrasadas: agendadas antes de hoje e ainda não finalizadas (página /concursos/atrasadas). */
  apenasAtrasadas?: boolean;
}

/** IS atrasada: agendada para um dia anterior a hoje e ainda não finalizada. */
export const isAtrasada = (c: { dataAgendamento: string; finalizado: boolean }, hoje: string = hojeISO()): boolean =>
  !!c.dataAgendamento && c.dataAgendamento < hoje && !c.finalizado;


/** Estado e ações da planilha de um concurso; a apresentação fica em ConcursoDetalhe e nos
 *  componentes TabelaCandidatos, ListaCandidatosMobile, SheetCandidatoMobile e MenuAcoesCandidato. */
export const useConcursoDetalhe = ({ concursoId, onVoltar, dataFixa, embutido = false, apenasAtrasadas = false }: ConcursoDetalheProps) => {
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
    const res = await fetch(GAS_URL_CONCURSOS, {
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
      void registrarDocumentoGerado({
        tipo: 'termo-cientificacao',
        titulo: 'Termo de Cientificação de Resultado',
        detalhe: `${nome} · ${concurso?.nome || ''}`,
        pdfUrl: url,
        remetente: nav?.authUser?.usuario || nav?.authUser?.nome || '',
      });
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
  // Triagem: o MPI lança ("TRIAR", só nas IS agendadas para hoje) e edita; depois de triado,
  // todos menos a Secretaria veem ("TRIADO" e a seção na barra lateral). Com a IS finalizada,
  // nada disso aparece.
  const ehMpi = perfil === 'user_medicos_mpi';
  const podeVerTriagem = perfil !== 'user_secretaria';
  const mostrarBotaoTriagem = (c: CandidatoRecord) =>
    !c.finalizado && (c.triagem ? podeVerTriagem : ehMpi && c.dataAgendamento === hojeISO());
  const mostrarSecaoTriagem = (c: CandidatoRecord) => !!c.triagem && !c.finalizado && podeVerTriagem;
  const [triagemAlvo, setTriagemAlvo] = useState<CandidatoRecord | null>(null);
  const handleSalvarTriagem = async (c: CandidatoRecord, dados: Parameters<typeof salvarTriagem>[2]) => {
    const triagem = await salvarTriagem(concursoId, c.id, dados, nav?.authUser?.usuario || nav?.authUser?.nome || '');
    setCandidatos(prev => prev.map(x => (x.id === c.id ? { ...x, triagem } : x)));
    setTriagemAlvo(null);
    showToast(`Triagem de ${c.nome} salva.`);
  };
  // Limpar só faz sentido se há algum PDF gerado (termos, pareceres ou exames) ou triagem.
  const temDocumentoGerado = (c: CandidatoRecord) =>
    !!(c.termoRecursoUrl || c.termoCientificacaoUrl) || qtdSolicitacoes(c) > 0 || c.examesQtd > 0 || !!c.triagem;
  // MPI: depois da triagem, o Status ainda indefinido fica em amarelo (lembrete de lançar o resultado).
  const destacarStatus = (c: CandidatoRecord) =>
    ehMpi && !!c.triagem && !c.finalizado && ['', 'PENDENTE', 'REAGENDADO'].includes(String(c.status || '').trim().toUpperCase());
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
      message: `Limpar toda a IS de ${c.nome}? O Status volta a "Sem status" e serão apagados Observações, Nº TIS, laudo, todos os documentos gerados (termo de recurso, termo de cientificação, pareceres e pedidos de exames), os exames entregues pelo candidato (PDF no Drive e transcrição) e os dados da triagem. Esta ação não pode ser desfeita.`,
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
      const res = await fetch(GAS_URL_CONCURSOS, {
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
      void registrarDocumentoGerado({
        tipo: tipo === 'parecer' ? 'solicitacao-parecer' : 'solicitacao-exames',
        titulo: tipo === 'parecer' ? `Pedido de Parecer · ${rotulo}` : 'Solicitação de Exames',
        detalhe: `${candidato.nome} · ${concurso?.nome || ''}`,
        pdfUrl: url,
        remetente: nav?.authUser?.usuario || nav?.authUser?.nome || '',
      });
      // Envio automático para impressão; uma falha aqui não desfaz o documento gerado.
      try {
        await enviarSolicitacaoParaImpressao({ pdfUrl: url, tipo, remetente: nav?.authUser?.usuario || nav?.authUser?.nome || '' });
        showToast(`${titulo} gerado para ${candidato.nome} e enviado para impressão.`);
      } catch (erroEnvio: any) {
        showToast(`${titulo} gerado para ${candidato.nome}, mas o e-mail para impressão falhou: ${erroEnvio?.message || 'erro desconhecido'}.`);
      }
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

  // usuario (ex.: "CT MAURISTON") é o remetente exibido e a assinatura do e-mail automático do termo.
  type SignatarioTermo = { nome: string; usuario: string; postoGraduacao: string; cargo: string };

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
      usuario: nav?.authUser?.usuario || nav?.authUser?.nome || '',
      postoGraduacao: nav?.authUser?.postoGraduacao || '',
      cargo: nav?.authUser?.cargo || '',
    });
  };

  const handleResponsavelEscolhido = (medico: UsuarioRecord) => {
    const alvo = responsavelModal;
    setResponsavelModal(null);
    if (!alvo) return;
    gerarTermo(alvo.id, alvo.nome, { nome: medico.nome, usuario: medico.usuario || medico.nome, postoGraduacao: medico.postoGraduacao, cargo: medico.cargo });
  };

  const gerarTermo = async (id: string, nome: string, signatario: SignatarioTermo) => {
    if (gerandoTermoIds.has(id)) return;
    marcarGerandoTermo(id, true);
    try {
      const candidato = candidatos.find(c => c.id === id);
      // Inapto: o PDF único leva o Termo de Recurso (1ª página) e o Termo de Cientificação (anexado).
      const cientificacaoPromise = pedirPdfCientificacao(id, nome, 'INAPTO');
      cientificacaoPromise.catch(() => {}); // o erro é tratado quando a promise é aguardada abaixo
      const res = await fetch(GAS_URL_CONCURSOS, {
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
      void registrarDocumentoGerado({
        tipo: 'termo-recurso',
        titulo: 'Termo de Recurso e Cientificação',
        detalhe: `${nome} · ${concurso?.nome || ''}`,
        pdfUrl: url,
        remetente: signatario.usuario,
      });
      // Envio automático para impressão e coleta de assinaturas; uma falha aqui não desfaz o termo gerado.
      try {
        await enviarTermoRecursoParaImpressao({ pdfUrl: url, candidatoId: id, candidatoNome: nome, nomeConcurso: concurso?.nome || '', remetente: signatario.usuario });
        showToast(`Termo de Recurso e Cientificação gerados para ${nome} e enviados para impressão.`);
      } catch (erroEnvio: any) {
        showToast(`Termo gerado para ${nome}, mas o e-mail para impressão falhou: ${erroEnvio?.message || 'erro desconhecido'}.`);
      }
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
        if (apenasAtrasadas && !isAtrasada(c)) return false;

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
  }, [candidatosComDataBR, search, statusKpiFilter, dateFilterMode, dateFilterCustom, hojeBR, apenasAtrasadas]);

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
  /**
   * Fundo da linha por status, enquanto a IS não está finalizada: Pendente em
   * amarelo claro e Inapto em vermelho claro, para saltarem aos olhos na
   * planilha. Finalizada volta ao fundo normal.
   */
  const destaqueDaLinha = (c: CandidatoRecord): string => {
    if (c.finalizado) return '';
    const status = String(c.status || '').trim().toUpperCase();
    if (status === 'PENDENTE') return 'bg-gold/10';
    if (status === 'INAPTO') return 'bg-wine-50';
    return '';
  };

  const toggleDateGroup = (dataBR: string) => {
    setOpenDateGroups(prev => {
      const next = new Set(prev);
      if (next.has(dataBR)) next.delete(dataBR); else next.add(dataBR);
      return next;
    });
  };


  return {
    concursoId, onVoltar, dataFixa, embutido, apenasAtrasadas, nav, perfil, podeEditarInlineBase,
    podeReagendarBase, podeAbrirEncerrar, podeGerarTermoBase, responsavelModal, setResponsavelModal,
    gerandoTermoIds, setGerandoTermoIds, marcarGerandoTermo, showDefinirPeriodoModal,
    setShowDefinirPeriodoModal, concurso, setConcurso, candidatos, setCandidatos, loading, setLoading,
    loadError, setLoadError, search, setSearch, mostrarSugestoes, setMostrarSugestoes, statusKpiFilter,
    setStatusKpiFilter, dateFilterMode, setDateFilterMode, dateFilterCustom, setDateFilterCustom,
    showDateMenu, setShowDateMenu, showDateCalendar, setShowDateCalendar, toastMessage, setToastMessage,
    confirmDialog, setConfirmDialog, motivoModal, setMotivoModal, numTisResetKey, setNumTisResetKey,
    datasAgendamento, setDatasAgendamento, loadingDatasAgendamento, setLoadingDatasAgendamento,
    reagendandoCandidato, setReagendandoCandidato, confirmandoReagendamento, setConfirmandoReagendamento,
    candidatoModalMobile, setCandidatoModalMobile, isDesktop, pastaDrive, scrollContainerRef,
    mostrarBotaoTopo, setMostrarBotaoTopo, toolbarRef, toolbarAltura, setToolbarAltura, openDateGroups,
    setOpenDateGroups, rolarAoTopo, podeEditar, podeReagendar, podeReagendarCandidato, statusTemLaudo,
    showToast, carregarTudo, loadDatasAgendamento, gerandoCientIds, setGerandoCientIds, marcarGerandoCient,
    podeGerarCientificacao, pedirPdfCientificacao, gerarTermoCientificacao, podeSolicitarBase,
    podeEnviarExames, enviarExamesAlvo, setEnviarExamesAlvo, verExamesAlvo, setVerExamesAlvo,
    solicitacaoModal, setSolicitacaoModal, gerandoSolicitacaoIds, setGerandoSolicitacaoIds, menuAcoes,
    setMenuAcoes, detalheCandidatoId, setDetalheCandidatoId, abrirDetalheDaLinha, eventosAlvo,
    setEventosAlvo, statusPermiteSolicitacao, qtdSolicitacoes, ehAdmin, ehMpi, podeVerTriagem,
    mostrarBotaoTriagem, mostrarSecaoTriagem, triagemAlvo, setTriagemAlvo, handleSalvarTriagem,
    temDocumentoGerado, destacarStatus, temSolicitacaoGerada, mostrarMenuAcoes, alvoExames,
    handleEnviarExames, handleVerExames, abrirMenuAcoes, handleGerarSolicitacao, handleVerSolicitacao,
    handleEditarIS, handleLimparIS, gerarSolicitacao, estadoSalvar, setEstadoSalvar, marcarSalvar,
    salvarCampoCandidato, handleGerarTermo, handleResponsavelEscolhido, gerarTermo, handleStatusChange,
    aplicarMudancaStatus, handleMotivoSelecionado, handleMotivoFechado, handleObservacoesBlur,
    handleNumTisBlur, handleOpenReagendamento, handleSelecionarDataReagendamento, handleCopiarNomeCandidato,
    toggleStatusKpiFilter, hojeBR, inicioSemana, fimSemana, candidatosComDataBR, filteredCandidatos, total,
    countApto, countInapto, countInsuf, countFaltou, countNaoFinalizados, dateFilterLabel, chipFilters,
    sugestoesCandidatos, filtrosAtivos, gruposPorData, resumoDoGrupo, destaqueDaLinha, toggleDateGroup,
  };
};

export type EstadoConcursoDetalhe = ReturnType<typeof useConcursoDetalhe>;
