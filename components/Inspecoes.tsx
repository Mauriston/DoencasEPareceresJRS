// Ficheiro: components/Inspecoes.tsx
// Página INSPEÇÕES DE SAÚDE: cadastro das IS (exceto as de concursos), agendamento das entrevistas em
// slots de 20 min por perito, acompanhamento de prazos e minutas de mensagem. O status muda sozinho
// (Conclusão da IS no detalhe; Falta, Restituição, Reabrir e Cancelar IS no menu ⋮ da linha).
// Lista (auditoria v3, 2b): abas sublinhadas Ativas · Finalizadas (com contagem) e filtros em chips — Atrasadas,
// Sem agendamento, Minhas, Perito, Período —, numa linha rolável no celular (M3). Uma tabela só, na ordem de
// trabalho: Hoje → próximos dias → entrevistados aguardando conclusão → abertas sem agendamento; Finalizadas por
// mês, paginadas ("Mostrar mais"). Ver inspecoes/TabelaAgendaIS e inspecoes/listaIS.
// Calendário (formato do Google Agenda) só a partir de md (4g): no celular a página força a Lista, mesmo com a
// preferência salva ou ?visao=calendario. Cabeçalho (desktop): "Enviar e-mails" (menu com as listas de pendentes e o
// badge do total) · "Bloqueios" · "Abrir IS" por último. No celular, FAB com "Abrir IS" (manual), "Abrir IS" (foto do
// SINAIS), "Enviar e-mails" e "Bloqueios" (4d).
// Filtros pela URL (contadores da Início e do Painel):
//   ?situacao=atrasadas | sem_agendamento | finalizadas | hoje   (hoje vira o período "Hoje" e sai da URL)
//   ?perito=<uid> · ?minhas=1 · ?dia=AAAA-MM-DD (período daquele dia) · ?visao=calendario|tabela · ?novo=manual|print
// As IS com entrevista marcada são sincronizadas com a agenda "JRS/HNRe" do Google Agenda, com o perito como
// convidado (ver services/agendaGoogleIS.ts).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { ConfirmDialog } from './ui/Dialog';
import { SearchField } from './ui/Field';
import { FilterChip } from './ui/FilterChip';
import { FabAcoes } from './ui/Fab';
import { MenuAcoes, type ItemMenu } from './ui/MenuAcoes';
import { TabelaAgendaIS, type AvisoDiaIS } from './inspecoes/TabelaAgendaIS';
import { FiltroPeriodo, type FiltroPeriodoValor } from './inspecoes/FiltroPeriodo';
import { FiltroPopover } from './inspecoes/FiltroPopover';
import { agruparAtivasIS, agruparFinalizadasIS, ordenarFinalizadasIS, type GrupoIS } from './inspecoes/listaIS';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { InspecaoForm, type DadosInspecionadoIS } from './inspecoes/InspecaoForm';
import { PosCriacaoIS, deveTentarGuias } from './inspecoes/guias/PosCriacaoIS';
import { ISPorFotoForm } from './inspecoes/ISPorFotoForm';
import { InspecaoDetalhe } from './inspecoes/InspecaoDetalhe';
import { AgendarDialog } from './inspecoes/AgendarDialog';
import { TrocarPeritoDialog } from './inspecoes/TrocarPeritoDialog';
import { AgendarNoHorarioDialog } from './inspecoes/AgendarNoHorarioDialog';
import { MinutaDialog } from './inspecoes/MinutaDialog';
import { EnviarResultadoDialog } from './inspecoes/EnviarResultadoDialog';
import { EnviarAgendamentoDialog } from './inspecoes/EnviarAgendamentoDialog';
import { EnviarResultadoBeneficiosDialog } from './inspecoes/emails/EnviarResultadoBeneficiosDialog';
import { resultadoBeneficiosDisponivel, resultadoBeneficiosEnviado } from '../utils/resultadoBeneficiosIS';
import { avisarAgendamento, observarAgendamentos, type AgendamentoFeito } from '../services/emailAgendamentoIS';
import { agendamentoJaEnviado, ehElegivelAgendamento } from '../utils/emailAgendamentoIS';
import { EmailAgendaDialog } from './inspecoes/EmailAgendaDialog';
import { useEmailsIS } from './inspecoes/BotaoEnviarEmail';
import { BotaoEnviarEmails, EmailsPendentesDialog, ROTULO_ENVIAR_EMAILS, rotuloEmailsComTotal } from './inspecoes/BotaoEnviarEmails';
import { EmailsDaIS } from './inspecoes/EmailsDaIS';
import { emailDoInspecionado } from '../services/emailResultadoIS';
import { CalendarioIS } from './inspecoes/CalendarioIS';
import { BloqueiosDialog } from './inspecoes/BloqueiosDialog';
import { NovoParecerForm } from './pareceres/NovoParecerForm';
import { useNav } from '../context/NavContext';
import { canUseFeature, canAccessPage } from '../config/permissions';
import { podeUsarEntrevista } from '../config/entrevistas';
import { observarMilitares, vinculoDoInspecionado, type MilitarRecord } from '../services/firestoreMilitares';
import {
  observarInspecoes, observarBloqueios, observarConfigAgenda, cancelarInspecao, apagarInspecao, agendarInspecao, atualizarInspecao, type InspecaoRecord,
} from '../services/firestoreInspecoes';
import type { ParecerRecord } from '../services/firestorePareceres';
import { mostraMinutaMsg, fasesDeEntrevista } from './inspecoes/InspecaoDetalhe';
import { restituicaoDoStatus } from '../utils/conclusaoIS';
import { podeArrastarIS } from '../utils/calendarioIS';
import { useDiasConcursos, useSincronizarAgendaConcursos } from '../hooks/useDiasConcursos';
import { tituloDiaConcurso, ehBloqueioDeConcurso } from '../services/agendaConcursos';
import { estadoDoSlot } from './inspecoes/SeletorHorario';
import { concursoPath } from '../config/routes';
import { carregarPeritos, type PeritoIS } from '../services/peritosIS';
import { sincronizarAgendaIS, removerEventoAgendaIS } from '../services/agendaGoogleIS';
import { minutaCancelamento, minutaResultadoDaIS } from '../utils/minutasIS';
import { postoDoInspecionado, sugerirDestinatariosIA } from '../services/destinatariosIA';
import { normalizarBusca } from '../utils/corposQuadros';
import {
  STATUS_IS, aguardaAgendamento, statusEfetivoIS, dataHoraBr, hojeISO, podeCancelarIS, situacaoDoStatus, bloqueioNoDia, ehDiaUtil,
  TURNOS, slotsDoTurno, minutosDe, horaDeEntrevista, duracaoDaIS, peritoAtendeNoTurno, ocupadosDe, turnoDoSlot,
  type BloqueioAgenda, type ConfigAgenda, type StatusIS,
} from '../utils/inspecoes';
import { intervaloDoPeriodo } from '../utils/periodos';
import { passaNoPeriodo } from '../utils/agendaIS';

type Visao = 'tabela' | 'calendario';
type Aba = 'ativas' | 'finalizadas';
/** ?situacao= que vira estado da lista (os demais valores são consumidos e saem da URL). */
type SituacaoURL = 'atrasadas' | 'sem_agendamento' | 'finalizadas';
const SITUACOES_URL: SituacaoURL[] = ['atrasadas', 'sem_agendamento', 'finalizadas'];
/** Finalizadas por página ("Mostrar mais"). */
const PAGINA_FINALIZADAS = 30;
const CHAVE_VISAO = 'jrs_inspecoes_visao';
const lerVisaoSalva = (): Visao => { try { return localStorage.getItem(CHAVE_VISAO) === 'calendario' ? 'calendario' : 'tabela'; } catch { return 'tabela'; } };
const diaDoParam = (v: string | null): string => (/^\d{4}-\d{2}-\d{2}$/.test(v ?? '') ? v! : '');
const periodoDoDia = (dia: string, hoje: string): FiltroPeriodoValor => (dia === hoje ? { id: 'hoje' } : { id: 'custom', custom: { inicio: dia, fim: dia } });

/** Texto do bloqueio no cabeçalho do dia (bloqueio de turno/horário, férias e afastamentos). */
const textoBloqueio = (b: BloqueioAgenda): string => {
  const quem = b.peritoUid === '*' ? 'todos os peritos' : (b.peritoNome || 'perito');
  if (b.dataFim && b.dataFim !== b.data) return `${b.motivo || 'Afastamento'} · ${quem}`;
  const quando = b.hora ? `${b.hora} bloqueado` : b.turno === 'manha' ? 'Manhã bloqueada' : b.turno === 'tarde' ? 'Tarde bloqueada' : 'Dia bloqueado';
  return `${quando}${b.horaFim ? ` até ${b.horaFim}` : ''} · ${quem}${b.motivo ? ` — ${b.motivo}` : ''}`;
};

/** IS finalizadas de concursos não entram aqui; aqui só as cadastradas na página. */
const nomeCurto = (inspecionado: string): string => inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || inspecionado;

const VISOES: { value: Visao; label: string; icon: string }[] = [
  { value: 'tabela', label: 'Tabela', icon: 'table_rows' },
  { value: 'calendario', label: 'Calendário', icon: 'calendar_month' },
];

/** Alternância Tabela · Calendário só com ícones (radiogroup no estilo do Segmented; rótulo em aria-label e title). */
const AlternarVisao: React.FC<{ value: Visao; onChange: (v: Visao) => void }> = ({ value, onChange }) => {
  const raiz = useRef<HTMLDivElement>(null);
  const aoTecla = (e: React.KeyboardEvent) => {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = (VISOES.findIndex(o => o.value === value) + passo + VISOES.length) % VISOES.length;
    onChange(VISOES[i].value);
    requestAnimationFrame(() => raiz.current?.querySelectorAll<HTMLElement>('[role="radio"]')[i]?.focus());
  };
  return (
    <div ref={raiz} role="radiogroup" aria-label="Forma de visualização" onKeyDown={aoTecla} className="inline-flex shrink-0 gap-1 p-1 rounded-lg bg-thead border border-line">
      {VISOES.map(o => {
        const ativo = o.value === value;
        return (
          <button
            key={o.value} type="button" role="radio" aria-checked={ativo} aria-label={o.label} title={o.label} tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${ativo ? 'bg-navy text-white' : 'text-ink-3 hover:bg-white hover:text-navy'}`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{o.icon}</span>
          </button>
        );
      })}
    </div>
  );
};

export const Inspecoes: React.FC = () => {
  const nav = useNav();
  const usuario = nav?.authUser;
  const perfil = usuario?.perfil;
  const ehAdmin = perfil === 'admin';
  const ehSecretaria = perfil === 'user_secretaria';

  const podeCadastrar = canUseFeature('inspecoes.cadastrar', perfil);
  const podeAgendar = canUseFeature('inspecoes.agendar', perfil);
  const podeEditar = canUseFeature('inspecoes.editar', perfil);
  const podeMinuta = canUseFeature('inspecoes.gerarMinuta', perfil);
  const podeBloquear = canUseFeature('inspecoes.bloquearAgenda', perfil);
  const podeParecer = canUseFeature('pareceres.gerar', perfil);
  const podeCadastrarInspecionado = canUseFeature('militares.cadastrar', perfil);
  const podeGravarEntrevista = podeUsarEntrevista(perfil);
  const podeEnviarExames = canUseFeature('inspecoes.enviarExames', perfil);

  const [lista, setLista] = useState<InspecaoRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [config, setConfig] = useState<ConfigAgenda>({});
  const { dias: diasConcursos, concursosAtivos } = useDiasConcursos();
  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [peritos, setPeritos] = useState<PeritoIS[]>([]);

  // Visão: ?visao= (ex.: cabeçalho do card "Agenda de inspeções" da Início) ou a última escolhida neste navegador.
  // Abaixo de md não há calendário (4g): a visão efetiva é sempre a Lista.
  const desktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [visao, setVisaoEstado] = useState<Visao>(() => {
    const v = searchParams.get('visao');
    return v === 'calendario' || v === 'tabela' ? v : lerVisaoSalva();
  });
  const setVisao = (v: Visao) => { setVisaoEstado(v); try { localStorage.setItem(CHAVE_VISAO, v); } catch { /* sem localStorage */ } };
  const visaoEfetiva: Visao = desktop ? visao : 'tabela';

  // Filtros da Lista (o calendário tem navegação própria). Aba, chips Atrasadas/Sem agendamento, perito e Minhas
  // ficam na URL (deep link da Início e do Painel); período e busca, no estado. Padrão: Ativas · todos os períodos.
  // ?dia=AAAA-MM-DD (card "Agenda de inspeções" da Início) e ?situacao=hoje viram o período e saem da URL.
  const situacaoParam = searchParams.get('situacao');
  const situacao: SituacaoURL | null = SITUACOES_URL.includes(situacaoParam as SituacaoURL) ? situacaoParam as SituacaoURL : null;
  const aba: Aba = situacao === 'finalizadas' ? 'finalizadas' : 'ativas';
  const minhas = searchParams.get('minhas') === '1';
  const peritoParam = searchParams.get('perito') ?? '';
  const [periodo, setPeriodo] = useState<FiltroPeriodoValor | null>(() => {
    const dia = diaDoParam(searchParams.get('dia'));
    return dia ? periodoDoDia(dia, hojeISO()) : situacaoParam === 'hoje' ? { id: 'hoje' } : null;
  });
  const [busca, setBusca] = useState('');
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [limiteFinalizadas, setLimiteFinalizadas] = useState(PAGINA_FINALIZADAS);
  /** Muda vários parâmetros da URL numa chamada só (null remove). */
  const mudarURL = (mudancas: Record<string, string | null>) => {
    setSearchParams(prev => {
      const proximo = new URLSearchParams(prev);
      Object.entries(mudancas).forEach(([k, v]) => { if (v === null || v === '') proximo.delete(k); else proximo.set(k, v); });
      return proximo;
    }, { replace: true });
  };
  const irParaAba = (a: Aba) => { mudarURL({ situacao: a === 'finalizadas' ? 'finalizadas' : null }); setLimiteFinalizadas(PAGINA_FINALIZADAS); };
  const alternarSituacao = (s: 'atrasadas' | 'sem_agendamento') => mudarURL({ situacao: situacao === s ? null : s });

  const [novo, setNovo] = useState<{ dataEntrevista?: string; peritoUid?: string; inspecionadoId?: string } | null>(null);
  const [porFoto, setPorFoto] = useState(false);
  const [detalheId, setDetalheIdEstado] = useState<string | null>(null);
  // Deep link /inspecoes/{isId}[/{acao}] (ex.: QR "Abrir no celular" da gravação da entrevista): abre o
  // detalhe da IS; ao fechar, a URL volta para /inspecoes. A ação (ex.: 'entrevista') é lida pelo próprio
  // InspecaoDetalhe via useParams.
  const { isId: isIdDaRota } = useParams();
  const navigate = useNavigate();
  useEffect(() => { if (isIdDaRota) setDetalheIdEstado(isIdDaRota); }, [isIdDaRota]);
  const setDetalheId = (id: string | null) => {
    setDetalheIdEstado(id);
    if (id === null && isIdDaRota) navigate('/inspecoes', { replace: true });
  };
  const [agendando, setAgendando] = useState<InspecaoRecord | null>(null);
  const [trocandoPerito, setTrocandoPerito] = useState<{ is: InspecaoRecord; dataHora: string; modo: 'arraste' | 'troca' } | null>(null);
  const [horarioVazio, setHorarioVazio] = useState<string | null>(null);
  const [minuta, setMinuta] = useState<InspecaoRecord | null>(null);
  const [enviandoResultado, setEnviandoResultado] = useState<InspecaoRecord | null>(null);
  const [enviandoBeneficios, setEnviandoBeneficios] = useState<InspecaoRecord | null>(null);
  /** E-mails de agendamento/reagendamento (todos os grupos) a confirmar depois de agendar ou pedidos pelo menu; um por vez. */
  const [filaAgendamento, setFilaAgendamento] = useState<(AgendamentoFeito & { origem: 'agendamento' | 'menu' })[]>([]);
  // A confirmação depois de agendar é só para Admin e Secretaria (quem envia o e-mail de agendamento).
  // E-mails da IS (matriz de permissões: inspecoes.enviarEmails; padrão Admin e Secretaria).
  const podeEmails = canUseFeature('inspecoes.enviarEmails', perfil);
  const perguntaAgendamento = podeEmails;
  useEffect(() => {
    if (!perguntaAgendamento) return;
    return observarAgendamentos(a => setFilaAgendamento(f => (f.some(x => x.isId === a.isId && x.dataEntrevista === a.dataEntrevista) ? f : [...f, { ...a, origem: 'agendamento' }])));
  }, [perguntaAgendamento]);
  /** Depois de abrir a IS: guias de exames, e-mail de abertura e envio das guias (inspecoes/guias/PosCriacaoIS). */
  const [posCriacao, setPosCriacao] = useState<{ is: InspecaoRecord; dados: DadosInspecionadoIS } | null>(null);
  const [parecerPara, setParecerPara] = useState<{ is: InspecaoRecord; inicial?: ParecerRecord } | null>(null);
  const [confirmando, setConfirmando] = useState<{ tipo: 'falta' | 'cancelar'; is: InspecaoRecord } | null>(null);
  const [apagando, setApagando] = useState<InspecaoRecord | null>(null);
  const [bloqueiosAberto, setBloqueiosAberto] = useState(false);
  const [emailAgendaAberto, setEmailAgendaAberto] = useState(false);
  /** Celular: lista de e-mails pendentes aberta pela ação "Enviar e-mails" do FAB. */
  const [emailsAberto, setEmailsAberto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  useEffect(() => observarInspecoes(setLista, e => setErroCarga(e.message || 'Não foi possível carregar as inspeções.')), []);
  useEffect(() => observarBloqueios(setBloqueios), []);
  useEffect(() => observarConfigAgenda(setConfig), []);
  // ?dia=, ?situacao=hoje, ?visao= e ?novo= viram estado e saem da URL (também quando a Início/Painel navega para cá
  // com a página já aberta). No celular, ?visao=calendario cai na Lista (do dia, se vier ?dia=).
  // Atalho da Início ("+ Abrir IS"): ?novo=manual abre o formulário; ?novo=print, a IS por foto. Respeita a permissão.
  // Da Ficha do inspecionado: ?novo=manual&inspecionado=<nip> abre o formulário já com o inspecionado escolhido.
  useEffect(() => {
    const dia = diaDoParam(searchParams.get('dia'));
    const hojeParam = searchParams.get('situacao') === 'hoje';
    const v = searchParams.get('visao');
    const novoParam = searchParams.get('novo');
    if (!searchParams.has('dia') && !hojeParam && !v && !novoParam) return;
    if (dia) setPeriodo(periodoDoDia(dia, hojeISO()));
    else if (hojeParam) setPeriodo({ id: 'hoje' });
    if (v === 'calendario' || v === 'tabela') setVisao(v);
    const inspecionadoParam = searchParams.get('inspecionado')?.trim() || '';
    if (novoParam && podeCadastrar) { if (novoParam === 'print') setPorFoto(true); else setNovo(inspecionadoParam ? { inspecionadoId: inspecionadoParam } : {}); }
    const resto = new URLSearchParams(searchParams);
    resto.delete('dia'); resto.delete('visao'); resto.delete('novo'); resto.delete('inspecionado');
    if (hojeParam) resto.delete('situacao');
    setSearchParams(resto, { replace: true });
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => observarMilitares(setMilitares), []);
  useEffect(() => { carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, []);

  const hoje = hojeISO();
  // Dias de concurso não bloqueiam mais a agenda: só os bloqueios cadastrados valem (o concurso aparece no calendário
  // como aviso no cabeçalho do dia).
  const bloqueiosTodos = bloqueios;
  const podeVerConcursos = canAccessPage('concursosJRS', perfil);

  // Google Agenda: quem agenda mantém os eventos dos dias de concurso (com aviso de erro nesta página).
  useSincronizarAgendaConcursos(podeAgendar, diasConcursos, concursosAtivos, msg => avisar(msg, 'error'));

  // Sigla da OM do inspecionado (dependente herda a do titular; pensionista não tem).
  const omPorId = useMemo(() => new Map(militares.map(m => [m.id, m.om])), [militares]);
  const detalhe = detalheId ? lista?.find(i => i.id === detalheId) ?? null : null;
  const avisouRotaInvalida = useRef<string | null>(null);
  useEffect(() => {
    if (!isIdDaRota || !lista || lista.some(i => i.id === isIdDaRota) || avisouRotaInvalida.current === isIdDaRota) return;
    avisouRotaInvalida.current = isIdDaRota;
    avisar(`IS ${isIdDaRota} não encontrada.`, 'error');
    setDetalheId(null);
  }, [isIdDaRota, lista]);

  const intervalo = useMemo(() => (periodo ? intervaloDoPeriodo(periodo.id, hoje, periodo.custom) : null), [periodo, hoje]);
  // Minhas = o usuário como perito; senão o perito do chip (?perito=uid).
  const peritoAlvo = minhas ? (usuario?.uid ?? '') : peritoParam;

  // Perito + período + busca (sem aba nem chips): base das contagens das abas e dos chips.
  const base = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return (lista ?? [])
      .filter(i => (peritoAlvo ? i.peritoUid === peritoAlvo : true))
      .filter(i => (intervalo ? passaNoPeriodo(i, intervalo) : true))
      .filter(i => { const alvo = normalizarBusca(`${i.is} ${i.inspecionado} ${i.inspecionadoId} ${i.finalidade} ${i.peritoNome} ${STATUS_IS[statusEfetivoIS(i, hoje)].rotulo}`); return termos.every(t => alvo.includes(t)); });
  }, [lista, peritoAlvo, intervalo, busca, hoje]);

  const ativasBase = useMemo(() => base.filter(i => i.situacao !== 'finalizada'), [base]);
  const finalizadasBase = useMemo(() => ordenarFinalizadasIS(base.filter(i => i.situacao === 'finalizada')), [base]);
  const contagens = useMemo(() => ({
    ativas: ativasBase.length,
    finalizadas: finalizadasBase.length,
    atrasadas: ativasBase.filter(i => statusEfetivoIS(i, hoje) === 'atrasada').length,
    semAgendamento: ativasBase.filter(i => !i.dataEntrevista).length,
  }), [ativasBase, finalizadasBase, hoje]);

  // Ordem de trabalho (Ativas) ou meses (Finalizadas, paginadas).
  const grupos: GrupoIS[] = useMemo(() => {
    if (aba === 'finalizadas') return agruparFinalizadasIS(finalizadasBase.slice(0, limiteFinalizadas));
    const filtradas = situacao === 'atrasadas' ? ativasBase.filter(i => statusEfetivoIS(i, hoje) === 'atrasada')
      : situacao === 'sem_agendamento' ? ativasBase.filter(i => !i.dataEntrevista) : ativasBase;
    return agruparAtivasIS(filtradas, hoje);
  }, [aba, situacao, ativasBase, finalizadasBase, limiteFinalizadas, hoje]);
  const restantesFinalizadas = aba === 'finalizadas' ? Math.max(0, finalizadasBase.length - limiteFinalizadas) : 0;
  const filtrosAtivos = !!situacao && situacao !== 'finalizadas' || !!peritoAlvo || !!periodo || !!busca;
  const limparFiltros = () => { mudarURL({ situacao: aba === 'finalizadas' ? 'finalizadas' : null, perito: null, minhas: null }); setPeriodo(null); setBusca(''); };

  /** Cabeçalho do dia: turno de concurso, bloqueios (todos os peritos ou do perito filtrado), férias e afastamentos. */
  const avisosDoDia = (data: string): AvisoDiaIS[] => [
    ...diasConcursos.filter(c => c.data === data).map(c => ({ chave: c.chave, icone: 'fact_check', texto: `Concurso: ${tituloDiaConcurso(c)}` })),
    ...bloqueios
      .filter(b => !ehBloqueioDeConcurso(b) && bloqueioNoDia(b, data) && (!peritoAlvo || b.peritoUid === '*' || b.peritoUid === peritoAlvo))
      .map(b => ({ chave: b.id, icone: b.dataFim && b.dataFim !== b.data ? 'event_busy' : 'block', texto: textoBloqueio(b) })),
  ];

  // Celular, quem agenda: 1º horário livre (de algum perito, ou do filtrado) em cada intervalo entre IS do dia.
  const ocupados = useMemo(() => (desktop || !podeAgendar ? new Set<string>() : ocupadosDe(lista ?? [])), [desktop, podeAgendar, lista]);
  const livresDoGrupo = (g: GrupoIS): Map<string, string> => {
    const livres = new Map<string, string>();
    const data = g.data;
    if (!data || data < hoje || !ehDiaUtil(data)) return livres;
    const agora = new Date();
    const minAgora = agora.getHours() * 60 + agora.getMinutes();
    const candidatos = peritoAlvo ? peritos.filter(p => p.uid === peritoAlvo) : peritos;
    const livre = (hhmm: string) => {
      const t = turnoDoSlot(hhmm);
      if (!t || (data === hoje && minutosDe(hhmm) <= minAgora)) return false;
      return candidatos.some(p => estadoDoSlot(p.uid, data, hhmm, peritoAtendeNoTurno(config, p.uid, data, t), bloqueios, ocupados) === 'livre');
    };
    const slots = TURNOS.flatMap(t => slotsDoTurno(t.id));
    const itens = g.itens.filter(i => i.dataEntrevista);
    itens.forEach((is, idx) => {
      const proxima = itens[idx + 1];
      if (!proxima) return;
      const hora = horaDeEntrevista(is.dataEntrevista);
      const fim = minutosDe(hora) + duracaoDaIS(is);
      const inicioProxima = minutosDe(horaDeEntrevista(proxima.dataEntrevista));
      const slot = slots.find(h => minutosDe(h) >= fim && minutosDe(h) + 20 <= inicioProxima && livre(h));
      if (slot) livres.set(is.id, slot);
    });
    return livres;
  };

  // ----- ações -----

  const sincronizar = async (is: InspecaoRecord) => {
    const r = await sincronizarAgendaIS(is);
    if (!r.ok) avisar(`Google Agenda não atualizado: ${r.erro}`, 'error');
    else avisar(r.semConvidado ? 'Evento sincronizado. O perito não tem Gmail cadastrado e não foi convidado.' : 'Evento sincronizado com o Google Agenda "JRS/HNRe".');
  };

  const aoCriada = (is: InspecaoRecord, dados: DadosInspecionadoIS = {}) => {
    setNovo(null);
    // Guias de exames e e-mail de abertura primeiro; a pergunta do e-mail de agendamento vem depois (fimPosCriacao).
    if (deveTentarGuias(is) || podeEmails) setPosCriacao({ is, dados });
    else if (is.dataEntrevista) avisarAgendamento(is, is.dataEntrevista);
    if (is.dataEntrevista) {
      avisar(`IS ${is.is} cadastrada e agendada. Sincronizando com o Google Agenda…`);
      sincronizarAgendaIS(is).then(r => {
        if (!r.ok) avisar(`IS ${is.is} cadastrada, mas o Google Agenda não foi atualizado: ${r.erro}`, 'error');
        else avisar(r.semConvidado ? `IS ${is.is} agendada. O perito não tem Gmail cadastrado e não foi convidado.` : `IS ${is.is} agendada e sincronizada com o Google Agenda.`);
      });
    } else avisar(`IS ${is.is} cadastrada.`);
  };

  const fimPosCriacao = () => {
    const is = posCriacao?.is;
    setPosCriacao(null);
    if (is?.dataEntrevista) avisarAgendamento(is, is.dataEntrevista);
  };

  /** IS por foto (lote): cada IS gravada com horário reservado sincroniza o Google Agenda. */
  const aoGravarPorFoto = (is: InspecaoRecord, _criada: boolean, reservada: boolean) => {
    if (reservada) sincronizarAgendaIS(is).then(r => { if (!r.ok) avisar(`IS ${is.is} gravada, mas o Google Agenda não foi atualizado: ${r.erro}`, 'error'); });
    if (reservada && is.dataEntrevista) avisarAgendamento(is, is.dataEntrevista);
  };
  /** Lote gravado: fecha o painel; com uma IS só, abre o detalhe dela. */
  const aoConcluirPorFoto = (gravadas: number, unica: InspecaoRecord | null) => {
    setPorFoto(false);
    avisar(unica ? `IS ${unica.is} gravada.` : `${gravadas} IS gravada${gravadas !== 1 ? 's' : ''}.`);
    if (unica) setDetalheId(unica.id);
  };

  /** Muda o status por uma ação do menu (Falta, Restituição, Reabrir IS) e atualiza o Google Agenda se a situação mudar. */
  const mudarStatus = async (is: InspecaoRecord, status: StatusIS, msg: string) => {
    try {
      await atualizarInspecao(is.id, { status });
      avisar(msg);
      if (is.dataEntrevista && situacaoDoStatus(status) !== is.situacao) {
        sincronizarAgendaIS({ ...is, status, situacao: situacaoDoStatus(status) }).then(r => { if (!r.ok) avisar(`Google Agenda não atualizado: ${r.erro}`, 'error'); });
      }
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível alterar o status.', 'error');
    }
  };

  const confirmarAcao = async () => {
    const alvo = confirmando;
    if (!alvo) return;
    setConfirmando(null);
    if (alvo.tipo === 'falta') { await mudarStatus(alvo.is, 'faltou', `IS ${alvo.is.is}: Faltou.`); return; }
    try {
      await cancelarInspecao(alvo.is);
      if (alvo.is.eventoAgendaId) await removerEventoAgendaIS(alvo.is);
      avisar(`IS ${alvo.is.is} cancelada.`);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível cancelar a IS.', 'error');
    }
  };

  /** Parecer pedido a partir da IS: a IS passa a "Parecer solicitado". */
  const aoParecerGerado = async (is: InspecaoRecord, nome: string) => {
    setParecerPara(null);
    avisar(`Pedido de parecer de ${nome} gerado.`);
    const atual = lista?.find(i => i.id === is.id) ?? is;
    if (fasesDeEntrevista(atual)) await mudarStatus(atual, 'parecer_solicitado', `Pedido de parecer de ${nome} gerado. IS ${is.is}: Parecer solicitado.`);
  };

  const confirmarApagar = async () => {
    const is = apagando;
    if (!is) return;
    setApagando(null);
    try {
      if (is.eventoAgendaId) await removerEventoAgendaIS(is);
      await apagarInspecao(is);
      setDetalheId(null);
      avisar(`IS ${is.is} apagada.`);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível apagar a IS.', 'error');
    }
  };

  /** IS arrastada no calendário: reagenda no novo horário, com o mesmo perito, e atualiza o Google Agenda. */
  const reagendarArrastando = async (is: InspecaoRecord, dataEntrevista: string) => {
    try {
      const novo = { peritoUid: is.peritoUid, peritoNome: is.peritoNome, peritoGmail: is.peritoGmail, amp: is.amp, dataEntrevista };
      const status = await agendarInspecao(is, novo);
      const r = await sincronizarAgendaIS({ ...is, ...novo, status, situacao: 'andamento' });
      avisar(r.ok ? `IS ${is.is} reagendada para ${dataHoraBr(dataEntrevista)}.` : `IS ${is.is} reagendada, mas o Google Agenda não foi atualizado: ${r.erro}`, r.ok ? 'success' : 'error');
      avisarAgendamento({ ...is, status }, dataEntrevista);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível reagendar.', 'error');
    }
  };

  const omDe = (is: InspecaoRecord) => omPorId.get(is.inspecionadoId);
  const vinculoDe = (is: InspecaoRecord) => { const m = militares.find(x => x.id === is.inspecionadoId); return m ? vinculoDoInspecionado(m) : undefined; };
  const dadosMinuta = (is: InspecaoRecord) => ({ is: is.is, finalidade: is.finalidade, grupoFinalidade: is.grupoFinalidade, inspecionado: is.inspecionado, dataAbertura: is.dataAbertura, amp: is.amp, om: omDe(is), dataEntrevista: is.dataEntrevista });

  const itensDe = (is: InspecaoRecord): ItemMenu[] => {
    const itens: ItemMenu[] = [];
    // Aberta e Realizando Exames (guias entregues): "Agendar".
    if (podeAgendar && aguardaAgendamento(is.status)) itens.push({ rotulo: is.dataEntrevista ? 'Reagendar' : 'Agendar', icone: 'event', onClick: () => setAgendando(is) });
    if (podeAgendar && is.status === 'faltou') itens.push({ rotulo: 'Reagendar', icone: 'event', onClick: () => setAgendando(is) });
    // Agendada/Reagendada: reagendar enquanto der para remarcar (sem laudo, TIS nem DS-1a; não é de concurso).
    if (podeAgendar && !aguardaAgendamento(is.status) && is.status !== 'faltou' && podeArrastarIS(is)) itens.push({ rotulo: 'Reagendar', icone: 'event', onClick: () => setAgendando(is) });
    if (podeEditar && fasesDeEntrevista(is)) itens.push({ rotulo: 'Falta', icone: 'person_off', onClick: () => setConfirmando({ tipo: 'falta', is }) });
    const restituicao = restituicaoDoStatus(is.status);
    if (restituicao && podeEditar && !ehSecretaria) itens.push({ rotulo: restituicao.rotulo, icone: 'undo', onClick: () => { mudarStatus(is, restituicao.status, `IS ${is.is}: ${restituicao.rotulo}.`); } });
    if (podeMinuta && mostraMinutaMsg(is)) itens.push({ rotulo: 'Minuta MSG', icone: 'mail', onClick: () => setMinuta(is) });
    // Os e-mails (agendamento, resultado, faltas, NAC) ficam no menu "Enviar e-mail" do cabeçalho; o resultado de
    // Benefícios também aqui, assim que a IS tem Nº do TIS (Assinaturas pendentes ou TIS assinado) e enquanto não foi enviado.
    if (podeEmails && resultadoBeneficiosDisponivel(is) && !resultadoBeneficiosEnviado(is)) itens.push({ rotulo: 'E-mail de resultado (Benefícios)', icone: 'mark_email_unread', onClick: () => setEnviandoBeneficios(is) });
    if (podeAgendar && is.dataEntrevista && is.status !== 'cancelada' && !(is.agendaSincronizada && is.eventoAgendaId)) itens.push({ rotulo: 'Sincronizar com o Google Agenda', icone: 'sync', onClick: () => { sincronizar(is); } });
    if (ehAdmin && is.status === 'tis_assinado') itens.push({ rotulo: 'Reabrir IS', icone: 'lock_open', onClick: () => { mudarStatus(is, 'assinaturas_pendentes', `IS ${is.is} reaberta.`); } });
    if (canUseFeature('inspecoes.cancelar', perfil) && podeCancelarIS(is, hoje)) itens.push({ rotulo: 'Cancelar IS', icone: 'cancel', perigo: true, onClick: () => setConfirmando({ tipo: 'cancelar', is }) });
    if (ehAdmin) itens.push({ rotulo: 'Apagar IS', icone: 'delete', perigo: true, onClick: () => setApagando(is) });
    return itens;
  };

  // E-mail de agendamento: o 1º da fila cuja IS já está na lista (a gravação pode chegar um instante depois).
  // Sai da fila quando a IS mudou de data, foi cancelada ou o e-mail daquela data já foi enviado.
  const agendamentoAtual = useMemo(() => {
    const item = filaAgendamento[0];
    const is = item && lista?.find(i => i.id === item.isId);
    return item && is ? { item, is } : null;
  }, [filaAgendamento, lista]);
  useEffect(() => {
    if (!agendamentoAtual) return;
    const { item, is } = agendamentoAtual;
    const descartar = is.dataEntrevista === item.dataEntrevista
      ? !ehElegivelAgendamento(is) || agendamentoJaEnviado(is)
      // Reagendada de novo antes de responder: vale só o aviso mais novo da mesma IS.
      : filaAgendamento.slice(1).some(x => x.isId === item.isId);
    if (descartar) setFilaAgendamento(f => f.slice(1));
  }, [agendamentoAtual, filaAgendamento]);
  const proximoAgendamento = () => setFilaAgendamento(f => f.slice(1));

  // ----- apresentação -----

  const peritosFiltraveis = peritos;
  const emails = useEmailsIS({
    inspecoes: lista ?? [], militares, hoje,
    podeEmailAgenda: ehAdmin, onEmailAgenda: () => setEmailAgendaAberto(true),
    onEnviarAgendamento: is => setFilaAgendamento(f => [...f, { isId: is.id, dataEntrevista: is.dataEntrevista, origem: 'menu' }]),
    onEnviarResultado: setEnviandoResultado,
    onEnviarResultadoBeneficios: setEnviandoBeneficios,
    onAviso: avisar,
  });
  // Ações da página: "Enviar e-mails" (listas de pendentes) e "Bloqueios" como botões secundários no cabeçalho
  // (desktop) e no FAB (celular). Não sobrou nada para um ⋮.
  const temAcoesCabecalho = podeEmails || podeBloquear || podeCadastrar;

  const nomePeritoFiltro = peritoParam ? (peritos.find(p => p.uid === peritoParam)?.usuario ?? 'Perito') : '';
  const souPerito = !!usuario && peritos.some(p => p.uid === usuario.uid);
  const abas: { id: Aba; rotulo: string; n: number }[] = [
    { id: 'ativas', rotulo: 'Ativas', n: contagens.ativas },
    { id: 'finalizadas', rotulo: 'Finalizadas', n: contagens.finalizadas },
  ];
  const aoTeclaAbas = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const proxima: Aba = aba === 'ativas' ? 'finalizadas' : 'ativas';
    irParaAba(proxima);
    requestAnimationFrame(() => document.getElementById(`inspecoes-aba-${proxima}`)?.focus());
  };
  const badge = (n: number, alerta = false) => (
    <span className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs font-bold tabular-nums ${alerta ? 'bg-wine text-white' : 'bg-thead text-ink-3 border border-line'}`}>{n}</span>
  );

  const conteudoLista = erroCarga ? (
    <p role="alert" className="bg-white rounded-xl border border-line md:border-0 md:border-t md:rounded-none p-6 text-sm font-semibold text-wine">{erroCarga}</p>
  ) : lista === null ? (
    <p className="bg-white rounded-xl border border-line md:border-0 md:border-t md:rounded-none p-10 text-center text-sm text-ink-3" role="status">Carregando inspeções…</p>
  ) : grupos.length === 0 ? (
    <div className="bg-white rounded-xl border border-line md:border-0 md:border-t md:rounded-none">
      <EmptyState
        icon="event_available" title="Nenhuma IS encontrada"
        description={lista.length === 0 ? 'Cadastre a primeira IS para começar.' : 'Ajuste os filtros, o período ou a busca.'}
        action={filtrosAtivos ? <Button variant="secondary" onClick={limparFiltros}>Limpar filtros</Button> : undefined}
      />
    </div>
  ) : (
    <TabelaAgendaIS
      grupos={grupos} hoje={hoje}
      nomeDe={is => nomeCurto(is.inspecionado)} omDe={omDe}
      onAbrir={is => setDetalheId(is.id)}
      podeTrocarPerito={is => !['cancelada', 'tis_assinado'].includes(is.status)}
      onTrocarPerito={podeAgendar ? is => setTrocandoPerito({ is, dataHora: is.dataEntrevista, modo: 'troca' }) : undefined}
      itensDe={itensDe}
      onNomeCopiado={(nome, ok) => avisar(ok ? `Nome copiado: ${nome}` : 'Não foi possível copiar; selecione o nome e copie manualmente.', ok ? 'success' : 'error')}
      avisosDe={avisosDoDia}
      livresDe={podeAgendar && !desktop && aba === 'ativas' ? livresDoGrupo : undefined}
      onAgendarHorario={podeAgendar ? setHorarioVazio : undefined}
      rodape={restantesFinalizadas > 0 ? (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Button variant="ghost" size="sm" icon="expand_more" onClick={() => setLimiteFinalizadas(l => l + PAGINA_FINALIZADAS)}>
            Mostrar mais {Math.min(PAGINA_FINALIZADAS, restantesFinalizadas)} finalizadas
          </Button>
          <span className="text-xs text-ink-3 tabular-nums">{limiteFinalizadas} de {finalizadasBase.length}</span>
        </span>
      ) : undefined}
    />
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className={`py-6 md:py-8 ${temAcoesCabecalho ? 'pb-28 md:pb-10' : 'pb-10'} space-y-4`}>
        <PageHeader
          title="Inspeções de Saúde"
          description="Cadastro, agenda e prazos das IS (exceto concursos)."
          actions={temAcoesCabecalho ? (
            // Celular: as mesmas ações vão para o FAB.
            <div className="hidden md:flex items-center gap-2">
              {podeEmails && <BotaoEnviarEmails itens={emails.itens} total={emails.total} />}
              {podeBloquear && <Button variant="secondary" icon="block" onClick={() => setBloqueiosAberto(true)}>Bloqueios</Button>}
              {podeCadastrar && (
                <MenuAcoes
                  rotulo="Abrir IS" botao={{ texto: 'Abrir IS', icone: 'add', primario: true }}
                  itens={[
                    { rotulo: 'Manualmente', icone: 'edit_note', onClick: () => setNovo({}) },
                    { rotulo: 'Enviar print', icone: 'photo_camera', onClick: () => setPorFoto(true) },
                  ]}
                />
              )}
            </div>
          ) : undefined}
        />

        {visaoEfetiva === 'calendario' ? (
          erroCarga ? <p role="alert" className="bg-white rounded-xl border border-line p-6 text-sm font-semibold text-wine">{erroCarga}</p>
            : lista === null ? <p className="bg-white rounded-xl border border-line p-10 text-center text-sm text-ink-3" role="status">Carregando inspeções…</p>
              : (
                <CalendarioIS
                  inspecoes={lista} bloqueios={bloqueiosTodos} config={config} peritoUid="" diasConcursos={diasConcursos}
                  controleVisao={<AlternarVisao value={visao} onChange={setVisao} />}
                  onAbrirConcurso={podeVerConcursos ? id => nav?.navigate(concursoPath(id)) : undefined}
                  onAbrir={is => setDetalheId(is.id)}
                  onNovoNoHorario={podeAgendar ? setHorarioVazio : undefined}
                  onReagendar={podeAgendar ? reagendarArrastando : undefined}
                  onTrocarPerito={podeAgendar ? (is, dataHora) => setTrocandoPerito({ is, dataHora, modo: 'arraste' }) : undefined}
                  onAviso={avisar}
                />
              )
        ) : (
          <section aria-label="Lista de IS" className="md:bg-white md:border md:border-line md:rounded-xl md:overflow-clip">
            {/* Abas sublinhadas (ouro = ativa) com a contagem · vista só com ícone (G2). */}
            <div className="flex items-end justify-between gap-2 border-b border-line md:px-4">
              <div role="tablist" aria-label="Situação das IS" className="flex gap-1" onKeyDown={aoTeclaAbas}>
                {abas.map(t => {
                  const ativa = aba === t.id;
                  return (
                    <button
                      key={t.id} type="button" role="tab" id={`inspecoes-aba-${t.id}`} aria-selected={ativa} aria-controls="inspecoes-lista" tabIndex={ativa ? 0 : -1}
                      onClick={() => irParaAba(t.id)}
                      className={`inline-flex items-center gap-2 h-12 px-3 -mb-px border-b-[3px] text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${ativa ? 'border-gold text-navy' : 'border-transparent text-ink-3 hover:text-navy'}`}
                    >
                      {t.rotulo}
                      <span className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-xs tabular-nums ${ativa ? 'bg-navy text-white' : 'bg-thead text-ink-3'}`}>{t.n}</span>
                    </button>
                  );
                })}
              </div>
              {desktop && (
                <div className="flex items-center gap-1 pb-1.5">
                  <AlternarVisao value={visao} onChange={setVisao} />
                </div>
              )}
            </div>

            {/* Busca e filtros em chips — no celular, uma linha só com rolagem lateral (M3); a busca abre pelo ícone. */}
            <div className="py-3 md:px-4 flex flex-col md:flex-row md:items-center gap-2">
              <SearchField
                value={busca} onChange={setBusca} label="Buscar IS" placeholder="Nº da IS, inspecionado, NIP ou finalidade" autoComplete="off"
                className={`${buscaAberta || busca ? '' : 'hidden'} md:block md:flex-1 md:min-w-[14rem] md:max-w-md`}
              />
              <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap [scrollbar-width:none]">
                <IconButton
                  icon={buscaAberta ? 'search_off' : 'search'} label={buscaAberta ? 'Fechar a busca' : 'Buscar'} variant="secondary"
                  className="md:hidden shrink-0" aria-expanded={buscaAberta} onClick={() => setBuscaAberta(a => !a)}
                />
                {(contagens.atrasadas > 0 || situacao === 'atrasadas') && (
                  <FilterChip ativo={situacao === 'atrasadas'} icon="warning" onAlternar={() => alternarSituacao('atrasadas')} className="shrink-0">
                    Atrasadas {badge(contagens.atrasadas, true)}
                  </FilterChip>
                )}
                <FilterChip ativo={situacao === 'sem_agendamento'} icon="event_busy" onAlternar={() => alternarSituacao('sem_agendamento')} className="shrink-0">
                  Sem agendamento {badge(contagens.semAgendamento)}
                </FilterChip>
                {(souPerito || minhas) && (
                  <FilterChip ativo={minhas} icon="person" onAlternar={() => mudarURL({ minhas: minhas ? null : '1', perito: null })} className="shrink-0">Minhas</FilterChip>
                )}
                <FiltroPopover variante="chip" nome="Perito" icone="stethoscope" resumo={nomePeritoFiltro || 'Perito'} ativo={!!peritoParam}>
                  {fechar => (
                    <fieldset>
                      <legend className="sr-only">Perito</legend>
                      {[{ uid: '', usuario: 'Todos os peritos' }, ...peritosFiltraveis].map(p => (
                        <label key={p.uid || 'todos'} className="flex items-center gap-3 min-h-10 px-3 cursor-pointer hover:bg-thead">
                          <input
                            type="radio" name="inspecoes-perito" className="w-5 h-5 shrink-0 accent-navy" checked={peritoParam === p.uid && !minhas || (!p.uid && !peritoParam && !minhas)}
                            onChange={() => { mudarURL({ perito: p.uid || null, minhas: null }); fechar(); }}
                          />
                          <span className={`text-sm ${peritoParam === p.uid ? 'font-bold text-navy' : 'font-semibold text-ink'}`}>{p.usuario}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </FiltroPopover>
                <FiltroPeriodo variante="chip" value={periodo} onChange={setPeriodo} onLimpar={() => setPeriodo(null)} />
              </div>
            </div>

            <div id="inspecoes-lista" role="tabpanel" aria-labelledby={`inspecoes-aba-${aba}`}>{conteudoLista}</div>
          </section>
        )}
      </Container>

      {/* Celular: FAB com as ações do cabeçalho (4d) — Abrir IS (manual), Abrir IS (foto do SINAIS), Enviar e-mails, Bloqueios. */}
      <FabAcoes acoes={[
        { id: 'abrir-is-manual', rotulo: 'Abrir IS', icone: 'add', ariaLabel: 'Abrir IS manualmente', onClick: () => setNovo({}), permitido: podeCadastrar },
        { id: 'abrir-is-foto', rotulo: 'Abrir IS', icone: 'photo_camera', ariaLabel: 'Abrir IS por foto do SINAIS', onClick: () => setPorFoto(true), permitido: podeCadastrar },
        {
          id: 'enviar-emails', rotulo: emails.total > 0 ? `${ROTULO_ENVIAR_EMAILS} (${emails.total > 99 ? '99+' : emails.total})` : ROTULO_ENVIAR_EMAILS,
          icone: 'mail', ariaLabel: rotuloEmailsComTotal(emails.total), onClick: () => setEmailsAberto(true), permitido: podeEmails,
        },
        { id: 'bloqueios', rotulo: 'Bloqueios', icone: 'block', ariaLabel: 'Bloqueios da agenda', onClick: () => setBloqueiosAberto(true), permitido: podeBloquear },
      ]} />
      {podeEmails && emailsAberto && <EmailsPendentesDialog itens={emails.itens} total={emails.total} onClose={() => setEmailsAberto(false)} />}
      {podeEmails && emails.dialogos}

      {novo && usuario && (
        <InspecaoForm
          militares={militares} peritos={peritos} config={config} bloqueios={bloqueiosTodos} inspecoes={lista ?? []}
          usuario={{ uid: usuario.uid, usuario: usuario.usuario, perfil: usuario.perfil }}
          podeCadastrarInspecionado={podeCadastrarInspecionado} podeAgendar={podeAgendar}
          inicial={novo} onClose={() => setNovo(null)} onCriada={aoCriada}
        />
      )}

      {posCriacao && (
        <PosCriacaoIS
          key={posCriacao.is.id}
          is={posCriacao.is} dados={posCriacao.dados} podeEmails={podeEmails}
          militar={militares.find(m => m.id === posCriacao.is.inspecionadoId)}
          onAviso={avisar} onFim={fimPosCriacao}
        />
      )}

      {porFoto && usuario && (
        <ISPorFotoForm
          militares={militares} peritos={peritos} config={config} bloqueios={bloqueiosTodos} inspecoes={lista ?? []}
          usuario={{ uid: usuario.uid, usuario: usuario.usuario, perfil: usuario.perfil }}
          podeCadastrarInspecionado={podeCadastrarInspecionado} onClose={() => setPorFoto(false)} onGravada={aoGravarPorFoto} onConcluido={aoConcluirPorFoto}
        />
      )}

      {detalhe && (
        <InspecaoDetalhe
          inspecao={detalhe}
          om={omDe(detalhe)}
          permissoes={{ editar: podeEditar, minuta: podeMinuta, parecer: podeParecer, entrevista: podeGravarEntrevista, exames: podeEnviarExames }}
          onClose={() => setDetalheId(null)}
          onMinuta={() => setMinuta(detalhe)}
          onSolicitarParecer={() => setParecerPara({ is: detalhe })}
          onDuplicarParecer={p => setParecerPara({ is: detalhe, inicial: p })}
          onSituacaoMudou={is => { sincronizarAgendaIS(is).then(r => { if (!r.ok) avisar(`IS atualizada, mas o Google Agenda não: ${r.erro}`, 'error'); }); }}
          onAviso={avisar}
          emails={(
            <EmailsDaIS
              is={detalhe} om={omDe(detalhe)} hoje={hoje} podeEnviar={podeEmails}
              onEnviarAgendamento={is => setFilaAgendamento(f => [...f, { isId: is.id, dataEntrevista: is.dataEntrevista, origem: 'menu' }])}
              onEnviarResultado={setEnviandoResultado}
              onEnviarResultadoBeneficios={setEnviandoBeneficios}
              onAviso={avisar}
            />
          )}
        />
      )}

      {trocandoPerito && (
        <TrocarPeritoDialog
          inspecao={trocandoPerito.is} dataHora={trocandoPerito.dataHora} modo={trocandoPerito.modo} peritos={peritos} config={config} bloqueios={bloqueiosTodos} inspecoes={lista ?? []}
          onClose={() => setTrocandoPerito(null)} onConcluido={(msg, tom) => { setTrocandoPerito(null); avisar(msg, tom); }}
        />
      )}

      {horarioVazio && (
        <AgendarNoHorarioDialog
          dataHora={horarioVazio} peritoFiltro="" inspecoes={lista ?? []} peritos={peritos} config={config} bloqueios={bloqueiosTodos}
          podeCadastrar={podeCadastrar && (ehAdmin || horarioVazio.slice(0, 10) >= hoje)}
          onNova={() => { setNovo({ dataEntrevista: horarioVazio }); setHorarioVazio(null); }}
          onClose={() => setHorarioVazio(null)}
          onAgendada={(msg, tom) => { setHorarioVazio(null); avisar(msg, tom); }}
        />
      )}

      {agendando && (
        <AgendarDialog
          inspecao={agendando} peritos={peritos} config={config} bloqueios={bloqueiosTodos} inspecoes={lista ?? []}
          onClose={() => setAgendando(null)} onAgendada={(msg, tom) => { setAgendando(null); avisar(msg, tom); }}
        />
      )}

      {minuta && (minuta.status === 'cancelada' ? (
        <MinutaDialog
          titulo={`Minuta de cancelamento — IS ${minuta.is}`}
          textoInicial={minuta.minutaCancelamento || minutaCancelamento(dadosMinuta(minuta))}
          onClose={() => setMinuta(null)} onAviso={avisar}
        />
      ) : (
        <MinutaDialog
          titulo={`Minuta MSG — IS ${minuta.is}`}
          textoInicial={minutaResultadoDaIS(minuta, { om: omDe(minuta), vinculo: vinculoDe(minuta) })}
          sugerirDestinatarios={async () => {
            const s = await sugerirDestinatariosIA({
              finalidade: minuta.finalidade, grupoFinalidade: minuta.grupoFinalidade, vinculo: vinculoDe(minuta),
              posto: postoDoInspecionado(minuta.inspecionado), laudo: minuta.laudo || '',
            });
            return s && {
              para: s.para, info: s.info,
              origem: `Linha: ${s.finalidadeIS} › ${s.situacaoInspecionado} › ${s.laudo}.${s.justificativa ? ` ${s.justificativa}` : ''}`,
            };
          }}
          onClose={() => setMinuta(null)} onAviso={avisar}
        />
      ))}

      {agendamentoAtual && agendamentoAtual.is.dataEntrevista === agendamentoAtual.item.dataEntrevista && ehElegivelAgendamento(agendamentoAtual.is) && !agendamentoJaEnviado(agendamentoAtual.is) && (
        <EnviarAgendamentoDialog
          key={`${agendamentoAtual.item.isId}|${agendamentoAtual.item.dataEntrevista}`}
          inspecao={agendamentoAtual.is} origem={agendamentoAtual.item.origem} om={omDe(agendamentoAtual.is)}
          emailCadastrado={emailDoInspecionado(militares.find(m => m.id === agendamentoAtual.is.inspecionadoId))}
          onClose={proximoAgendamento}
          onEnviado={(msg, tom) => { proximoAgendamento(); avisar(msg, tom); }}
        />
      )}

      {enviandoResultado && (
        <EnviarResultadoDialog
          inspecao={enviandoResultado}
          emailCadastrado={emailDoInspecionado(militares.find(m => m.id === enviandoResultado.inspecionadoId))}
          onClose={() => setEnviandoResultado(null)}
          onEnviado={(msg, tom) => { setEnviandoResultado(null); avisar(msg, tom); }}
        />
      )}

      {enviandoBeneficios && (
        <EnviarResultadoBeneficiosDialog
          inspecao={lista?.find(i => i.id === enviandoBeneficios.id) ?? enviandoBeneficios}
          militar={militares.find(m => m.id === enviandoBeneficios.inspecionadoId)}
          emailCadastrado={emailDoInspecionado(militares.find(m => m.id === enviandoBeneficios.inspecionadoId))}
          onClose={() => setEnviandoBeneficios(null)}
          onEnviado={(msg, tom) => { setEnviandoBeneficios(null); avisar(msg, tom); }}
        />
      )}

      {parecerPara && (
        <NovoParecerForm
          inicial={parecerPara.inicial}
          prefill={{ militarId: parecerPara.is.inspecionadoId, finalidade: parecerPara.is.finalidade }}
          vinculoIS={{ isId: parecerPara.is.id, is: parecerPara.is.is }}
          onClose={() => setParecerPara(null)}
          onGerado={nome => { aoParecerGerado(parecerPara.is, nome); }}
        />
      )}

      {confirmando && (
        <ConfirmDialog
          title={confirmando.tipo === 'falta' ? 'Falta' : 'Cancelar IS'}
          message={<>{confirmando.tipo === 'falta' ? 'Registrar falta na' : 'Cancelar a'} <strong>IS {confirmando.is.is}</strong> ({nomeCurto(confirmando.is.inspecionado)})?</>}
          confirmLabel={confirmando.tipo === 'falta' ? 'Registrar falta' : 'Cancelar IS'} cancelLabel="Voltar"
          destructive={confirmando.tipo === 'cancelar'} onConfirm={confirmarAcao} onCancel={() => setConfirmando(null)}
        />
      )}

      {apagando && (
        <ConfirmDialog
          title="Apagar IS"
          message={<>Apagar definitivamente a <strong>IS {apagando.is}</strong> ({nomeCurto(apagando.inspecionado)})? O horário reservado, o evento no Google Agenda e as guias de exames também são removidos. Esta ação não pode ser desfeita.</>}
          confirmLabel="Apagar" destructive onConfirm={confirmarApagar} onCancel={() => setApagando(null)}
        />
      )}

      {bloqueiosAberto && usuario && (
        <BloqueiosDialog
          peritos={peritosFiltraveis} config={config} bloqueios={bloqueios}
          usuario={{ uid: usuario.uid, usuario: usuario.usuario, perfil: usuario.perfil }}
          onClose={() => setBloqueiosAberto(false)} onAviso={avisar}
        />
      )}
      {emailAgendaAberto && ehAdmin && (
        <EmailAgendaDialog
          hoje={hoje} inspecoes={lista ?? []} diasConcursos={diasConcursos}
          onClose={() => setEmailAgendaAberto(false)}
          onEnviado={(msg, tom) => { setEmailAgendaAberto(false); avisar(msg, tom); }}
        />
      )}
    </div>
  );
};
