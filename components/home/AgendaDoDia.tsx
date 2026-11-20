// Ficheiro: components/home/AgendaDoDia.tsx
// "Agenda de hoje" da Início (auditoria v3, 2a/H4): os eventos do dia escolhido no calendário (começa em hoje),
// com a HORA PRIMEIRO (início em negrito e fim abaixo, tabular-nums), uma barra de cor por tipo (IS JRS navy ·
// IS MPI ouro · concurso azul — a mesma legenda do calendário), o inspecionado, a tag de status e o chevron.
// Cada linha abre o que foi clicado: a IS abre o próprio detalhe (/inspecoes/{id}); o concurso abre a planilha
// (quem acessa Concursos) ou a lista do dia. Hoje, uma linha "agora HH:MM" separa o que já passou (esmaecido).
// Regras dos eventos (concurso como um evento por turno etc.) em utils/agendaHome.ts.
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Secao } from './Secao';
import { Button, ButtonLink } from '../ui/Button';
import { StatusTag, type StatusTone } from '../ui/StatusTag';
import { concursoPath } from '../../config/routes';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { DiaConcurso } from '../../services/agendaConcursos';
import { eventosDoDia, type EventoAgenda } from '../../utils/agendaHome';
import { TURNOS, dataBr, duracaoDaIS, hhmmDe, minutosDe, nomeDiaCurto } from '../../utils/inspecoes';

interface Props {
  dia: string;
  hoje: string;
  inspecoes: InspecaoRecord[];
  diasConcursos: DiaConcurso[];
  /** Quem acessa Concursos abre a planilha ao clicar no concurso. */
  concursosClicaveis: boolean;
  /** Volta o painel para hoje (só aparece quando outro dia está escolhido). */
  onHoje: () => void;
  /** Sem moldura própria: dentro do card único "calendário + agenda" do celular (com uma divisória no topo). */
  embutido?: boolean;
}

/** Pesos das tags (H3/I8/G1): navy cheio fica para a ação primária; "Agendada" e afins vão em contorno. */
const tomDaTag = (tom: StatusTone): StatusTone => (tom === 'navy' ? 'navyOutline' : tom);

interface Linha { e: EventoAgenda; fim: string; to?: string; barra: string }

const agoraHHMM = () => new Date().toTimeString().slice(0, 5);

export const AgendaDoDia: React.FC<Props> = ({ dia, hoje, inspecoes, diasConcursos, concursosClicaveis, onHoje, embutido }) => {
  const ehHoje = dia === hoje;
  const porId = useMemo(() => new Map(inspecoes.map(i => [i.id, i])), [inspecoes]);
  const linhas: Linha[] = useMemo(() => eventosDoDia(dia, inspecoes, diasConcursos, hoje).map(e => {
    if (e.tipo === 'is') {
      const id = e.chave.slice(3); // "is:{id}"
      const is = porId.get(id);
      return { e, fim: is ? hhmmDe(minutosDe(e.hora) + duracaoDaIS(is)) : '', to: `/inspecoes/${encodeURIComponent(id)}`, barra: e.amp === 'JRS' ? 'bg-navy' : 'bg-gold' };
    }
    const turno = e.hora < '12:00' ? TURNOS[0] : TURNOS[1];
    return {
      e, fim: turno.fim, barra: 'bg-blue',
      to: e.concursoId ? (concursosClicaveis ? concursoPath(e.concursoId) : undefined) : `/inspecoes?dia=${dia}`,
    };
  }), [dia, inspecoes, diasConcursos, hoje, porId, concursosClicaveis]);

  const agora = agoraHHMM();
  // Onde entra a linha "agora": antes do primeiro evento que ainda não terminou.
  const idxAgora = ehHoje ? (() => { const i = linhas.findIndex(l => (l.fim || l.e.hora) > agora); return i === -1 ? linhas.length : i; })() : -1;

  const titulo = ehHoje ? 'Agenda de hoje' : `Agenda de ${nomeDiaCurto(dia)}, ${dataBr(dia).slice(0, 5)}`;

  return (
    <Secao
      id="home-agenda" titulo={titulo} embutido={embutido} className={embutido ? 'border-t border-line' : ''}
      acao={(
        <>
          {!ehHoje && <Button variant="ghost" size="sm" icon="today" onClick={onHoje}>Hoje</Button>}
          <ButtonLink to="/inspecoes?visao=calendario" variant="ghost" size="sm">Abrir calendário</ButtonLink>
        </>
      )}
    >
      {linhas.length === 0 ? (
        <p className="px-4 pb-6 pt-2 text-sm text-ink-3">Nenhuma inspeção agendada {ehHoje ? 'para hoje' : 'neste dia'}.</p>
      ) : (
        <ol aria-label={`Eventos de ${dataBr(dia)}`}>
          {linhas.map((l, i) => {
            const passou = ehHoje && i < idxAgora;
            const corpo = (
              <>
                <span className="w-16 shrink-0 text-right leading-tight tabular-nums">
                  <span className="block text-sm font-bold text-navy">{l.e.hora}</span>
                  {l.fim && <span className="block text-xs text-ink-3">{l.fim}</span>}
                </span>
                <span className={`w-1 self-stretch rounded-sm shrink-0 ${l.barra}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-navy truncate">{l.e.titulo}</span>
                  <span className="block text-xs text-ink-3 truncate">{l.e.detalhe}</span>
                </span>
                <StatusTag tone={tomDaTag(l.e.tag.tom)} className="shrink-0 hidden sm:inline-flex">{l.e.tag.rotulo}</StatusTag>
                {l.to && <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">chevron_right</span>}
              </>
            );
            const classe = `flex items-center gap-3 px-4 py-2.5 min-h-[56px] border-t border-line ${passou ? 'opacity-60' : ''}`;
            return (
              <React.Fragment key={l.e.chave}>
                {i === idxAgora && <LinhaAgora agora={agora} />}
                <li>
                  {l.to
                    ? <Link to={l.to} className={`${classe} hover:bg-thead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold`}>{corpo}</Link>
                    : <div className={classe}>{corpo}</div>}
                </li>
              </React.Fragment>
            );
          })}
          {idxAgora === linhas.length && <LinhaAgora agora={agora} />}
        </ol>
      )}
    </Secao>
  );
};

const LinhaAgora: React.FC<{ agora: string }> = ({ agora }) => (
  <li className="flex items-center gap-3 px-4 h-5" aria-label={`Agora, ${agora}`}>
    <span className="w-16 shrink-0 text-right text-xs font-bold text-gold-ink tabular-nums whitespace-nowrap">agora {agora}</span>
    <span className="flex-1 h-0.5 rounded-sm bg-gold" aria-hidden="true" />
  </li>
);
