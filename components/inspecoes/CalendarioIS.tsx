// Ficheiro: components/inspecoes/CalendarioIS.tsx
// Visão de calendário das IS, no formato do Google Agenda: barra com "Hoje", setas e título do
// período, e as visões Dia · Semana · Mês. Dia e Semana são grades de horário (07:00–17:00) com as
// entrevistas nos slots de 20 min, os bloqueios hachurados e, quando há um perito filtrado, os
// turnos em que ele não atende esmaecidos. Clicar numa IS abre os detalhes; clicar num horário
// livre (quem pode agendar) abre o agendamento nesse horário (IS aberta ou nova IS). Segurar e arrastar
// uma IS para outro horário livre do mesmo perito a reagenda. Os cartões mostram só a hora e o nome do
// inspecionado; a cor indica o AMP (JRS = azul-marinho, MPI = dourado).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { estadoDoSlot } from './SeletorHorario';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { tituloDiaConcurso, ehBloqueioDeConcurso, type DiaConcurso } from '../../services/agendaConcursos';
import {
  STATUS_IS, statusEfetivoIS, hojeISO, ocupadosDe, duracaoDaIS, horaFimEntrevista, somarDias, inicioDaSemana, inicioDoMes, nomeMes, nomeDiaCurto, nomeDiaSemana, ehDiaUtil, deISO, paraISO,
  dataDeEntrevista, horaDeEntrevista, minutosDe, hhmmDe, ehSlotValido, bloqueioAtinge, peritoAtendeNoTurno, turnoDoSlot, TURNOS, DURACAO_SLOT_MIN,
  type BloqueioAgenda, type ConfigAgenda, type Turno,
} from '../../utils/inspecoes';

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

interface Props {
  inspecoes: InspecaoRecord[];
  bloqueios: BloqueioAgenda[];
  config: ConfigAgenda;
  /** Perito filtrado ('' = todos). */
  peritoUid: string;
  onAbrir: (is: InspecaoRecord) => void;
  /** Dias de concurso (Em andamento e Em breve): um evento ocupa o turno da manhã inteiro. */
  diasConcursos?: DiaConcurso[];
  /** Clique no cartão de um dia de concurso: abre a tabela do concurso. */
  onAbrirConcurso?: (concursoId: string) => void;
  /** Presente só para quem pode agendar: clique num horário livre (dataHora = AAAA-MM-DDThh:mm). */
  onNovoNoHorario?: (dataHora: string) => void;
  /** Presente só para quem pode agendar: IS arrastada para outro horário (mesmo perito). */
  onReagendar?: (is: InspecaoRecord, dataHora: string) => void;
  /** IS solta num turno em que o perito dela não atende: o chamador oferece trocar o perito. */
  onTrocarPerito?: (is: InspecaoRecord, dataHora: string) => void;
  /** Avisos do arraste (horário indisponível etc.). */
  onAviso?: (msg: string, tom?: 'success' | 'error') => void;
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

const nomeCurto = (inspecionado: string): string => {
  const nome = inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '');
  return nome || inspecionado;
};

export const CalendarioIS: React.FC<Props> = ({ inspecoes, bloqueios, config, peritoUid, onAbrir, onNovoNoHorario, onReagendar, onTrocarPerito, onAviso, diasConcursos = [], onAbrirConcurso }) => {
  const [modo, setModo] = useState<Modo>('semana');
  const [ancora, setAncora] = useState(() => { const h = hojeISO(); return ehDiaUtil(h) ? h : somarDias(h, deISO(h).getDay() === 6 ? 2 : 1); });
  const hoje = hojeISO();
  const rolagem = useRef<HTMLDivElement>(null);

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

  // ----- arrastar para reagendar -----
  interface Arraste { is: InspecaoRecord; x: number; y: number; alvo: { data: string; hhmm: string; motivo: string | null; trocar?: boolean } | null }
  const [arraste, setArraste] = useState<Arraste | null>(null);

  const podeArrastar = (is: InspecaoRecord) => !!onReagendar && is.situacao !== 'finalizada' && !!is.peritoUid;

  /** Slot (data + hora alinhada a 20 min) sob o ponto da tela, ou null se fora das colunas/turnos. */
  const slotDoPonto = (x: number, y: number): { data: string; hhmm: string } | null => {
    const coluna = document.elementsFromPoint(x, y).map(el => (el as HTMLElement).closest?.('[data-coluna]')).find(Boolean) as HTMLElement | null | undefined;
    if (!coluna) return null;
    const min = INICIO_GRADE + Math.floor((y - coluna.getBoundingClientRect().top) / PX_POR_MIN);
    const turno = TURNOS.find(t => min >= minutosDe(t.inicio) && min < minutosDe(t.fim));
    if (!turno) return null;
    const ini = minutosDe(turno.inicio);
    const hhmm = hhmmDe(ini + Math.floor((min - ini) / DURACAO_SLOT_MIN) * DURACAO_SLOT_MIN);
    return ehSlotValido(hhmm) ? { data: coluna.dataset.coluna!, hhmm } : null;
  };

  /** O perito da IS não atende no turno do slot (dia útil): dá para oferecer a troca de perito. */
  const foraDoTurnoDoPerito = (is: InspecaoRecord, data: string, hhmm: string): boolean => {
    const turno = turnoDoSlot(hhmm);
    return !!onTrocarPerito && ehDiaUtil(data) && !!turno && !peritoAtendeNoTurno(config, is.peritoUid, data, turno);
  };

  /** Motivo pelo qual a IS não pode ir para o slot (null = pode). */
  const motivoRecusa = (is: InspecaoRecord, data: string, hhmm: string): string | null => {
    if (!ehDiaUtil(data)) return 'Sem expediente neste dia.';
    const turno = turnoDoSlot(hhmm);
    const ocupados = ocupadosDe(inspecoes, is.id);
    const estado = estadoDoSlot(is.peritoUid, data, hhmm, !!turno && peritoAtendeNoTurno(config, is.peritoUid, data, turno), bloqueios, ocupados, duracaoDaIS(is));
    if (estado === 'nao_cabe') return `A entrevista (${duracaoDaIS(is)} min) não cabe no turno a partir das ${hhmm}.`;
    if (estado === 'fora') return `${is.peritoNome} não atende neste turno.`;
    if (estado === 'bloqueado') return 'Horário bloqueado.';
    if (estado === 'ocupado') return `${is.peritoNome} já tem outra IS neste horário.`;
    return null;
  };

  const iniciarArraste = (is: InspecaoRecord, e: React.PointerEvent<HTMLButtonElement>) => {
    if (!podeArrastar(is) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const botao = e.currentTarget;
    const x0 = e.clientX; const y0 = e.clientY;
    let movendo = false;
    botao.setPointerCapture(e.pointerId);
    const mover = (ev: PointerEvent) => {
      if (!movendo && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
      movendo = true;
      const ponto = slotDoPonto(ev.clientX, ev.clientY);
      setArraste({ is, x: ev.clientX, y: ev.clientY, alvo: ponto ? { ...ponto, motivo: motivoRecusa(is, ponto.data, ponto.hhmm), trocar: foraDoTurnoDoPerito(is, ponto.data, ponto.hhmm) } : null });
    };
    const soltar = (ev: PointerEvent) => {
      botao.removeEventListener('pointermove', mover);
      botao.removeEventListener('pointerup', soltar);
      botao.removeEventListener('pointercancel', cancelar);
      botao.releasePointerCapture?.(ev.pointerId);
      setArraste(null);
      if (!movendo) return;
      // O clique que se segue ao arraste não deve abrir a ficha.
      const engolir = (ce: Event) => ce.stopImmediatePropagation();
      botao.addEventListener('click', engolir, { once: true, capture: true });
      window.setTimeout(() => botao.removeEventListener('click', engolir, true), 100);
      const ponto = slotDoPonto(ev.clientX, ev.clientY);
      if (!ponto) { onAviso?.('Solte a IS sobre um horário do calendário.', 'error'); return; }
      const destino = `${ponto.data}T${ponto.hhmm}`;
      if (destino === is.dataEntrevista) return;
      if (foraDoTurnoDoPerito(is, ponto.data, ponto.hhmm)) { onTrocarPerito?.(is, destino); return; }
      const motivo = motivoRecusa(is, ponto.data, ponto.hhmm);
      if (motivo) { onAviso?.(`Não foi possível reagendar: ${motivo}`, 'error'); return; }
      onReagendar?.(is, destino);
    };
    const cancelar = () => { botao.removeEventListener('pointermove', mover); botao.removeEventListener('pointerup', soltar); botao.removeEventListener('pointercancel', cancelar); setArraste(null); };
    botao.addEventListener('pointermove', mover);
    botao.addEventListener('pointerup', soltar);
    botao.addEventListener('pointercancel', cancelar);
  };

  const navegar = (sentido: -1 | 1) => {
    if (modo === 'dia') {
      let d = somarDias(ancora, sentido);
      while (!ehDiaUtil(d)) d = somarDias(d, sentido);
      setAncora(d);
    } else if (modo === 'semana') setAncora(somarDias(ancora, 7 * sentido));
    else { const d = deISO(ancora); d.setMonth(d.getMonth() + sentido, 1); setAncora(paraISO(d)); }
  };
  const irHoje = () => setAncora(ehDiaUtil(hoje) ? hoje : somarDias(hoje, deISO(hoje).getDay() === 6 ? 2 : 1));

  const dias = modo === 'dia' ? [ancora] : modo === 'semana' ? Array.from({ length: 5 }, (_, i) => somarDias(inicioDaSemana(ancora), i)) : [];

  // Ao abrir a grade, rola até as 8h (ou o primeiro evento do período).
  useEffect(() => { if (modo !== 'mes' && rolagem.current) rolagem.current.scrollTop = 0; }, [modo, ancora]);

  return (
    <div className="bg-white rounded-xl border border-line overflow-clip">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-line">
        <div className="flex items-center gap-1">
          <Button variant="secondary" onClick={irHoje}>Hoje</Button>
          <button type="button" onClick={() => navegar(-1)} aria-label="Período anterior" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
          <button type="button" onClick={() => navegar(1)} aria-label="Próximo período" className="w-11 h-11 flex items-center justify-center rounded-lg text-navy hover:bg-thead"><span className="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
          <h2 className="text-h3 font-bold text-navy ml-1 first-letter:uppercase" aria-live="polite">{titulo(modo, ancora)}</h2>
        </div>
        <Segmented<Modo>
          ariaLabel="Visão do calendário" value={modo} onChange={setModo}
          options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-b border-line text-xs text-ink-3" aria-label="Legenda de cores por AMP">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-navy" aria-hidden="true" />JRS</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gold" aria-hidden="true" />MPI</span>
        {diasConcursos.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-wine" aria-hidden="true" />Concurso (turno reservado)<span className="w-3 h-3 rounded-sm bg-green ml-1" aria-hidden="true" />dia encerrado</span>}
        {onReagendar && <span className="ml-auto hidden sm:inline">Segure e arraste uma IS para reagendar.</span>}
      </div>

      {modo === 'mes'
        ? <VisaoMes ancora={ancora} hoje={hoje} porDia={porDia} bloqueios={bloqueios} peritoUid={peritoUid} onAbrir={onAbrir} concursosPorDia={concursosPorDia} onAbrirConcurso={onAbrirConcurso} onDia={d => { setAncora(d); setModo('dia'); }} />
        : (
          <div ref={rolagem} className="overflow-auto max-h-[70vh]">
            <div className="min-w-[640px]">
              <div className="sticky top-0 z-20 grid bg-white border-b border-line" style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}>
                <div />
                {dias.map(d => (
                  <button key={d} type="button" onClick={() => { setAncora(d); setModo('dia'); }} className="py-2 text-center border-l border-line hover:bg-thead" aria-label={`Abrir ${nomeDiaSemana(d)}, ${Number(d.slice(8))} de ${nomeMes(d)}`}>
                    <span className="block text-xs font-semibold text-ink-3 uppercase">{nomeDiaCurto(d)}</span>
                    <span className={`inline-flex w-9 h-9 items-center justify-center rounded-full text-h3 font-bold ${d === hoje ? 'bg-navy text-white' : 'text-navy'}`}>{Number(d.slice(8))}</span>
                  </button>
                ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}>
                <div className="relative" style={{ height: ALTURA_GRADE }} aria-hidden="true">
                  {HORAS.map(h => (
                    <span key={h} className="absolute right-2 -translate-y-1/2 text-xs text-ink-3 font-mono" style={{ top: (h * 60 - INICIO_GRADE) * PX_POR_MIN }}>{h > 7 ? `${String(h).padStart(2, '0')}:00` : ''}</span>
                  ))}
                </div>
                {dias.map(d => (
                  <ColunaDia key={d} data={d} hoje={hoje} inspecoes={porDia.get(d) ?? []} bloqueios={bloqueios} config={config} peritoUid={peritoUid} onAbrir={onAbrir} onNovoNoHorario={onNovoNoHorario} podeArrastar={podeArrastar} onIniciarArraste={iniciarArraste} arrastando={arraste} concursosDoDia={concursosPorDia.get(d) ?? []} onAbrirConcurso={onAbrirConcurso} />
                ))}
              </div>
            </div>
          </div>
        )}
      {arraste && (
        <div
          className={`fixed z-toast pointer-events-none px-2 py-1 rounded border text-xs font-semibold shadow-lg opacity-90 ${corAmp(arraste.is.amp)}`}
          style={{ left: arraste.x + 12, top: arraste.y + 12 }}
        >
          {arraste.alvo ? (arraste.alvo.trocar ? `⚠ ${arraste.is.peritoNome} não atende: solte para trocar o perito` : arraste.alvo.motivo ? `✖ ${arraste.alvo.motivo}` : `${arraste.alvo.hhmm} · ${nomeCurto(arraste.is.inspecionado)}`) : nomeCurto(arraste.is.inspecionado)}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------

const topo = (min: number) => (min - INICIO_GRADE) * PX_POR_MIN;

const ColunaDia: React.FC<{
  data: string; hoje: string; inspecoes: InspecaoRecord[]; bloqueios: BloqueioAgenda[]; config: ConfigAgenda; peritoUid: string;
  onAbrir: (is: InspecaoRecord) => void; onNovoNoHorario?: (dataHora: string) => void;
  podeArrastar: (is: InspecaoRecord) => boolean;
  onIniciarArraste: (is: InspecaoRecord, e: React.PointerEvent<HTMLButtonElement>) => void;
  arrastando: { is: InspecaoRecord; alvo: { data: string; hhmm: string; motivo: string | null; trocar?: boolean } | null } | null;
  concursosDoDia: DiaConcurso[];
  onAbrirConcurso?: (concursoId: string) => void;
}> = ({ data, hoje, inspecoes, bloqueios, config, peritoUid, onAbrir, onNovoNoHorario, podeArrastar, onIniciarArraste, arrastando, concursosDoDia, onAbrirConcurso }) => {
  const agora = new Date();
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  // Os bloqueios gerados pelos dias de concurso aparecem como o próprio cartão do concurso (abaixo), não hachurados.
  const diaBloqueios = bloqueios.filter(b => !ehBloqueioDeConcurso(b) && b.data === data && (!peritoUid || b.peritoUid === '*' || b.peritoUid === peritoUid));

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
      className={`relative border-l border-line ${onNovoNoHorario ? 'cursor-cell' : ''}`}
      style={{ height: ALTURA_GRADE }}
      data-coluna={data}
      onClick={aoClicarVazio}
    >
      {/* destino do arraste */}
      {arrastando?.alvo?.data === data && (
        <div
          className={`absolute inset-x-0 z-20 pointer-events-none border-2 rounded ${arrastando.alvo.trocar ? 'border-gold bg-gold/20' : arrastando.alvo.motivo ? 'border-wine bg-wine/10' : 'border-green bg-green/15'}`}
          style={{ top: topo(minutosDe(arrastando.alvo.hhmm)), height: duracaoDaIS(arrastando.is) * PX_POR_MIN }}
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
      {diaBloqueios.map(b => {
        const ini = b.hora ? minutosDe(b.hora) : b.turno === 'dia' ? minutosDe('07:30') : minutosDe(TURNOS.find(t => t.id === b.turno)!.inicio);
        const fim = b.hora ? ini + DURACAO_SLOT_MIN : b.turno === 'dia' ? minutosDe('17:00') : minutosDe(TURNOS.find(t => t.id === b.turno)!.fim);
        return (
          <div
            key={b.id}
            className="absolute inset-x-0 bg-wine/10 border-y border-wine/30 text-wine text-xs font-semibold px-1 overflow-hidden pointer-events-none"
            style={{ top: topo(ini), height: (fim - ini) * PX_POR_MIN, backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(0,0,0,0.04) 6px 12px)' }}
            title={`Bloqueado${b.peritoNome ? ` · ${b.peritoNome}` : b.peritoUid === '*' ? ' · todos os peritos' : ''}${b.motivo ? ` · ${b.motivo}` : ''}`}
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

      {/* concursos: um evento ocupa o turno da manhã inteiro */}
      {concursosDoDia.map(c => {
        const clicavel = !!onAbrirConcurso;
        return (
          <button
            key={c.chave}
            type="button"
            disabled={!clicavel}
            onClick={e => { e.stopPropagation(); onAbrirConcurso?.(c.concursoId); }}
            title={`${tituloDiaConcurso(c)}${c.encerrado ? ' · dia encerrado' : ''}${clicavel ? ' · abrir a tabela do concurso' : ''}`}
            className={`absolute inset-x-0.5 z-[5] rounded border px-1.5 py-1 text-left overflow-hidden text-xs font-bold leading-tight flex flex-col items-start justify-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${clicavel ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} ${corConcurso(c)}`}
            style={{ top: topo(minutosDe('07:30')) + 1, height: (minutosDe('12:00') - minutosDe('07:30')) * PX_POR_MIN - 2 }}
          >
            <span className="inline-flex items-start gap-1"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">{c.encerrado ? 'check_circle' : 'fact_check'}</span><span>{tituloDiaConcurso(c)}</span></span>
            <span className="block font-normal opacity-90">{c.encerrado ? 'Dia encerrado' : 'Turno da manhã reservado'}</span>
          </button>
        );
      })}

      {/* IS */}
      {posicoes.map(({ is, ini: min, col, total }) => {
        const duracao = duracaoDaIS(is);
        const st = STATUS_IS[statusEfetivoIS(is)];
        const arrastavel = podeArrastar(is);
        return (
          <button
            key={is.id}
            type="button"
            onClick={e => { e.stopPropagation(); onAbrir(is); }}
            onPointerDown={e => onIniciarArraste(is, e)}
            title={`${horaDeEntrevista(is.dataEntrevista)}–${horaFimEntrevista(horaDeEntrevista(is.dataEntrevista), duracao)} · IS ${is.is} · ${is.inspecionado} · ${is.amp} · ${is.peritoNome} · ${st.rotulo}${arrastavel ? ' · arraste para reagendar' : ''}`}
            className={`absolute z-10 px-1.5 rounded border text-left overflow-hidden text-xs leading-tight hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold select-none ${arrastavel ? 'cursor-grab active:cursor-grabbing touch-none' : ''} ${arrastando?.is.id === is.id ? 'opacity-40' : ''} ${corAmp(is.amp)}`}
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
}> = ({ ancora, hoje, porDia, bloqueios, peritoUid, onAbrir, onDia, concursosPorDia, onAbrirConcurso }) => {
  const primeiro = inicioDoMes(ancora);
  const inicio = inicioDaSemana(primeiro);
  const semanas = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => somarDias(inicio, w * 7 + d)));
  // O sexto ramal só aparece se ainda tem dias do mês.
  const visiveis = semanas.filter((s, i) => i < 5 || s.some(d => d.slice(0, 7) === ancora.slice(0, 7)));
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-line bg-thead text-xs font-semibold text-ink-3 uppercase">
          {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map(n => <div key={n} className="px-2 py-2 text-center">{n}</div>)}
        </div>
        {visiveis.map((sem, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-line last:border-b-0">
            {sem.map(d => {
              const lista = porDia.get(d) ?? [];
              const foraDoMes = d.slice(0, 7) !== ancora.slice(0, 7);
              const concursosDoDia = concursosPorDia.get(d) ?? [];
              const bloqueado = bloqueios.some(b => !ehBloqueioDeConcurso(b) && b.data === d && (!peritoUid || b.peritoUid === '*' || b.peritoUid === peritoUid));
              return (
                <div key={d} className={`min-h-[104px] p-1 border-l border-line first:border-l-0 ${foraDoMes ? 'bg-thead/60' : 'bg-white'} ${ehDiaUtil(d) ? '' : 'bg-thead/60'}`}>
                  <button type="button" onClick={() => onDia(d)} aria-label={`Abrir ${Number(d.slice(8))} de ${nomeMes(d)}`} className="flex items-center gap-1 w-full">
                    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold ${d === hoje ? 'bg-navy text-white' : foraDoMes ? 'text-ink-4' : 'text-navy'}`}>{Number(d.slice(8))}</span>
                    {bloqueado && <span className="material-symbols-outlined text-[16px] text-wine" aria-label="Há bloqueio neste dia" title="Há bloqueio neste dia">block</span>}
                  </button>
                  <div className="space-y-0.5 mt-0.5">
                    {concursosDoDia.map(c => (
                      <button key={c.chave} type="button" disabled={!onAbrirConcurso} onClick={() => onAbrirConcurso?.(c.concursoId)} title={`${tituloDiaConcurso(c)}${c.encerrado ? ' · dia encerrado' : ''}`} className={`block w-full text-left truncate rounded border px-1 text-xs font-bold ${onAbrirConcurso ? '' : 'cursor-default'} ${corConcurso(c)}`}>
                        {tituloDiaConcurso(c)}
                      </button>
                    ))}
                    {lista.slice(0, 3).map(is => {
                      const st = STATUS_IS[statusEfetivoIS(is)];
                      return (
                        <button key={is.id} type="button" onClick={() => onAbrir(is)} title={`${is.inspecionado} · ${is.amp} · ${st.rotulo}`} className={`block w-full text-left truncate rounded border px-1 text-xs ${corAmp(is.amp)}`}>
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
