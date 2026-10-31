// Ficheiro: components/concursos/ConcursoDetalhe.tsx
// Planilha de candidatos de um concurso (também embutida nas páginas do dia e de IS atrasadas).
import { CidInaptidaoModal } from '../CidInaptidaoModal';
import { MotivoIdmModal } from '../MotivoIdmModal';
import { ResponsavelTermoModal } from '../ResponsavelTermoModal';
import React, { useEffect, useState } from 'react';
import { Container, PageHeader } from '../ui/Page';
import { SolicitarParecerModal, SolicitarExamesModal } from '../SolicitacaoModais';
import { CandidatoDetalhe } from './CandidatoDetalhe';
import { TriagemFormulario, TriagemSecao } from './Triagem';
import { EnviarExamesModal, ExamesTranscritosModal } from './ExamesCandidato';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { listarEventos, type EventoIS } from '../../services/auditoriaIS';
import { EmptyState } from '../ui/EmptyState';
import { ConfirmDialog } from '../ui/Dialog';
import { Toast } from '../ui/Toast';
import { CandidatoStatusTag, ConcursoStatusTag } from '../ui/statusTheme';
import { CalendarioAgendamento } from './compartilhado';
import { ModalDefinirPeriodoAgendamento } from './ModaisConcurso';
import { useConcursoDetalhe, type ConcursoDetalheProps } from './useConcursoDetalhe';
import { TabelaCandidatos } from './TabelaCandidatos';
import { ListaCandidatosMobile } from './ListaCandidatosMobile';
import { SheetCandidatoMobile } from './SheetCandidatoMobile';
import { MenuAcoesCandidato } from './MenuAcoesCandidato';

export { type ConcursoDetalheProps };

// =========================================================================
// REGISTRO DE EVENTOS (log de auditoria da IS) — exclusivo do Admin
// =========================================================================

export const formatarDataHora = (d: Date | null) =>
  d ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

export const ModalRegistroEventos: React.FC<{ concursoId: string; candidato: { id: string; nome: string }; onClose: () => void }> = ({ concursoId, candidato, onClose }) => {
  const [eventos, setEventos] = useState<EventoIS[] | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    listarEventos(concursoId, candidato.id)
      .then(l => { if (ativo) setEventos(l); })
      .catch(() => { if (ativo) setErro('Não foi possível carregar o registro de eventos.'); });
    return () => { ativo = false; };
  }, [concursoId, candidato.id]);

  return (
    <Dialog title={`Registro de Eventos — ${candidato.nome}`} icon="history" size="lg" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}>
      <p className="text-xs text-ink-3 mb-3">Matrícula {candidato.id}. Cada ação da IS é registrada com a data, a hora e o usuário.</p>
      {erro ? (
        <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>
      ) : eventos === null ? (
        <p className="py-6 text-center text-ink-3" role="status">Carregando…</p>
      ) : eventos.length === 0 ? (
        <EmptyState icon="history" title="Nenhum evento registrado" description="As ações feitas a partir de agora nesta IS aparecerão aqui." />
      ) : (
        <ul className="divide-y divide-line border border-line rounded-lg">
          {eventos.map(ev => (
            <li key={ev.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-sm font-bold text-navy">{ev.acao}</span>
                <span className="text-xs text-ink-3 whitespace-nowrap">{formatarDataHora(ev.em)}</span>
              </div>
              {ev.detalhe && <p className="text-sm text-ink-2 break-words mt-0.5">{ev.detalhe}</p>}
              <p className="text-xs text-ink-3 mt-0.5">por {ev.usuario || ev.nome || '—'}</p>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
};

export const ConcursoDetalhe: React.FC<ConcursoDetalheProps> = (props) => {
  const s = useConcursoDetalhe(props);
  const {
    concursoId, embutido, nav, perfil, podeAbrirEncerrar, responsavelModal, setResponsavelModal,
    showDefinirPeriodoModal, setShowDefinirPeriodoModal, concurso, candidatos, setCandidatos, loading,
    loadError, search, setSearch, mostrarSugestoes, setMostrarSugestoes, statusKpiFilter, dateFilterMode,
    setDateFilterMode, setDateFilterCustom, showDateMenu, setShowDateMenu, showDateCalendar,
    setShowDateCalendar, toastMessage, confirmDialog, setConfirmDialog, motivoModal, datasAgendamento,
    loadingDatasAgendamento, reagendandoCandidato, setReagendandoCandidato, confirmandoReagendamento,
    candidatoModalMobile, isDesktop, scrollContainerRef, mostrarBotaoTopo, toolbarRef, toolbarAltura,
    rolarAoTopo, showToast, carregarTudo, loadDatasAgendamento, enviarExamesAlvo, setEnviarExamesAlvo,
    verExamesAlvo, setVerExamesAlvo, solicitacaoModal, setSolicitacaoModal, detalheCandidatoId,
    setDetalheCandidatoId, eventosAlvo, setEventosAlvo, ehAdmin, ehMpi, mostrarSecaoTriagem, triagemAlvo,
    setTriagemAlvo, handleSalvarTriagem, handleVerExames, gerarSolicitacao, handleResponsavelEscolhido,
    handleMotivoSelecionado, handleMotivoFechado, handleSelecionarDataReagendamento, toggleStatusKpiFilter,
    filteredCandidatos, total, dateFilterLabel, chipFilters, sugestoesCandidatos,
  } = s;

  return (
    <div className="flex flex-col flex-1 relative">

      <Toast message={toastMessage} />

      {responsavelModal && (
        <ResponsavelTermoModal candidatoNome={responsavelModal.nome} onSelect={handleResponsavelEscolhido} onClose={() => setResponsavelModal(null)} />
      )}

      {triagemAlvo && (() => {
        const c = candidatos.find(x => x.id === triagemAlvo.id) || triagemAlvo;
        return (
          <TriagemFormulario
            candidatoNome={c.nome}
            inicial={c.triagem}
            onSalvar={dados => handleSalvarTriagem(c, dados)}
            onClose={() => setTriagemAlvo(null)}
          />
        );
      })()}

      {detalheCandidatoId && isDesktop && (() => {
        const c = candidatos.find(x => x.id === detalheCandidatoId);
        if (!c) return null;
        return (
          <CandidatoDetalhe
            candidato={c}
            concursoId={concursoId}
            concursoNome={concurso?.nome || ''}
            statusTag={<CandidatoStatusTag status={c.status} />}
            onClose={() => setDetalheCandidatoId(null)}
            onVerExames={c.examesQtd > 0 ? () => handleVerExames(c) : undefined}
            triagem={mostrarSecaoTriagem(c) && c.triagem ? (
              <TriagemSecao triagem={c.triagem} onCopiado={showToast} onEditar={ehMpi ? () => setTriagemAlvo(c) : undefined} />
            ) : undefined}
          />
        );
      })()}

      <MenuAcoesCandidato s={s} />

      {eventosAlvo && ehAdmin && (
        <ModalRegistroEventos concursoId={concursoId} candidato={eventosAlvo} onClose={() => setEventosAlvo(null)} />
      )}

      {enviarExamesAlvo && (
        <EnviarExamesModal
          alvo={enviarExamesAlvo}
          usuarioNome={nav?.authUser?.nome}
          onClose={() => setEnviarExamesAlvo(null)}
          onEnviado={atualizado => setCandidatos(prev => prev.map(x => (x.id === atualizado.id ? atualizado : x)))}
        />
      )}

      {verExamesAlvo && (
        <ExamesTranscritosModal
          concursoId={concursoId}
          concursoNome={concurso?.nome || ''}
          candidatoId={verExamesAlvo.id}
          candidatoNome={verExamesAlvo.nome}
          onClose={() => setVerExamesAlvo(null)}
        />
      )}

      {solicitacaoModal?.tipo === 'parecer' && (
        <SolicitarParecerModal candidatoNome={solicitacaoModal.candidato.nome} onClose={() => setSolicitacaoModal(null)} onGerar={d => gerarSolicitacao('parecer', solicitacaoModal.candidato, d)} />
      )}
      {solicitacaoModal?.tipo === 'exames' && (
        <SolicitarExamesModal candidatoNome={solicitacaoModal.candidato.nome} onClose={() => setSolicitacaoModal(null)} onGerar={d => gerarSolicitacao('exames', solicitacaoModal.candidato, d)} />
      )}

      {motivoModal && (isDesktop || !candidatoModalMobile) && motivoModal.tipo === 'CID' && (
        <CidInaptidaoModal candidatoNome={motivoModal.candidato.nome} obrigatorio={motivoModal.obrigatorio} onSelect={handleMotivoSelecionado} onClose={handleMotivoFechado} />
      )}
      {motivoModal && (isDesktop || !candidatoModalMobile) && motivoModal.tipo === 'IDM' && (
        <MotivoIdmModal candidatoNome={motivoModal.candidato.nome} observacoesAtuais={motivoModal.candidato.observacoes || ''} obrigatorio={motivoModal.obrigatorio} onConfirm={handleMotivoSelecionado} onClose={handleMotivoFechado} />
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destrutivo}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => { setConfirmDialog(null); confirmDialog.onCancel?.(); }}
        />
      )}

      {!isDesktop && mostrarBotaoTopo && (
        <button
          type="button"
          onClick={rolarAoTopo}
          className="md:hidden fixed bottom-6 right-4 z-sticky w-11 h-11 rounded-full bg-navy text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Voltar ao topo"
          title="Voltar ao topo"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_upward</span>
        </button>
      )}

      <div ref={scrollContainerRef} style={{ '--toolbar-h': `${toolbarAltura}px` } as React.CSSProperties} className="pb-10 w-full flex-1">
        <Container size="data" className="pt-6 md:pt-8">
          {/* F49: título à esquerda, status por extenso e andamento escritos; sem hífen nem elementos absolutos. */}
          <PageHeader
            title={concurso?.nome || 'Concurso'}
            description={(
              <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                {concurso && <ConcursoStatusTag status={concurso.status} />}
                <span>{total} candidato{total === 1 ? '' : 's'}</span>
                <span aria-hidden="true">·</span>
                <span>{candidatos.filter(c => c.finalizado).length} de {total} finalizados</span>
              </span>
            )}
          />
        </Container>

        {/* Toolbar compacta e fixa no desktop: o título rola junto com a
            planilha, a busca e os filtros ficam.
            z-topbar (20), e não z-sticky (10): a toolbar cria um contexto de
            empilhamento, então o z-dropdown das sugestões da busca só vale
            dentro dela. Empatada em 10 com o cabeçalho de colunas, que vem
            depois no DOM, a lista de sugestões ficava POR BAIXO do cabeçalho.
            Não há risco de cobrir o Topbar do app: ele é irmão do <main> que
            rola, e a toolbar nunca sai da caixa do <main>. */}
        <div ref={toolbarRef} className={`${embutido ? '' : 'md:sticky md:top-0 md:z-topbar '}bg-canvas py-2`}>
        <Container size="data">
        <div className="bg-white p-2 rounded-xl border border-line">
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-3">
          <div className="relative md:w-72 md:shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[20px]">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
              placeholder="Buscar por matrícula ou nome"
              autoComplete="off"
              className="w-full pl-11 pr-11 h-11 md:h-10 text-sm font-body rounded-lg border border-line bg-paper focus:bg-white focus:outline-none focus:border-navy transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpar busca" className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 md:w-10 md:h-10 flex items-center justify-center text-ink-3 hover:text-navy">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
            {mostrarSugestoes && sugestoesCandidatos.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-line py-1.5 z-dropdown animate-fade-in max-h-64 overflow-y-auto">
                {sugestoesCandidatos.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => { setSearch(c.nome); setMostrarSugestoes(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-paper flex items-center justify-between gap-2"
                  >
                    <span className="text-sm font-semibold text-navy truncate">{c.nome}</span>
                    <span className="text-xs font-mono text-ink-3 shrink-0">{c.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chip filters: só no desktop (tabela) — na lista mobile ficam só
              a busca por nome e o filtro de data. */}
          <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible md:flex-wrap md:flex-1">
            {chipFilters.map(chip => {
              const isActive = statusKpiFilter === chip.filterValue;
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => toggleStatusKpiFilter(chip.filterValue)}
                  className={`px-3 min-h-[44px] md:min-h-[40px] rounded-full text-sm font-bold border transition-all flex items-center gap-2 whitespace-nowrap ${isActive ? chip.corAtivo : 'bg-white text-ink border-line hover:border-ink-5'}`}
                >
                  <span>{chip.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black ${isActive ? 'bg-white/25' : 'bg-thead'}`}>{chip.value}</span>
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0 md:w-40 md:ml-auto">
            <button
              type="button"
              onClick={() => setShowDateMenu(prev => !prev)}
              className={`w-full px-4 h-11 md:h-10 text-sm font-bold rounded-lg border flex items-center justify-center space-x-2 whitespace-nowrap ${dateFilterMode !== 'todos' ? 'bg-navy text-white border-navy' : 'bg-paper text-ink border-line hover:bg-thead'}`}
            >
              <span className="material-symbols-outlined text-[20px]">event</span>
              <span>{dateFilterLabel}</span>
            </button>
            {showDateMenu && (
              <>
                <div className="fixed inset-0 z-dropdown" onClick={() => setShowDateMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-line p-1.5 z-dropdown animate-fade-in space-y-0.5">
                  <button type="button" onClick={() => { setDateFilterMode('todos'); setDateFilterCustom(null); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Todos</button>
                  <button type="button" onClick={() => { setDateFilterMode('hoje'); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Hoje</button>
                  <button type="button" onClick={() => { setDateFilterMode('semana'); setShowDateMenu(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Esta Semana</button>
                  <button type="button" onClick={() => { setShowDateMenu(false); setShowDateCalendar(true); loadDatasAgendamento(); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-ink hover:bg-thead">Personalizado...</button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
        </Container>
        </div>

        <Container size="data" className="pt-2 space-y-4">
        {showDateCalendar && (
          <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-sm overflow-hidden flex flex-col">
              <div className="p-4 bg-navy text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[20px] text-gold">event</span>
                  <h3 className="font-heading font-bold text-sm">Escolher Data</h3>
                </div>
                <button onClick={() => setShowDateCalendar(false)} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="p-4">
                <CalendarioAgendamento
                  datas={datasAgendamento}
                  loading={loadingDatasAgendamento}
                  onSelect={(dataISO) => { setDateFilterMode('personalizado'); setDateFilterCustom(dataISO); setShowDateCalendar(false); }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-line/60 overflow-clip">
          {loading ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined animate-spin text-[32px] text-navy">progress_activity</span>
              <p className="text-xs font-semibold">Carregando candidatos...</p>
            </div>
          ) : loadError ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-wine-500">error</span>
              <p className="text-sm font-bold text-ink">Não foi possível carregar os candidatos</p>
              <p className="text-xs text-ink-3 max-w-sm">{loadError}</p>
              <button type="button" onClick={carregarTudo} className="mt-2 px-4 py-2 bg-navy text-white rounded-lg text-xs font-bold">Tentar novamente</button>
            </div>
          ) : filteredCandidatos.length === 0 ? (
            <div className="p-12 text-center text-ink-3 flex flex-col items-center space-y-2">
              <span className="material-symbols-outlined text-[36px] text-ink-5">person_off</span>
              <p className="text-sm font-bold text-ink">Nenhum candidato encontrado</p>
              <p className="text-xs text-ink-3">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP: tabela, como sempre foi. */}
              <TabelaCandidatos s={s} />

              {/* MOBILE: lista Material Design 3 (sem tabela/rolagem horizontal). */}
              <ListaCandidatosMobile s={s} />
            </>
          )}
        </div>
        </Container>
      </div>

      {reagendandoCandidato && (
        <div className="fixed inset-0 z-dialog bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-line w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-navy text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="material-symbols-outlined text-[20px] text-gold shrink-0">event_repeat</span>
                <h3 className="font-heading font-bold text-sm truncate">Reagendar {reagendandoCandidato.nome}</h3>
              </div>
              <button onClick={() => setReagendandoCandidato(null)} disabled={confirmandoReagendamento} className="text-ink-5 hover:text-white p-1 rounded-lg hover:bg-white/10 shrink-0">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4">
              {!loadingDatasAgendamento && datasAgendamento.length === 0 ? (
                <div className="text-center py-4 space-y-3">
                  <p className="text-sm text-ink-3">
                    Este concurso ainda não tem um período de IS configurado, por isso não há datas disponíveis para reagendamento.
                  </p>
                  {podeAbrirEncerrar ? (
                    <button
                      type="button"
                      onClick={() => setShowDefinirPeriodoModal(true)}
                      className="px-4 py-2.5 bg-navy hover:bg-navy-hover text-white rounded-xl text-sm font-bold transition-colors shadow-sm inline-flex items-center space-x-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">event</span>
                      <span>Definir Período de Agendamento</span>
                    </button>
                  ) : (
                    <p className="text-sm text-ink-3">Peça a um Admin para configurar o período deste concurso.</p>
                  )}
                </div>
              ) : (
                <CalendarioAgendamento datas={datasAgendamento} loading={loadingDatasAgendamento || confirmandoReagendamento} onSelect={handleSelecionarDataReagendamento} />
              )}
            </div>
          </div>
        </div>
      )}

      {showDefinirPeriodoModal && (
        <ModalDefinirPeriodoAgendamento
          concursoId={concursoId}
          concursoNome={concurso?.nome || ''}
          onClose={atualizado => {
            setShowDefinirPeriodoModal(false);
            if (atualizado) {
              loadDatasAgendamento();
              carregarTudo();
            }
          }}
        />
      )}

      {/* Mobile: modal full-screen com os detalhes da IS do candidato
          tocado na lista — Status/Observações editáveis conforme perfil e
          estado de finalização, Nº TIS sempre somente leitura (nunca
          editável no mobile) e as ações cabíveis (Termo de Recurso,
          Reagendar). No desktop a edição continua inline na própria tabela. */}
      <SheetCandidatoMobile s={s} />

    </div>
  );
};
