// Ficheiro: components/PericiaMenor.tsx
// Perícias Menores (auditoria v3, seção 5): lista com o nome primeiro. No celular, o card mostra o nome em toda a
// largura, "posto · OM · N dias" e o CID na linha de baixo (término e histórico só no detalhe); no desktop, a
// tabela segue com a contagem regressiva do término ("termina em 2 dias / hoje / terminou 07/11") e o histórico;
// a tag diz só o tipo (Dispensa total · Restrições) — vigente vira contagem, não alarme (G1/PM2/PM5/PM9/PM10).
// O detalhe tem as abas "Esta perícia · Histórico N" (components/periciaMenor/PericiaMenorPainel.tsx):
//   ≥ 1280 px mestre-detalhe lado a lado (sem backdrop; ↑ ↓ trocam, Enter abre, Esc fecha);
//   768–1279 px painel não modal à direita; < 768 px bottom sheet.
// A seleção fica na URL (?sel=<id>&aba=historico). A antiga página de histórico do militar
// (/pericia-menor/historico/<nip>) virou a Ficha do inspecionado (/inspecionados/<nip>).
// Abas principais: Todas · Atestados (registrados) · Homologações (atestado externo homologado) — ?registro=atestados|homologacoes.
// Filtros: Situação (seletor Todas · Vigentes · Concluídas — ?situacao=vigentes|concluidas), Minhas, OM e busca.
// Filtros por URL (Início/Painel): ?registro= · ?situacao= · ?tipo=dispensa|restricoes · ?minhas=1 (perito responsável) · ?periodo=mes|trimestre|semestre|ano|personalizado (&de= &ate=)
// · ?om=<sigla> · ?mes=atual (atestado do mês corrente) · ?ano=atual (atestado do ano corrente)
// Atalhos: ?novo=1 (abre o formulário) · ?novo=1&militar=<nip> (já preenchido).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Container, PageHeader } from './ui/Page';
import { EmptyState } from './ui/EmptyState';
import { Toast } from './ui/Toast';
import { SearchField, controlClass } from './ui/Field';
import { FilterChip } from './ui/FilterChip';
import { NovaPericiaMenorForm } from './periciaMenor/NovaPericiaMenorForm';
import { PericiaMenorPainel, type AbaPericia, type ModoPainel } from './periciaMenor/PericiaMenorPainel';
import { AbasSublinhadas, CidCodigo, TagTipoPericia, TextoContagem, useLarguraMinima } from './periciaMenor/partes';
import { podeAbrirFicha } from './ficha/permissoes';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useNav } from '../context/NavContext';
import { canUseFeature } from '../config/permissions';
import { termosPericia } from '../config/termosPericia';
import { fichaPath } from '../config/routes';
import { observarPericiasMenores, chaveMilitar, statusPericia, type PericiaMenorRecord } from '../services/firestorePericiasMenores';
import { carregarCid, normalizarBusca } from '../utils/corposQuadros';
import { indiceCidAbreviado, medicoDaPericia, rotuloCidAbreviado } from '../utils/periciaMenorLista';
import { compararParaLista, contagemTermino, contarPorMilitar, partesCid, postoDoInspecionado, rotuloHistorico, tipoDaPericia } from '../utils/periciaMenorResumo';
import { extrairNomeInspecionado } from '../utils/format';
import { hojeISO } from '../utils/dados';
import { ehMinhaPericia, podeExcluirPericia } from '../utils/exclusaoPericia';
import { OPCOES_PERIODO, dataReferenciaPericia, intervaloPeriodo, noPeriodo, periodoDaUrl } from '../utils/periodoPericia';
import { ExcluirPericiaDialog } from './periciaMenor/ExcluirPericiaDialog';

type FiltroSituacao = 'vigentes' | 'concluidas' | 'todas';
type FiltroRegistro = 'todas' | 'atestados' | 'homologacoes';
type FiltroTipo = '' | 'dispensa' | 'restricoes';

const ehCampoDeTexto = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable);
};

/** Dias da perícia: os homologados (ou os do atestado, sem homologação) — "1 dia", "10 dias". */
const rotuloDias = (p: { tempoHomologado?: number; tempoAtestado?: number }): string => {
  const n = Number(p.tempoHomologado || p.tempoAtestado || 0);
  return n > 0 ? `${n} dia${n === 1 ? '' : 's'}` : '';
};

export const PericiaMenor: React.FC = () => {
  const nav = useNav();
  const perfil = nav?.authUser?.perfil;
  const uid = nav?.authUser?.uid ?? '';
  const podeNovo = canUseFeature('pericia-menor.novo', perfil);
  const podeConsultar = canUseFeature('pericia-menor.historico', perfil);
  const podeFicha = podeAbrirFicha(perfil);
  const t = termosPericia(perfil);
  const atestado = t.singular === 'atestado';
  const { aba: abaRota, pessoa: pessoaParam } = useParams();
  const pessoa = pessoaParam ? decodeURIComponent(pessoaParam) : null;

  const [params, setParams] = useSearchParams();
  const situacaoUrl = params.get('situacao');
  const situacao: FiltroSituacao = situacaoUrl === 'vigentes' || situacaoUrl === 'concluidas' ? situacaoUrl : 'todas';
  const registroUrl = params.get('registro');
  const registro: FiltroRegistro = registroUrl === 'atestados' || registroUrl === 'homologacoes' ? registroUrl : 'todas';
  const tipoUrl = params.get('tipo');
  const tipo: FiltroTipo = tipoUrl === 'dispensa' || tipoUrl === 'restricoes' ? tipoUrl : '';
  const minhas = params.get('minhas') === '1';
  const om = params.get('om') ?? '';
  // Período (data do atestado ou, na homologação, a data em que foi homologado — utils/periodoPericia.ts).
  const periodo = periodoDaUrl({ periodo: params.get('periodo'), mes: params.get('mes'), ano: params.get('ano') });
  const periodoDe = params.get('de') ?? '';
  const periodoAte = params.get('ate') ?? '';
  const sel = params.get('sel');
  const abaDetalhe: AbaPericia = params.get('aba') === 'historico' ? 'historico' : 'esta';

  const definir = useCallback((mudancas: Record<string, string | null>, replace = false) => {
    setParams(prev => {
      const n = new URLSearchParams(prev);
      Object.entries(mudancas).forEach(([k, v]) => { if (v === null || v === '') n.delete(k); else n.set(k, v); });
      return n;
    }, { replace });
  }, [setParams]);

  const [lista, setLista] = useState<PericiaMenorRecord[] | null>(null);
  const [erroCarga, setErroCarga] = useState('');
  const [busca, setBusca] = useState('');
  const [novo, setNovo] = useState<{ militar?: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const [excluindo, setExcluindo] = useState<PericiaMenorRecord | null>(null);
  const [editando, setEditando] = useState<PericiaMenorRecord | null>(null);
  const quemExclui = uid && perfil ? { uid, perfil } : null;
  const [hoje] = useState(() => hojeISO());
  const [cidAbrev, setCidAbrev] = useState<Map<string, string> | null>(null);

  const isDesktop = useIsDesktop();
  const largo = useLarguraMinima(1280);
  const modo: ModoPainel = !isDesktop ? 'sheet' : largo ? 'lateral' : 'flutuante';

  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!podeConsultar) return;
    return observarPericiasMenores(setLista, e => setErroCarga(e.message || 'Não foi possível carregar os registros.'));
  }, [podeConsultar]);
  useEffect(() => {
    if (!podeConsultar) return;
    let vivo = true;
    carregarCid().then(l => { if (vivo) setCidAbrev(indiceCidAbreviado(l)); }).catch(() => { /* fica o rótulo gravado */ });
    return () => { vivo = false; };
  }, [podeConsultar]);
  // Atalhos: ?novo=1 (Início, Ficha) e /pericia-menor/novo abrem o formulário; ?militar=<nip> já preenche.
  useEffect(() => {
    const novoParam = params.get('novo');
    if (novoParam === '1' || abaRota === 'novo') {
      if (podeNovo) setNovo({ militar: params.get('militar') ?? undefined });
      if (novoParam) definir({ novo: null, militar: null }, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const contagemHist = useMemo(() => contarPorMilitar(lista ?? []), [lista]);
  const comStatus = useMemo(() => (lista ?? [])
    .map(p => ({
      p, vigente: statusPericia(p, hoje) === 'vigente', tipo: tipoDaPericia(p.dispensas), medico: medicoDaPericia(p),
      cid: partesCid(p, cidAbrev), cidRotulo: rotuloCidAbreviado(p, cidAbrev), contagem: contagemTermino(p.dataTermino, hoje),
      nome: extrairNomeInspecionado(p.inspecionado), hist: contagemHist.get(chaveMilitar(p)) ?? 1,
    }))
    .sort((a, b) => compararParaLista(a.p, b.p, hoje)), [lista, hoje, cidAbrev, contagemHist]);
  const oms = useMemo(() => [...new Set<string>(comStatus.map(x => x.p.om).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [comStatus]);
  // "Minhas": perícias em que o usuário é o PERITO RESPONSÁVEL (o Admin registrou algumas em nome de outros peritos).
  const minhaPericia = (p: PericiaMenorRecord) => ehMinhaPericia(p, uid);

  const intervalo = useMemo(() => intervaloPeriodo(periodo, hoje, periodoDe, periodoAte), [periodo, hoje, periodoDe, periodoAte]);
  // Base comum (tipo, minhas, OM, mês/ano e busca); as abas (registro) e os chips (situação) contam sobre ela.
  const base = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return comStatus
      .filter(x => !tipo || x.tipo === tipo)
      .filter(x => !minhas || minhaPericia(x.p))
      .filter(x => !om || x.p.om === om)
      .filter(x => noPeriodo(dataReferenciaPericia(x.p), intervalo))
      .filter(x => { const alvo = normalizarBusca(`${x.p.inspecionado} ${x.p.militarId} ${x.p.cid} ${x.cidRotulo} ${x.p.om} ${x.medico}`); return termos.every(w => alvo.includes(w)); });
  }, [comStatus, tipo, minhas, om, intervalo, busca, uid, hoje]); // eslint-disable-line react-hooks/exhaustive-deps
  const doRegistro = (x: typeof comStatus[number], r: FiltroRegistro) => r === 'todas' || (r === 'homologacoes') === !!x.p.homologacao;
  const daSituacao = (x: typeof comStatus[number], s: FiltroSituacao) => s === 'todas' || (s === 'vigentes') === x.vigente;
  // Contagem das abas respeita a situação escolhida; a dos chips respeita a aba — cada uma mostra o que o toque traria.
  const filtradaSemRegistro = useMemo(() => base.filter(x => daSituacao(x, situacao)), [base, situacao]);
  const filtradaSemSituacao = useMemo(() => base.filter(x => doRegistro(x, registro)), [base, registro]);
  const totais = useMemo(() => ({
    todas: filtradaSemRegistro.length,
    atestados: filtradaSemRegistro.filter(x => !x.p.homologacao).length,
    homologacoes: filtradaSemRegistro.filter(x => !!x.p.homologacao).length,
    vigentes: filtradaSemSituacao.filter(x => x.vigente).length,
    concluidas: filtradaSemSituacao.filter(x => !x.vigente).length,
    terminaHoje: filtradaSemSituacao.filter(x => x.contagem.tom === 'hoje').length,
  }), [filtradaSemRegistro, filtradaSemSituacao]);
  const filtrada = useMemo(() => filtradaSemSituacao.filter(x => daSituacao(x, situacao)), [filtradaSemSituacao, situacao]);

  const detalhe = lista?.find(p => p.id === sel) ?? null;
  const historicoDetalhe = useMemo(() => (detalhe && lista ? lista.filter(p => chaveMilitar(p) === chaveMilitar(detalhe)) : []), [detalhe, lista]);

  const selecionar = useCallback((id: string | null, opcoes: { replace?: boolean; aba?: AbaPericia } = {}) => {
    definir({ sel: id, aba: id && opcoes.aba === 'historico' ? 'historico' : null }, opcoes.replace);
  }, [definir]);

  // Teclado no desktop: ↑ ↓ trocam a perícia do painel, Esc fecha (Enter abre pela própria linha).
  useEffect(() => {
    if (modo === 'sheet' || !sel) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.defaultPrevented || ehCampoDeTexto(e.target) || document.querySelector('[aria-modal="true"]')) return;
      if (e.key === 'Escape') { e.preventDefault(); selecionar(null, { replace: true }); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const i = filtrada.findIndex(x => x.p.id === sel);
      const prox = filtrada[i + (e.key === 'ArrowDown' ? 1 : -1)] ?? (i < 0 ? filtrada[0] : null);
      if (!prox) return;
      e.preventDefault();
      selecionar(prox.p.id, { replace: true });
      requestAnimationFrame(() => {
        const botao = document.getElementById(`pm-linha-${prox.p.id}`);
        botao?.focus({ preventScroll: true });
        botao?.scrollIntoView({ block: 'nearest' });
      });
    };
    window.addEventListener('keydown', aoTecla);
    return () => window.removeEventListener('keydown', aoTecla);
  }, [modo, sel, filtrada, selecionar]);

  // Endereço antigo do histórico do militar → Ficha do inspecionado (deep links continuam funcionando).
  if (pessoa !== null) {
    if (/^\d{5,12}$/.test(pessoa)) return <Navigate to={fichaPath(pessoa)} replace />;
    if (!podeConsultar) return <Navigate to="/pericia-menor" replace />;
    if (lista === null) return <div className="flex flex-1 items-center justify-center py-20"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando histórico" /></div>;
    const ultimo = lista.find(p => chaveMilitar(p) === pessoa);
    return <Navigate to={ultimo ? `/pericia-menor/historico?sel=${encodeURIComponent(ultimo.id)}&aba=historico` : '/pericia-menor/historico'} replace />;
  }

  const rotuloNovo = atestado ? 'Atestado' : 'Perícia Menor';
  const abrirNovo = (militar?: string) => setNovo({ militar });
  const descricao = podeConsultar && lista
    ? `${totais.vigentes} vigente${totais.vigentes !== 1 ? 's' : ''}${totais.terminaHoje ? ` · ${totais.terminaHoje} termina${totais.terminaHoje !== 1 ? 'm' : ''} hoje` : ''}`
    : undefined;
  const painelLateral = modo === 'lateral' && detalhe;

  const painel = detalhe && (
    <PericiaMenorPainel
      pericia={detalhe} historico={historicoDetalhe} hoje={hoje} cidAbrev={cidAbrev} modo={modo} termos={t}
      aba={abaDetalhe} onAba={a => definir({ aba: a === 'historico' ? 'historico' : null }, true)}
      onSelecionar={id => selecionar(id, { replace: true })}
      onFechar={() => selecionar(null, { replace: true })}
      onNova={podeNovo ? () => abrirNovo(detalhe.militarId || undefined) : undefined}
      onExcluir={podeExcluirPericia(detalhe, quemExclui) ? () => setExcluindo(detalhe) : undefined}
      onEditar={podeExcluirPericia(detalhe, quemExclui) ? () => setEditando(detalhe) : undefined}
      fichaHref={podeFicha && detalhe.militarId ? fichaPath(detalhe.militarId) : undefined}
    />
  );

  const tabela = (
    <div className="bg-white rounded-xl border border-line overflow-clip">
      {erroCarga ? (
        <p role="alert" className="p-6 text-sm font-semibold text-wine">{erroCarga}</p>
      ) : lista === null ? (
        <p className="p-10 text-center text-sm text-ink-3" role="status">Carregando {t.plural}…</p>
      ) : filtrada.length === 0 ? (
        <EmptyState icon="personal_injury" title={lista.length === 0 ? `Nenhum${atestado ? '' : 'a'} ${t.singular} registrad${atestado ? 'o' : 'a'}` : 'Nenhum resultado'} description={lista.length === 0 ? `Os ${atestado ? 'atestados registrados aparecem' : 'registros de perícias menores aparecem'} aqui.` : 'Ajuste a busca ou os filtros.'} />
      ) : (
        <>
          {/* Celular: nome em toda a largura; posto · OM · dias e, na linha de baixo, o CID (o término e o histórico
              ficam no detalhe, ao tocar no card). */}
          <ul className="md:hidden divide-y divide-line">
            {filtrada.map(x => (
              <li key={x.p.id}>
                <button type="button" onClick={() => selecionar(x.p.id)} aria-label={`Abrir detalhe ${atestado ? 'do atestado' : 'da perícia'} de ${x.nome}`}
                  className={`w-full text-left px-4 py-3 flex flex-col gap-0.5 hover:bg-thead ${x.p.id === sel ? 'bg-thead' : ''}`}>
                  <span className="font-bold text-navy truncate">{x.nome}</span>
                  <span className="text-xs text-ink-3 min-w-0 break-words">{[postoDoInspecionado(x.p.inspecionado, x.nome), x.p.om, rotuloDias(x.p)].filter(Boolean).join(' · ')}</span>
                  {(x.cid.codigo || x.cid.descricao) && (
                    <span className="text-xs text-ink-3 min-w-0 break-words"><CidCodigo codigo={x.cid.codigo} descricao={x.cid.descricao} /></span>
                  )}
                  <span className="pt-1"><TagTipoPericia tipo={x.tipo} /></span>
                </button>
              </li>
            ))}
          </ul>
          {/* Desktop: tabela enxuta — Inspecionado · CID · Tipo · Término · Hist.; data e médico vão para o painel. */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-thead text-ink-3 text-xs border-b border-line">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Inspecionado</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">CID</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th scope="col" className="px-4 py-3 text-left font-semibold">Término</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold"><abbr title="Registros no histórico" className="no-underline">Hist.</abbr></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtrada.map(x => (
                  <tr key={x.p.id} onClick={() => selecionar(x.p.id, { replace: !!sel })} aria-selected={x.p.id === sel}
                    className={`cursor-pointer hover:bg-thead transition-colors ${x.p.id === sel ? 'bg-thead shadow-[inset_3px_0_0_rgb(var(--c-gold))]' : ''}`}>
                    <td className="px-4 py-2.5 align-top">
                      <button type="button" id={`pm-linha-${x.p.id}`} onClick={e => { e.stopPropagation(); selecionar(x.p.id, { replace: !!sel }); }} className="text-left w-full"
                        aria-label={`Abrir detalhe ${atestado ? 'do atestado' : 'da perícia'} de ${x.nome}`}>
                        <span className="block font-bold text-navy break-words">{x.nome}</span>
                        <span className="block text-xs text-ink-3">{[postoDoInspecionado(x.p.inspecionado, x.nome), x.p.om].filter(Boolean).join(' · ')}</span>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 align-top text-ink"><CidCodigo codigo={x.cid.codigo} descricao={x.cid.descricao} /></td>
                    <td className="px-4 py-2.5 align-top"><TagTipoPericia tipo={x.tipo} /></td>
                    <td className="px-4 py-2.5 align-top"><TextoContagem contagem={x.contagem} curto /></td>
                    <td className="px-4 py-2.5 align-top text-right tabular-nums text-ink">{x.hist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-line text-xs text-ink-3 flex flex-wrap items-center justify-between gap-2">
            <span role="status">{atestado ? `${filtrada.length} atestado${filtrada.length !== 1 ? 's' : ''}` : `${filtrada.length} perícia${filtrada.length !== 1 ? 's' : ''} menor${filtrada.length !== 1 ? 'es' : ''}`}</span>
            {modo !== 'sheet' && <span className="hidden md:inline">↑ ↓ trocam a perícia no painel · Enter abre · Esc fecha</span>}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      {editando && (
        <NovaPericiaMenorForm
          titulo={atestado ? 'Editar atestado' : 'Editar perícia menor'} editar={editando}
          onClose={() => setEditando(null)}
          onRegistrado={n => { setEditando(null); avisar(`${atestado ? 'Atestado' : 'Perícia menor'} de ${n} atualizad${atestado ? 'o' : 'a'}.`); }}
        />
      )}
      {excluindo && perfil && (
        <ExcluirPericiaDialog
          pericia={excluindo} perfil={perfil} termo={t.singular}
          onClose={() => setExcluindo(null)}
          onExcluida={msg => { setExcluindo(null); selecionar(null, { replace: true }); avisar(msg); }}
        />
      )}
      <Container size="data" className="pt-0 md:pt-8 pb-10 flex flex-col gap-4">
        <PageHeader
          title={t.pagina}
          description={descricao}
          fab={podeNovo ? { icon: 'add', label: rotuloNovo, onClick: () => abrirNovo() } : undefined}
        />

        {!podeConsultar ? (
          <div className="bg-white rounded-xl border border-line">
            <EmptyState icon="personal_injury" title={`Registre um${atestado ? '' : 'a'} ${t.singular}`} description={`Use o botão ${rotuloNovo}. Seu perfil não consulta o histórico de ${t.plural}.`} />
          </div>
        ) : (
          <>
            {/* 5c: no desktop, uma faixa branca com as abas à esquerda e os chips + busca à direita; no celular,
                abas coladas na topbar (largura dividida), chips numa linha rolável e a busca abaixo. */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2 md:bg-white md:border md:border-line md:rounded-xl md:pl-1 md:pr-3">
              <AbasSublinhadas<FiltroRegistro>
                rotulo={`Tipo de registro ${atestado ? 'do atestado' : 'da perícia'}`} idBase="pm-registro" ativa={registro}
                className="-mx-4 px-2 md:mx-0 md:px-0 bg-white md:bg-transparent md:border-b-0 md:shrink-0"
                onChange={r => definir({ registro: r === 'todas' ? null : r }, true)}
                abas={[
                  { id: 'todas', rotulo: 'Todas', contagem: totais.todas },
                  { id: 'atestados', rotulo: 'Atestados', contagem: totais.atestados },
                  { id: 'homologacoes', rotulo: 'Homologações', contagem: totais.homologacoes },
                ]}
              />
              <div className="flex flex-col gap-3 md:flex-1 md:min-w-0 md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-2 md:py-1.5">
              <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:justify-end">
                {/* Situação: um seletor (como o de OM) no lugar dos chips Vigentes/Concluídas — no celular os chips espremiam. */}
                <label className="sr-only" htmlFor="pm-filtro-situacao">Situação</label>
                <select id="pm-filtro-situacao" value={situacao === 'todas' ? '' : situacao} onChange={e => definir({ situacao: e.target.value || null }, true)} className={`${controlClass} !w-auto min-w-[8rem] shrink-0`}>
                  <option value="">Todas</option>
                  <option value="vigentes">Vigentes</option>
                  <option value="concluidas">Concluídas</option>
                </select>
                {tipo && <FilterChip ativo className="shrink-0" onAlternar={() => definir({ tipo: null }, true)}>{tipo === 'dispensa' ? 'Dispensa total' : 'Restrições'}</FilterChip>}
                {/* Período: data do atestado ou, na homologação, a data em que foi homologado; "Personalizado" abre De/Até. */}
                <label className="sr-only" htmlFor="pm-filtro-periodo">Período</label>
                <select id="pm-filtro-periodo" value={periodo}
                  onChange={e => definir({ periodo: e.target.value || null, mes: null, ano: null, ...(e.target.value === 'personalizado' ? {} : { de: null, ate: null }) }, true)}
                  className={`${controlClass} !w-auto min-w-[9rem] shrink-0`}>
                  {OPCOES_PERIODO.map(o => <option key={o.valor || 'todo'} value={o.valor}>{o.rotulo}</option>)}
                </select>
                <label className="sr-only" htmlFor="pm-filtro-om">OM</label>
                <select id="pm-filtro-om" value={om} onChange={e => definir({ om: e.target.value || null }, true)} className={`${controlClass} !w-auto min-w-[8rem] shrink-0`}>
                  <option value="">Todas as OM</option>
                  {om && !oms.includes(om) && <option value={om}>{om}</option>}
                  {oms.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {(podeNovo || minhas) && <FilterChip ativo={minhas} className="shrink-0" icon="person" onAlternar={() => definir({ minhas: minhas ? null : '1' }, true)}>Minhas</FilterChip>}
              </div>
              {periodo === 'personalizado' && (
                <div className="grid grid-cols-2 gap-2 md:flex md:items-end" role="group" aria-label="Período personalizado">
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-3">
                    De
                    <input type="date" value={periodoDe} max={periodoAte || undefined} onChange={e => definir({ de: e.target.value || null }, true)} className={`${controlClass} md:!w-auto min-w-0`} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-semibold text-ink-3">
                    Até
                    <input type="date" value={periodoAte} min={periodoDe || undefined} onChange={e => definir({ ate: e.target.value || null }, true)} className={`${controlClass} md:!w-auto min-w-0`} />
                  </label>
                </div>
              )}
              <SearchField value={busca} onChange={setBusca} label={`Buscar ${t.singular}`} placeholder="Nome, NIP, OM ou CID" className="md:w-[220px] xl:w-[260px] md:shrink-0" autoComplete="off" />
              </div>
            </div>

            {painelLateral ? (
              <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-7 min-w-0">{tabela}</div>
                <div className="col-span-5 min-w-0">{painel}</div>
              </div>
            ) : tabela}
          </>
        )}
      </Container>

      {!painelLateral && painel}
      {novo && podeNovo && (
        <NovaPericiaMenorForm
          onClose={() => setNovo(null)}
          titulo={t.novo}
          militarInicial={novo.militar}
          onRegistrado={nome => { setNovo(null); avisar(atestado ? `Atestado de ${nome} registrado.` : `Perícia menor de ${nome} registrada.`); }}
        />
      )}
    </div>
  );
};
