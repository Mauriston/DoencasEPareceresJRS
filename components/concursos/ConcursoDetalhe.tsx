// Ficheiro: components/concursos/ConcursoDetalhe.tsx
// Planilha de candidatos de um concurso (também embutida nas páginas do dia e de IS atrasadas).
import { CidInaptidaoModal } from '../CidInaptidaoModal';
import { MotivoIdmModal } from '../MotivoIdmModal';
import { ResponsavelTermoModal } from '../ResponsavelTermoModal';
import React, { useEffect, useState } from 'react';
import { Container, PageHeader } from '../ui/Page';
import { FabAcoes } from '../ui/Fab';
import { MenuAcoes } from '../ui/MenuAcoes';
import { FilterChip } from '../ui/FilterChip';
import { SearchField } from '../ui/Field';
import { canUseFeature } from '../../config/permissions';
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
import { ModalAdicionarCandidato, ModalDefinirPeriodoAgendamento } from './ModaisConcurso';
import { useConcursoDetalhe, type ConcursoDetalheProps } from './useConcursoDetalhe';
import { TabelaCandidatos } from './TabelaCandidatos';
import { ListaCandidatosMobile } from './ListaCandidatosMobile';
import { SheetCandidatoMobile } from './SheetCandidatoMobile';
import { MenuAcoesCandidato } from './MenuAcoesCandidato';
import { BotaoEmailInaptos, podeEmailInaptos } from './BotaoEmailInaptos';
import { inaptoPendente } from '../../utils/emailInaptosConcurso';

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
              {ev.detalhe && <p className="text-sm text-ink break-words mt-0.5">{ev.detalhe}</p>}
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
    candidatoModalMobile, isDesktop, scrollContainerRef, toolbarRef, toolbarAltura,
    showToast, carregarTudo, loadDatasAgendamento, enviarExamesAlvo, setEnviarExamesAlvo,
    verExamesAlvo, setVerExamesAlvo, solicitacaoModal, setSolicitacaoModal, detalheCandidatoId,
    setDetalheCandidatoId, eventosAlvo, setEventosAlvo, ehAdmin, ehMpi, mostrarSecaoTriagem, triagemAlvo,
    setTriagemAlvo, handleSalvarTriagem, handleVerExames, gerarSolicitacao, handleResponsavelEscolhido,
    handleMotivoSelecionado, handleMotivoFechado, handleSelecionarDataReagendamento, toggleStatusKpiFilter,
    filteredCandidatos, total, dateFilterLabel, chipFilters, sugestoesCandidatos,
  } = s;
  // FAB / ações do cabeçalho (auditoria v3, 4d): + Candidato (principal) e Enviar exames, pela permissão do perfil
  // e pela situação do concurso. Só na planilha de UM concurso (não nas páginas do dia e de atrasadas).
  const [adicionarCandidatoAberto, setAdicionarCandidatoAberto] = useState(false);
  const [enviarExamesAberto, setEnviarExamesAberto] = useState(false);
  const [inaptosAberto, setInaptosAberto] = useState(false);
  const inaptosPendentes = candidatos.filter(inaptoPendente).length;
  const podeCandidato = !embutido && !!concurso && canUseFeature('concursosJRS.adicionarCandidato', perfil) && (concurso.status === 'em_andamento' || concurso.status === 'em_breve');
  const podeExames = !embutido && !!concurso && canUseFeature('concursosJRS.enviarExamesCandidato', perfil) && concurso.status === 'em_andamento';
  const finalizados = candidatos.filter(c => c.finalizado).length;
  const descricao = (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {concurso && concurso.status !== 'em_andamento' && <ConcursoStatusTag status={concurso.status} />}
      <span>{total} candidato{total === 1 ? '' : 's'}</span>
      <span aria-hidden="true">·</span>
      <span>{finalizados} de {total} finalizado{total === 1 ? '' : 's'}</span>
    </span>
  );
  const acoesCabecalho = (
    <>
      {concurso && (
        <BotaoEmailInaptos concurso={concurso} candidatos={candidatos} perfil={perfil} onAviso={showToast}
          aberto={inaptosAberto} onAbertoChange={setInaptosAberto} className={embutido ? '' : 'hidden md:inline-flex'} />
      )}
      {podeExames && <Button variant="secondary" icon="upload_file" onClick={() => setEnviarExamesAberto(true)} className="hidden md:inline-flex">Enviar exames</Button>}
      {podeCandidato && <Button icon="person_add" onClick={() => setAdicionarCandidatoAberto(true)} className="hidden md:inline-flex">Adicionar candidato</Button>}
    </>
  );

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

      {/* M7: sem "voltar ao topo" flutuante — o canto é do FAB (+ Candidato); a trilha e o gesto do sistema cobrem a volta. */}
      {adicionarCandidatoAberto && concurso && (
        <ModalAdicionarCandidato
          concursoId={concursoId}
          concursoNome={concurso.nome}
          onClose={atualizado => { setAdicionarCandidatoAberto(false); if (atualizado) carregarTudo(); }}
        />
      )}
      {enviarExamesAberto && concurso && (
        <EnviarExamesModal
          concursos={[concurso]}
          usuarioNome={nav?.authUser?.nome}
          onClose={() => { setEnviarExamesAberto(false); carregarTudo(); }}
        />
      )}
      {!embutido && (
        <FabAcoes acoes={[
          { id: 'candidato', rotulo: 'Candidato', ariaLabel: 'Adicionar candidato', icone: 'add', onClick: () => setAdicionarCandidatoAberto(true), permitido: podeCandidato },
          { id: 'exames', rotulo: 'Enviar exames', icone: 'upload_file', onClick: () => setEnviarExamesAberto(true), permitido: podeExames },
          // E-mail de inaptos: no celular também no FAB (o botão do cabeçalho só aparece a partir de md).
          {
            id: 'inaptos', rotulo: 'E-mail de inaptos', icone: 'mail', onClick: () => setInaptosAberto(true),
            permitido: !!concurso && podeEmailInaptos(concurso, perfil), disabled: inaptosPendentes === 0,
          },
        ]} />
      )}

      <div ref={scrollContainerRef} style={{ '--toolbar-h': `${toolbarAltura}px` } as React.CSSProperties} className={`${embutido ? 'pb-6' : 'pb-28 md:pb-10'} w-full flex-1`}>
        <Container size="data" className={embutido ? "pt-2" : "pt-6 md:pt-8"}>
          {/* F49: título à esquerda, andamento escrito. P2: embutido (páginas do dia e de atrasadas) o concurso é
              uma seção h2 — o h1 é o PageHeader da rota. A situação só aparece quando não é "Em andamento" (C3). */}
          {embutido ? (
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-h2 text-navy">{concurso?.nome || 'Concurso'}</h2>
                <div className="text-sm text-ink-3 mt-1">{descricao}</div>
              </div>
              <div className="flex flex-row flex-wrap items-center gap-2 shrink-0">{acoesCabecalho}</div>
            </div>
          ) : (
            <PageHeader title={concurso?.nome || 'Concurso'} description={descricao} actions={acoesCabecalho} />
          )}
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
            <SearchField
              value={search}
              onChange={setSearch}
              onFocus={() => setMostrarSugestoes(true)}
              onBlur={() => setTimeout(() => setMostrarSugestoes(false), 150)}
              label="Buscar candidato"
              placeholder="Buscar por matrícula ou nome"
              autoComplete="off"
            />
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
                    <span className="text-xs tabular-nums text-ink-3 shrink-0">{c.id}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Filtros de resultado (FilterChip do DS, com a contagem); no celular rolam numa linha. */}
          <div className="flex items-center gap-2 overflow-x-auto md:overflow-visible md:flex-wrap md:flex-1">
            {chipFilters.map(chip => (
              <FilterChip key={chip.key} ativo={statusKpiFilter === chip.filterValue} onAlternar={() => toggleStatusKpiFilter(chip.filterValue)} className="shrink-0">
                {chip.label}
                <span className="min-w-5 h-5 px-1.5 rounded-full text-xs font-bold tabular-nums inline-flex items-center justify-center bg-line text-ink">{chip.value}</span>
              </FilterChip>
            ))}
          </div>

          <div className="shrink-0 md:ml-auto">
            <MenuAcoes
              rotulo="Filtrar por data"
              botao={{ texto: dateFilterLabel, icone: 'event', primario: dateFilterMode !== 'todos' }}
              itens={[
                { rotulo: 'Todas as datas', icone: 'calendar_month', onClick: () => { setDateFilterMode('todos'); setDateFilterCustom(null); } },
                { rotulo: 'Hoje', icone: 'today', onClick: () => setDateFilterMode('hoje') },
                { rotulo: 'Esta semana', icone: 'date_range', onClick: () => setDateFilterMode('semana') },
                { rotulo: 'Escolher data…', icone: 'edit_calendar', onClick: () => { setShowDateCalendar(true); loadDatasAgendamento(); } },
              ]}
            />
          </div>
        </div>
        </div>
        </Container>
        </div>

        <Container size="data" className="pt-2 space-y-4">
        {showDateCalendar && (
          <Dialog title="Escolher data" icon="event" onClose={() => setShowDateCalendar(false)}>
            <CalendarioAgendamento
              datas={datasAgendamento}
              loading={loadingDatasAgendamento}
              onSelect={(dataISO) => { setDateFilterMode('personalizado'); setDateFilterCustom(dataISO); setShowDateCalendar(false); }}
            />
          </Dialog>
        )}

        <div className="bg-white rounded-xl border border-line overflow-clip">
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
              <Button size="sm" icon="refresh" onClick={carregarTudo} className="mt-2">Tentar novamente</Button>
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
        <Dialog title={`Reagendar ${reagendandoCandidato.nome}`} icon="event_repeat" travado={confirmandoReagendamento} onClose={() => setReagendandoCandidato(null)}>
          {!loadingDatasAgendamento && datasAgendamento.length === 0 ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-ink-3">
                Este concurso ainda não tem um período de IS configurado, por isso não há datas disponíveis para reagendamento.
              </p>
              {podeAbrirEncerrar ? (
                <Button icon="event" onClick={() => setShowDefinirPeriodoModal(true)}>Definir período de agendamento</Button>
              ) : (
                <p className="text-sm text-ink-3">Peça a um Admin para configurar o período deste concurso.</p>
              )}
            </div>
          ) : (
            <CalendarioAgendamento datas={datasAgendamento} loading={loadingDatasAgendamento || confirmandoReagendamento} onSelect={handleSelecionarDataReagendamento} />
          )}
        </Dialog>
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
