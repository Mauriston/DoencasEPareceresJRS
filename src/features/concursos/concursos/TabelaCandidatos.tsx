// Ficheiro: components/concursos/TabelaCandidatos.tsx
// Planilha de candidatos no desktop: uma tabela agrupada por data, com edição inline de Status,
// Observações e Nº TIS, chips de triagem e ações por linha (estado em useConcursoDetalhe).
import React from 'react';
import { TriagemBotao } from './Triagem';
import { abrirPdf } from '@/services/driveConcursos';
import { CandidatoStatusTag, StatusSelect } from '@/components/ui/statusTheme';
import { STATUS_OPTIONS } from './compartilhado';
import { type EstadoConcursoDetalhe } from './useConcursoDetalhe';

export const TabelaCandidatos: React.FC<{ s: EstadoConcursoDetalhe }> = ({ s }) => {
  const {
    embutido, podeGerarTermoBase, gerandoTermoIds, setMotivoModal, numTisResetKey, openDateGroups,
    podeEditar, podeReagendarCandidato, statusTemLaudo, gerandoCientIds, podeGerarCientificacao,
    gerarTermoCientificacao, gerandoSolicitacaoIds, menuAcoes, setDetalheCandidatoId, abrirDetalheDaLinha,
    qtdSolicitacoes, mostrarBotaoTriagem, setTriagemAlvo, destacarStatus, mostrarMenuAcoes, handleVerExames,
    abrirMenuAcoes, estadoSalvar, handleGerarTermo, handleStatusChange, handleObservacoesBlur,
    handleNumTisBlur, handleOpenReagendamento, handleCopiarNomeCandidato, filtrosAtivos, gruposPorData,
    resumoDoGrupo, destaqueDaLinha, toggleDateGroup,
  } = s;
  return (
    <div className="hidden md:block">
                <table className="w-full text-left border-collapse table-fixed">
                  <colgroup>
                    <col style={{ width: '56px' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '20%' }} />
                    <col />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '176px' }} />
                  </colgroup>
                  <thead>
                    {/* Cabeçalho de colunas fixo logo abaixo da toolbar. */}
                    <tr className="text-xs font-bold text-navy uppercase tracking-wider">
                      {[
                        { rotulo: 'Candidato', colSpan: 2, alinhamento: '' },
                        { rotulo: 'Status', colSpan: 1, alinhamento: '' },
                        { rotulo: 'Observações', colSpan: 1, alinhamento: '' },
                        { rotulo: 'Nº TIS', colSpan: 1, alinhamento: '' },
                        { rotulo: 'Ações', colSpan: 1, alinhamento: 'text-right' },
                      ].map(col => (
                        <th key={col.rotulo} colSpan={col.colSpan} className={`${embutido ? '' : 'md:sticky md:top-[var(--toolbar-h)] '}z-10 bg-thead border-b border-line py-3 px-4 ${col.alinhamento}`}>{col.rotulo}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-sm">
                    {gruposPorData.map(grupo => {
                      // Um grupo só vira accordion (recolhido por padrão) quando
                      // todas as IS do dia já estão finalizadas — e isso é
                      // desprezado enquanto houver algum filtro ativo.
                      const grupoAccordion = grupo.finalizado && !filtrosAtivos;
                      const expandidoGrupo = !grupoAccordion || openDateGroups.has(grupo.dataBR);
                      return (
                        <React.Fragment key={grupo.dataBR}>
                          <tr
                            className={`bg-paper/60 ${grupoAccordion ? 'cursor-pointer select-none hover:bg-thead/70' : ''}`}
                            onClick={grupoAccordion ? () => toggleDateGroup(grupo.dataBR) : undefined}
                          >
                            <td colSpan={6} className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-navy">{grupo.dataBR}</span>
                                <span className="text-xs text-ink-3">{grupo.itens.length} candidato{grupo.itens.length === 1 ? '' : 's'}{resumoDoGrupo(grupo.itens) ? ` · ${resumoDoGrupo(grupo.itens)}` : ''}</span>
                                {grupoAccordion && (
                                  <span className={`material-symbols-outlined text-[20px] text-ink-3 ml-auto transition-transform duration-200 ${expandidoGrupo ? 'rotate-180' : ''}`}>expand_more</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandidoGrupo && grupo.itens.map((c, ordem) => {
                            const editavel = podeEditar && !c.finalizado;
                            const numTisHabilitado = editavel && statusTemLaudo(c.status);
                            return (
                              <tr key={c.id} onClick={e => abrirDetalheDaLinha(e, c.id)} className={`hover:bg-thead transition-colors cursor-pointer ${destaqueDaLinha(c)}`}>
                                <td className="py-3.5 pl-4 pr-0">
                                  <span className="flex items-center gap-1">
                                    <span className="text-xs font-semibold text-ink-3 w-5 text-right" title="Ordem no dia">{ordem + 1}</span>
                                    {c.finalizado && (
                                      <span className="material-symbols-outlined text-[20px] text-green-700" style={{ fontVariationSettings: "'FILL' 1" }} aria-label="Finalizado">check_circle</span>
                                    )}
                                  </span>
                                </td>
                                <td className="py-3.5 pl-2 pr-4">
                                  <p className="font-semibold text-ink flex items-center gap-2 flex-wrap">
                                    <button type="button" onClick={() => setDetalheCandidatoId(c.id)} className="text-left" title="Ver detalhes da IS">{c.nome}</button>
                                  </p>
                                  <p className="text-xs font-mono text-ink-3 flex items-center gap-2">
                                    <span>{c.id}</span>
                                    <button type="button" onClick={() => handleCopiarNomeCandidato(c.nome)} aria-label={`Copiar nome de ${c.nome}`} title="Copiar nome" className="inline-flex items-center justify-center w-6 h-6 rounded text-navy hover:bg-thead">
                                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">content_copy</span>
                                    </button>
                                    {mostrarBotaoTriagem(c) && <TriagemBotao triagem={c.triagem} onTriar={() => setTriagemAlvo(c)} onVer={() => setDetalheCandidatoId(c.id)} />}
                                    {estadoSalvar[c.id] && (
                                      <span role="status" className={`font-sans font-semibold ${estadoSalvar[c.id] === 'falhou' ? 'text-wine' : 'text-ink-3'}`}>
                                        {estadoSalvar[c.id] === 'salvando' ? 'Salvando…' : estadoSalvar[c.id] === 'salvo' ? 'Salvo' : 'Falha ao salvar'}
                                      </span>
                                    )}
                                  </p>
                                </td>
                                <td className="py-3.5 px-4">
                                  {editavel ? (
                                    <StatusSelect value={c.status || ''} options={STATUS_OPTIONS} onChange={v => handleStatusChange(c, v)} className="w-full" destaque={destacarStatus(c)} />
                                  ) : <CandidatoStatusTag status={c.status} />}
                                </td>
                                <td className="py-3.5 px-4 text-ink">
                                  {editavel && (c.status === 'INAPTO' || c.status === 'INSUF DOCUMENTAL') ? (
                                    <button type="button" onClick={() => setMotivoModal({ candidato: c, tipo: c.status === 'INAPTO' ? 'CID' : 'IDM', obrigatorio: false })} title={c.status === 'INAPTO' ? 'Clique para escolher/trocar o CID da inaptidão' : 'Clique para escolher/trocar o motivo da IDM'} className="w-full text-left truncate px-2 py-1.5 text-sm rounded-lg border border-line bg-paper hover:bg-white hover:border-navy cursor-pointer transition-colors">
                                      {c.observacoes || <span className="text-ink-3">{c.status === 'INAPTO' ? 'Selecionar CID...' : 'Selecionar motivo...'}</span>}
                                    </button>
                                  ) : editavel ? (
                                    <input key={`obs-${c.id}-${c.observacoes}`} type="text" defaultValue={c.observacoes} onBlur={e => handleObservacoesBlur(c, e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-lg border border-line bg-paper focus:outline-none focus:border-navy focus:bg-white" placeholder="-" />
                                  ) : <span className="truncate block" title={c.observacoes}>{c.observacoes || '-'}</span>}
                                </td>
                                <td className="py-3.5 px-4 text-ink">
                                  {numTisHabilitado ? (
                                    <input key={`tis-${c.id}-${numTisResetKey}`} type="text" defaultValue={c.numTIS} onBlur={e => handleNumTisBlur(c, e.target.value)} className="w-full px-2 py-1.5 text-sm rounded-lg border border-line bg-paper focus:outline-none focus:border-navy focus:bg-white" placeholder="-" />
                                  ) : editavel ? (
                                    c.numTIS ? <span className="block text-sm text-ink-2">{c.numTIS}</span> : null
                                  ) : (c.numTIS || '-')}
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  {c.termoRecursoUrl ? (
                                    <button type="button" onClick={() => abrirPdf(c.termoRecursoUrl!)} className="p-2 text-green-800 bg-green-50 hover:bg-green-700 hover:text-white rounded-xl transition-colors cursor-pointer inline-flex" title="Visualizar Termo de Recurso e Cientificação">
                                      <span className="material-symbols-outlined text-[22px]">description</span>
                                    </button>
                                  ) : c.status === 'INAPTO' && podeGerarTermoBase ? (
                                    <button type="button" disabled={gerandoTermoIds.has(c.id)} onClick={() => handleGerarTermo(c.id, c.nome)} className="p-2 text-wine-800 bg-wine-50 hover:bg-wine-700 hover:text-white rounded-xl transition-colors cursor-pointer disabled:cursor-wait disabled:hover:bg-wine-50 disabled:hover:text-wine-800" title={gerandoTermoIds.has(c.id) ? 'Gerando o Termo de Recurso...' : 'Gerar Termo de Recurso'} aria-busy={gerandoTermoIds.has(c.id)}>
                                      <span className={`material-symbols-outlined text-[22px] ${gerandoTermoIds.has(c.id) ? 'animate-spin' : ''}`}>{gerandoTermoIds.has(c.id) ? 'progress_activity' : 'gavel'}</span>
                                    </button>
                                  ) : null}

                                  {c.termoCientificacaoUrl ? (
                                    <button type="button" onClick={() => abrirPdf(c.termoCientificacaoUrl)} className="p-2 ml-1 text-green-800 bg-green-50 hover:bg-green-700 hover:text-white rounded-xl transition-colors cursor-pointer inline-flex" title="Visualizar Termo de Cientificação de Resultado">
                                      <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                                    </button>
                                  ) : gerandoCientIds.has(c.id) ? (
                                    <span className="p-2 ml-1 text-wine-800 bg-wine-50 rounded-xl inline-flex cursor-wait" title="Gerando o Termo de Cientificação..." aria-busy="true">
                                      <span className="material-symbols-outlined text-[22px] animate-spin">progress_activity</span>
                                    </span>
                                  ) : podeGerarCientificacao(c) ? (
                                    <button type="button" onClick={() => gerarTermoCientificacao(c.id, c.nome, c.status, true)} className="p-2 ml-1 text-wine-800 bg-wine-50 hover:bg-wine-700 hover:text-white rounded-xl transition-colors cursor-pointer" title="Gerar Termo de Cientificação de Resultado">
                                      <span className="material-symbols-outlined text-[22px]">assignment_turned_in</span>
                                    </button>
                                  ) : null}

                                  {podeReagendarCandidato(c) && (
                                    <button type="button" onClick={() => handleOpenReagendamento(c)} className="p-2 ml-1 text-green-700 bg-green-50 hover:bg-green-700 hover:text-white rounded-xl transition-colors cursor-pointer" title="Reagendar">
                                      <span className="material-symbols-outlined text-[22px]">event_repeat</span>
                                    </button>
                                  )}

                                  {/* Exames entregues pelo candidato: só aparece depois do envio, com o badge da quantidade transcrita. */}
                                  {c.examesQtd > 0 && (
                                    <button type="button" onClick={() => handleVerExames(c)} className="relative p-2 ml-1 text-blue-700 bg-blue-50 hover:bg-blue-700 hover:text-white rounded-xl transition-colors cursor-pointer inline-flex" title={`Ver os ${c.examesQtd} exame(s) transcrito(s)`}>
                                      <span className="material-symbols-outlined text-[22px]">lab_profile</span>
                                      <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-700 text-white text-xs font-bold leading-none flex items-center justify-center ring-2 ring-white">{c.examesQtd}</span>
                                    </button>
                                  )}

                                  {mostrarMenuAcoes(c) && (
                                    <button type="button" onClick={e => abrirMenuAcoes(e, c.id)} className="relative p-2 ml-1 text-ink bg-thead hover:bg-navy hover:text-white rounded-xl transition-colors cursor-pointer" title={qtdSolicitacoes(c) ? `Mais ações — ${qtdSolicitacoes(c)} documento(s) gerado(s)` : 'Mais ações'} aria-haspopup="menu" aria-expanded={menuAcoes?.id === c.id}>
                                      <span className={`material-symbols-outlined text-[22px] ${gerandoSolicitacaoIds.has(c.id) ? 'animate-spin' : ''}`}>{gerandoSolicitacaoIds.has(c.id) ? 'progress_activity' : 'more_vert'}</span>
                                      {qtdSolicitacoes(c) > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-green-700 text-white text-xs font-bold leading-none flex items-center justify-center ring-2 ring-white">{qtdSolicitacoes(c)}</span>
                                      )}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
  );
};
