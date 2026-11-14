// Ficheiro: components/ficha/FichaInspecionado.tsx
// Ficha do inspecionado (/inspecionados/:nip — auditoria v3, seção 9; MF1–MF4, PM6, PM8, PMD3).
// Uma página com o que o perfil pode ver (components/ficha/permissoes.ts — sem abas fantasmas):
//   cabeçalho mínimo (nome no título; posto · NIP · OM na descrição) · Situação atual (um cartão por
//   seção visível) · faixa dos últimos 12 meses + linha do tempo (IS, pareceres e perícias, filtrável)
//   na coluna principal (8) · resumo de 12 meses, perícias 2 × 3, saldo de 30 dias, CID mais
//   frequentes, cadastro e registro de eventos (só Admin) na coluna de apoio (4).
// Leitura limitada às consultas por NIP (where militarId/inspecionadoId == nip), nunca a coleção inteira (MF2).
// Abrir a ficha grava o evento "abriu a ficha" (quem e quando) em militares/{nip}/eventos (best effort).
// Substitui a antiga página de histórico da Perícia Menor (/pericia-menor/historico/<nip> redireciona para cá).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container, PageHeader } from '../ui/Page';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { StatusTag } from '../ui/StatusTag';
import { EmptyState } from '../ui/EmptyState';
import { AccessDenied } from '../ui/AccessDenied';
import { Toast } from '../ui/Toast';
import { GradePainel } from '../ui/Grade';
import { AbasSublinhadas, CidCodigo, SaldoAcumulado, TextoContagem } from '../periciaMenor/partes';
import { LinhaRegistroPericia, PericiaMenorPainel, type AbaPericia } from '../periciaMenor/PericiaMenorPainel';
import { NovaPericiaMenorForm } from '../periciaMenor/NovaPericiaMenorForm';
import { MilitarEdicao } from '../Militares';
import { secoesDaFicha, podeAbrirFicha } from './permissoes';
import { useNav } from '../../context/NavContext';
import { useBreadcrumbs } from '../../context/BreadcrumbContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { canUseFeature } from '../../config/permissions';
import { termosPericia } from '../../config/termosPericia';
import { fichaPath, inspecaoPath } from '../../config/routes';
import { observarMilitar, tipoDoInspecionado, type MilitarRecord } from '../../services/firestoreMilitares';
import { observarPericiasDoMilitar, dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { observarInspecoesDoInspecionado, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { observarPareceresDoMilitar, statusEfetivo, type ParecerRecord } from '../../services/firestorePareceres';
import { observarEventosInspecionado, registrarEventoInspecionado, ROTULO_ACAO_INSPECIONADO, type EventoInspecionado } from '../../services/eventosInspecionado';
import { carregarCid, carregarCorposQuadros, carregarOms, type CorposQuadros, type OrganizacaoMilitar } from '../../utils/corposQuadros';
import { indiceCidAbreviado } from '../../utils/periciaMenorLista';
import { saldoAcumulado } from '../../utils/periciaMenorRegras';
import {
  ROTULO_TIPO_PERICIA, cidsFrequentes, contagemTermino, diaMes, diasEntreISO, faixa12Meses, partesCid, postoDoInspecionado, resumoPericias, tipoDaPericia,
} from '../../utils/periciaMenorResumo';
import { STATUS_IS, statusEfetivoIS, dataHoraBr } from '../../utils/inspecoes';
import { extrairNomeInspecionado, formatCelular, formatCpf, formatDataBr, formatNip, idadeEmAnos } from '../../utils/format';
import { hojeISO } from '../../utils/dados';

type Filtro = 'tudo' | 'is' | 'pareceres' | 'pericias';
const TOM_PARECER = { solicitado: 'navyOutline', atrasado: 'danger', concluido: 'success' } as const;
const ROTULO_PARECER = { solicitado: 'Solicitado', atrasado: 'Atrasado', concluido: 'Concluído' } as const;
const isoDe = (ts: { toDate?: () => Date } | null | undefined): string => {
  const d = ts?.toDate?.();
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
};
const quandoEvento = (d: Date | null, hoje: string) => {
  if (!d) return 'agora';
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${iso === hoje ? 'hoje' : diaMes(iso)} · ${hora}`;
};

interface ItemLinha { chave: string; data: string; icone: string; titulo: string; detalhe: React.ReactNode; tag?: React.ReactNode; tipo: Exclude<Filtro, 'tudo'>; abrir?: () => void; to?: string; href?: string }

const LinhaDoTempo: React.FC<{ item: ItemLinha }> = ({ item }) => {
  const corpo = (
    <>
      <span className="material-symbols-outlined text-[22px] text-navy shrink-0 mt-0.5" aria-hidden="true">{item.icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-ink-3 tabular-nums">{dataBR(item.data)}</span>
        <span className="block text-sm font-bold text-navy break-words">{item.titulo}</span>
        <span className="block text-xs text-ink-3 break-words">{item.detalhe}</span>
      </span>
      {item.tag && <span className="shrink-0">{item.tag}</span>}
      {(item.abrir || item.to || item.href) && <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">{item.href ? 'open_in_new' : 'chevron_right'}</span>}
    </>
  );
  const classe = 'w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-thead transition-colors';
  if (item.abrir) return <button type="button" onClick={item.abrir} className={classe}>{corpo}</button>;
  if (item.to) return <Link to={item.to} className={classe}>{corpo}</Link>;
  if (item.href) return <a href={item.href} target="_blank" rel="noopener noreferrer" className={classe}>{corpo}</a>;
  return <div className="flex items-start gap-3 px-5 py-3">{corpo}</div>;
};

const CartaoSituacao: React.FC<{ icone: string; titulo: React.ReactNode; detalhe: React.ReactNode; tag?: React.ReactNode; to?: string; onClick?: () => void }> = ({ icone, titulo, detalhe, tag, to, onClick }) => {
  const corpo = (
    <>
      <span className="material-symbols-outlined text-[22px] text-navy shrink-0" aria-hidden="true">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-navy break-words">{titulo}</span>
        <span className="block text-xs text-ink-3 break-words">{detalhe}</span>
      </span>
      {tag && <span className="shrink-0">{tag}</span>}
    </>
  );
  const classe = 'min-w-[15rem] md:min-w-0 flex items-start gap-3 p-4 bg-white border border-line rounded-xl text-left';
  if (to) return <li className="contents"><Link to={to} className={`${classe} hover:border-navy transition-colors`}>{corpo}</Link></li>;
  if (onClick) return <li className="contents"><button type="button" onClick={onClick} className={`${classe} hover:border-navy transition-colors`}>{corpo}</button></li>;
  return <li className={classe}>{corpo}</li>;
};

const Dado: React.FC<{ rotulo: string; valor?: string | null }> = ({ rotulo, valor }) => (valor ? (
  <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">{rotulo}</dt><dd className="text-sm text-ink text-right break-words min-w-0">{valor}</dd></div>
) : null);

export const FichaInspecionado: React.FC = () => {
  const { nip: nipParam = '' } = useParams();
  const nip = decodeURIComponent(nipParam).replace(/\D/g, '');
  const nav = useNav();
  const navigate = useNavigate();
  const perfil = nav?.authUser?.perfil;
  const secoes = secoesDaFicha(perfil);
  const podeFicha = podeAbrirFicha(perfil);
  const t = termosPericia(perfil);
  const atestado = t.singular === 'atestado';
  const isDesktop = useIsDesktop();
  const [hoje] = useState(() => hojeISO());
  const [params, setParams] = useSearchParams();
  const sel = params.get('sel');
  const abaPericia: AbaPericia = params.get('aba') === 'historico' ? 'historico' : 'esta';
  const definir = (m: Record<string, string | null>) => setParams(prev => {
    const n = new URLSearchParams(prev);
    Object.entries(m).forEach(([k, v]) => { if (v) n.set(k, v); else n.delete(k); });
    return n;
  }, { replace: true });

  const [militar, setMilitar] = useState<MilitarRecord | null | undefined>(undefined);
  const [pericias, setPericias] = useState<PericiaMenorRecord[]>([]);
  const [inspecoes, setInspecoes] = useState<InspecaoRecord[]>([]);
  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  const [eventos, setEventos] = useState<EventoInspecionado[]>([]);
  const [verTodosEventos, setVerTodosEventos] = useState(false);
  const [cidAbrev, setCidAbrev] = useState<Map<string, string> | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('tudo');
  const [novaPericia, setNovaPericia] = useState(false);
  const [editando, setEditando] = useState(false);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [postos, setPostos] = useState<CorposQuadros['postos']>();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => (podeFicha && nip ? observarMilitar(nip, setMilitar, () => setMilitar(null)) : undefined), [nip, podeFicha]);
  useEffect(() => (secoes.pericias && nip ? observarPericiasDoMilitar(nip, setPericias, () => setPericias([])) : undefined), [nip, secoes.pericias]);
  useEffect(() => (secoes.inspecoes && nip ? observarInspecoesDoInspecionado(nip, setInspecoes, () => setInspecoes([])) : undefined), [nip, secoes.inspecoes]);
  useEffect(() => (secoes.pareceres && nip ? observarPareceresDoMilitar(nip, setPareceres, () => setPareceres([])) : undefined), [nip, secoes.pareceres]);
  useEffect(() => (secoes.eventos && nip ? observarEventosInspecionado(nip, setEventos, () => setEventos([])) : undefined), [nip, secoes.eventos]);
  useEffect(() => {
    if (!secoes.pericias) return;
    let vivo = true;
    carregarCid().then(l => { if (vivo) setCidAbrev(indiceCidAbreviado(l)); }).catch(() => { /* rótulo gravado */ });
    return () => { vivo = false; };
  }, [secoes.pericias]);
  // Auditoria de leitura: "abriu a ficha" (quem e quando), uma vez por ficha aberta.
  const auditada = useRef('');
  useEffect(() => {
    if (!podeFicha || !nip || auditada.current === nip) return;
    auditada.current = nip;
    registrarEventoInspecionado(nip, 'ficha.abrir');
  }, [nip, podeFicha]);
  useEffect(() => {
    if (!editando) return;
    carregarOms().then(setOms).catch(() => { /* mantém a OM atual */ });
    carregarCorposQuadros().then(d => setPostos(d.postos)).catch(() => { /* sem hierarquia */ });
  }, [editando]);

  // Cabeçalho mínimo: do cadastro ou, sem cadastro, do texto copiado no registro mais recente.
  const textoRegistro = pericias[0]?.inspecionado || inspecoes[0]?.inspecionado || pareceres[0]?.inspecionado || '';
  const nome = militar?.nome || extrairNomeInspecionado(textoRegistro) || formatNip(nip);
  const posto = militar?.pgq || postoDoInspecionado(textoRegistro, extrairNomeInspecionado(textoRegistro));
  const om = militar?.om || pericias[0]?.om || '';
  useBreadcrumbs(nome ? [{ label: nome }] : null);

  const resumo = useMemo(() => resumoPericias(pericias, hoje), [pericias, hoje]);
  const faixa = useMemo(() => faixa12Meses(pericias, hoje), [pericias, hoje]);
  const cids = useMemo(() => cidsFrequentes(pericias, cidAbrev), [pericias, cidAbrev]);
  const saldo = useMemo(() => saldoAcumulado(pericias, hoje), [pericias, hoje]);
  const [agora] = useState(() => Date.now());

  const vigente = pericias.find(p => p.dataTermino >= hoje);
  const isEmCurso = inspecoes.find(i => STATUS_IS[statusEfetivoIS(i, hoje)].situacao !== 'finalizada');
  const pareceresPendentes = pareceres.filter(p => statusEfetivo(p, agora) !== 'concluido');
  const em12 = (iso: string) => { const d = diasEntreISO(iso, hoje); return d >= 0 && d < 365; };
  const periciaSel = pericias.find(p => p.id === sel) ?? null;

  const itens: ItemLinha[] = useMemo(() => [
    ...pericias.map<ItemLinha>(p => {
      const cid = partesCid(p, cidAbrev);
      const c = contagemTermino(p.dataTermino, hoje);
      return {
        chave: `pm-${p.id}`, data: p.dataAtestado, icone: 'personal_injury', tipo: 'pericias',
        titulo: atestado ? 'Atestado registrado' : 'Perícia menor registrada',
        detalhe: <>{p.tempoHomologado} dia{p.tempoHomologado !== 1 ? 's' : ''} · {ROTULO_TIPO_PERICIA[tipoDaPericia(p.dispensas)]}{cid.codigo || cid.descricao ? ' · ' : ''}<CidCodigo codigo={cid.codigo} descricao={cid.descricao} /></>,
        tag: c.tom !== 'passado' ? <TextoContagem contagem={c} /> : <StatusTag tone="muted">Concluída</StatusTag>,
        abrir: () => definir({ sel: p.id, aba: null }),
      };
    }),
    ...inspecoes.map<ItemLinha>(i => {
      const st = STATUS_IS[statusEfetivoIS(i, hoje)];
      return {
        chave: `is-${i.id}`, data: (i.dataEntrevista || i.dataAbertura || '').slice(0, 10), icone: 'event_available', tipo: 'is',
        titulo: `IS ${i.is}${i.dataEntrevista ? ` · entrevista em ${dataHoraBr(i.dataEntrevista)}` : ' · aberta'}`,
        detalhe: [i.finalidade, i.amp, i.peritoNome].filter(Boolean).join(' · '),
        tag: <StatusTag tone={st.tom}>{st.rotulo}</StatusTag>, to: inspecaoPath(i.id),
      };
    }),
    ...pareceres.map<ItemLinha>(p => {
      const st = statusEfetivo(p, agora);
      return {
        chave: `pa-${p.id}`, data: isoDe(p.criadoEm) || hoje, icone: 'assignment', tipo: 'pareceres',
        titulo: `Parecer solicitado · ${p.especialidade}`, detalhe: p.finalidade || (p.pdfUrl ? 'Pedido em PDF arquivado' : ''),
        tag: <StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag>, href: p.pdfUrl || undefined,
      };
    }),
  ].sort((a, b) => b.data.localeCompare(a.data)), [pericias, inspecoes, pareceres, cidAbrev, hoje, agora, atestado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!podeFicha) return <AccessDenied pagina="Ficha do inspecionado" />;
  if (militar === undefined) {
    return <div className="flex flex-1 items-center justify-center py-20"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando ficha" /></div>;
  }
  if (militar === null && !textoRegistro) {
    return <Container className="py-8"><EmptyState icon="person_search" title="Inspecionado não encontrado" description="Não há cadastro nem registros com este NIP." /></Container>;
  }

  // Ações (4d): a principal do perfil vira primária/FAB; o resto vai para o ⋮.
  const podePericia = canUseFeature('pericia-menor.novo', perfil);
  const podeIS = secoes.inspecoes && canUseFeature('inspecoes.cadastrar', perfil);
  const podeParecer = secoes.pareceres && canUseFeature('pareceres.gerar', perfil);
  const acoes = [
    podePericia && { id: 'pericia', rotulo: atestado ? 'Atestado' : 'Perícia Menor', icone: 'add', onClick: () => setNovaPericia(true) },
    podeIS && { id: 'is', rotulo: 'Abrir IS', icone: 'event_available', onClick: () => navigate(`/inspecoes?novo=manual&inspecionado=${nip}`) },
    podeParecer && { id: 'parecer', rotulo: 'Pedir parecer', icone: 'assignment', onClick: () => navigate(`/pareceres?novo=1&militar=${nip}`) },
  ].filter(Boolean) as { id: string; rotulo: string; icone: string; onClick: () => void }[];
  const [principal, ...secundarias] = acoes;
  const menu: ItemMenu[] = [
    ...(!isDesktop ? secundarias.map(a => ({ rotulo: a.rotulo, icone: a.icone, onClick: a.onClick })) : []),
    ...(perfil === 'admin' && militar ? [{ rotulo: 'Editar cadastro', icone: 'edit', onClick: () => setEditando(true) }] : []),
    { rotulo: 'Imprimir resumo', icone: 'print', onClick: () => window.print() },
    ...(secoes.cadastro ? [{ rotulo: 'Abrir em Inspecionados', icone: 'groups', onClick: () => navigate('/inspecionados') }] : []),
  ];

  const tipo = militar ? tipoDoInspecionado(militar) : 'militar';
  const idade = idadeEmAnos(militar?.dataNascimento);
  const descricao = (
    <span className="tabular-nums">
      {[posto, formatNip(nip), om, tipo === 'dependente' ? 'dependente' : tipo === 'pensionista' ? 'pensionista' : null, idade !== null ? `${idade} anos` : null].filter(Boolean).join(' · ')}
      {tipo === 'dependente' && militar?.titularId && (
        <> · titular <Link to={fichaPath(militar.titularId)} className="font-bold text-blue underline underline-offset-2">{militar.titularNome || formatNip(militar.titularId)}</Link></>
      )}
    </span>
  );

  const abas = [
    { id: 'tudo' as Filtro, rotulo: 'Tudo', contagem: itens.length },
    ...(secoes.inspecoes ? [{ id: 'is' as Filtro, rotulo: 'IS', contagem: inspecoes.length }] : []),
    ...(secoes.pareceres ? [{ id: 'pareceres' as Filtro, rotulo: 'Pareceres', contagem: pareceres.length }] : []),
    ...(secoes.pericias ? [{ id: 'pericias' as Filtro, rotulo: atestado ? 'Atestados' : 'Perícias', contagem: pericias.length }] : []),
  ];
  const soPericias = !secoes.inspecoes && !secoes.pareceres;
  const visiveis = itens.filter(i => filtro === 'tudo' || i.tipo === filtro);
  const situacao = [
    secoes.pericias && vigente && (() => {
      const c = contagemTermino(vigente.dataTermino, hoje);
      return <CartaoSituacao key="pm" icone="personal_injury" titulo={`${ROTULO_TIPO_PERICIA[tipoDaPericia(vigente.dispensas)]} até ${diaMes(vigente.dataTermino)}`}
        detalhe={`${atestado ? 'Atestado' : 'Perícia'} de ${diaMes(vigente.dataAtestado)} · saldo ${saldo.restante} de 30 dias`} tag={<TextoContagem contagem={c} curto />}
        onClick={() => definir({ sel: vigente.id, aba: null })} />;
    })(),
    secoes.inspecoes && isEmCurso && (() => {
      const st = STATUS_IS[statusEfetivoIS(isEmCurso, hoje)];
      return <CartaoSituacao key="is" icone="event_available" titulo={`IS ${isEmCurso.is} · ${st.rotulo.toLocaleLowerCase('pt-BR')}`} detalhe={isEmCurso.finalidade} tag={<StatusTag tone={st.tom}>{st.rotulo}</StatusTag>} to={inspecaoPath(isEmCurso.id)} />;
    })(),
    secoes.pareceres && pareceresPendentes[0] && (() => {
      const p = pareceresPendentes[0];
      const st = statusEfetivo(p, agora);
      const desde = isoDe(p.criadoEm);
      return <CartaoSituacao key="pa" icone="assignment" titulo={`Parecer de ${p.especialidade}`} detalhe={`solicitado${desde ? ` em ${diaMes(desde)} · ${diasEntreISO(desde, hoje)} dias` : ''}${pareceresPendentes.length > 1 ? ` · +${pareceresPendentes.length - 1} pendente${pareceresPendentes.length > 2 ? 's' : ''}` : ''}`} tag={<StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag>} />;
    })(),
  ].filter(Boolean);

  const principalCol = (
    <div className="space-y-6">
      {secoes.pericias && pericias.length > 0 && (
        <Card title="Últimos 12 meses" actions={(
          <span className="flex items-center gap-3 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-navy" aria-hidden="true" />Dispensa total</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gold" aria-hidden="true" />Restrições</span>
          </span>
        )}>
          <ol className="grid grid-cols-12 gap-1" aria-label="Perícias por mês nos últimos 12 meses">
            {faixa.map(m => (
              <li key={m.chave} className="flex flex-col items-center gap-1">
                <span className={`w-full h-5 rounded ${m.tipo === 'dispensa' ? 'bg-navy' : m.tipo === 'restricoes' ? 'bg-gold' : 'bg-line'}`} aria-hidden="true" />
                <span className="text-xs font-semibold text-ink-3">{m.rotulo}<span className="sr-only">: {m.tipo ? ROTULO_TIPO_PERICIA[m.tipo] : 'nenhuma'}</span></span>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <Card padding="none" as="section" title={soPericias ? `${atestado ? 'Atestados' : 'Perícias menores'} · ${pericias.length}` : 'Linha do tempo'}>
        {!soPericias && <AbasSublinhadas rotulo="Filtrar a linha do tempo" idBase="ficha-linha" ativa={filtro} onChange={setFiltro} abas={abas} className="px-5" />}
        <div id="ficha-linha-painel" role={soPericias ? undefined : 'tabpanel'}>
          {visiveis.length === 0
            ? <p className="px-5 py-6 text-sm text-ink-3">Nenhum registro.</p>
            : <ul className="divide-y divide-line">{visiveis.map(i => <li key={i.chave}><LinhaDoTempo item={i} /></li>)}</ul>}
        </div>
      </Card>
    </div>
  );

  const nIs12 = inspecoes.filter(i => em12(i.dataAbertura)).length;
  const pa12 = pareceres.filter(p => em12(isoDe(p.criadoEm) || hoje));
  const pm12 = pericias.filter(p => em12(p.dataAtestado));
  const eventosVisiveis = verTodosEventos ? eventos : eventos.slice(0, 5);
  const apoio = (
    <div className="space-y-6">
      {!soPericias && (
        <Card title="Em 12 meses">
          <dl className="divide-y divide-line">
            {secoes.inspecoes && <Dado rotulo="Inspeções de Saúde" valor={String(nIs12)} />}
            {secoes.pareceres && <Dado rotulo="Pareceres" valor={`${pa12.length}${pareceresPendentes.length ? ` · ${pareceresPendentes.length} pendente${pareceresPendentes.length !== 1 ? 's' : ''}` : ''}`} />}
            {secoes.pericias && <Dado rotulo={atestado ? 'Atestados' : 'Perícias menores'} valor={`${pm12.length} · ${resumo.dispensa.m12} dias de dispensa`} />}
          </dl>
        </Card>
      )}
      {secoes.pericias && pericias.length > 0 && (
        <Card title="Resumo">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">Dias de dispensa total e de restrições</caption>
            <thead className="text-xs text-ink-3">
              <tr><th scope="col" className="text-left font-semibold pb-1">Dias</th><th scope="col" className="text-right font-semibold pb-1">30 dias</th><th scope="col" className="text-right font-semibold pb-1">12 meses</th><th scope="col" className="text-right font-semibold pb-1">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {([['Dispensa', resumo.dispensa], ['Restrições', resumo.restricoes]] as const).map(([rot, l]) => (
                <tr key={rot}><th scope="row" className="text-left font-semibold text-ink py-1.5">{rot}</th><td className="text-right">{l.d30}</td><td className="text-right font-bold text-navy">{l.m12}</td><td className="text-right">{l.total}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-ink-3 mt-2">{resumo.registros} registro{resumo.registros !== 1 ? 's' : ''} · {resumo.vigentes} vigente{resumo.vigentes !== 1 ? 's' : ''} · {resumo.vdf} com VDF</p>
          <SaldoAcumulado usados={saldo.usados} restante={saldo.restante} className="mt-4" />
        </Card>
      )}
      {secoes.pericias && cids.length > 0 && (
        <Card title="CID mais frequentes">
          <ul className="space-y-1.5">
            {cids.map(c => <li key={c.chave} className="flex justify-between gap-3 text-sm"><CidCodigo codigo={c.codigo} descricao={c.descricao} className="min-w-0" /><span className="text-ink-3 tabular-nums shrink-0">{c.n}×</span></li>)}
          </ul>
        </Card>
      )}
      {secoes.cadastro && militar && (
        <Card title="Cadastro" actions={perfil === 'admin' ? <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditando(true)}>Editar</Button> : undefined}>
          <dl className="divide-y divide-line">
            <Dado rotulo="Situação" valor={militar.ativo ? 'Ativo' : 'Inativo'} />
            {tipo === 'militar' && <Dado rotulo="Vínculo" valor={militar.temporario ? 'Temporário' : (militar.rm1 || militar.refo) ? 'Inativo' : 'Carreira'} />}
            <Dado rotulo="Especialidade" valor={militar.especialidade} />
            <Dado rotulo="Nascimento" valor={formatDataBr(militar.dataNascimento)} />
            <Dado rotulo="Serviço do HNRe" valor={militar.servico_label} />
            <Dado rotulo="E-mail" valor={militar.email} />
            <Dado rotulo="Celular" valor={formatCelular(militar.celular)} />
            <Dado rotulo="CPF" valor={formatCpf(militar.cpf)} />
          </dl>
        </Card>
      )}
      {secoes.eventos && (
        <Card title="Registro de eventos" actions={<span className="inline-flex items-center gap-1 text-xs text-ink-3"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>só Admin</span>}>
          {eventos.length === 0 ? <p className="text-sm text-ink-3">Nenhum evento registrado.</p> : (
            <ul className="space-y-2">
              {eventosVisiveis.map(e => (
                <li key={e.id} className="text-sm">
                  <span className="text-ink"><strong className="text-navy">{e.usuario || 'Usuário'}</strong> {ROTULO_ACAO_INSPECIONADO[e.acao as keyof typeof ROTULO_ACAO_INSPECIONADO] ?? e.acao}{e.ref && e.acao !== 'ficha.abrir' ? ` (${e.ref})` : ''}</span>
                  <span className="block text-xs text-ink-3 tabular-nums">{quandoEvento(e.em, hoje)}</span>
                </li>
              ))}
            </ul>
          )}
          {eventos.length > 5 && <Button variant="ghost" size="sm" className="mt-2" onClick={() => setVerTodosEventos(v => !v)}>{verTodosEventos ? 'Mostrar menos' : `Ver todos (${eventos.length})`}</Button>}
        </Card>
      )}
    </div>
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
        <PageHeader
          title={nome}
          description={descricao}
          actions={(
            <>
              <MenuAcoes rotulo="Mais ações da ficha" itens={menu} />
              {isDesktop && secundarias.map(a => <Button key={a.id} variant="secondary" icon={a.icone} onClick={a.onClick}>{a.rotulo}</Button>)}
            </>
          )}
          fab={principal ? { icon: principal.icone, label: principal.rotulo, onClick: principal.onClick } : undefined}
          className="!mb-0"
        />

        {situacao.length > 0 && (
          <section aria-label="Situação atual">
            <ul className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-1">{situacao}</ul>
          </section>
        )}

        <GradePainel principal={principalCol} apoio={apoio} rotuloApoio="Resumo do inspecionado" />
      </Container>

      {periciaSel && (
        <PericiaMenorPainel
          pericia={periciaSel} historico={pericias} hoje={hoje} cidAbrev={cidAbrev} modo={isDesktop ? 'flutuante' : 'sheet'} termos={t}
          aba={abaPericia} onAba={a => definir({ aba: a === 'historico' ? 'historico' : null })}
          onSelecionar={id => definir({ sel: id })} onFechar={() => definir({ sel: null, aba: null })}
          onNova={podePericia ? () => setNovaPericia(true) : undefined}
        />
      )}
      {periciaSel && isDesktop && <FecharComEsc onFechar={() => definir({ sel: null, aba: null })} />}
      {novaPericia && podePericia && (
        <NovaPericiaMenorForm titulo={t.novo} militarInicial={nip} onClose={() => setNovaPericia(false)}
          onRegistrado={n => { setNovaPericia(false); setToast(atestado ? `Atestado de ${n} registrado.` : `Perícia menor de ${n} registrada.`); window.setTimeout(() => setToast(null), 4000); }} />
      )}
      {editando && militar && perfil === 'admin' && (
        <MilitarEdicao militar={militar} oms={oms} postos={postos} onClose={() => setEditando(false)}
          onSalvo={n => { setEditando(false); setToast(`Dados de ${n} atualizados.`); window.setTimeout(() => setToast(null), 4000); }} />
      )}
    </div>
  );
};

/** Esc fecha o painel não modal de perícia (desktop), sem disputar com diálogos abertos. */
const FecharComEsc: React.FC<{ onFechar: () => void }> = ({ onFechar }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('[aria-modal="true"]')) return;
      onFechar();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);
  return null;
};

export { LinhaRegistroPericia };
