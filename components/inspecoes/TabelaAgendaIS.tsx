// Ficheiro: components/inspecoes/TabelaAgendaIS.tsx
// Visão Tabela das Inspeções de Saúde no formato "agenda": à esquerda, a data da entrevista (dia do mês
// grande; dia da semana e mês/ano abaixo; hoje em círculo navy); à direita, as IS do dia, uma por linha,
// com hora, status (StatusTag do status efetivo), inspecionado (OM e nº da IS menores), finalidade,
// perito (clique troca o perito) e o menu ⋮. Divisores só entre dias. No topo, o grupo "Não agendadas" (IS sem data de
// entrevista). No celular, cada dia vira um cartão com a data no cabeçalho e as IS em itens compactos.
import React from 'react';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { StatusTag } from '../ui/StatusTag';
import type { InspecaoRecord } from '../../services/firestoreInspecoes';
import type { DiaAgendaIS } from '../../utils/agendaIS';
import { horaDeEntrevista, nomeDiaSemana, nomeMes, type TomStatus } from '../../utils/inspecoes';

export interface TabelaAgendaISProps {
  grupos: DiaAgendaIS<InspecaoRecord>[];
  hoje: string;
  nomeDe: (is: InspecaoRecord) => string;
  omDe: (is: InspecaoRecord) => string | undefined;
  statusDe: (is: InspecaoRecord) => { rotulo: string; tom: TomStatus };
  /** Texto do prazo das abertas não agendadas (ex.: "3/7 dias"). */
  prazoDe: (is: InspecaoRecord) => string | null;
  onAbrir: (is: InspecaoRecord) => void;
  /** Ausente = sem permissão para trocar o perito desta IS. */
  onTrocarPerito?: (is: InspecaoRecord) => void;
  podeTrocarPerito: (is: InspecaoRecord) => boolean;
  itensDe: (is: InspecaoRecord) => ItemMenu[];
}

const maiuscula = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const rotuloDia = (data: string | null): string =>
  data ? `${maiuscula(nomeDiaSemana(data))}, ${Number(data.slice(8, 10))} de ${nomeMes(data)} de ${data.slice(0, 4)}` : 'Não agendadas';

/** Linha menor do inspecionado: sigla da OM e nº da IS (ex.: "EAMPE · 8478471"). */
const linhaOmIS = (om: string | undefined, is: InspecaoRecord): string => [om, String(is.is)].filter(Boolean).join(' · ');

/** Dia do mês grande (hoje em círculo navy). */
const NumeroDia: React.FC<{ data: string; hoje: string; compacto?: boolean }> = ({ data, hoje, compacto }) => {
  const ehHoje = data === hoje;
  const tam = compacto ? 'w-10 h-10 text-h2' : 'w-12 h-12 text-display';
  return (
    <span className={`inline-flex items-center justify-center shrink-0 rounded-full font-heading font-bold leading-none ${tam} ${ehHoje ? 'bg-navy text-white' : 'text-navy'}`}>
      {Number(data.slice(8, 10))}
    </span>
  );
};

const CelulaData: React.FC<{ data: string | null; hoje: string; total: number }> = ({ data, hoje, total }) => {
  if (!data) {
    return (
      <span className="flex flex-col items-start gap-1">
        <span className="material-symbols-outlined text-[28px] text-ink-3" aria-hidden="true">event_busy</span>
        <span className="text-sm font-bold text-navy leading-tight">Não agendadas</span>
        <span className="text-xs text-ink-3">{total} IS</span>
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <NumeroDia data={data} hoje={hoje} />
      <span className={`text-xs font-semibold leading-tight ${data === hoje ? 'text-navy' : 'text-ink'}`}>{maiuscula(nomeDiaSemana(data))}{data === hoje ? ' · hoje' : ''}</span>
      <span className="text-xs text-ink-3 leading-tight">{nomeMes(data)} {data.slice(0, 4)}</span>
    </span>
  );
};

export const TabelaAgendaIS: React.FC<TabelaAgendaISProps> = ({ grupos, hoje, nomeDe, omDe, statusDe, prazoDe, onAbrir, onTrocarPerito, podeTrocarPerito, itensDe }) => {
  const perito = (is: InspecaoRecord, classe = '') => {
    if (onTrocarPerito && podeTrocarPerito(is)) {
      return (
        <button
          type="button" onClick={e => { e.stopPropagation(); onTrocarPerito(is); }} aria-label={`Trocar perito da IS ${is.is}`} title="Trocar perito"
          className={`min-h-[44px] max-w-full truncate font-bold text-navy hover:underline text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${classe}`}
        >
          {is.peritoNome || '—'}
        </button>
      );
    }
    if (!is.peritoNome) return <span className={`text-ink-4 ${classe}`}>—</span>;
    return <span className={`font-bold text-navy truncate ${classe}`}>{is.peritoNome}</span>;
  };

  return (
    <>
      {/* Desktop: tabela com a data em rowgroup à esquerda. */}
      <div className="hidden md:block bg-white rounded-xl border border-line overflow-clip">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">Agenda das Inspeções de Saúde</caption>
          <colgroup>
            <col className="w-36" />
            <col className="w-24" />
            <col className="w-48" />
            <col />
            <col />
            <col className="w-44" />
            <col className="w-14" />
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th scope="col">Data</th><th scope="col">Hora</th><th scope="col">Status</th><th scope="col">Inspecionado</th><th scope="col">Finalidade</th><th scope="col">Perito</th><th scope="col">Ações</th>
            </tr>
          </thead>
          {grupos.map((g, gi) => (
            <tbody key={g.data ?? 'nao-agendadas'} aria-label={rotuloDia(g.data)} className={gi > 0 ? 'border-t border-line' : ''}>
              {g.itens.map((is, i) => {
                const st = statusDe(is);
                const om = omDe(is);
                const nome = nomeDe(is);
                const itens = itensDe(is);
                const primeira = i === 0;
                const ultima = i === g.itens.length - 1;
                const py = `${primeira ? 'pt-3' : 'pt-0.5'} ${ultima ? 'pb-3' : 'pb-0.5'}`;
                return (
                  <tr key={is.id} onClick={() => onAbrir(is)} className="cursor-pointer hover:bg-thead transition-colors">
                    {primeira && (
                      <th scope="rowgroup" rowSpan={g.itens.length} onClick={e => e.stopPropagation()} className="align-top text-left font-normal bg-white cursor-default px-4 py-4">
                        <CelulaData data={g.data} hoje={hoje} total={g.itens.length} />
                      </th>
                    )}
                    <td className={`align-top pr-3 ${py}`}>
                      <button type="button" onClick={e => { e.stopPropagation(); onAbrir(is); }} aria-label={`Abrir IS ${is.is}`} className="min-h-[44px] w-full flex items-center text-left font-bold text-navy tabular-nums leading-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
                        {is.dataEntrevista ? horaDeEntrevista(is.dataEntrevista) : (prazoDe(is) ?? '—')}
                      </button>
                    </td>
                    <td className={`align-top pr-3 ${py}`}>
                      <span className="flex items-center min-h-[44px] min-w-0"><StatusTag tone={st.tom} title={st.rotulo} className="max-w-full truncate">{st.rotulo}</StatusTag></span>
                    </td>
                    <td className={`align-top pr-4 ${py}`}>
                      <span className="flex flex-col justify-center min-h-[44px] min-w-0">
                        <span className="block font-semibold text-ink truncate leading-tight" title={nome}>{nome}</span>
                        <span className="block text-xs text-ink-3 truncate leading-tight">{linhaOmIS(om, is)}</span>
                      </span>
                    </td>
                    <td className={`align-top pr-4 ${py}`}>
                      <span className="flex items-center min-h-[44px] min-w-0">
                        <span className="block text-ink-3 truncate" title={is.finalidade}>{is.finalidade}</span>
                      </span>
                    </td>
                    <td className={`align-top pr-2 ${py}`} onClick={e => e.stopPropagation()}>
                      <span className="flex items-center min-h-[44px] min-w-0">{perito(is)}</span>
                    </td>
                    <td className={`align-top pr-2 text-right ${py}`} onClick={e => e.stopPropagation()}>
                      {itens.length > 0 && <MenuAcoes rotulo={`Ações da IS ${is.is}`} itens={itens} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>

      {/* Celular: um cartão por dia, a data como cabeçalho e as IS em itens compactos. */}
      <div className="md:hidden space-y-3">
        {grupos.map(g => (
          <section key={g.data ?? 'nao-agendadas'} aria-label={rotuloDia(g.data)} className="bg-white rounded-xl border border-line overflow-clip">
            <h2 className="flex items-center gap-3 px-3 py-2 bg-thead border-b border-line">
              {g.data ? (
                <>
                  <NumeroDia data={g.data} hoje={hoje} compacto />
                  <span className="min-w-0 leading-tight">
                    <span className="block text-sm font-bold text-navy">{maiuscula(nomeDiaSemana(g.data))}{g.data === hoje ? ' · hoje' : ''}</span>
                    <span className="block text-xs text-ink-3">{nomeMes(g.data)} {g.data.slice(0, 4)}</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[24px] text-ink-3 w-10 text-center" aria-hidden="true">event_busy</span>
                  <span className="text-sm font-bold text-navy">Não agendadas</span>
                </>
              )}
              <span className="ml-auto text-xs font-bold text-ink-3 bg-white border border-line rounded-full px-2 py-0.5">{g.itens.length}</span>
            </h2>
            <ul className="p-1.5 space-y-0.5">
              {g.itens.map(is => {
                const st = statusDe(is);
                const om = omDe(is);
                const itens = itensDe(is);
                return (
                  <li key={is.id} className="flex items-start rounded-lg hover:bg-thead">
                    <button type="button" onClick={() => onAbrir(is)} className="flex-1 min-w-0 text-left px-2 py-2 min-h-[44px]">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-bold text-navy tabular-nums">{is.dataEntrevista ? horaDeEntrevista(is.dataEntrevista) : (prazoDe(is) ?? '—')}</span>
                        <StatusTag tone={st.tom} title={st.rotulo} className="min-w-0 truncate">{st.rotulo}</StatusTag>
                      </span>
                      <span className="block text-sm font-semibold text-ink truncate">{nomeDe(is)}</span>
                      <span className="block text-xs text-ink-3 truncate">{linhaOmIS(om, is)}</span>
                      <span className="block text-xs text-ink-3 truncate">
                        {is.finalidade}{is.finalidade && is.peritoNome ? ' · ' : null}{is.peritoNome ? <strong className="font-bold text-navy">{is.peritoNome}</strong> : null}
                      </span>
                    </button>
                    <div className="shrink-0 w-12 pt-0.5">{itens.length > 0 && <MenuAcoes rotulo={`Ações da IS ${is.is}`} itens={itens} />}</div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
};
