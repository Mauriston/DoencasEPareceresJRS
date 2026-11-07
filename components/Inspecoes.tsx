// Ficheiro: components/Inspecoes.tsx
// Página INSPEÇÕES DE SAÚDE: cadastro das IS (exceto as de concursos), agendamento das entrevistas em
// slots de 20 min por perito, acompanhamento de prazos e minutas de mensagem. O status muda sozinho
// (Conclusão da IS no detalhe; Falta, Restituição, Reabrir e Cancelar IS no menu ⋮ da linha). Visão inicial em tabela
// (agrupada em Abertas · Em andamento · Finalizadas) com alternância para calendário no formato do
// Google Agenda. As IS com entrevista marcada são sincronizadas com a agenda "JRS/HNRe" do Google
// Agenda, com o perito como convidado (ver services/agendaGoogleIS.ts).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { ConfirmDialog } from './ui/Dialog';
import { controlClass } from './ui/Field';
import { MenuAcoes, type ItemMenu } from './ui/MenuAcoes';
import { InspecaoForm } from './inspecoes/InspecaoForm';
import { InspecaoDetalhe } from './inspecoes/InspecaoDetalhe';
import { AgendarDialog } from './inspecoes/AgendarDialog';
import { TrocarPeritoDialog } from './inspecoes/TrocarPeritoDialog';
import { AgendarNoHorarioDialog } from './inspecoes/AgendarNoHorarioDialog';
import { MinutaDialog } from './inspecoes/MinutaDialog';
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
import { bloqueiosDeConcursos } from '../services/agendaConcursos';
import { useDiasConcursos, useSincronizarAgendaConcursos } from '../hooks/useDiasConcursos';
import { concursoPath } from '../config/routes';
import { carregarPeritos, type PeritoIS } from '../services/peritosIS';
import { sincronizarAgendaIS, removerEventoAgendaIS } from '../services/agendaGoogleIS';
import { minutaCancelamento, minutaResultadoDaIS } from '../utils/minutasIS';
import { normalizarBusca } from '../utils/corposQuadros';
import {
  STATUS_IS, SITUACOES_IS, statusEfetivoIS, diasEmAberto, prazoAtrasoDias, dataBr, dataHoraBr, hojeISO, dataDeEntrevista, horaDeEntrevista, nomeDiaSemana,
  podeCancelarIS, situacaoDoStatus,
  type BloqueioAgenda, type ConfigAgenda, type SituacaoIS, type StatusIS,
} from '../utils/inspecoes';

type Visao = 'tabela' | 'calendario';
type FiltroSituacao = 'todas' | SituacaoIS;

/** IS finalizadas de concursos não entram aqui; aqui só as cadastradas na página. */
const nomeCurto = (inspecionado: string): string => inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || inspecionado;

const ordenar = (situacao: SituacaoIS, a: InspecaoRecord, b: InspecaoRecord): number => {
  if (situacao === 'aberta') return a.dataAbertura.localeCompare(b.dataAbertura) || a.is - b.is;
  // Em andamento e Finalizadas: agrupadas por data da entrevista, da mais antiga para a mais recente (sem data no fim).
  return (a.dataEntrevista || '9').localeCompare(b.dataEntrevista || '9') || a.is - b.is;
};

/** Cabeçalho de grupo por data: "segunda-feira, 19/10/2026". */
const rotuloData = (is: InspecaoRecord): string => (is.dataEntrevista ? `${nomeDiaSemana(dataDeEntrevista(is.dataEntrevista))}, ${dataBr(dataDeEntrevista(is.dataEntrevista))}` : 'Sem data de entrevista');

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

  const [lista, setLista] = useState<InspecaoRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [config, setConfig] = useState<ConfigAgenda>({});
  const { dias: diasConcursos, concursosAtivos } = useDiasConcursos();
  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [peritos, setPeritos] = useState<PeritoIS[]>([]);

  const [visao, setVisao] = useState<Visao>('tabela');
  const [filtro, setFiltro] = useState<FiltroSituacao>('todas');
  const [busca, setBusca] = useState('');
  const [peritoFiltro, setPeritoFiltro] = useState('');

  const [novo, setNovo] = useState<{ dataEntrevista?: string; peritoUid?: string } | null>(null);
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
  const [parecerPara, setParecerPara] = useState<{ is: InspecaoRecord; inicial?: ParecerRecord } | null>(null);
  const [confirmando, setConfirmando] = useState<{ tipo: 'falta' | 'cancelar'; is: InspecaoRecord } | null>(null);
  const [apagando, setApagando] = useState<InspecaoRecord | null>(null);
  const [bloqueiosAberto, setBloqueiosAberto] = useState(false);
  const [turnosAberto, setTurnosAberto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  useEffect(() => observarInspecoes(setLista, e => setErroCarga(e.message || 'Não foi possível carregar as inspeções.')), []);
  useEffect(() => observarBloqueios(setBloqueios), []);
  useEffect(() => observarConfigAgenda(setConfig), []);
  useEffect(() => observarMilitares(setMilitares), []);
  useEffect(() => { carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, []);

  const hoje = hojeISO();
  // Dias de concurso bloqueiam o turno da manhã inteiro para todos os peritos (além dos bloqueios cadastrados).
  const bloqueiosTodos = useMemo(() => [...bloqueios, ...bloqueiosDeConcursos(diasConcursos)], [bloqueios, diasConcursos]);
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

  const totais = useMemo(() => ({
    todas: lista?.length ?? 0,
    aberta: lista?.filter(i => i.situacao === 'aberta').length ?? 0,
    andamento: lista?.filter(i => i.situacao === 'andamento').length ?? 0,
    finalizada: lista?.filter(i => i.situacao === 'finalizada').length ?? 0,
    atrasadas: lista?.filter(i => statusEfetivoIS(i, hoje) === 'atrasada').length ?? 0,
  }), [lista, hoje]);

  const filtrada = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return (lista ?? [])
      .filter(i => (filtro === 'todas' ? true : i.situacao === filtro))
      .filter(i => (peritoFiltro ? i.peritoUid === peritoFiltro : true))
      .filter(i => { const alvo = normalizarBusca(`${i.is} ${i.inspecionado} ${i.inspecionadoId} ${i.finalidade} ${i.peritoNome} ${STATUS_IS[statusEfetivoIS(i, hoje)].rotulo}`); return termos.every(t => alvo.includes(t)); });
  }, [lista, filtro, peritoFiltro, busca, hoje]);

  const grupos = useMemo(() => SITUACOES_IS
    .map(s => ({ ...s, itens: filtrada.filter(i => i.situacao === s.id).sort((a, b) => ordenar(s.id, a, b)) }))
    .filter(g => g.itens.length > 0), [filtrada]);

  // ----- ações -----

  const sincronizar = async (is: InspecaoRecord) => {
    const r = await sincronizarAgendaIS(is);
    if (!r.ok) avisar(`Google Agenda não atualizado: ${r.erro}`, 'error');
    else avisar(r.semConvidado ? 'Evento sincronizado. O perito não tem Gmail cadastrado e não foi convidado.' : 'Evento sincronizado com o Google Agenda "JRS/HNRe".');
  };

  const aoCriada = (is: InspecaoRecord) => {
    setNovo(null);
    if (is.dataEntrevista) {
      avisar(`IS ${is.is} cadastrada e agendada. Sincronizando com o Google Agenda…`);
      sincronizarAgendaIS(is).then(r => {
        if (!r.ok) avisar(`IS ${is.is} cadastrada, mas o Google Agenda não foi atualizado: ${r.erro}`, 'error');
        else avisar(r.semConvidado ? `IS ${is.is} agendada. O perito não tem Gmail cadastrado e não foi convidado.` : `IS ${is.is} agendada e sincronizada com o Google Agenda.`);
      });
    } else avisar(`IS ${is.is} cadastrada.`);
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
    if (podeEditar && fasesDeEntrevista(is)) itens.push({ rotulo: 'Falta', icone: 'person_off', onClick: () => setConfirmando({ tipo: 'falta', is }) });
    const restituicao = restituicaoDoStatus(is.status);
    if (restituicao && podeEditar && !ehSecretaria) itens.push({ rotulo: restituicao.rotulo, icone: 'undo', onClick: () => { mudarStatus(is, restituicao.status, `IS ${is.is}: ${restituicao.rotulo}.`); } });
    if (podeMinuta && mostraMinutaMsg(is)) itens.push({ rotulo: 'Minuta MSG', icone: 'mail', onClick: () => setMinuta(is) });
    if (podeParecer && fasesDeEntrevista(is)) itens.push({ rotulo: 'Parecer', icone: 'assignment_add', onClick: () => setParecerPara({ is }) });
    if (podeAgendar && is.dataEntrevista && is.status !== 'cancelada' && !(is.agendaSincronizada && is.eventoAgendaId)) itens.push({ rotulo: 'Sincronizar com o Google Agenda', icone: 'sync', onClick: () => { sincronizar(is); } });
    if (ehAdmin && is.status === 'tis_assinado') itens.push({ rotulo: 'Reabrir IS', icone: 'lock_open', onClick: () => { mudarStatus(is, 'assinaturas_pendentes', `IS ${is.is} reaberta.`); } });
    if ((ehAdmin || ehSecretaria) && podeCancelarIS(is, hoje)) itens.push({ rotulo: 'Cancelar IS', icone: 'cancel', perigo: true, onClick: () => setConfirmando({ tipo: 'cancelar', is }) });
    if (ehAdmin) itens.push({ rotulo: 'Apagar IS', icone: 'delete', perigo: true, onClick: () => setApagando(is) });
    return itens;
  };

  // ----- apresentação -----

  const tagStatus = (is: InspecaoRecord) => { const e = statusEfetivoIS(is, hoje); return <StatusTag tone={STATUS_IS[e].tom}>{STATUS_IS[e].rotulo}</StatusTag>; };
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
          description="Cadastre IS, agende as entrevistas em slots de 20 minutos, acompanhe os prazos e gere as minutas de mensagem."
          actions={(
            <>
              {ehAdmin && <Button variant="secondary" icon="tune" title="Turnos dos peritos" onClick={() => setTurnosAberto(true)}>Horários</Button>}
              {podeBloquear && <Button variant="secondary" icon="block" onClick={() => setBloqueiosAberto(true)}>Bloqueios</Button>}
              {podeCadastrar && <Button icon="add" onClick={() => setNovo({})}>Cadastrar IS</Button>}
            </>
          )}
        />

        {totais.atrasadas > 0 && (
          <button
            type="button"
            onClick={() => { setVisao('tabela'); setFiltro('aberta'); setBusca('atrasada'); }}
            className="w-full text-left bg-wine/10 border border-wine/30 rounded-xl px-4 py-3 text-sm font-semibold text-wine flex items-center gap-2 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">warning</span>
            {totais.atrasadas} IS atrasada{totais.atrasadas !== 1 ? 's' : ''} (abertas e sem agendamento além do prazo). Toque para ver.
          </button>
        )}

        <div className="bg-white rounded-xl border border-line p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented<Visao>
              ariaLabel="Forma de visualização" value={visao} onChange={setVisao}
              options={[{ value: 'tabela', label: 'Tabela', icon: 'table_rows' }, { value: 'calendario', label: 'Calendário', icon: 'calendar_month' }]}
            />
            <select aria-label="Filtrar por perito" value={peritoFiltro} onChange={e => setPeritoFiltro(e.target.value)} className={`${controlClass} !w-auto min-w-[200px]`}>
              <option value="">Todos os peritos</option>
              {peritosFiltraveis.map(p => <option key={p.uid} value={p.uid}>{p.usuario}</option>)}
            </select>
          </div>
          {visao === 'tabela' && (
            <>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
                <input type="search" aria-label="Buscar IS" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nº da IS, inspecionado, NIP, finalidade, perito ou status…" className={`${controlClass} pl-10`} autoComplete="off" />
              </div>
              <Segmented<FiltroSituacao>
                ariaLabel="Situação da IS" className="overflow-x-auto" value={filtro} onChange={setFiltro}
                options={[
                  { value: 'todas', label: 'Todas', badge: totais.todas, badgeTone: 'neutro' },
                  { value: 'aberta', label: 'Abertas', badge: totais.aberta, badgeTone: 'neutro' },
                  { value: 'andamento', label: 'Em andamento', badge: totais.andamento, badgeTone: 'neutro' },
                  { value: 'finalizada', label: 'Finalizadas', badge: totais.finalizada, badgeTone: 'neutro' },
                ]}
              />
            </>
          )}
        </div>

        {erroCarga ? (
          <p role="alert" className="bg-white rounded-xl border border-line p-6 text-sm font-semibold text-wine">{erroCarga}</p>
        ) : lista === null ? (
          <p className="bg-white rounded-xl border border-line p-10 text-center text-sm text-ink-3" role="status">Carregando inspeções…</p>
        ) : visao === 'calendario' ? (
          <CalendarioIS
            inspecoes={lista} bloqueios={bloqueiosTodos} config={config} peritoUid={peritoFiltro} diasConcursos={diasConcursos}
            onAbrirConcurso={podeVerConcursos ? id => nav?.navigate(concursoPath(id)) : undefined}
            onAbrir={is => setDetalheId(is.id)}
            onNovoNoHorario={podeAgendar ? setHorarioVazio : undefined}
            onReagendar={podeAgendar ? reagendarArrastando : undefined}
            onTrocarPerito={podeAgendar ? (is, dataHora) => setTrocandoPerito({ is, dataHora, modo: 'arraste' }) : undefined}
            onAviso={avisar}
          />
        ) : grupos.length === 0 ? (
          <div className="bg-white rounded-xl border border-line">
            <EmptyState icon="event_available" title="Nenhuma IS encontrada" description={lista.length === 0 ? 'Cadastre a primeira IS para começar.' : 'Ajuste a busca ou os filtros.'} />
          </div>
        ) : (
          grupos.map(g => (
            <section key={g.id} aria-label={g.plural} className="bg-white rounded-xl border border-line overflow-clip">
              <h2 className="px-4 py-3 bg-thead border-b border-line text-h3 font-bold text-navy flex items-center gap-2">
                {g.plural}
                <span className="text-xs font-bold text-ink-3 bg-white border border-line rounded-full px-2 py-0.5">{g.itens.length}</span>
              </h2>
              {/* Mobile */}
              <ul className="md:hidden divide-y divide-line">
                {g.itens.map((is, i) => (
                  <React.Fragment key={is.id}>
                  {g.id !== 'aberta' && (i === 0 || rotuloData(g.itens[i - 1]) !== rotuloData(is)) && (
                    <li className="px-4 py-1.5 bg-thead text-xs font-bold text-ink-3 capitalize">{rotuloData(is)}</li>
                  )}
                  <li className="flex items-start">
                    <button type="button" onClick={() => setDetalheId(is.id)} className="flex-1 min-w-0 text-left pl-4 py-3 min-h-[44px] hover:bg-thead">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-navy break-words">IS {is.is}{is.dataEntrevista ? ` · ${horaDeEntrevista(is.dataEntrevista)}` : ''} · {nomeCurto(is.inspecionado)}</span>
                          <span className="block text-xs text-ink-3 break-words">{is.finalidade}</span>
                          <span className="block text-xs text-ink-3">{is.dataEntrevista ? `${dataHoraBr(is.dataEntrevista)} · ${is.peritoNome}` : `Aberta em ${dataBr(is.dataAbertura)}${prazoTexto(is) ? ` · ${prazoTexto(is)}` : ''}`}</span>
                        </span>
                        <span className="shrink-0">{tagStatus(is)}</span>
                      </span>
                    </button>
                    <div className="shrink-0 pr-2 pt-1 w-12">{itensDe(is).length > 0 && <MenuAcoes rotulo={`Ações da IS ${is.is}`} itens={itensDe(is)} />}</div>
                  </li>
                  </React.Fragment>
                ))}
              </ul>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-ink-3 text-xs border-b border-line">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">IS</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Inspecionado</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Perito</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Status</th>
                      <th scope="col" className="pr-2 py-2 w-14 text-right font-semibold"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {g.itens.map((is, i) => (
                      <React.Fragment key={is.id}>
                        {g.id !== 'aberta' && (i === 0 || rotuloData(g.itens[i - 1]) !== rotuloData(is)) && (
                          <tr className="bg-thead"><th scope="colgroup" colSpan={5} className="px-4 py-1.5 text-left text-xs font-bold text-ink-3 capitalize">{rotuloData(is)}</th></tr>
                        )}
                        <tr onClick={() => setDetalheId(is.id)} className="cursor-pointer hover:bg-thead transition-colors">
                          <td className="px-4 py-2 font-mono whitespace-nowrap">
                            <button type="button" onClick={e => { e.stopPropagation(); setDetalheId(is.id); }} aria-label={`Abrir IS ${is.is}`} className="min-h-[44px] text-left">
                              <span className="block font-bold text-navy">{is.is}</span>
                              {is.dataEntrevista && <span className="block text-xs font-normal text-ink-3">{horaDeEntrevista(is.dataEntrevista)}</span>}
                            </button>
                          </td>
                          <td className="px-4 py-2 max-w-[320px]">
                            {(() => {
                              const om = omPorId.get(is.inspecionadoId);
                              const titulo = `${nomeCurto(is.inspecionado)}${om ? ` (${om})` : ''}`;
                              return <span className="block font-semibold text-navy truncate" title={titulo}>{titulo}</span>;
                            })()}
                            <span className="block text-xs text-ink-3 truncate" title={`${is.amp} | ${is.finalidade}`}>{is.amp} | {is.finalidade}</span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            {podeAgendar && !['cancelada', 'tis_assinado'].includes(is.status) ? (
                              <button type="button" onClick={() => setTrocandoPerito({ is, dataHora: is.dataEntrevista, modo: 'troca' })} aria-label={`Trocar perito da IS ${is.is}`} className="min-h-[44px] font-bold text-navy hover:underline text-left">
                                {is.peritoNome || '—'}
                              </button>
                            ) : <span className="font-bold text-navy">{is.peritoNome || '—'}</span>}
                          </td>
                          <td className="px-4 py-2">{tagStatus(is)}</td>
                          <td className="pr-2 py-1 text-right" onClick={e => e.stopPropagation()}>{itensDe(is).length > 0 && <MenuAcoes rotulo={`Ações da IS ${is.is}`} itens={itensDe(is)} />}</td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
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

      {detalhe && (
        <InspecaoDetalhe
          inspecao={detalhe}
          om={omDe(detalhe)}
          permissoes={{ editar: podeEditar, minuta: podeMinuta, parecer: podeParecer, entrevista: podeGravarEntrevista }}
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
          dataHora={horarioVazio} peritoFiltro={peritoFiltro} inspecoes={lista ?? []} peritos={peritos} config={config} bloqueios={bloqueiosTodos}
          podeCadastrar={podeCadastrar && (ehAdmin || horarioVazio.slice(0, 10) >= hoje)}
          onNova={() => { setNovo({ dataEntrevista: horarioVazio, peritoUid: peritoFiltro || undefined }); setHorarioVazio(null); }}
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
          onClose={() => setMinuta(null)} onAviso={avisar}
        />
      ))}

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
      {turnosAberto && ehAdmin && (
        <AgendaConfigDialog
          peritos={peritosFiltraveis} config={config}
          onClose={() => setTurnosAberto(false)} onSalvo={() => { setTurnosAberto(false); avisar('Turnos dos peritos salvos.'); }}
        />
      )}
    </div>
  );
};
