// Ficheiro: components/home/AgendaInspecoesCard.tsx
// Card "Agenda de inspeções" da Início (coluna da esquerda, abaixo de "Precisa de atenção"), em duas partes:
//  - à esquerda, o calendário do mês ("Ver Inspeções" leva à página Inspeções na visão Calendário), com seletor de
//    mês e ano, setas e marcas nos dias com IS (azul-marinho = JRS, dourado = MPI) e concursos (vinho; verde
//    quando concluído);
//  - à direita, os eventos do dia escolhido (começa em hoje), com rolagem quando não cabem. "Inspeções hoje" e o
//    clique numa IS levam à lista de Inspeções filtrada pelo dia; cada concurso é um evento único por turno, com o
//    nome e a quantidade de candidatos, e abre a planilha do concurso (como "Concursos em andamento").
// Regras dos eventos em utils/agendaHome.ts.
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { controlClass } from '../ui/Field';
import { concursoPath } from '../../config/routes';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { DiaConcurso } from '../../services/agendaConcursos';
import { eventosDoDia, marcasDoDia, type EventoAgenda } from '../../utils/agendaHome';
import { hojeISO, somarDias, inicioDaSemana, inicioDoMes, nomeMes, nomeDiaSemana, dataBr } from '../../utils/inspecoes';

const MESES = Array.from({ length: 12 }, (_, i) => nomeMes(`2000-${String(i + 1).padStart(2, '0')}-01`));
const DIAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

interface Props {
  inspecoes: InspecaoRecord[];
  diasConcursos: DiaConcurso[];
  /** Quem acessa Concursos abre a planilha ao clicar no concurso. */
  concursosClicaveis: boolean;
}

const linkCabecalho = 'inline-flex items-center gap-0.5 min-h-[44px] text-sm font-bold text-navy hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded';

const CartaoEvento: React.FC<{ e: EventoAgenda; to?: string }> = ({ e, to }) => {
  const corpo = (
    <>
      <span className="flex items-center gap-2 min-w-0">
        {e.tipo === 'is'
          ? <span className={`w-2 h-2 rounded-full shrink-0 ${e.amp === 'JRS' ? 'bg-navy' : 'bg-gold'}`} aria-hidden="true" />
          : <span className="material-symbols-outlined text-[18px] text-wine shrink-0" aria-hidden="true">groups</span>}
        <span className="text-sm font-bold text-navy truncate">{e.titulo}</span>
      </span>
      <span className="flex items-center gap-3 min-w-0 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>{e.hora}
        </span>
        <span className="truncate">{e.detalhe}</span>
      </span>
    </>
  );
  const classe = 'flex flex-col justify-center gap-1.5 h-[76px] px-3 rounded-lg border border-line bg-white';
  return to
    ? <Link to={to} className={`${classe} hover:border-navy transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold`}>{corpo}</Link>
    : <div className={classe}>{corpo}</div>;
};

export const AgendaInspecoesCard: React.FC<Props> = ({ inspecoes, diasConcursos, concursosClicaveis }) => {
  const hoje = hojeISO();
  const [mes, setMes] = useState(inicioDoMes(hoje));
  const [selecionado, setSelecionado] = useState(hoje);

  const ano = Number(mes.slice(0, 4));
  const anos = useMemo(() => {
    const base = Number(hoje.slice(0, 4));
    return Array.from(new Set([base - 2, base - 1, base, base + 1, base + 2, ano])).sort((a, b) => a - b);
  }, [hoje, ano]);
  const irPara = (a: number, m: number) => setMes(`${a}-${String(m).padStart(2, '0')}-01`);
  const mudarMes = (n: number) => { const total = ano * 12 + (Number(mes.slice(5, 7)) - 1) + n; irPara(Math.floor(total / 12), (total % 12) + 1); };

  const inicio = inicioDaSemana(mes);
  const dias = Array.from({ length: 42 }, (_, i) => somarDias(inicio, i))
    .filter((d, i) => i < 35 || Array.from({ length: 7 }, (_, k) => somarDias(inicio, 35 + k)).some(x => x.slice(0, 7) === mes.slice(0, 7)));

  const eventos = useMemo(() => eventosDoDia(selecionado, inspecoes, diasConcursos, hoje), [selecionado, inspecoes, diasConcursos, hoje]);
  const linkDia = `/inspecoes?dia=${selecionado}`;
  const ehHoje = selecionado === hoje;

  return (
    <div className="@container border-t border-line">
    <div className="grid grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @2xl:divide-x divide-line">
      {/* Calendário */}
      <div className="p-3 @2xl:p-4 min-w-0">
        <Link to="/inspecoes?visao=calendario" className={linkCabecalho}>
          Ver Inspeções<span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
        </Link>
        <div className="flex items-center gap-1.5 mb-2">
          <button type="button" onClick={() => mudarMes(-1)} aria-label="Mês anterior" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_left</span>
          </button>
          <div className="flex-1 min-w-0">
            <select aria-label="Mês" className={`${controlClass} capitalize`} value={Number(mes.slice(5, 7))} onChange={e => irPara(ano, Number(e.target.value))}>
              {MESES.map((m, i) => <option key={m} value={i + 1} className="capitalize">{m}</option>)}
            </select>
          </div>
          <div className="w-24 shrink-0">
            <select aria-label="Ano" className={controlClass} value={ano} onChange={e => irPara(Number(e.target.value), Number(mes.slice(5, 7)))}>
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => mudarMes(1)} aria-label="Próximo mês" className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
            <span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_right</span>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-3 mb-1" aria-hidden="true">
          {DIAS.map(d => <span key={d} className="py-1">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`Calendário de ${nomeMes(mes)} de ${ano}`}>
          {dias.map(d => {
            const fora = d.slice(0, 7) !== mes.slice(0, 7);
            const ativo = d === selecionado;
            const m = marcasDoDia(d, inspecoes, diasConcursos);
            return (
              <button
                key={d} type="button" role="gridcell" aria-pressed={ativo} onClick={() => setSelecionado(d)}
                aria-label={`${Number(d.slice(8))} de ${nomeMes(d)}${m.jrs || m.mpi ? ', com inspeções' : ''}${m.concurso ? ', com concurso' : ''}`}
                className={`relative h-11 rounded-lg text-sm font-semibold flex flex-col items-center justify-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                  ativo ? 'bg-navy text-white' : d === hoje ? 'bg-thead text-navy ring-1 ring-navy' : fora ? 'bg-thead/40 text-ink-4 hover:bg-thead' : 'bg-thead/60 text-ink hover:bg-thead'
                }`}
              >
                <span className="flex gap-0.5 h-1.5 mb-0.5" aria-hidden="true">
                  {m.jrs && <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-white' : 'bg-navy'}`} />}
                  {m.mpi && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
                  {m.concurso && <span className={`w-1.5 h-1.5 rounded-full ${m.concursoConcluido ? 'bg-green' : 'bg-wine'}`} />}
                </span>
                {Number(d.slice(8))}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eventos do dia */}
      <div className="p-3 @2xl:p-4 min-w-0 flex flex-col border-t border-line @2xl:border-t-0">
        <Link to={linkDia} className={linkCabecalho}>
          {ehHoje ? 'Inspeções hoje' : `Inspeções em ${dataBr(selecionado).slice(0, 5)}`}
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
        </Link>
        <p className="text-xs text-ink-3 mb-2">
          <span className="first-letter:uppercase inline-block">{nomeDiaSemana(selecionado)}</span>, {dataBr(selecionado)} · {eventos.length} evento{eventos.length !== 1 ? 's' : ''}
        </p>
        {eventos.length === 0 ? (
          <p className="text-sm text-ink-3 py-6 text-center">Nenhuma inspeção agendada neste dia.</p>
        ) : (
          <ul className="space-y-2 max-h-[22rem] overflow-y-auto pr-1 -mr-1" aria-label={`Eventos de ${dataBr(selecionado)}`}>
            {eventos.map(e => (
              <li key={e.chave}>
                <CartaoEvento e={e} to={e.tipo === 'is' ? linkDia : e.concursoId ? (concursosClicaveis ? concursoPath(e.concursoId) : undefined) : linkDia} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    </div>
  );
};
