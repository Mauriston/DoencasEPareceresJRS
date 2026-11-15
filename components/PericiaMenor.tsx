// Ficheiro: components/PericiaMenor.tsx
// Perícias Menores (auditoria v3, seção 5): lista com o nome primeiro, a contagem regressiva do término
// ("termina em 2 dias / hoje / terminou 07/11") e quantos registros o militar já tem ("4 no histórico");
// a tag diz só o tipo (Dispensa total · Restrições) — vigente vira contagem, não alarme (G1/PM2/PM5/PM9/PM10).
// O detalhe tem as abas "Esta perícia · Histórico N" (components/periciaMenor/PericiaMenorPainel.tsx):
//   ≥ 1280 px mestre-detalhe lado a lado (sem backdrop; ↑ ↓ trocam, Enter abre, Esc fecha);
//   768–1279 px painel não modal à direita; < 768 px bottom sheet.
// A seleção fica na URL (?sel=<id>&aba=historico). A antiga página de histórico do militar
// (/pericia-menor/historico/<nip>) virou a Ficha do inspecionado (/inspecionados/<nip>).
// Filtros por URL (Início/Painel): ?situacao=vigentes|concluidas · ?tipo=dispensa|restricoes · ?minhas=1 (perito/quem registrou)
// · ?om=<sigla> · ?mes=atual (atestado do mês corrente)
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

type FiltroSituacao = 'vigentes' | 'concluidas' | 'todas';
type FiltroTipo = '' | 'dispensa' | 'restricoes';

const ehCampoDeTexto = (el: EventTarget | null) => {
  const e = el as HTMLElement | null;
  return !!e && (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT' || e.isContentEditable);
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
  const tipoUrl = params.get('tipo');
  const tipo: FiltroTipo = tipoUrl === 'dispensa' || tipoUrl === 'restricoes' ? tipoUrl : '';
  const minhas = params.get('minhas') === '1';
  const om = params.get('om') ?? '';
  const mesAtual = params.get('mes') === 'atual';
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
  const minhaPericia = (p: PericiaMenorRecord) => p.peritoUid === uid || p.criadoPor === uid;

  // Contagens das abas respeitam os demais filtros (tipo, minhas, OM e busca).
  const filtradaSemSituacao = useMemo(() => {
    const termos = normalizarBusca(busca).split(/\s+/).filter(Boolean);
    return comStatus
      .filter(x => !tipo || x.tipo === tipo)
      .filter(x => !minhas || minhaPericia(x.p))
      .filter(x => !om || x.p.om === om)
      .filter(x => !mesAtual || (x.p.dataAtestado || '').slice(0, 7) === hoje.slice(0, 7))
      .filter(x => { const alvo = normalizarBusca(`${x.p.inspecionado} ${x.p.militarId} ${x.p.cid} ${x.cidRotulo} ${x.p.om} ${x.medico}`); return termos.every(w => alvo.includes(w)); });
  }, [comStatus, tipo, minhas, om, mesAtual, busca, uid, hoje]); // eslint-disable-line react-hooks/exhaustive-deps
  const totais = useMemo(() => ({
    vigentes: filtradaSemSituacao.filter(x => x.vigente).length,
    concluidas: filtradaSemSituacao.filter(x => !x.vigente).length,
    todas: filtradaSemSituacao.length,
    terminaHoje: filtradaSemSituacao.filter(x => x.contagem.tom === 'hoje').length,
  }), [filtradaSemSituacao]);
  const filtrada = useMemo(() => filtradaSemSituacao.filter(x => situacao === 'todas' || (situacao === 'vigentes') === x.vigente), [filtradaSemSituacao, situacao]);

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
          {/* Celular: nome primeiro; à direita, quanto falta e quantos registros o militar tem (PM10). */}
          <ul className="md:hidden divide-y divide-line">
            {filtrada.map(x => (
              <li key={x.p.id}>
                <button type="button" onClick={() => selecionar(x.p.id)} aria-label={`Abrir detalhe ${atestado ? 'do atestado' : 'da perícia'} de ${x.nome}`}
                  className={`w-full text-left px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 hover:bg-thead ${x.p.id === sel ? 'bg-thead' : ''}`}>
                  <span className="font-bold text-navy truncate">{x.nome}</span>
                  <TextoContagem contagem={x.contagem} />
                  <span className="text-xs text-ink-3 min-w-0 break-words">{[postoDoInspecionado(x.p.inspecionado, x.nome), x.p.om].filter(Boolean).join(' · ')}{x.cid.codigo || x.cid.descricao ? ' · ' : ''}<CidCodigo codigo={x.cid.codigo} descricao={x.cid.descricao} /></span>
                  <span className="text-xs text-ink-3 text-right whitespace-nowrap">{rotuloHistorico(x.hist)}</span>
                  <span className="col-span-2 pt-1"><TagTipoPericia tipo={x.tipo} /></span>
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
      <Container size="data" className="pt-0 md:pt-8 pb-10 space-y-4">
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
            <div className="space-y-3">
              <AbasSublinhadas<FiltroSituacao>
                rotulo={`Situação ${atestado ? 'do atestado' : 'da perícia'}`} idBase="pm-situacao" ativa={situacao}
                className="-mx-4 px-4 md:mx-0 md:px-0 bg-white md:bg-transparent"
                onChange={s => definir({ situacao: s === 'todas' ? null : s }, true)}
                abas={[
                  { id: 'vigentes', rotulo: 'Vigentes', contagem: totais.vigentes },
                  { id: 'concluidas', rotulo: 'Concluídas', contagem: totais.concluidas },
                  { id: 'todas', rotulo: 'Todas', contagem: totais.todas },
                ]}
              />
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip ativo={tipo === 'dispensa'} onAlternar={() => definir({ tipo: tipo === 'dispensa' ? null : 'dispensa' }, true)}>Dispensa total</FilterChip>
                <FilterChip ativo={tipo === 'restricoes'} onAlternar={() => definir({ tipo: tipo === 'restricoes' ? null : 'restricoes' }, true)}>Restrições</FilterChip>
                {mesAtual && <FilterChip ativo icon="calendar_month" onAlternar={() => definir({ mes: null }, true)}>Este mês</FilterChip>}
                {(podeNovo || minhas) && <FilterChip ativo={minhas} icon="person" onAlternar={() => definir({ minhas: minhas ? null : '1' }, true)}>Minhas</FilterChip>}
                <label className="sr-only" htmlFor="pm-filtro-om">OM</label>
                <select id="pm-filtro-om" value={om} onChange={e => definir({ om: e.target.value || null }, true)} className={`${controlClass} !w-auto min-w-[8rem]`}>
                  <option value="">Todas as OM</option>
                  {om && !oms.includes(om) && <option value={om}>{om}</option>}
                  {oms.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <SearchField value={busca} onChange={setBusca} label={`Buscar ${t.singular}`} placeholder="Nome, NIP, OM, médico ou CID" className="flex-1 min-w-[14rem]" autoComplete="off" />
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
