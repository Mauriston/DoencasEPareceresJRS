// Ficheiro: components/inspecoes/TabelaAgendaIS.tsx
// Lista das Inspeções de Saúde (auditoria v3, 2b · I4–I8 · 4g).
// Desktop: UMA tabela com colgroup fixo — Quando · IS · Inspecionado · finalidade · Perito · Prazo · etapa · Status · ⋮ —
// e os grupos (Hoje, cada próximo dia, Entrevistados aguardando conclusão, Abertas sem agendamento; ou meses, na aba
// Finalizadas) como linhas de cabeçalho dentro dela: as colunas ficam alinhadas entre grupos (I7). A coluna Quando
// não repete o que o cabeçalho do grupo já diz (I6); o prazo das abertas aparece com barra e a etapa do fluxo em 6
// segmentos (I4/I8). Clique na linha (ou no nº da IS) abre o detalhe; clique no nome copia o nome completo; clique no
// perito troca o perito.
// Celular: um cartão por grupo, com o dia no cabeçalho, os avisos do dia (bloqueios, turno de concurso, férias) e,
// para quem agenda, linhas tracejadas "HH:MM livre · Agendar" entre as IS do dia.
import React from 'react';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { StatusTag } from '../ui/StatusTag';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import { copiarTexto } from './CampoCopiavel';
import { etapaIS, prazoIS, quandoIS, statusListaIS, TOTAL_ETAPAS_IS, type GrupoIS, type TipoGrupoIS } from './listaIS';

/** Aviso no cabeçalho de um dia (bloqueio, turno de concurso, férias). */
export interface AvisoDiaIS { chave: string; icone: string; texto: string }

export interface TabelaAgendaISProps {
  grupos: GrupoIS[];
  hoje: string;
  nomeDe: (is: InspecaoRecord) => string;
  omDe: (is: InspecaoRecord) => string | undefined;
  onAbrir: (is: InspecaoRecord) => void;
  /** Ausente = sem permissão para trocar o perito desta IS. */
  onTrocarPerito?: (is: InspecaoRecord) => void;
  podeTrocarPerito: (is: InspecaoRecord) => boolean;
  itensDe: (is: InspecaoRecord) => ItemMenu[];
  /** Resultado da cópia do nome (clique no nome do inspecionado), para o aviso da página. */
  onNomeCopiado?: (nome: string, ok: boolean) => void;
  /** Avisos do cabeçalho de um dia (AAAA-MM-DD). */
  avisosDe?: (data: string) => AvisoDiaIS[];
  /** Celular, quem agenda: horário livre a mostrar logo depois de cada IS do dia (id da IS → hh:mm). */
  livresDe?: (g: GrupoIS) => Map<string, string>;
  onAgendarHorario?: (dataHora: string) => void;
  /** Abaixo da lista (ex.: "Mostrar mais"). */
  rodape?: React.ReactNode;
}

const PONTO: Record<TipoGrupoIS, string> = { dia: 'bg-navy', aguardando: 'bg-gold-ink', abertas: 'bg-ink-3', mes: 'bg-ink-4' };

const linhaSub = (is: InspecaoRecord, om: string | undefined): string => [is.finalidade, is.amp, om].filter(Boolean).join(' · ');

/** Prazo (abertas) ou etapa do fluxo (demais), com barra. */
const PrazoEtapa: React.FC<{ is: InspecaoRecord; hoje: string }> = ({ is, hoje }) => {
  const prazo = prazoIS(is, hoje);
  if (prazo) {
    return (
      <span className="flex flex-col gap-1">
        <span className={`text-xs font-semibold tabular-nums ${prazo.atrasada ? 'text-wine' : 'text-ink-3'}`}>{prazo.texto}</span>
        <span className="block h-1.5 w-full max-w-[7.5rem] rounded-full bg-thead overflow-hidden" aria-hidden="true">
          <span className={`block h-full rounded-full ${prazo.atrasada ? 'bg-wine' : 'bg-navy'}`} style={{ width: `${prazo.pct}%` }} />
        </span>
      </span>
    );
  }
  const etapa = etapaIS(statusListaIS(is, hoje).status);
  if (!etapa) return null;
  return (
    <span className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-ink-3 truncate">{etapa.passo > 0 ? `${etapa.rotulo} · ${etapa.passo} de ${TOTAL_ETAPAS_IS}` : etapa.rotulo}</span>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: TOTAL_ETAPAS_IS }, (_, i) => <span key={i} className={`w-4 h-1.5 rounded-sm ${i < etapa.passo ? 'bg-navy' : 'bg-line'}`} />)}
      </span>
    </span>
  );
};

/** Dia do mês grande (hoje em círculo navy) — cabeçalho do cartão do dia no celular. */
const NumeroDia: React.FC<{ data: string; hoje: string }> = ({ data, hoje }) => (
  <span className={`inline-flex items-center justify-center shrink-0 w-10 h-10 rounded-full font-heading font-bold leading-none text-h2 tabular-nums ${data === hoje ? 'bg-navy text-white' : 'text-navy'}`}>
    {Number(data.slice(8, 10))}
  </span>
);

const ICONE_GRUPO: Record<Exclude<TipoGrupoIS, 'dia'>, string> = { aguardando: 'pending_actions', abertas: 'event_busy', mes: 'event_available' };

export const TabelaAgendaIS: React.FC<TabelaAgendaISProps> = ({
  grupos, hoje, nomeDe, omDe, onAbrir, onTrocarPerito, podeTrocarPerito, itensDe, onNomeCopiado, avisosDe, livresDe, onAgendarHorario, rodape,
}) => {
  const perito = (is: InspecaoRecord) => {
    if (onTrocarPerito && podeTrocarPerito(is) && (is.peritoNome || is.dataEntrevista)) {
      return (
        <button
          type="button" onClick={e => { e.stopPropagation(); onTrocarPerito(is); }} aria-label={`Trocar perito da IS ${is.is}`} title="Trocar perito"
          className="max-w-full truncate text-ink hover:text-navy hover:underline text-left rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
        >
          {is.peritoNome || 'Escolher perito'}
        </button>
      );
    }
    return is.peritoNome ? <span className="block text-ink truncate">{is.peritoNome}</span> : null;
  };

  const copiarNome = async (e: React.MouseEvent, nome: string) => { e.stopPropagation(); onNomeCopiado?.(nome, await copiarTexto(nome)); };

  return (
    <>
      {/* Desktop: uma tabela só; os grupos são linhas de cabeçalho (colunas alinhadas entre grupos). */}
      <table className="hidden md:table w-full table-fixed text-sm">
        <caption className="sr-only">Inspeções de Saúde</caption>
        <colgroup>
          <col className="w-28" />
          <col className="w-20" />
          <col />
          <col className="w-36" />
          <col className="w-40" />
          <col className="w-44" />
          <col className="w-12" />
        </colgroup>
        <thead>
          <tr className="bg-thead text-xs text-ink-3 text-left border-y border-line">
            <th scope="col" className="px-4 py-2 font-semibold">Quando</th>
            <th scope="col" className="px-2 py-2 font-semibold">IS</th>
            <th scope="col" className="px-2 py-2 font-semibold">Inspecionado · finalidade</th>
            <th scope="col" className="px-2 py-2 font-semibold">Perito</th>
            <th scope="col" className="px-2 py-2 font-semibold">Prazo · etapa</th>
            <th scope="col" className="px-2 py-2 font-semibold">Status</th>
            <th scope="col"><span className="sr-only">Ações</span></th>
          </tr>
        </thead>
        {grupos.map(g => {
          const avisos = g.data && avisosDe ? avisosDe(g.data) : [];
          const ehHoje = g.data === hoje;
          return (
            <tbody key={g.chave}>
              <tr className="bg-thead/60 border-t border-line first:border-t-0">
                <th scope="rowgroup" colSpan={7} className="px-4 py-2 text-left font-normal">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ehHoje ? 'bg-gold' : PONTO[g.tipo]}`} aria-hidden="true" />
                    <span className="text-xs font-bold text-navy first-letter:uppercase">{g.titulo}</span>
                    <span className="text-xs text-ink-3">{g.dica}</span>
                    {avisos.map(a => (
                      <span key={a.chave} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-3">
                        <span aria-hidden="true">·</span>
                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{a.icone}</span>{a.texto}
                      </span>
                    ))}
                  </span>
                </th>
              </tr>
              {g.itens.map(is => {
                const st = statusListaIS(is, hoje);
                const nome = nomeDe(is);
                const itens = itensDe(is);
                const q = quandoIS(is, g.tipo, hoje);
                return (
                  <tr key={is.id} onClick={() => onAbrir(is)} className="border-t border-line cursor-pointer hover:bg-thead/60 transition-colors">
                    <td className="px-4 py-1.5 leading-tight">
                      <span className="block font-bold text-navy tabular-nums whitespace-nowrap">{q.linha1}</span>
                      {q.linha2 && <span className="block text-xs text-ink-3 tabular-nums whitespace-nowrap">{q.linha2}</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={e => { e.stopPropagation(); onAbrir(is); }} aria-label={`Abrir IS ${is.is}`} className="font-bold text-navy tabular-nums hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
                        {is.is}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 leading-tight min-w-0">
                      <button
                        type="button" onClick={e => copiarNome(e, nome)}
                        title={`${nome} · clique para copiar o nome`} aria-label={`Copiar o nome ${nome}`}
                        className="block max-w-full font-semibold text-navy truncate text-left cursor-copy hover:underline rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                      >
                        {nome}
                      </button>
                      <span className="block text-xs text-ink-3 truncate" title={linhaSub(is, omDe(is))}>{linhaSub(is, omDe(is))}</span>
                    </td>
                    <td className="px-2 py-1.5 min-w-0" onClick={e => e.stopPropagation()}>{perito(is)}</td>
                    <td className="px-2 py-1.5"><PrazoEtapa is={is} hoje={hoje} /></td>
                    <td className="px-2 py-1.5 min-w-0"><StatusTag tone={st.tom} title={st.rotulo} className="max-w-full truncate">{st.rotulo}</StatusTag></td>
                    <td className="pr-2 py-1.5 text-right" onClick={e => e.stopPropagation()}>
                      {itens.length > 0 && <MenuAcoes size="sm" rotulo={`Ações da IS ${is.is}`} itens={itens} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
      {rodape && <div className="hidden md:block border-t border-line px-4 py-2">{rodape}</div>}

      {/* Celular: um cartão por grupo, com os avisos do dia e os horários livres (quem agenda). */}
      <div className="md:hidden space-y-3">
        {grupos.map(g => {
          const avisos = g.data && avisosDe ? avisosDe(g.data) : [];
          const livres = g.data && livresDe ? livresDe(g) : null;
          return (
            <section key={g.chave} aria-label={g.titulo} className="bg-white rounded-xl border border-line overflow-clip">
              <h2 className="flex items-center gap-3 px-3 py-2 bg-thead border-b border-line">
                {g.data
                  ? <NumeroDia data={g.data} hoje={hoje} />
                  : <span className="material-symbols-outlined text-[24px] text-ink-3 w-10 text-center" aria-hidden="true">{ICONE_GRUPO[g.tipo as Exclude<TipoGrupoIS, 'dia'>]}</span>}
                <span className="min-w-0 leading-tight">
                  <span className="block text-sm font-bold text-navy first-letter:uppercase">{g.titulo}</span>
                  <span className="block text-xs text-ink-3">{g.dica}</span>
                </span>
              </h2>
              {avisos.map(a => (
                <p key={a.chave} className="flex items-center gap-2 px-3 py-2 border-b border-line text-xs font-semibold text-ink-3">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{a.icone}</span>
                  <span className="min-w-0">{a.texto}</span>
                </p>
              ))}
              <ul className="p-1.5 space-y-0.5">
                {g.itens.map(is => {
                  const st = statusListaIS(is, hoje);
                  const itens = itensDe(is);
                  const q = quandoIS(is, g.tipo, hoje);
                  const prazo = prazoIS(is, hoje);
                  const livre = livres?.get(is.id);
                  return (
                    <React.Fragment key={is.id}>
                      <li className="flex items-start rounded-lg hover:bg-thead">
                        <button type="button" onClick={() => onAbrir(is)} className="flex-1 min-w-0 flex items-start gap-3 text-left px-2 py-2">
                          <span className="w-14 shrink-0 leading-tight">
                            {g.tipo === 'dia'
                              ? <span className="block text-sm font-bold text-navy tabular-nums">{q.linha1}</span>
                              : prazo
                                ? <span className={`block text-xs font-bold tabular-nums ${prazo.atrasada ? 'text-wine' : 'text-navy'}`}>{q.linha2}</span>
                                : (
                                  <>
                                    <span className="block text-xs font-bold text-navy tabular-nums">{q.linha1}</span>
                                    {q.linha2 && <span className="block text-xs text-ink-3 tabular-nums">{q.linha2}</span>}
                                  </>
                                )}
                          </span>
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block text-sm font-semibold text-navy truncate">{nomeDe(is)}</span>
                            <span className="block text-xs text-ink-3 truncate">
                              {is.finalidade}{is.peritoNome ? ` · ${is.peritoNome}` : ''}
                              {prazo && <span className={prazo.atrasada ? 'font-semibold text-wine' : ''}> · {prazo.texto}</span>}
                            </span>
                            <StatusTag tone={st.tom} className="mt-1">{st.rotulo}</StatusTag>
                          </span>
                        </button>
                        <div className="shrink-0 w-11 pt-1">{itens.length > 0 && <MenuAcoes rotulo={`Ações da IS ${is.is}`} itens={itens} />}</div>
                      </li>
                      {livre && onAgendarHorario && g.data && (
                        <li>
                          <button
                            type="button" onClick={() => onAgendarHorario(`${g.data}T${livre}`)}
                            className="w-full min-h-10 flex items-center gap-2 px-2 rounded-lg border border-dashed border-line text-sm font-semibold text-navy hover:bg-thead focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                          >
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
                            <span className="tabular-nums">{livre}</span> livre · Agendar
                          </button>
                        </li>
                      )}
                    </React.Fragment>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {rodape && <div className="px-1">{rodape}</div>}
      </div>
    </>
  );
};
