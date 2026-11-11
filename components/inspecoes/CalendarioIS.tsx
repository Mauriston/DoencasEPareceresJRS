// Ficheiro: components/inspecoes/CalendarioIS.tsx
// Visão de calendário das IS, no formato do Google Agenda: barra com "Hoje", setas e título do
// período, e as visões Dia · Semana · Mês (abre em Mês, só com os dias úteis seg–sex). Dia e Semana são
// grades de horário (07:00–17:00) com as entrevistas nos slots de 20 min, os bloqueios hachurados e,
// quando há um perito filtrado, os turnos em que ele não atende esmaecidos. Clicar numa IS abre os
// detalhes; clicar num horário livre (quem pode agendar) abre o agendamento nesse horário (IS aberta ou
// nova IS); o botão "+" de um dia abre o agendamento de uma IS aberta naquele dia.
// À esquerda, o painel das IS abertas ainda sem entrevista (com o mini calendário no topo na visão Dia).
// Arrastar (HTML5 drag-and-drop) um cartão do painel para um dia/horário — ou uma IS agendada ainda sem
// laudo, TIS e DS-1a (ver podeArrastarIS) — abre o diálogo de agendamento/reagendamento já com a nova
// data; a transação de agendamento valida perito e slot. Os cartões mostram só a hora e o nome do
// inspecionado; a cor indica o AMP (JRS = azul-marinho, MPI = dourado). Passar o mouse (ou o foco por
// teclado) sobre uma IS mostra um rich tooltip com Inspecionado, Finalidade, Perito e Status.
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { TooltipIS } from './TooltipIS';
import { AgendarDialog } from './AgendarDialog';
import { AgendarNoHorarioDialog } from './AgendarNoHorarioDialog';
import { MiniCalendarioIS } from './MiniCalendarioIS';
import { CalendarioPainelAbertas, TIPO_ARRASTE_IS } from './CalendarioPainelAbertas';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { carregarPeritos, type PeritoIS } from '../../services/peritosIS';
import { tituloDiaConcurso, ehBloqueioDeConcurso, type DiaConcurso } from '../../services/agendaConcursos';
import {
  STATUS_IS, statusEfetivoIS, hojeISO, duracaoDaIS, horaFimEntrevista, somarDias, inicioDaSemana, nomeMes, nomeDiaCurto, nomeDiaSemana, ehDiaUtil, deISO, paraISO, bloqueioNoDia,
  dataDeEntrevista, horaDeEntrevista, minutosDe, hhmmDe, ehSlotValido, bloqueioAtinge, peritoAtendeNoTurno, TURNOS, DURACAO_SLOT_MIN,
  type BloqueioAgenda, type ConfigAgenda, type Turno,
} from '../../utils/inspecoes';
import { podeArrastarIS, abertasNaoAgendadas, semanasUteisDoMes, nomeCurtoInspecionado } from '../../utils/calendarioIS';

type Modo = 'dia' | 'semana' | 'mes';

const INICIO_GRADE = 7 * 60; // 07:00
const FIM_GRADE = 17 * 60 + 20; // 17:20 (último slot da tarde termina às 17:00)
const PX_POR_MIN = 1.6;
const ALTURA_GRADE = (FIM_GRADE - INICIO_GRADE) * PX_POR_MIN;
const HORAS = Array.from({ length: 11 }, (_, i) => 7 + i); // 07h … 17h

/** Cor do cartão pelo AMP: JRS = azul-marinho; MPI = dourado. */
const COR_AMP: Record<string, string> = {
  JRS: 'bg-navy text-white border-navy',
  MPI: 'bg-gold/30 text-gold-ink border-gold',
};
const corAmp = (amp: string) => COR_AMP[amp] ?? COR_AMP.JRS;
/** Dia de concurso: vermelho enquanto aberto; verde quando todos os candidatos do dia estão finalizados. */
const corConcurso = (d: Pick<DiaConcurso, 'encerrado'>) => (d.encerrado ? 'bg-green text-white border-green' : 'bg-wine text-white border-wine');
/** Destaque do dia/horário sob o arraste. */
const DESTAQUE_ALVO = 'ring-2 ring-inset ring-green bg-green/10';
/** Botão "+" do dia: discreto, aparece no hover/foco (sempre visível no toque). */
const CLASSE_MAIS_DIA = 'w-7 h-7 shrink-0 inline-flex items-center justify-center rounded-full text-navy bg-white border border-line hover:bg-thead opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold transition-opacity';

interface Props {
  inspecoes: InspecaoRecord[];
  bloqueios: BloqueioAgenda[];
  config: ConfigAgenda;
  /** Perito filtrado ('' = todos). */
  peritoUid: string;
  onAbrir: (is: InspecaoRecord) => void;
  /** Dias de concurso (Em andamento e Em breve): etiqueta no cabeçalho do dia (semana/dia) e no mês; não bloqueiam slots. */
  diasConcursos?: DiaConcurso[];
  /** Clique no cartão de um dia de concurso: abre a tabela do concurso. */
  onAbrirConcurso?: (concursoId: string) => void;
  /** Presente só para quem pode agendar: clique num horário livre (dataHora = AAAA-MM-DDThh:mm). */
  onNovoNoHorario?: (dataHora: string) => void;
  /**
   * Presente só para quem pode agendar (habilita o arraste e o botão "+"). O próprio calendário abre o
   * diálogo de agendamento/reagendamento ao soltar; esta função não é mais chamada pelo arraste.
   */
  onReagendar?: (is: InspecaoRecord, dataHora: string) => void;
  /** @deprecated O diálogo de reagendamento já permite trocar o perito; mantido por compatibilidade. */
  onTrocarPerito?: (is: InspecaoRecord, dataHora: string) => void;
  /** Avisos (resultado do agendamento, arraste recusado etc.). */
  onAviso?: (msg: string, tom?: 'success' | 'error') => void;
  /** Controle extra na barra de topo, à esquerda do Dia/Semana/Mês (ex.: a alternância Tabela/Calendário). */
  controleVisao?: React.ReactNode;
}

const titulo = (modo: Modo, ancora: string): string => {
  if (modo === 'mes') return `${nomeMes(ancora)} de ${ancora.slice(0, 4)}`;
  if (modo === 'dia') return `${nomeDiaSemana(ancora)}, ${Number(ancora.slice(8))} de ${nomeMes(ancora)} de ${ancora.slice(0, 4)}`;
  const ini = inicioDaSemana(ancora);
  const fim = somarDias(ini, 4);
  const mesIni = nomeMes(ini); const mesFim = nomeMes(fim);
  return mesIni === mesFim
    ? `${Number(ini.slice(8))} – ${Number(fim.slice(8))} de ${mesIni} de ${fim.slice(0, 4)}`
    : `${Number(ini.slice(8))} de ${mesIni.slice(0, 3)} – ${Number(fim.slice(8))} de ${mesFim.slice(0, 3)} de ${fim.slice(0, 4)}`;
};

const nomeCurto = nomeCurtoInspecionado;
/** O próprio dia, se útil; senão a próxima segunda. */
const diaUtilOuProximo = (d: string): string => (ehDiaUtil(d) ? d : somarDias(d, deISO(d).getDay() === 6 ? 2 : 1));

/** Handlers do rich tooltip de uma IS (mouse e foco por teclado; toque não mostra). */
type PropsDica = (is: InspecaoRecord) => Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onPointerEnter' | 'onPointerLeave' | 'onFocus' | 'onBlur' | 'aria-describedby'>;

/** Props de arraste de uma IS agendada (vazio = não arrastável: sem draggable e cursor normal). */
interface HandlersArraste { draggable?: boolean; onDragStart?: React.DragEventHandler<HTMLElement>; onDragEnd?: React.DragEventHandler<HTMLElement> }
type PropsArraste = (is: InspecaoRecord) => HandlersArraste;
/** Props de um dia como destino do arraste (célula do Mês, cabeçalho da Semana). */
interface HandlersAlvo { onDragOver?: React.DragEventHandler<HTMLElement>; onDragLeave?: React.DragEventHandler<HTMLElement>; onDrop?: React.DragEventHandler<HTMLElement> }
type PropsAlvoDia = (data: string) => HandlersAlvo;
/** Alvo atual do arraste: dia (hhmm null) ou horário. */
type Alvo = { data: string; hhmm: string | null } | null;

type Dialogo = { tipo: 'agendar'; is: InspecaoRecord; data?: string; hora?: string } | { tipo: 'dia'; data: string } | null;

export const CalendarioIS: React.FC<Props> = ({ inspecoes, bloqueios, config, peritoUid, onAbrir, onNovoNoHorario, onReagendar, onAviso, diasConcursos = [], onAbrirConcurso, controleVisao }) => {
  const [modo, setModo] = useState<Modo>('mes');
  const [ancora, setAncora] = useState(() => diaUtilOuProximo(hojeISO()));
  const hoje = hojeISO();
  const rolagem = useRef<HTMLDivElement>(null);
  const podeAgendar = !!(onNovoNoHorario || onReagendar);

  // Peritos (para os diálogos de agendamento): carregados só para quem pode agendar.
  const [peritos, setPeritos] = useState<PeritoIS[]>([]);
  useEffect(() => { if (podeAgendar) carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, [podeAgendar]);
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const fecharDialogo = () => setDialogo(null);
  const concluido = (msg: string, tom?: 'success' | 'error') => { setDialogo(null); onAviso?.(msg, tom); };

  // ----- rich tooltip -----
  const idDica = useId();
  const [dica, setDica] = useState<{ is: InspecaoRecord; alvo: DOMRect } | null>(null);
  const mostrarDica = (is: InspecaoRecord, el: HTMLElement) => setDica({ is, alvo: el.getBoundingClientRect() });
  const esconderDica = (is: InspecaoRecord) => setDica(d => (d?.is.id === is.id ? null : d));
  useEffect(() => {
    if (!dica) return;
    const fechar = () => setDica(null);
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('scroll', fechar, true); window.removeEventListener('resize', fechar); window.removeEventListener('keydown', tecla); };
  }, [dica]);
  const propsDica: PropsDica = is => ({
    onPointerEnter: e => { if (e.pointerType === 'mouse') mostrarDica(is, e.currentTarget); },
    onPointerLeave: () => esconderDica(is),
    onFocus: e => { if (e.currentTarget.matches(':focus-visible')) mostrarDica(is, e.currentTarget); },
    onBlur: () => esconderDica(is),
    'aria-describedby': dica?.is.id === is.id ? idDica : undefined,
  });

  const concursosPorDia = useMemo(() => {
    const m = new Map<string, DiaConcurso[]>();
    diasConcursos.forEach(d => m.set(d.data, [...(m.get(d.data) ?? []), d]));
    return m;
  }, [diasConcursos]);

  const porDia = useMemo(() => {
    const m = new Map<string, InspecaoRecord[]>();
    inspecoes.forEach(i => {
      if (!i.dataEntrevista || i.status === 'cancelada') return;
      if (peritoUid && i.peritoUid !== peritoUid) return;
      const d = dataDeEntrevista(i.dataEntrevista);
      m.set(d, [...(m.get(d) ?? []), i]);
    });
    m.forEach(l => l.sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista)));
    return m;
  }, [inspecoes, peritoUid]);

  const abertas = useMemo(() => abertasNaoAgendadas(inspecoes, hoje), [inspecoes, hoje]);

  // ----- arrastar (HTML5): cartão do painel para agendar; IS agendada para remarcar -----
  const [arraste, setArraste] = useState<{ is: InspecaoRecord; origem: 'painel' | 'agenda' } | null>(null);
  const [alvo, setAlvo] = useState<Alvo>(null);

  const podeArrastar = (is: InspecaoRecord) => podeAgendar && podeArrastarIS(is);

  const iniciarArraste = (is: InspecaoRecord, origem: 'painel' | 'agenda', e: React.DragEvent<HTMLElement>) => {
    setDica(null);
    e.dataTransfer.setData(TIPO_ARRASTE_IS, is.id);
    e.dataTransfer.setData('text/plain', `IS ${is.is}`);
    e.dataTransfer.effectAllowed = 'move';
    // Atualiza o estado depois do dragstart: mexer no DOM da origem durante o evento cancela o arraste em alguns navegadores.
    window.setTimeout(() => setArraste({ is, origem }), 0);
  };
  const terminarArraste = () => { setArraste(null); setAlvo(null); };

  const propsArraste: PropsArraste = is => (podeArrastar(is)
    ? { draggable: true, onDragStart: e => { e.stopPropagation(); iniciarArraste(is, 'agenda', e); }, onDragEnd: terminarArraste }
    : {});

  /** O dia aceita a IS solta: dia útil, de hoje em diante. */
  const aceitaDia = (data: string) => ehDiaUtil(data) && data >= hoje;
  const marcarAlvo = (novo: NonNullable<Alvo>) => setAlvo(a => (a && a.data === novo.data && a.hhmm === novo.hhmm ? a : novo));

  /** Solta a IS no dia (e horário, se houver): abre o diálogo de agendamento/reagendamento já preenchido. */
  const soltar = (e: React.DragEvent<HTMLElement>, data: string, hhmm: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(TIPO_ARRASTE_IS);
    const is = arraste?.is ?? inspecoes.find(i => i.id === id);
    terminarArraste();
    if (!is) return;
    if (!aceitaDia(data)) { onAviso?.('Solte a IS num dia útil, de hoje em diante.', 'error'); return; }
    if (is.dataEntrevista) {
      if (!podeArrastarIS(is)) return;
      // Mesmo dia (sem horário) ou mesmo horário: nada a remarcar.
      if (hhmm ? is.dataEntrevista === `${data}T${hhmm}` : dataDeEntrevista(is.dataEntrevista) === data) return;
    }
    setDialogo({ tipo: 'agendar', is, data, hora: hhmm ?? undefined });
  };

  const propsAlvoDia: PropsAlvoDia = data => (podeAgendar ? {
    onDragOver: e => {
      if (!aceitaDia(data) || !e.dataTransfer.types.includes(TIPO_ARRASTE_IS)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      marcarAlvo({ data, hhmm: null });
    },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo(a => (a?.data === data && !a.hhmm ? null : a)); },
    onDrop: e => soltar(e, data, null),
  } : {});

  /** Coluna da grade (Dia/Semana) como destino: o horário sob o ponteiro, alinhado ao slot de 20 min. */
  const propsAlvoColuna: PropsAlvoDia = data => (podeAgendar ? {
    onDragOver: e => {
      if (!aceitaDia(data) || !e.dataTransfer.types.includes(TIPO_ARRASTE_IS)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      marcarAlvo({ data, hhmm: slotNoY(e.clientY - e.currentTarget.getBoundingClientRect().top) });
    },
    onDragLeave: e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAlvo(a => (a?.data === data ? null : a)); },
    onDrop: e => soltar(e, data, slotNoY(e.clientY - e.currentTarget.getBoundingClientRect().top)),
  } : {});

  const navegar = (sentido: -1 | 1) => {
    if (modo === 'dia') {
      let d = somarDias(ancora, sentido);
      while (!ehDiaUtil(d)) d = somarDias(d, sentido);
      setAncora(d);
    } else if (modo === 'semana') setAncora(somarDias(ancora, 7 * sentido));
    else { const d = deISO(ancora); d.setMonth(d.getMonth() + sentido, 1); setAncora(paraISO(d)); }
  };
  const irHoje = () => setAncora(diaUtilOuProximo(hoje));

  const dias = modo === 'dia' ? [ancora] : modo === 'semana' ? Array.from({ length: 5 }, (_, i) => somarDias(inicioDaSemana(ancora), i)) : [];

  // Ao abrir a grade, rola até as 8h (ou o primeiro evento do período).
  useEffect(() => { if (modo !== 'mes' && rolagem.current) rolagem.current.scrollTop = 0; }, [modo, ancora]);

  /** "+" de um dia: agenda uma IS aberta naquele dia. */
  const maisDoDia = (d: string) => (podeAgendar && aceitaDia(d) ? () => setDialogo({ tipo: 'dia', data: d }) : undefined);

  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-stretch">
      {/* Painel: no desktop, mesma altura do calendário (posição absoluta na célula da grade) e rolagem própria. */}
      <div className="lg:relative lg:min-h-[24rem]">
        <div className="lg:absolute lg:inset-0">
          <CalendarioPainelAbertas
            abertas={abertas} hoje={hoje} onAbrir={onAbrir}
            onAgendar={podeAgendar ? is => setDialogo({ tipo: 'agendar', is }) : undefined}
            onArrastarInicio={(is, e) => iniciarArraste(is, 'painel', e)} onArrastarFim={terminarArraste}
            arrastandoId={arraste?.origem === 'painel' ? arraste.is.id : null}
            topo={modo === 'dia' ? (
              <MiniCalendarioIS compacto inspecoes={peritoUid ? inspecoes.filter(i => i.peritoUid === peritoUid) : inspecoes} diasConcursos={diasConcursos} selecionado={ancora} onSelecionar={d => setAncora(diaUtilOuProximo(d))} />
            ) : undefined}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-line overflow-clip min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-line">
          <div className="flex items-center gap-1 min-w-0">
            <Button variant="secondary" onClick={irHoje}>Hoje</Button>
            <button type="button" onClick={() => navegar(-1)} aria-label="Período anterior" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
            <button type="button" onClick={() => navegar(1)} aria-label="Próximo período" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
            <h2 className="text-h3 font-bold text-navy ml-1 first-letter:uppercase" aria-live="polite">{titulo(modo, ancora)}</h2>
          </div>
          <div className="flex items-center gap-2">
            {controleVisao}
            <Segmented<Modo>
              ariaLabel="Visão do calendário" value={modo} onChange={setModo}
              options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-b border-line text-xs text-ink-3" aria-label="Legenda de cores por AMP">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-navy" aria-hidden="true" />JRS</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gold" aria-hidden="true" />MPI</span>
          {diasConcursos.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-wine" aria-hidden="true" />Concurso (não bloqueia a agenda)<span className="w-3 h-3 rounded-sm bg-green ml-1" aria-hidden="true" />dia encerrado</span>}
        </div>

        {modo === 'mes'
          ? <VisaoMes ancora={ancora} hoje={hoje} porDia={porDia} bloqueios={bloqueios} peritoUid={peritoUid} onAbrir={onAbrir} concursosPorDia={concursosPorDia} onAbrirConcurso={onAbrirConcurso} propsDica={propsDica} propsArraste={propsArraste} propsAlvoDia={propsAlvoDia} alvo={alvo} arrastandoId={arraste?.is.id ?? null} maisDoDia={maisDoDia} onDia={d => { setAncora(d); setModo('dia'); }} />
          : (
            <div ref={rolagem} className="overflow-auto max-h-[70vh]">
              <div className="min-w-[640px]">
                <div className="sticky top-0 z-20 grid bg-white border-b border-line" style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}>
                  <div />
                  {dias.map(d => {
                    const mais = maisDoDia(d);
                    return (
                      <div key={d} {...propsAlvoDia(d)} className={`group relative border-l border-line ${alvo?.data === d && !alvo.hhmm ? DESTAQUE_ALVO : ''}`}>
                        <button type="button" onClick={() => { setAncora(d); setModo('dia'); }} className="w-full py-2 text-center hover:bg-thead" aria-label={`Abrir ${nomeDiaSemana(d)}, ${Number(d.slice(8))} de ${nomeMes(d)}`}>
                          <span className="block text-xs font-semibold text-ink-3 uppercase">{nomeDiaCurto(d)}</span>
                          <span className={`inline-flex w-9 h-9 items-center justify-center rounded-full text-h3 font-bold ${d === hoje ? 'bg-navy text-white' : 'text-navy'}`}>{Number(d.slice(8))}</span>
                        </button>
                        {(concursosPorDia.get(d) ?? []).map(c => (
                          <button
                            key={c.chave} type="button" disabled={!onAbrirConcurso} onClick={() => onAbrirConcurso?.(c.concursoId)}
                            title={`${tituloDiaConcurso(c)}${c.encerrado ? ' · dia encerrado' : ''}${onAbrirConcurso ? ' · abrir a tabela do concurso' : ''}`}
                            className={`mx-1 mb-1 flex items-center gap-1 rounded border px-1 text-xs font-bold truncate w-[calc(100%-0.5rem)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${onAbrirConcurso ? 'hover:shadow-md' : 'cursor-default'} ${corConcurso(c)}`}
                          >
                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{c.encerrado ? 'check_circle' : 'fact_check'}</span>
                            <span className="truncate">{tituloDiaConcurso(c)}</span>
                          </button>
                        ))}
                        {mais && (
                          <button type="button" onClick={mais} aria-label={`Agendar IS aberta em ${Number(d.slice(8))} de ${nomeMes(d)}`} title="Agendar IS neste dia" className={`absolute top-1 right-1 ${CLASSE_MAIS_DIA}`}>
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}>
                  <div className="relative" style={{ height: ALTURA_GRADE }} aria-hidden="true">
                    {HORAS.map(h => (
                      <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-ink-3 font-mono" style={{ top: (h * 60 - INICIO_GRADE) * PX_POR_MIN }}>{h > 7 ? `${String(h).padStart(2, '0')}:00` : ''}</span>
                    ))}
                  </div>
                  {dias.map(d => (
                    <ColunaDia
                      key={d} data={d} hoje={hoje} inspecoes={porDia.get(d) ?? []} bloqueios={bloqueios} config={config} peritoUid={peritoUid} onAbrir={onAbrir} onNovoNoHorario={onNovoNoHorario}
                      propsArraste={propsArraste} propsAlvo={propsAlvoColuna(d)} alvo={alvo?.data === d ? alvo : null} arrastando={arraste?.is ?? null}
                      propsDica={propsDica}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
      </div>

      {dica && !arraste && (
        <TooltipIS
          id={idDica} alvo={dica.alvo} titulo={`IS ${dica.is.is}${dica.is.dataEntrevista ? ` · ${horaDeEntrevista(dica.is.dataEntrevista)}–${horaFimEntrevista(horaDeEntrevista(dica.is.dataEntrevista), duracaoDaIS(dica.is))}` : ''}`}
          linhas={[
            { rotulo: 'Inspecionado', valor: dica.is.inspecionado },
            { rotulo: 'Finalidade', valor: dica.is.finalidade },
            { rotulo: 'Perito', valor: dica.is.peritoNome },
            { rotulo: 'Status', valor: STATUS_IS[statusEfetivoIS(dica.is)].rotulo },
          ]}
        />
      )}

      {dialogo?.tipo === 'agendar' && (
        <AgendarDialog
          inspecao={dialogo.is} peritos={peritos} config={config} bloqueios={bloqueios} inspecoes={inspecoes}
          dataInicial={dialogo.data} horaInicial={dialogo.hora} peritoInicial={dialogo.is.peritoUid || peritoUid || undefined}
          onClose={fecharDialogo} onAgendada={concluido}
        />
      )}
      {dialogo?.tipo === 'dia' && (
        <AgendarNoHorarioDialog
          dataHora={dialogo.data} peritoFiltro={peritoUid} inspecoes={inspecoes} peritos={peritos} config={config} bloqueios={bloqueios}
          podeCadastrar={false} onNova={fecharDialogo} onClose={fecharDialogo} onAgendada={concluido}
        />
      )}
    </div>
  );
};

/** Slot (hh:mm, alinhado a 20 min) na altura y da coluna, ou null fora dos turnos. */
const slotNoY = (y: number): string | null => {
  const min = INICIO_GRADE + Math.floor(y / PX_POR_MIN);
  const turno = TURNOS.find(t => min >= minutosDe(t.inicio) && min < minutosDe(t.fim));
  if (!turno) return null;
  const ini = minutosDe(turno.inicio);
  const hhmm = hhmmDe(ini + Math.floor((min - ini) / DURACAO_SLOT_MIN) * DURACAO_SLOT_MIN);
  return ehSlotValido(hhmm) ? hhmm : null;
};

// ---------------------------------------------------------------------------

const topo = (min: number) => (min - INICIO_GRADE) * PX_POR_MIN;

const ColunaDia: React.FC<{
  data: string; hoje: string; inspecoes: InspecaoRecord[]; bloqueios: BloqueioAgenda[]; config: ConfigAgenda; peritoUid: string;
  onAbrir: (is: InspecaoRecord) => void; onNovoNoHorario?: (dataHora: string) => void;
  propsArraste: PropsArraste;
  /** Handlers de destino do arraste (a coluna inteira). */
  propsAlvo: HandlersAlvo;
  /** Alvo do arraste nesta coluna (dia inteiro ou horário). */
  alvo: Alvo;
  arrastando: InspecaoRecord | null;
  propsDica: PropsDica;
}> = ({ data, hoje, inspecoes, bloqueios, config, peritoUid, onAbrir, onNovoNoHorario, propsArraste, propsAlvo, alvo, arrastando, propsDica }) => {
  const agora = new Date();
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  // Dias de concurso não bloqueiam slots (a etiqueta fica no cabeçalho do dia); filtro mantido por segurança.
  const diaBloqueios = bloqueios.filter(b => !ehBloqueioDeConcurso(b) && bloqueioNoDia(b, data) && (!peritoUid || b.peritoUid === '*' || b.peritoUid === peritoUid));

  const aoClicarVazio = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onNovoNoHorario) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const min = INICIO_GRADE + Math.floor(y / PX_POR_MIN);
    const inicioSlot = ehSlotValido(hhmmDe(min)) ? min : null;
    // Alinha ao slot de 20 min do turno que contém o clique.
    const turno = TURNOS.find(t => min >= minutosDe(t.inicio) && min < minutosDe(t.fim));
    if (!turno) return;
    const slot = inicioSlot ?? minutosDe(turno.inicio) + Math.floor((min - minutosDe(turno.inicio)) / DURACAO_SLOT_MIN) * DURACAO_SLOT_MIN;
    const hhmm = hhmmDe(slot);
    if (!ehSlotValido(hhmm)) return;
    if (peritoUid && !peritoAtendeNoTurno(config, peritoUid, data, turno.id)) return;
    if (peritoUid && bloqueios.some(b => bloqueioAtinge(b, peritoUid, data, hhmm))) return;
    onNovoNoHorario(`${data}T${hhmm}`);
  };

  // IS no mesmo horário (peritos diferentes) dividem a largura da coluna.
  // Posição lateral: IS que se sobrepõem no tempo (peritos diferentes, ou entrevistas longas) dividem a largura.
  const posicoes = (() => {
    const itens = inspecoes.map(i => { const ini = minutosDe(horaDeEntrevista(i.dataEntrevista)); return { is: i, ini, fim: ini + duracaoDaIS(i), col: 0, total: 1 }; });
    let grupo: typeof itens = [];
    let fimGrupo = -1;
    const fechar = () => { const n = Math.max(...grupo.map(g => g.col)) + 1; grupo.forEach(g => { g.total = n; }); grupo = []; };
    itens.forEach(it => {
      if (grupo.length && it.ini >= fimGrupo) { fechar(); fimGrupo = -1; }
      let col = 0;
      while (grupo.some(g => g.col === col && g.fim > it.ini)) col++;
      it.col = col; grupo.push(it); fimGrupo = Math.max(fimGrupo, it.fim);
    });
    if (grupo.length) fechar();
    return itens;
  })();

  return (
    <div
      className={`relative border-l border-line ${onNovoNoHorario ? 'cursor-cell' : ''} ${alvo && !alvo.hhmm ? DESTAQUE_ALVO : ''}`}
      style={{ height: ALTURA_GRADE }}
      data-coluna={data}
      onClick={aoClicarVazio}
      {...propsAlvo}
    >
      {/* destino do arraste */}
      {alvo?.hhmm && arrastando && (
        <div
          className="absolute inset-x-0 z-20 pointer-events-none border-2 rounded border-green bg-green/15"
          style={{ top: topo(minutosDe(alvo.hhmm)), height: duracaoDaIS(arrastando) * PX_POR_MIN }}
        />
      )}
      {/* fora do expediente: antes das 07:30, almoço e depois das 17:00 */}
      <div className="absolute inset-x-0 bg-thead/70 pointer-events-none" style={{ top: 0, height: topo(7 * 60 + 30) }} />
      <div className="absolute inset-x-0 bg-thead/70 pointer-events-none" style={{ top: topo(12 * 60), height: 60 * PX_POR_MIN }} />
      <div className="absolute inset-x-0 bg-thead/70 pointer-events-none" style={{ top: topo(17 * 60), height: ALTURA_GRADE - topo(17 * 60) }} />
      {/* turnos em que o perito filtrado não atende */}
      {peritoUid && TURNOS.map((t: { id: Turno; inicio: string; fim: string }) => !peritoAtendeNoTurno(config, peritoUid, data, t.id) && (
        <div key={t.id} className="absolute inset-x-0 bg-ink/5 pointer-events-none" style={{ top: topo(minutosDe(t.inicio)), height: (minutosDe(t.fim) - minutosDe(t.inicio)) * PX_POR_MIN }} title="O perito não atende neste turno" />
      ))}
      {/* linhas de hora */}
      {HORAS.map(h => <div key={h} className="absolute inset-x-0 border-t border-line pointer-events-none" style={{ top: topo(h * 60) }} />)}

      {/* bloqueios */}
      {diaBloqueios.map((b, idx) => {
        const ini = b.hora ? minutosDe(b.hora) : b.turno === 'dia' ? minutosDe('07:30') : minutosDe(TURNOS.find(t => t.id === b.turno)!.inicio);
        const fim = b.hora ? ini + DURACAO_SLOT_MIN : b.horaFim ? minutosDe(b.horaFim) : b.turno === 'dia' ? minutosDe('17:00') : minutosDe(TURNOS.find(t => t.id === b.turno)!.fim);
        const titulo = `Bloqueado${b.peritoNome ? ` · ${b.peritoNome}` : b.peritoUid === '*' ? ' · todos os peritos' : ''}${b.motivo ? ` · ${b.motivo}` : ''}`;
        // Visão de todos os peritos: o bloqueio de um perito só vira uma etiqueta (motivo · nome), sem hachurar a coluna
        // inteira, porque os demais peritos continuam atendendo.
        if (!peritoUid && b.peritoUid !== '*') {
          const antes = diaBloqueios.slice(0, idx).filter(o => o.peritoUid !== '*').length;
          return (
            <div
              key={b.id}
              className="absolute inset-x-0.5 z-10 h-[18px] rounded bg-wine/10 border border-wine/30 text-wine text-xs font-semibold px-1 truncate pointer-events-none"
              style={{ top: topo(ini) + antes * 19 }}
              title={titulo}
            >
              <span className="material-symbols-outlined text-[14px] align-middle" aria-hidden="true">block</span> {b.motivo || 'Bloqueado'}{b.peritoNome ? ` · ${b.peritoNome}` : ''}
            </div>
          );
        }
        return (
          <div
            key={b.id}
            className="absolute inset-x-0 bg-wine/10 border-y border-wine/30 text-wine text-xs font-semibold px-1 overflow-hidden pointer-events-none"
            style={{ top: topo(ini), height: (fim - ini) * PX_POR_MIN, backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(0,0,0,0.04) 6px 12px)' }}
            title={titulo}
          >
            <span className="material-symbols-outlined text-[14px] align-middle" aria-hidden="true">block</span> {b.motivo || 'Bloqueado'}
          </div>
        );
      })}

      {/* hora atual */}
      {data === hoje && minAgora >= INICIO_GRADE && minAgora <= FIM_GRADE && (
        <div className="absolute inset-x-0 z-10 pointer-events-none flex items-center" style={{ top: topo(minAgora) }} aria-hidden="true">
          <span className="w-2 h-2 -ml-1 rounded-full bg-wine" /><span className="flex-1 border-t-2 border-wine" />
        </div>
      )}

      {/* IS */}
      {posicoes.map(({ is, ini: min, col, total }) => {
        const duracao = duracaoDaIS(is);
        const arraste = propsArraste(is);
        return (
          <button
            key={is.id}
            type="button"
            onClick={e => { e.stopPropagation(); onAbrir(is); }}
            {...arraste}
            {...propsDica(is)}
            className={`absolute z-10 px-1.5 rounded border text-left overflow-hidden text-xs leading-tight hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold select-none ${arraste.draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${arrastando?.id === is.id ? 'opacity-40' : ''} ${corAmp(is.amp)}`}
            style={{ top: topo(min) + 1, height: duracao * PX_POR_MIN - 2, left: `calc(${(col / total) * 100}% + 2px)`, width: `calc(${100 / total}% - 4px)` }}
          >
            <span className="font-bold font-mono">{horaDeEntrevista(is.dataEntrevista)}</span> <span className="font-semibold">{nomeCurto(is.inspecionado)}</span>
          </button>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------

const VisaoMes: React.FC<{
  ancora: string; hoje: string; porDia: Map<string, InspecaoRecord[]>; bloqueios: BloqueioAgenda[]; peritoUid: string;
  onAbrir: (is: InspecaoRecord) => void; onDia: (d: string) => void;
  concursosPorDia: Map<string, DiaConcurso[]>; onAbrirConcurso?: (concursoId: string) => void;
  propsDica: PropsDica; propsArraste: PropsArraste; propsAlvoDia: PropsAlvoDia; alvo: Alvo; arrastandoId: string | null;
  /** Ação do botão "+" do dia (undefined = sem botão). */
  maisDoDia: (d: string) => (() => void) | undefined;
}> = ({ ancora, hoje, porDia, bloqueios, peritoUid, onAbrir, onDia, concursosPorDia, onAbrirConcurso, propsDica, propsArraste, propsAlvoDia, alvo, arrastandoId, maisDoDia }) => {
  // Só os dias úteis (seg–sex): a grade tem 5 colunas.
  const semanas = semanasUteisDoMes(ancora);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid grid-cols-5 border-b border-line bg-thead text-xs font-semibold text-ink-3 uppercase">
          {['seg', 'ter', 'qua', 'qui', 'sex'].map(n => <div key={n} className="px-2 py-2 text-center">{n}</div>)}
        </div>
        {semanas.map(sem => (
          <div key={sem[0]} className="grid grid-cols-5 border-b border-line last:border-b-0">
            {sem.map(d => {
              const lista = porDia.get(d) ?? [];
              const foraDoMes = d.slice(0, 7) !== ancora.slice(0, 7);
              const concursosDoDia = concursosPorDia.get(d) ?? [];
              const bloqueado = bloqueios.some(b => !ehBloqueioDeConcurso(b) && bloqueioNoDia(b, d) && (!peritoUid || b.peritoUid === '*' || b.peritoUid === peritoUid));
              const mais = maisDoDia(d);
              const ehAlvo = alvo?.data === d;
              return (
                <div key={d} {...propsAlvoDia(d)} className={`group min-h-[104px] p-1 border-l border-line first:border-l-0 transition-colors ${foraDoMes ? 'bg-thead/60' : 'bg-white'} ${ehAlvo ? DESTAQUE_ALVO : ''}`}>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onDia(d)} aria-label={`Abrir ${Number(d.slice(8))} de ${nomeMes(d)}`} className="flex items-center gap-1 min-w-0 flex-1">
                      <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold ${d === hoje ? 'bg-navy text-white' : foraDoMes ? 'text-ink-4' : 'text-navy'}`}>{Number(d.slice(8))}</span>
                      {bloqueado && <span className="material-symbols-outlined text-[16px] text-wine" aria-label="Há bloqueio neste dia" title="Há bloqueio neste dia">block</span>}
                    </button>
                    {mais && (
                      <button type="button" onClick={mais} aria-label={`Agendar IS aberta em ${Number(d.slice(8))} de ${nomeMes(d)}`} title="Agendar IS neste dia" className={CLASSE_MAIS_DIA}>
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {concursosDoDia.map(c => (
                      <button key={c.chave} type="button" disabled={!onAbrirConcurso} onClick={() => onAbrirConcurso?.(c.concursoId)} title={`${tituloDiaConcurso(c)}${c.encerrado ? ' · dia encerrado' : ''}`} className={`block w-full text-left truncate rounded border px-1 text-xs font-bold ${onAbrirConcurso ? '' : 'cursor-default'} ${corConcurso(c)}`}>
                        {tituloDiaConcurso(c)}
                      </button>
                    ))}
                    {lista.slice(0, 3).map(is => {
                      const arraste = propsArraste(is);
                      return (
                        <button key={is.id} type="button" onClick={() => onAbrir(is)} {...arraste} {...propsDica(is)} className={`block w-full text-left truncate rounded border px-1 text-xs ${arraste.draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${arrastandoId === is.id ? 'opacity-40' : ''} ${corAmp(is.amp)}`}>
                          <span className="font-mono font-bold">{horaDeEntrevista(is.dataEntrevista)}</span> {nomeCurto(is.inspecionado)}
                        </button>
                      );
                    })}
                    {lista.length > 3 && <button type="button" onClick={() => onDia(d)} className="text-xs font-bold text-navy underline px-1">+{lista.length - 3} mais</button>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
