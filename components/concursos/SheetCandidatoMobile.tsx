// Ficheiro: components/concursos/SheetCandidatoMobile.tsx
// Sheet do candidato no celular: Status/Observações editáveis conforme perfil, triagem, Nº TIS
// somente leitura, os documentos gerados e as ações cabíveis (termos, reagendar, exames) num FAB menu.
import { CidPicker } from '../CidInaptidaoModal';
import { IdmPicker } from '../MotivoIdmModal';
import React from 'react';
import { TriagemSecao } from './Triagem';
import { urlVisualizacao } from '../../services/driveConcursos';
import { SheetArrastavel } from '../ui/SheetArrastavel';
import { AcoesRodape, type AcaoRodape } from '../ui/AcoesRodape';
import { CandidatoStatusTag, StatusSelect } from '../ui/statusTheme';
import { STATUS_OPTIONS, isoParaBR } from './compartilhado';
import { type EstadoConcursoDetalhe } from './useConcursoDetalhe';

export const SheetCandidatoMobile: React.FC<{ s: EstadoConcursoDetalhe }> = ({ s }) => {
  const {
    podeGerarTermoBase, gerandoTermoIds, candidatos, motivoModal, setMotivoModal, candidatoModalMobile,
    setCandidatoModalMobile, podeEditar, podeReagendarCandidato, showToast, gerandoCientIds,
    podeGerarCientificacao, gerarTermoCientificacao, podeSolicitarBase, podeEnviarExames,
    gerandoSolicitacaoIds, setEventosAlvo, statusPermiteSolicitacao, ehAdmin, ehMpi, mostrarSecaoTriagem,
    setTriagemAlvo, temDocumentoGerado, destacarStatus, handleEnviarExames,
    handleGerarSolicitacao, handleVerSolicitacao, handleEditarIS, handleLimparIS, handleGerarTermo,
    handleStatusChange, handleMotivoSelecionado, handleMotivoFechado, handleObservacoesBlur,
    handleOpenReagendamento,
  } = s;
  // Ações cabíveis ao candidato, na ordem de antes; no celular viram o FAB menu do sheet.
  const acoesDoCandidato = (c: typeof candidatos[number], podeGerarTermo: boolean): AcaoRodape[] => {
    const acoes: AcaoRodape[] = [];
    if (!c.termoRecursoUrl && podeGerarTermo) {
      const gerando = gerandoTermoIds.has(c.id);
      acoes.push({ id: 'termo-recurso', rotulo: gerando ? 'Gerando termo...' : 'Gerar Termo de Recurso', icone: 'gavel', loading: gerando, onClick: () => handleGerarTermo(c.id, c.nome) });
    }
    if (!c.termoCientificacaoUrl) {
      if (gerandoCientIds.has(c.id)) acoes.push({ id: 'termo-cient', rotulo: 'Gerando termo de cientificação...', icone: 'assignment_turned_in', loading: true, onClick: () => {} });
      else if (podeGerarCientificacao(c)) acoes.push({ id: 'termo-cient', rotulo: 'Gerar Termo de Cientificação', icone: 'assignment_turned_in', onClick: () => gerarTermoCientificacao(c.id, c.nome, c.status, false) });
    }
    if (podeSolicitarBase && statusPermiteSolicitacao(c) && !gerandoSolicitacaoIds.has(c.id)) {
      acoes.push({ id: 'gerar-parecer', rotulo: 'Gerar Parecer', icone: 'stethoscope', variante: 'secondary', onClick: () => { setCandidatoModalMobile(null); handleGerarSolicitacao('parecer', c); } });
      acoes.push({ id: 'gerar-exames', rotulo: 'Gerar Exames', icone: 'lab_research', variante: 'secondary', onClick: () => { setCandidatoModalMobile(null); handleGerarSolicitacao('exames', c); } });
    }
    // Ler os exames transcritos é só no desktop (a tela cheia precisa da largura).
    if (podeEnviarExames) acoes.push({ id: 'enviar-exames', rotulo: 'Enviar Exames (PDF)', icone: 'lab_profile', variante: 'secondary', onClick: () => handleEnviarExames(c) });
    if (ehAdmin) acoes.push({ id: 'eventos', rotulo: 'Registro de Eventos', icone: 'history', variante: 'secondary', onClick: () => { setCandidatoModalMobile(null); setEventosAlvo({ id: c.id, nome: c.nome }); } });
    if (ehAdmin && c.finalizado) acoes.push({ id: 'editar', rotulo: 'Editar', icone: 'edit', variante: 'secondary', onClick: () => handleEditarIS(c) });
    if (ehAdmin && temDocumentoGerado(c)) acoes.push({ id: 'limpar', rotulo: 'Limpar', icone: 'ink_eraser', variante: 'destructive', onClick: () => handleLimparIS(c) });
    if (podeReagendarCandidato(c)) acoes.push({ id: 'reagendar', rotulo: 'Reagendar', icone: 'event_repeat', variante: 'secondary', onClick: () => { setCandidatoModalMobile(null); handleOpenReagendamento(c); } });
    return acoes;
  };

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
                <div data-sheet-corpo="" className="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
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

                {/* Documentos já gerados: abrem numa nova janela (as ações ficam no FAB). */}
                {(c.termoRecursoUrl || c.termoCientificacaoUrl || c.solicitacoesParecer.length > 0 || c.solicitacoesExames.length > 0) && (
                  <div className="pt-2 space-y-2">
                    {c.termoRecursoUrl && (
                      <a href={urlVisualizacao(c.termoRecursoUrl)} target="_blank" rel="noopener noreferrer" className="w-full px-4 py-3 bg-green-50 text-green-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">description</span>
                        <span>Visualizar Termo de Recurso e Cientificação</span>
                      </a>
                    )}
                    {c.termoCientificacaoUrl && (
                      <a href={urlVisualizacao(c.termoCientificacaoUrl)} target="_blank" rel="noopener noreferrer" className="w-full px-4 py-3 bg-green-50 text-green-800 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                        <span>Visualizar Termo de Cientificação</span>
                      </a>
                    )}
                    {[
                      ...c.solicitacoesParecer.map((d, i) => ({ tipo: 'parecer' as const, d, chave: `p${i}` })),
                      ...c.solicitacoesExames.map((d, i) => ({ tipo: 'exames' as const, d, chave: `e${i}` })),
                    ].map(({ tipo, d, chave }) => (
                      <button key={chave} type="button" onClick={() => handleVerSolicitacao(d)} className="w-full px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-green-50 text-green-800">
                        <span className="material-symbols-outlined text-[20px]">{tipo === 'parecer' ? 'clinical_notes' : 'lab_panel'}</span>
                        <span className="min-w-0 truncate">{tipo === 'parecer' ? 'Ver Parecer' : 'Ver Exames'} · {d.rotulo}</span>
                      </button>
                    ))}
                  </div>
                )}
                </div>
              )}
              {!motivoNoSheet && <AcoesRodape acoes={acoesDoCandidato(c, podeGerarTermo)} />}
            </SheetArrastavel>
          </div>
        );
      })()}
    </>
  );
};
