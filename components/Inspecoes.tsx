// Ficheiro: components/Inspecoes.tsx
// Página INSPEÇÕES DE SAÚDE: cadastro das IS (exceto as de concursos), agendamento das entrevistas em
// slots de 20 min por perito, acompanhamento de prazos e minutas de mensagem. Visão inicial em tabela
// (agrupada em Abertas · Em andamento · Finalizadas) com alternância para calendário no formato do
// Google Agenda. As IS com entrevista marcada são sincronizadas com a agenda "JRS/HNRe" do Google
// Agenda, com o perito como convidado (ver services/agendaGoogleIS.ts).
import React, { useEffect, useMemo, useState } from 'react';
import { Container, PageHeader } from './ui/Page';
import { Button } from './ui/Button';
import { Segmented } from './ui/Segmented';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { ConfirmDialog } from './ui/Dialog';
import { controlClass } from './ui/Field';
import { InspecaoForm } from './inspecoes/InspecaoForm';
import { InspecaoDetalhe } from './inspecoes/InspecaoDetalhe';
import { AgendarDialog } from './inspecoes/AgendarDialog';
import { MinutaDialog } from './inspecoes/MinutaDialog';
import { CalendarioIS } from './inspecoes/CalendarioIS';
import { BloqueiosDialog } from './inspecoes/BloqueiosDialog';
import { AgendaConfigDialog } from './inspecoes/AgendaConfigDialog';
import { NovoParecerForm } from './pareceres/NovoParecerForm';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import { observarMilitares, type MilitarRecord } from '../services/firestoreMilitares';
import {
  observarInspecoes, observarBloqueios, observarConfigAgenda, cancelarInspecao, apagarInspecao, type InspecaoRecord,
} from '../services/firestoreInspecoes';
import { carregarPeritos, type PeritoIS } from '../services/peritosIS';
import { sincronizarAgendaIS, removerEventoAgendaIS } from '../services/agendaGoogleIS';
import { minutaCancelamento, minutaResultado } from '../utils/minutasIS';
import { normalizarBusca } from '../utils/corposQuadros';
import {
  STATUS_IS, SITUACOES_IS, statusEfetivoIS, diasEmAberto, prazoAtrasoDias, dataBr, dataHoraBr, hojeISO,
  type BloqueioAgenda, type ConfigAgenda, type SituacaoIS,
} from '../utils/inspecoes';

type Visao = 'tabela' | 'calendario';
type FiltroSituacao = 'todas' | SituacaoIS;

/** IS finalizadas de concursos não entram aqui; aqui só as cadastradas na página. */
const nomeCurto = (inspecionado: string): string => inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || inspecionado;

const ordenar = (situacao: SituacaoIS, a: InspecaoRecord, b: InspecaoRecord): number => {
  if (situacao === 'aberta') return a.dataAbertura.localeCompare(b.dataAbertura) || a.is - b.is;
  if (situacao === 'andamento') return (a.dataEntrevista || '9').localeCompare(b.dataEntrevista || '9') || a.is - b.is;
  return b.is - a.is;
};

export const Inspecoes: React.FC = () => {
  const nav = useNav();
  const usuario = nav?.authUser;
  const perfil = usuario?.perfil;
  const ehAdmin = perfil === 'admin';

  const podeCadastrar = canUseFeature('inspecoes.cadastrar', perfil);
  const podeAgendar = canUseFeature('inspecoes.agendar', perfil);
  const podeEditar = canUseFeature('inspecoes.editar', perfil);
  const podeMinuta = canUseFeature('inspecoes.gerarMinuta', perfil);
  const podeBloquear = canUseFeature('inspecoes.bloquearAgenda', perfil);
  const podeParecer = canUseFeature('pareceres.gerar', perfil);
  const podeCadastrarInspecionado = canUseFeature('militares.cadastrar', perfil);

  const [lista, setLista] = useState<InspecaoRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [bloqueios, setBloqueios] = useState<BloqueioAgenda[]>([]);
  const [config, setConfig] = useState<ConfigAgenda>({});
  const [militares, setMilitares] = useState<MilitarRecord[]>([]);
  const [peritos, setPeritos] = useState<PeritoIS[]>([]);

  const [visao, setVisao] = useState<Visao>('tabela');
  const [filtro, setFiltro] = useState<FiltroSituacao>('todas');
  const [busca, setBusca] = useState('');
  const [peritoFiltro, setPeritoFiltro] = useState('');

  const [novo, setNovo] = useState<{ dataEntrevista?: string; peritoUid?: string } | null>(null);
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [agendando, setAgendando] = useState<InspecaoRecord | null>(null);
  const [minuta, setMinuta] = useState<{ tipo: 'cancelamento' | 'resultado'; is: InspecaoRecord } | null>(null);
  const [parecerPara, setParecerPara] = useState<InspecaoRecord | null>(null);
  const [apagando, setApagando] = useState<InspecaoRecord | null>(null);
  const [bloqueiosAberto, setBloqueiosAberto] = useState(false);
  const [turnosAberto, setTurnosAberto] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4500); };

  useEffect(() => observarInspecoes(setLista, e => setErroCarga(e.message || 'Não foi possível carregar as inspeções.')), []);
  useEffect(() => observarBloqueios(setBloqueios), []);
  useEffect(() => observarConfigAgenda(setConfig), []);
  useEffect(() => observarMilitares(setMilitares), []);
  useEffect(() => { carregarPeritos().then(setPeritos).catch(() => setPeritos([])); }, []);

  const hoje = hojeISO();
  const detalhe = detalheId ? lista?.find(i => i.id === detalheId) ?? null : null;

  const totais = useMemo(() => ({
    todas: lista?.length ?? 0,
    aberta: lista?.filter(i => i.situacao === 'aberta').length ?? 0,
    andamento: lista?.filter(i => i.situacao === 'andamento').length ?? 0,
    finalizada: lista?.filter(i => i.situacao === 'finalizada').length ?? 0,
    atrasadas: lista?.filter(i => statusEfetivoIS(i, hoje) === 'atrasada').length ?? 0,
  }), [lista, hoje]);

  const filtrada = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return (lista ?? [])
      .filter(i => (filtro === 'todas' ? true : i.situacao === filtro))
      .filter(i => (peritoFiltro ? i.peritoUid === peritoFiltro : true))
      .filter(i => { const alvo = normalizarBusca(`${i.is} ${i.inspecionado} ${i.inspecionadoId} ${i.finalidade} ${i.peritoNome} ${STATUS_IS[statusEfetivoIS(i, hoje)].rotulo}`); return termos.every(t => alvo.includes(t)); });
  }, [lista, filtro, peritoFiltro, busca, hoje]);

  const grupos = useMemo(() => SITUACOES_IS
    .map(s => ({ ...s, itens: filtrada.filter(i => i.situacao === s.id).sort((a, b) => ordenar(s.id, a, b)) }))
    .filter(g => g.itens.length > 0), [filtrada]);

  // ----- ações -----

  const sincronizar = async (is: InspecaoRecord) => {
    const r = await sincronizarAgendaIS(is);
    if (!r.ok) avisar(`Google Agenda não atualizado: ${r.erro}`, 'error');
    else avisar(r.semConvidado ? 'Evento sincronizado. O perito não tem Gmail cadastrado e não foi convidado.' : 'Evento sincronizado com o Google Agenda "JRS/HNRe".');
  };

  const aoCriada = (is: InspecaoRecord) => {
    setNovo(null);
    if (is.dataEntrevista) {
      avisar(`IS ${is.is} cadastrada e agendada. Sincronizando com o Google Agenda…`);
      sincronizarAgendaIS(is).then(r => {
        if (!r.ok) avisar(`IS ${is.is} cadastrada, mas o Google Agenda não foi atualizado: ${r.erro}`, 'error');
        else avisar(r.semConvidado ? `IS ${is.is} agendada. O perito não tem Gmail cadastrado e não foi convidado.` : `IS ${is.is} agendada e sincronizada com o Google Agenda.`);
      });
    } else avisar(`IS ${is.is} cadastrada.`);
  };

  const cancelarComMinuta = async (is: InspecaoRecord, texto: string) => {
    await cancelarInspecao(is, texto);
    setMinuta(null);
    if (is.eventoAgendaId) await removerEventoAgendaIS(is);
  };

  const confirmarApagar = async () => {
    const is = apagando;
    if (!is) return;
    setApagando(null);
    try {
      if (is.eventoAgendaId) await removerEventoAgendaIS(is);
      await apagarInspecao(is);
      setDetalheId(null);
      avisar(`IS ${is.is} apagada.`);
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível apagar a IS.', 'error');
    }
  };

  const omDe = (is: InspecaoRecord) => militares.find(m => m.id === is.inspecionadoId)?.om;
  const dadosMinuta = (is: InspecaoRecord) => ({ is: is.is, finalidade: is.finalidade, grupoFinalidade: is.grupoFinalidade, inspecionado: is.inspecionado, dataAbertura: is.dataAbertura, amp: is.amp, om: omDe(is) });

  // ----- apresentação -----

  const tagStatus = (is: InspecaoRecord) => { const e = statusEfetivoIS(is, hoje); return <StatusTag tone={STATUS_IS[e].tom}>{STATUS_IS[e].rotulo}</StatusTag>; };
  const prazoTexto = (is: InspecaoRecord): string | null => {
    if (is.status !== 'aberta' || is.dataEntrevista) return null;
    return `${diasEmAberto(is.dataAbertura, hoje)}/${prazoAtrasoDias(is.grupoFinalidade)} dias`;
  };

  const peritosFiltraveis = peritos;

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-4">
        <PageHeader
          title="Inspeções de Saúde"
          description="Cadastre IS, agende as entrevistas em slots de 20 minutos, acompanhe os prazos e gere as minutas de mensagem."
          actions={(
            <>
              {ehAdmin && <Button variant="secondary" icon="schedule" onClick={() => setTurnosAberto(true)}>Turnos dos peritos</Button>}
              {podeBloquear && <Button variant="secondary" icon="block" onClick={() => setBloqueiosAberto(true)}>Bloqueios</Button>}
              {podeCadastrar && <Button icon="add" onClick={() => setNovo({})}>Cadastrar IS</Button>}
            </>
          )}
        />

        {totais.atrasadas > 0 && (
          <button
            type="button"
            onClick={() => { setVisao('tabela'); setFiltro('aberta'); setBusca('atrasada'); }}
            className="w-full text-left bg-wine/10 border border-wine/30 rounded-xl px-4 py-3 text-sm font-semibold text-wine flex items-center gap-2 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">warning</span>
            {totais.atrasadas} IS atrasada{totais.atrasadas !== 1 ? 's' : ''} (abertas e sem agendamento além do prazo). Toque para ver.
          </button>
        )}

        <div className="bg-white rounded-xl border border-line p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented<Visao>
              ariaLabel="Forma de visualização" value={visao} onChange={setVisao}
              options={[{ value: 'tabela', label: 'Tabela', icon: 'table_rows' }, { value: 'calendario', label: 'Calendário', icon: 'calendar_month' }]}
            />
            <select aria-label="Filtrar por perito" value={peritoFiltro} onChange={e => setPeritoFiltro(e.target.value)} className={`${controlClass} !w-auto min-w-[200px]`}>
              <option value="">Todos os peritos</option>
              {peritosFiltraveis.map(p => <option key={p.uid} value={p.uid}>{p.usuario}</option>)}
            </select>
          </div>
          {visao === 'tabela' && (
            <>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-ink-3 pointer-events-none" aria-hidden="true">search</span>
                <input type="search" aria-label="Buscar IS" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nº da IS, inspecionado, NIP, finalidade, perito ou status…" className={`${controlClass} pl-10`} autoComplete="off" />
              </div>
              <Segmented<FiltroSituacao>
                ariaLabel="Situação da IS" className="overflow-x-auto" value={filtro} onChange={setFiltro}
                options={[
                  { value: 'todas', label: 'Todas', badge: totais.todas, badgeTone: 'neutro' },
                  { value: 'aberta', label: 'Abertas', badge: totais.aberta, badgeTone: 'neutro' },
                  { value: 'andamento', label: 'Em andamento', badge: totais.andamento, badgeTone: 'neutro' },
                  { value: 'finalizada', label: 'Finalizadas', badge: totais.finalizada, badgeTone: 'neutro' },
                ]}
              />
            </>
          )}
        </div>

        {erroCarga ? (
          <p role="alert" className="bg-white rounded-xl border border-line p-6 text-sm font-semibold text-wine">{erroCarga}</p>
        ) : lista === null ? (
          <p className="bg-white rounded-xl border border-line p-10 text-center text-sm text-ink-3" role="status">Carregando inspeções…</p>
        ) : visao === 'calendario' ? (
          <CalendarioIS
            inspecoes={lista} bloqueios={bloqueios} config={config} peritoUid={peritoFiltro}
            onAbrir={is => setDetalheId(is.id)}
            onNovoNoHorario={podeCadastrar && podeAgendar ? dataHora => setNovo({ dataEntrevista: dataHora, peritoUid: peritoFiltro || undefined }) : undefined}
          />
        ) : grupos.length === 0 ? (
          <div className="bg-white rounded-xl border border-line">
            <EmptyState icon="event_available" title="Nenhuma IS encontrada" description={lista.length === 0 ? 'Cadastre a primeira IS para começar.' : 'Ajuste a busca ou os filtros.'} />
          </div>
        ) : (
          grupos.map(g => (
            <section key={g.id} aria-label={g.plural} className="bg-white rounded-xl border border-line overflow-clip">
              <h2 className="px-4 py-3 bg-thead border-b border-line text-h3 font-bold text-navy flex items-center gap-2">
                {g.plural}
                <span className="text-xs font-bold text-ink-3 bg-white border border-line rounded-full px-2 py-0.5">{g.itens.length}</span>
              </h2>
              {/* Mobile */}
              <ul className="md:hidden divide-y divide-line">
                {g.itens.map(is => (
                  <li key={is.id}>
                    <button type="button" onClick={() => setDetalheId(is.id)} className="w-full text-left px-4 py-3 min-h-[44px] hover:bg-thead">
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-navy break-words">IS {is.is} · {nomeCurto(is.inspecionado)}</span>
                          <span className="block text-xs text-ink-3 break-words">{is.finalidade}</span>
                          <span className="block text-xs text-ink-3">{is.dataEntrevista ? `${dataHoraBr(is.dataEntrevista)} · ${is.peritoNome}` : `Aberta em ${dataBr(is.dataAbertura)}${prazoTexto(is) ? ` · ${prazoTexto(is)}` : ''}`}</span>
                        </span>
                        <span className="shrink-0">{tagStatus(is)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-ink-3 text-xs border-b border-line">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">IS</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Inspecionado</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Finalidade</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Perito</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Entrevista</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Prazo</th>
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {g.itens.map(is => (
                      <tr key={is.id} onClick={() => setDetalheId(is.id)} className="cursor-pointer hover:bg-thead transition-colors">
                        <td className="px-4 py-2 font-mono font-bold text-navy whitespace-nowrap">
                          <button type="button" onClick={e => { e.stopPropagation(); setDetalheId(is.id); }} aria-label={`Abrir IS ${is.is}`} className="min-h-[44px]">{is.is}</button>
                        </td>
                        <td className="px-4 py-2 font-semibold text-navy">{nomeCurto(is.inspecionado)}</td>
                        <td className="px-4 py-2 max-w-[260px]"><span className="block truncate" title={is.finalidade}>{is.finalidade}</span><span className="block text-xs text-ink-3">{is.amp}</span></td>
                        <td className="px-4 py-2 whitespace-nowrap">{is.peritoNome || <span className="text-ink-4">—</span>}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{is.dataEntrevista ? dataHoraBr(is.dataEntrevista) : <span className="text-ink-4">Não agendada</span>}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-xs text-ink-3">{prazoTexto(is) ?? '—'}</td>
                        <td className="px-4 py-2">{tagStatus(is)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </Container>

      {novo && usuario && (
        <InspecaoForm
          militares={militares} peritos={peritos} config={config} bloqueios={bloqueios} inspecoes={lista ?? []}
          usuario={{ uid: usuario.uid, usuario: usuario.usuario, perfil: usuario.perfil }}
          podeCadastrarInspecionado={podeCadastrarInspecionado} podeAgendar={podeAgendar}
          inicial={novo} onClose={() => setNovo(null)} onCriada={aoCriada}
        />
      )}

      {detalhe && (
        <InspecaoDetalhe
          inspecao={detalhe}
          permissoes={{ editar: podeEditar, agendar: podeAgendar, minuta: podeMinuta, parecer: podeParecer, apagar: ehAdmin }}
          onClose={() => setDetalheId(null)}
          onAgendar={() => setAgendando(detalhe)}
          onMinutaCancelamento={() => setMinuta({ tipo: 'cancelamento', is: detalhe })}
          onMinutaResultado={() => setMinuta({ tipo: 'resultado', is: detalhe })}
          onSolicitarParecer={() => setParecerPara(detalhe)}
          onSincronizar={() => sincronizar(detalhe)}
          onSituacaoMudou={is => { sincronizarAgendaIS(is).then(r => { if (!r.ok) avisar(`IS atualizada, mas o Google Agenda não: ${r.erro}`, 'error'); }); }}
          onApagar={() => setApagando(detalhe)}
          onAviso={avisar}
        />
      )}

      {agendando && (
        <AgendarDialog
          inspecao={agendando} peritos={peritos} config={config} bloqueios={bloqueios} inspecoes={lista ?? []}
          onClose={() => setAgendando(null)} onAgendada={(msg, tom) => { setAgendando(null); avisar(msg, tom); }}
        />
      )}

      {minuta?.tipo === 'cancelamento' && (
        <MinutaDialog
          titulo={`Minuta de cancelamento — IS ${minuta.is.is}`}
          textoInicial={minutaCancelamento(dadosMinuta(minuta.is))}
          confirmar={{
            rotulo: 'Copiar e cancelar IS', icone: 'cancel', destrutiva: true,
            aviso: 'Ao confirmar, o texto é copiado, a IS passa para o status Cancelada (situação Finalizada) e o horário e o evento do Google Agenda, se houver, são liberados.',
            onConfirmar: texto => cancelarComMinuta(minuta.is, texto),
          }}
          onClose={() => setMinuta(null)} onAviso={avisar}
        />
      )}
      {minuta?.tipo === 'resultado' && (
        <MinutaDialog
          titulo={`Minuta de resultado — IS ${minuta.is.is}`}
          textoInicial={minutaResultado({ ...dadosMinuta(minuta.is), dataEntrevista: minuta.is.dataEntrevista, dataLaudo: minuta.is.dataLaudo, laudo: minuta.is.laudo, restricoes: minuta.is.restricoes, tis: minuta.is.tis })}
          onClose={() => setMinuta(null)} onAviso={avisar}
        />
      )}

      {parecerPara && (
        <NovoParecerForm
          prefill={{ militarId: parecerPara.inspecionadoId, finalidade: parecerPara.finalidade }}
          onClose={() => setParecerPara(null)}
          onGerado={nome => { setParecerPara(null); avisar(`Pedido de parecer de ${nome} gerado.`); }}
        />
      )}

      {apagando && (
        <ConfirmDialog
          title="Apagar IS"
          message={<>Apagar definitivamente a <strong>IS {apagando.is}</strong> ({nomeCurto(apagando.inspecionado)})? O horário reservado e o evento no Google Agenda também são removidos. Esta ação não pode ser desfeita.</>}
          confirmLabel="Apagar" destructive onConfirm={confirmarApagar} onCancel={() => setApagando(null)}
        />
      )}

      {bloqueiosAberto && usuario && (
        <BloqueiosDialog
          peritos={peritosFiltraveis} config={config} bloqueios={bloqueios}
          usuario={{ uid: usuario.uid, usuario: usuario.usuario, perfil: usuario.perfil }}
          onClose={() => setBloqueiosAberto(false)} onAviso={avisar}
        />
      )}
      {turnosAberto && ehAdmin && (
        <AgendaConfigDialog
          peritos={peritosFiltraveis} config={config}
          onClose={() => setTurnosAberto(false)} onSalvo={() => { setTurnosAberto(false); avisar('Turnos dos peritos salvos.'); }}
        />
      )}
    </div>
  );
};
