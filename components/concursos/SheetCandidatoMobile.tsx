// Ficheiro: components/concursos/SheetCandidatoMobile.tsx
// Sheet do candidato no celular: Status/Observações editáveis conforme perfil, triagem, Nº TIS
// somente leitura e as ações cabíveis (termos, reagendar, exames).
import { CidPicker } from '../CidInaptidaoModal';
import { IdmPicker } from '../MotivoIdmModal';
import React from 'react';
import { TriagemSecao } from './Triagem';
import { urlVisualizacao } from '../../services/driveConcursos';
import { SheetArrastavel } from '../ui/SheetArrastavel';
import { CandidatoStatusTag, StatusSelect } from '../ui/statusTheme';
import { STATUS_OPTIONS, isoParaBR } from './compartilhado';
import { type EstadoConcursoDetalhe } from './useConcursoDetalhe';

export const SheetCandidatoMobile: React.FC<{ s: EstadoConcursoDetalhe }> = ({ s }) => {
  const {
    podeGerarTermoBase, gerandoTermoIds, candidatos, motivoModal, setMotivoModal, candidatoModalMobile,
    setCandidatoModalMobile, podeEditar, podeReagendarCandidato, showToast, gerandoCientIds,
    podeGerarCientificacao, gerarTermoCientificacao, podeSolicitarBase, podeEnviarExames,
    gerandoSolicitacaoIds, setEventosAlvo, statusPermiteSolicitacao, ehAdmin, ehMpi, mostrarSecaoTriagem,
    setTriagemAlvo, temDocumentoGerado, destacarStatus, mostrarMenuAcoes, handleEnviarExames,
    handleGerarSolicitacao, handleVerSolicitacao, handleEditarIS, handleLimparIS, handleGerarTermo,
    handleStatusChange, handleMotivoSelecionado, handleMotivoFechado, handleObservacoesBlur,
    handleOpenReagendamento,
  } = s;
  return (
    <>
      {candidatoModalMobile && (() => {
        const c = candidatos.find(x => x.id === candidatoModalMobile.id) || candidatoModalMobile;
        const editavel = podeEditar && !c.finalizado;
        const podeGerarTermo = !c.termoRecursoUrl && c.status === 'INAPTO' && podeGerarTermoBase;
        // CID (Inapto) / exames da IDM: no mobile a escolha acontece dentro do próprio sheet.
        const motivoNoSheet = motivoModal && motivoModal.candidato.id === c.id ? motivoModal : null;
        const sheetTravado = !!motivoNoSheet?.obrigatorio;
        const fecharSheet = () => {
          if (sheetTravado) return;
          setMotivoModal(null);
          setCandidatoModalMobile(null);
        };
        return (
          <div className="md:hidden fixed inset-0 z-dialog flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/50 animate-backdrop-in" onClick={fecharSheet} />
            <SheetArrastavel onClose={fecharSheet} ativo={!sheetTravado} className="relative bg-canvas rounded-t-3xl shadow-2xl flex flex-col animate-sheet-up" style={{ maxHeight: '92dvh' }}>
              <div className="pt-2.5 pb-1 flex justify-center shrink-0" onClick={fecharSheet}>
                <span className="w-10 h-1.5 rounded-full bg-ink-5" />
              </div>
              <div className="px-5 py-3 flex items-center justify-between gap-3 shrink-0 border-b border-line/70">
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-base text-navy truncate">{c.nome}</h3>
                  <p className="text-xs text-ink-3 font-mono truncate">{c.id}{c.dataAgendamento ? ` · ${isoParaBR(c.dataAgendamento)}` : ''}</p>
                </div>
                {!sheetTravado && (
                  <button onClick={fecharSheet} aria-label="Fechar" className="text-ink-3 hover:text-navy p-1.5 rounded-lg hover:bg-line/60 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-[24px]">close</span>
                  </button>
                )}
              </div>

              {motivoNoSheet ? (
                <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-4">
                  {!motivoNoSheet.obrigatorio && (
                    <button type="button" onClick={handleMotivoFechado} className="flex items-center gap-1 text-sm font-bold text-navy">
                      <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                      Voltar
                    </button>
                  )}
                  {motivoNoSheet.tipo === 'CID' ? (
                    <CidPicker candidatoNome={c.nome} onSelect={handleMotivoSelecionado} onClose={handleMotivoFechado} />
                  ) : (
                    <IdmPicker candidatoNome={c.nome} observacoesAtuais={c.observacoes || ''} onConfirm={handleMotivoSelecionado} />
                  )}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
                {c.finalizado && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-green-700" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <p className="text-xs font-bold text-green-800">IS finalizada — os dados não podem mais ser alterados.</p>
                  </div>
                )}

                {mostrarSecaoTriagem(c) && c.triagem && (
                  <TriagemSecao
                    triagem={c.triagem} onCopiado={showToast}
                    onEditar={ehMpi ? () => { setCandidatoModalMobile(null); setTriagemAlvo(c); } : undefined}
                  />
                )}

                <div>
                  <label className="block text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5">Status</label>
                  {editavel ? (
                    <StatusSelect value={c.status || ''} options={STATUS_OPTIONS} onChange={v => handleStatusChange(c, v)} className="w-full" destaque={destacarStatus(c)} />
                  ) : (
                    <div>{<CandidatoStatusTag status={c.status} />}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5">Observações</label>
                  {editavel && (c.status === 'INAPTO' || c.status === 'INSUF DOCUMENTAL') ? (
                    <button type="button" onClick={() => setMotivoModal({ candidato: c, tipo: c.status === 'INAPTO' ? 'CID' : 'IDM', obrigatorio: false })} className="w-full text-left px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-ink bg-white">
                      {c.observacoes || <span className="text-ink-3">{c.status === 'INAPTO' ? 'Selecionar CID...' : 'Selecionar motivo...'}</span>}
                    </button>
                  ) : editavel ? (
                    <textarea
                      key={`obs-${c.id}-${c.observacoes}`}
                      defaultValue={c.observacoes}
                      onBlur={e => handleObservacoesBlur(c, e.target.value)}
                      rows={5}
                      placeholder="Sem observações."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-ink-5 text-sm text-ink focus:outline-none focus:border-navy resize-none"
                    />
                  ) : (
                    <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{c.observacoes || 'Sem observações.'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-3 uppercase tracking-wider mb-1.5">Nº TIS</label>
                  {/* Nunca editável no mobile — só é lançado na visão desktop. */}
                  <p className="text-sm font-semibold text-ink">{c.numTIS || '-'}</p>
                </div>

                {(podeGerarTermo || c.termoRecursoUrl || c.termoCientificacaoUrl || gerandoCientIds.has(c.id) || podeGerarCientificacao(c) || mostrarMenuAcoes(c) || podeReagendarCandidato(c)) && (
                  <div className="pt-2 space-y-2">
                    {c.termoRecursoUrl ? (
                      <a href={urlVisualizacao(c.termoRecursoUrl)} target="_blank" rel="noopener noreferrer" className="w-full px-4 py-3 bg-green-50 text-green-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                        <span>Visualizar Termo de Recurso e Cientificação</span>
                      </a>
                    ) : podeGerarTermo ? (
                      <button type="button" disabled={gerandoTermoIds.has(c.id)} onClick={() => handleGerarTermo(c.id, c.nome)} className="w-full px-4 py-3 bg-wine-50 text-wine-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80" aria-busy={gerandoTermoIds.has(c.id)}>
                        <span className={`material-symbols-outlined text-[20px] ${gerandoTermoIds.has(c.id) ? 'animate-spin' : ''}`}>{gerandoTermoIds.has(c.id) ? 'progress_activity' : 'gavel'}</span>
                        <span>{gerandoTermoIds.has(c.id) ? 'Gerando termo...' : 'Gerar Termo de Recurso'}</span>
                      </button>
                    ) : null}
                    {c.termoCientificacaoUrl ? (
                      <a href={urlVisualizacao(c.termoCientificacaoUrl)} target="_blank" rel="noopener noreferrer" className="w-full px-4 py-3 bg-green-50 text-green-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                        <span>Visualizar Termo de Cientificação</span>
                      </a>
                    ) : gerandoCientIds.has(c.id) ? (
                      <div className="w-full px-4 py-3 bg-wine-50 text-wine-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2 opacity-80" aria-busy="true">
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        <span>Gerando termo de cientificação...</span>
                      </div>
                    ) : podeGerarCientificacao(c) ? (
                      <button type="button" onClick={() => gerarTermoCientificacao(c.id, c.nome, c.status, false)} className="w-full px-4 py-3 bg-wine-50 text-wine-800 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                        <span>Gerar Termo de Cientificação</span>
                      </button>
                    ) : null}
                    {podeSolicitarBase && statusPermiteSolicitacao(c) && !gerandoSolicitacaoIds.has(c.id) && (['parecer', 'exames'] as const).map(tipo => {
                      return (
                        <button key={tipo} type="button" onClick={() => { setCandidatoModalMobile(null); handleGerarSolicitacao(tipo, c); }} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                          <span className="material-symbols-outlined text-[20px]">{tipo === 'parecer' ? 'stethoscope' : 'lab_research'}</span>
                          <span>{tipo === 'parecer' ? 'Gerar Parecer' : 'Gerar Exames'}</span>
                        </button>
                      );
                    })}
                    {[
                      ...c.solicitacoesParecer.map((d, i) => ({ tipo: 'parecer' as const, d, chave: `p${i}` })),
                      ...c.solicitacoesExames.map((d, i) => ({ tipo: 'exames' as const, d, chave: `e${i}` })),
                    ].map(({ tipo, d, chave }) => (
                      <button key={chave} type="button" onClick={() => handleVerSolicitacao(d)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-green-50 text-green-800">
                        <span className="material-symbols-outlined text-[20px]">{tipo === 'parecer' ? 'clinical_notes' : 'lab_panel'}</span>
                        <span className="min-w-0 truncate">{tipo === 'parecer' ? 'Ver Parecer' : 'Ver Exames'} · {d.rotulo}</span>
                      </button>
                    ))}
                    {/* Ler os exames transcritos é só no desktop (a tela cheia precisa da largura). */}
                    {podeEnviarExames && (
                      <button type="button" onClick={() => handleEnviarExames(c)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                        <span className="material-symbols-outlined text-[20px]">lab_profile</span>
                        <span>Enviar Exames (PDF)</span>
                      </button>
                    )}
                    {ehAdmin && (
                      <button type="button" onClick={() => { setCandidatoModalMobile(null); setEventosAlvo({ id: c.id, nome: c.nome }); }} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                        <span className="material-symbols-outlined text-[20px]">history</span>
                        <span>Registro de Eventos</span>
                      </button>
                    )}
                    {ehAdmin && c.finalizado && (
                      <button type="button" onClick={() => handleEditarIS(c)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-white text-navy border border-line">
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                        <span>Editar</span>
                      </button>
                    )}
                    {ehAdmin && temDocumentoGerado(c) && (
                      <button type="button" onClick={() => handleLimparIS(c)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-wine-50 text-wine-700">
                        <span className="material-symbols-outlined text-[20px]">ink_eraser</span>
                        <span>Limpar</span>
                      </button>
                    )}
                    {podeReagendarCandidato(c) && (
                      <button type="button" onClick={() => { setCandidatoModalMobile(null); handleOpenReagendamento(c); }} className="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">event_repeat</span>
                        <span>Reagendar</span>
                      </button>
                    )}
                  </div>
                )}
                </div>
              )}
            </SheetArrastavel>
          </div>
        );
      })()}
    </>
  );
};
