// Ficheiro: components/Inspecoes.tsx
// Página INSPEÇÕES DE SAÚDE: cadastro das IS (exceto as de concursos), agendamento das entrevistas em
// slots de 20 min por perito, acompanhamento de prazos e minutas de mensagem. O status muda sozinho
// (Conclusão da IS no detalhe; Falta, Restituição, Reabrir e Cancelar IS no menu ⋮ da linha). Visão inicial em tabela
// no formato "agenda" (um grupo por dia da entrevista; no topo, as não agendadas — ver inspecoes/TabelaAgendaIS),
// filtrada por situação (padrão: Em andamento) e período (padrão: Este mês), com alternância para calendário no
// formato do Google Agenda. As IS com entrevista marcada são sincronizadas com a agenda "JRS/HNRe" do Google
// Agenda, com o perito como convidado (ver services/agendaGoogleIS.ts).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { ConfirmDialog } from './ui/Dialog';
import { controlClass } from './ui/Field';
import { type ItemMenu } from './ui/MenuAcoes';
import { TabelaAgendaIS } from './inspecoes/TabelaAgendaIS';
import { FiltroSituacaoIS } from './inspecoes/FiltroSituacaoIS';
import { FiltroPeriodo, type FiltroPeriodoValor } from './inspecoes/FiltroPeriodo';
import { InspecaoForm } from './inspecoes/InspecaoForm';
import { ISPorFotoForm } from './inspecoes/ISPorFotoForm';
import { InspecaoDetalhe } from './inspecoes/InspecaoDetalhe';
import { AgendarDialog } from './inspecoes/AgendarDialog';
import { TrocarPeritoDialog } from './inspecoes/TrocarPeritoDialog';
import { AgendarNoHorarioDialog } from './inspecoes/AgendarNoHorarioDialog';
import { MinutaDialog } from './inspecoes/MinutaDialog';
import { EnviarResultadoDialog } from './inspecoes/EnviarResultadoDialog';
import { EnviarAgendamentoDialog } from './inspecoes/EnviarAgendamentoDialog';
import { avisarAgendamento, observarAgendamentos, type AgendamentoFeito } from '../services/emailAgendamentoIS';
import { agendamentoJaEnviado, ehElegivelAgendamento } from '../utils/emailAgendamentoIS';
import { EmailAgendaDialog } from './inspecoes/EmailAgendaDialog';
import { BotaoEmailFaltas } from './inspecoes/BotaoEmailFaltas';
import { emailDoInspecionado } from '../services/emailResultadoIS';
import { CalendarioIS } from './inspecoes/CalendarioIS';
import { BloqueiosDialog } from './inspecoes/BloqueiosDialog';
import { AgendaConfigDialog } from './inspecoes/AgendaConfigDialog';
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
import { concursoPath } from '../config/routes';
import { carregarPeritos, type PeritoIS } from '../services/peritosIS';
import { sincronizarAgendaIS, removerEventoAgendaIS } from '../services/agendaGoogleIS';
import { minutaCancelamento, minutaResultadoDaIS } from '../utils/minutasIS';
import { postoDoInspecionado, sugerirDestinatariosIA } from '../services/destinatariosIA';
import { normalizarBusca } from '../utils/corposQuadros';
import {
  STATUS_IS, statusEfetivoIS, diasEmAberto, prazoAtrasoDias, dataHoraBr, hojeISO,
  podeCancelarIS, situacaoDoStatus,
  type BloqueioAgenda, type ConfigAgenda, type SituacaoIS, type StatusIS,
} from '../utils/inspecoes';
import { intervaloDoPeriodo } from '../utils/periodos';
import { agruparAgendaIS, passaNoPeriodo } from '../utils/agendaIS';

type Visao = 'tabela' | 'calendario';

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
            className={`inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${ativo ? 'bg-navy text-white' : 'text-ink-3 hover:bg-white hover:text-navy'}`}
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

  const [visao, setVisao] = useState<Visao>('tabela');
  // Filtros da visão Tabela (o calendário tem navegação própria). Padrão: Em andamento · Este mês.
  const [situacoes, setSituacoes] = useState<SituacaoIS[]>(['andamento']);
  const [periodo, setPeriodo] = useState<FiltroPeriodoValor>({ id: 'mes' });
  const [busca, setBusca] = useState('');
  const [peritoFiltro, setPeritoFiltro] = useState('');

  const [novo, setNovo] = useState<{ dataEntrevista?: string; peritoUid?: string } | null>(null);
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
  /** E-mails de agendamento a oferecer (depois de agendar) ou pedidos pelo menu ⋮; mostrados um por vez. */
  const [filaAgendamento, setFilaAgendamento] = useState<(AgendamentoFeito & { origem: 'agendamento' | 'menu' })[]>([]);
  // A pergunta depois de agendar é só para Admin e Secretaria (quem envia o e-mail de agendamento).
  const perguntaAgendamento = ehAdmin || ehSecretaria;
  useEffect(() => {
    if (!perguntaAgendamento) return;
    return observarAgendamentos(a => setFilaAgendamento(f => (f.some(x => x.isId === a.isId && x.dataEntrevista === a.dataEntrevista) ? f : [...f, { ...a, origem: 'agendamento' }])));
  }, [perguntaAgendamento]);
  const [parecerPara, setParecerPara] = useState<{ is: InspecaoRecord; inicial?: ParecerRecord } | null>(null);
  const [confirmando, setConfirmando] = useState<{ tipo: 'falta' | 'cancelar'; is: InspecaoRecord } | null>(null);
  const [apagando, setApagando] = useState<InspecaoRecord | null>(null);
  const [bloqueiosAberto, setBloqueiosAberto] = useState(false);
  const [turnosAberto, setTurnosAberto] = useState(false);
  const [emailAgendaAberto, setEmailAgendaAberto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  useEffect(() => observarInspecoes(setLista, e => setErroCarga(e.message || 'Não foi possível carregar as inspeções.')), []);
  useEffect(() => observarBloqueios(setBloqueios), []);
  useEffect(() => observarConfigAgenda(setConfig), []);
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

  const intervalo = useMemo(() => intervaloDoPeriodo(periodo.id, hoje, periodo.custom), [periodo, hoje]);

  // Perito + período + busca (sem a situação): base dos contadores do filtro de situação.
  const semSituacao = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return (lista ?? [])
      .filter(i => (peritoFiltro ? i.peritoUid === peritoFiltro : true))
      .filter(i => passaNoPeriodo(i, intervalo))
      .filter(i => { const alvo = normalizarBusca(`${i.is} ${i.inspecionado} ${i.inspecionadoId} ${i.finalidade} ${i.peritoNome} ${STATUS_IS[statusEfetivoIS(i, hoje)].rotulo}`); return termos.every(t => alvo.includes(t)); });
  }, [lista, peritoFiltro, intervalo, busca, hoje]);

  const totais = useMemo(() => ({
    aberta: semSituacao.filter(i => i.situacao === 'aberta').length,
    andamento: semSituacao.filter(i => i.situacao === 'andamento').length,
    finalizada: semSituacao.filter(i => i.situacao === 'finalizada').length,
    atrasadas: lista?.filter(i => statusEfetivoIS(i, hoje) === 'atrasada').length ?? 0,
  }), [semSituacao, lista, hoje]);

  // Agenda: não agendadas no topo; depois um grupo por dia da entrevista (crescente; no dia, pela hora).
  const grupos = useMemo(() => agruparAgendaIS(semSituacao.filter(i => situacoes.includes(i.situacao))), [semSituacao, situacoes]);

  // ----- ações -----

  const sincronizar = async (is: InspecaoRecord) => {
    const r = await sincronizarAgendaIS(is);
    if (!r.ok) avisar(`Google Agenda não atualizado: ${r.erro}`, 'error');
    else avisar(r.semConvidado ? 'Evento sincronizado. O perito não tem Gmail cadastrado e não foi convidado.' : 'Evento sincronizado com o Google Agenda "JRS/HNRe".');
  };

  const aoCriada = (is: InspecaoRecord) => {
    setNovo(null);
    if (is.dataEntrevista) avisarAgendamento(is, is.dataEntrevista);
    if (is.dataEntrevista) {
      avisar(`IS ${is.is} cadastrada e agendada. Sincronizando com o Google Agenda…`);
      sincronizarAgendaIS(is).then(r => {
        if (!r.ok) avisar(`IS ${is.is} cadastrada, mas o Google Agenda não foi atualizado: ${r.erro}`, 'error');
        else avisar(r.semConvidado ? `IS ${is.is} agendada. O perito não tem Gmail cadastrado e não foi convidado.` : `IS ${is.is} agendada e sincronizada com o Google Agenda.`);
      });
    } else avisar(`IS ${is.is} cadastrada.`);
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
    if (podeAgendar && is.status === 'aberta') itens.push({ rotulo: is.dataEntrevista ? 'Reagendar' : 'Agendar', icone: 'event', onClick: () => setAgendando(is) });
    if (podeAgendar && is.status === 'faltou') itens.push({ rotulo: 'Reagendar', icone: 'event', onClick: () => setAgendando(is) });
    // Agendada/Reagendada: reagendar enquanto der para remarcar (sem laudo, TIS nem DS-1a; não é de concurso).
    if (podeAgendar && is.status !== 'aberta' && is.status !== 'faltou' && podeArrastarIS(is)) itens.push({ rotulo: 'Reagendar', icone: 'event', onClick: () => setAgendando(is) });
    if (podeEditar && fasesDeEntrevista(is)) itens.push({ rotulo: 'Falta', icone: 'person_off', onClick: () => setConfirmando({ tipo: 'falta', is }) });
    const restituicao = restituicaoDoStatus(is.status);
    if (restituicao && podeEditar && !ehSecretaria) itens.push({ rotulo: restituicao.rotulo, icone: 'undo', onClick: () => { mudarStatus(is, restituicao.status, `IS ${is.is}: ${restituicao.rotulo}.`); } });
    if (podeMinuta && mostraMinutaMsg(is)) itens.push({ rotulo: 'Minuta MSG', icone: 'mail', onClick: () => setMinuta(is) });
    // E-mail de agendamento ao inspecionado (Benefícios, Verificações e Términos): Admin e Secretaria; um por data/hora.
    if ((ehAdmin || ehSecretaria) && ehElegivelAgendamento(is)) {
      itens.push(agendamentoJaEnviado(is)
        ? { rotulo: 'E-mail de agendamento enviado', icone: 'mark_email_read', desabilitado: true, dica: `Para ${is.emailAgendamentoPara}`, onClick: () => {} }
        : { rotulo: 'Enviar e-mail de agendamento', icone: 'forward_to_inbox', onClick: () => setFilaAgendamento(f => [...f, { isId: is.id, dataEntrevista: is.dataEntrevista, origem: 'menu' }]) });
    }
    // Resultado ao inspecionado por e-mail: só IS finalizada com TIS assinado; só Admin e Secretaria.
    // Já enviado: o item fica visível, mas desabilitado, com o destinatário na dica.
    if ((ehAdmin || ehSecretaria) && is.status === 'tis_assinado') {
      itens.push(is.emailResultadoPara
        ? { rotulo: 'Resultado já enviado por e-mail', icone: 'mark_email_read', desabilitado: true, dica: `Para ${is.emailResultadoPara}`, onClick: () => {} }
        : { rotulo: 'Enviar resultado por e-mail', icone: 'forward_to_inbox', onClick: () => setEnviandoResultado(is) });
    }
    if (podeAgendar && is.dataEntrevista && is.status !== 'cancelada' && !(is.agendaSincronizada && is.eventoAgendaId)) itens.push({ rotulo: 'Sincronizar com o Google Agenda', icone: 'sync', onClick: () => { sincronizar(is); } });
    if (ehAdmin && is.status === 'tis_assinado') itens.push({ rotulo: 'Reabrir IS', icone: 'lock_open', onClick: () => { mudarStatus(is, 'assinaturas_pendentes', `IS ${is.is} reaberta.`); } });
    if ((ehAdmin || ehSecretaria) && podeCancelarIS(is, hoje)) itens.push({ rotulo: 'Cancelar IS', icone: 'cancel', perigo: true, onClick: () => setConfirmando({ tipo: 'cancelar', is }) });
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

  const statusDe = (is: InspecaoRecord) => STATUS_IS[statusEfetivoIS(is, hoje)];
  const prazoTexto = (is: InspecaoRecord): string | null => {
    if (is.status !== 'aberta' || is.dataEntrevista) return null;
    return `${diasEmAberto(is.dataAbertura, hoje)}/${prazoAtrasoDias(is.grupoFinalidade)} dias`;
  };

  const peritosFiltraveis = peritos;

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title="Inspeções de Saúde"
          actions={(
            <>
              {(ehAdmin || ehSecretaria) && <BotaoEmailFaltas inspecoes={lista ?? []} militares={militares} onAviso={avisar} />}
              {ehAdmin && <IconButton variant="secondary" icon="outgoing_mail" label="E-mail das IS agendadas" onClick={() => setEmailAgendaAberto(true)} />}
              {ehAdmin && <IconButton variant="secondary" icon="tune" label="Horários" onClick={() => setTurnosAberto(true)} />}
              {podeBloquear && <IconButton variant="secondary" icon="block" label="Bloqueios" onClick={() => setBloqueiosAberto(true)} />}
              {podeCadastrar && <IconButton variant="secondary" icon="photo_camera" label="IS por foto" onClick={() => setPorFoto(true)} />}
              {podeCadastrar && <Button icon="add" onClick={() => setNovo({})}>Abrir IS</Button>}
            </>
          )}
        />

        {totais.atrasadas > 0 && (
          <button
            type="button"
            onClick={() => { setVisao('tabela'); setSituacoes(['aberta']); setBusca('atrasada'); }}
            className="w-full text-left bg-wine/10 border border-wine/30 rounded-xl px-4 py-3 text-sm font-semibold text-wine flex items-center gap-2 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">warning</span>
            {totais.atrasadas} IS atrasada{totais.atrasadas !== 1 ? 's' : ''} (abertas e sem agendamento além do prazo). Toque para ver.
          </button>
        )}

        {/* Barra de filtros (só na Tabela): Situação → Período → Perito → Tabela/Calendário → Busca (uma linha no
            desktop largo). No Calendário não há filtros: a alternância Tabela/Calendário vai para a barra do calendário. */}
        {visao === 'tabela' && (
          <div className="bg-white rounded-xl border border-line p-3 flex flex-wrap xl:flex-nowrap items-center gap-2">
            <FiltroSituacaoIS value={situacoes} onChange={setSituacoes} contadores={totais} className="flex-1 min-w-[9rem] sm:flex-none sm:w-48 xl:w-44 xl:shrink-0" />
            <FiltroPeriodo value={periodo} onChange={setPeriodo} className="flex-1 min-w-[9rem] sm:flex-none sm:w-52 xl:w-48 xl:shrink-0" />
            <select aria-label="Filtrar por perito" value={peritoFiltro} onChange={e => setPeritoFiltro(e.target.value)} className={`${controlClass} !w-auto flex-1 min-w-0 sm:flex-none sm:min-w-[12rem] xl:max-w-[14rem]`}>
              <option value="">Todos os peritos</option>
              {peritosFiltraveis.map(p => <option key={p.uid} value={p.uid}>{p.usuario}</option>)}
            </select>
            <AlternarVisao value={visao} onChange={setVisao} />
            <div className="relative flex-1 min-w-0 sm:flex-none sm:w-64 xl:w-72 xl:min-w-[10rem] xl:shrink">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
              <input type="search" aria-label="Buscar IS" title="Busca por nº da IS, inspecionado, NIP, finalidade, perito ou status" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" className={`${controlClass} pl-10`} autoComplete="off" />
            </div>
          </div>
        )}

        {erroCarga ? (
          <p role="alert" className="bg-white rounded-xl border border-line p-6 text-sm font-semibold text-wine">{erroCarga}</p>
        ) : lista === null ? (
          <p className="bg-white rounded-xl border border-line p-10 text-center text-sm text-ink-3" role="status">Carregando inspeções…</p>
        ) : visao === 'calendario' ? (
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
        ) : grupos.length === 0 ? (
          <div className="bg-white rounded-xl border border-line">
            <EmptyState
              icon="event_available" title="Nenhuma IS encontrada"
              description={lista.length === 0 ? 'Cadastre a primeira IS para começar.' : situacoes.length === 0 ? 'Selecione ao menos uma situação.' : 'Ajuste a situação, o período, o perito ou a busca.'}
            />
          </div>
        ) : (
          <TabelaAgendaIS
            grupos={grupos} hoje={hoje}
            nomeDe={is => nomeCurto(is.inspecionado)} omDe={omDe} statusDe={statusDe} prazoDe={prazoTexto}
            onAbrir={is => setDetalheId(is.id)}
            podeTrocarPerito={is => !['cancelada', 'tis_assinado'].includes(is.status)}
            onTrocarPerito={podeAgendar ? is => setTrocandoPerito({ is, dataHora: is.dataEntrevista, modo: 'troca' }) : undefined}
            itensDe={itensDe}
            onNomeCopiado={(nome, ok) => avisar(ok ? `Nome copiado: ${nome}` : 'Não foi possível copiar; selecione o nome e copie manualmente.', ok ? 'success' : 'error')}
          />
        )}
      </Container>

      {novo && usuario && (
        <InspecaoForm
          militares={militares} peritos={peritos} config={config} bloqueios={bloqueiosTodos} inspecoes={lista ?? []}
          usuario={{ uid: usuario.uid, usuario: usuario.usuario, perfil: usuario.perfil }}
          podeCadastrarInspecionado={podeCadastrarInspecionado} podeAgendar={podeAgendar}
          inicial={novo} onClose={() => setNovo(null)} onCriada={aoCriada}
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
          inspecao={agendamentoAtual.is} origem={agendamentoAtual.item.origem}
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
          message={<>Apagar definitivamente a <strong>IS {apagando.is}</strong> ({nomeCurto(apagando.inspecionado)})? O horário reservado e o evento no Google Agenda também são removidos. Esta ação não pode ser desfeita.</>}
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
      {turnosAberto && ehAdmin && (
        <AgendaConfigDialog
          peritos={peritosFiltraveis} config={config}
          onClose={() => setTurnosAberto(false)} onSalvo={() => { setTurnosAberto(false); avisar('Turnos dos peritos salvos.'); }}
        />
      )}
    </div>
  );
};
