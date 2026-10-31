// Ficheiro: components/concursos/ListaCandidatosMobile.tsx
// Lista de candidatos no celular (sem tabela), agrupada por data; o toque abre o SheetCandidatoMobile.
import React from 'react';
import { TriagemBotao } from './Triagem';
import { CandidatoStatusTag } from '../ui/statusTheme';
import { type EstadoConcursoDetalhe } from './useConcursoDetalhe';

export const ListaCandidatosMobile: React.FC<{ s: EstadoConcursoDetalhe }> = ({ s }) => {
  const {
    setCandidatoModalMobile, openDateGroups, mostrarBotaoTriagem, setTriagemAlvo, filtrosAtivos,
    gruposPorData, resumoDoGrupo, destaqueDaLinha, toggleDateGroup,
  } = s;
  return (
    <div className="md:hidden divide-y divide-line">
                {gruposPorData.map(grupo => {
                  const grupoAccordion = grupo.finalizado && !filtrosAtivos;
                  const expandidoGrupo = !grupoAccordion || openDateGroups.has(grupo.dataBR);
                  return (
                    <div key={grupo.dataBR}>
                      <button
                        type="button"
                        disabled={!grupoAccordion}
                        onClick={grupoAccordion ? () => toggleDateGroup(grupo.dataBR) : undefined}
                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-paper/60 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-navy">{grupo.dataBR}</span>
                          <span className="block text-xs text-ink-3">{grupo.itens.length} candidato{grupo.itens.length === 1 ? '' : 's'}{resumoDoGrupo(grupo.itens) ? ` · ${resumoDoGrupo(grupo.itens)}` : ''}</span>
                        </span>
                        {grupoAccordion && (
                          <span className={`material-symbols-outlined text-[20px] text-ink-3 ml-auto transition-transform duration-200 ${expandidoGrupo ? 'rotate-180' : ''}`}>expand_more</span>
                        )}
                      </button>
                      {expandidoGrupo && grupo.itens.map(c => (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setCandidatoModalMobile(c)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCandidatoModalMobile(c); } }}
                          className={`w-full flex items-center gap-3 px-4 py-3 border-t border-line text-left active:bg-paper transition-colors cursor-pointer ${destaqueDaLinha(c)}`}
                        >
                          <span className="w-6 h-6 shrink-0 flex items-center justify-center">
                            {c.finalizado ? (
                              <span className="material-symbols-outlined text-[20px] text-green-700" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            ) : c.status === 'Reagendado' ? (
                              <span className="material-symbols-outlined text-[20px] text-ink-3">event_repeat</span>
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold text-ink truncate">{c.nome}</span>
                              {mostrarBotaoTriagem(c) && <span className="shrink-0"><TriagemBotao triagem={c.triagem} onTriar={() => setTriagemAlvo(c)} onVer={() => setCandidatoModalMobile(c)} /></span>}
                            </span>
                            {c.observacoes && (
                              <span className="block text-xs text-ink-3 truncate">{c.observacoes}</span>
                            )}
                          </span>
                          <span className="shrink-0">{c.status ? <CandidatoStatusTag status={c.status} /> : null}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
  );
};
