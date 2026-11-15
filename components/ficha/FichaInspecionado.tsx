// Ficheiro: components/ficha/FichaInspecionado.tsx
// Ficha do inspecionado (/inspecionados/:nip — auditoria v3, seção 9; MF1–MF4, PM6, PM8, PMD3).
// Uma página com o que o perfil pode ver (components/ficha/permissoes.ts — sem abas fantasmas):
//   cabeçalho (o nome abre o top sheet com os dados cadastrais; ⋮ com "Registro de eventos" só do Admin) ·
//   guias "Inspeções de Saúde" × "Perícias Menores" (Segmented, fixas no topo ao rolar) · Situação atual ·
//   coluna principal (8): faixa dos últimos 12 meses com os períodos da guia (LTS/Restrições nas IS,
//   Dispensa/Restrições nas perícias) e a linha do tempo da guia · coluna de apoio (4):
//     - IS: resumo do ano (IS, dias de LTS e de Restrições), atestados/relatórios médicos e exames enviados
//       em "Enviar exames" (classificados pela IA — services/examesIS.ts), pareceres pedidos nas IS e CIDs;
//     - Perícias Menores: resumo de dispensas/restrições, atestados homologados e CIDs.
//   Cards sem itens aparecem vazios; guia sem registros mostra só o aviso (nenhum card).
// Os PDFs abrem no PdfFullscreenModal; IS e perícias abrem o detalhe num Drawer à direita (sem sair da ficha).
// Afastamentos das IS: adaptador único afastamentosDaIS (utils/fichaInspecionado.ts).
// Leitura limitada às consultas por NIP (where militarId/inspecionadoId == nip), nunca a coleção inteira (MF2).
// Abrir a ficha grava o evento "abriu a ficha" (quem e quando) em militares/{nip}/eventos (best effort).
// Substitui a antiga página de histórico da Perícia Menor (/pericia-menor/historico/<nip> redireciona para cá).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container } from '../ui/Page';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { Segmented } from '../ui/Segmented';
import { StatusTag } from '../ui/StatusTag';
import { EmptyState } from '../ui/EmptyState';
import { AccessDenied } from '../ui/AccessDenied';
import { Toast } from '../ui/Toast';
import { Drawer } from '../ui/Drawer';
import { GradePainel } from '../ui/Grade';
import { FabAcoes } from '../ui/Fab';
import { useTituloPagina } from '../shell/TituloPagina';
import { PdfFullscreenModal } from '../PdfFullscreenModal';
import { CidCodigo, SaldoAcumulado, TextoContagem } from '../periciaMenor/partes';
import { LinhaRegistroPericia, PericiaMenorPainel, type AbaPericia } from '../periciaMenor/PericiaMenorPainel';
import { NovaPericiaMenorForm } from '../periciaMenor/NovaPericiaMenorForm';
import { InspecaoDetalhe, fasesDeEntrevista } from '../inspecoes/InspecaoDetalhe';
import { NovoParecerForm } from '../pareceres/NovoParecerForm';
import { MilitarEdicao } from '../Militares';
import { CadastroTopSheet, type DadoCadastro } from './CadastroTopSheet';
import { useExamesDasIS, type ExameDaFicha } from './useExamesDasIS';
import { secoesDaFicha, podeAbrirFicha } from './permissoes';
import { useNav } from '../../context/NavContext';
import { useBreadcrumbs } from '../../context/BreadcrumbContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { canUseFeature } from '../../config/permissions';
import { podeUsarEntrevista } from '../../config/entrevistas';
import { termosPericia } from '../../config/termosPericia';
import { fichaPath } from '../../config/routes';
import { observarMilitar, tipoDoInspecionado, type MilitarRecord } from '../../services/firestoreMilitares';
import { observarPericiasDoMilitar, dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { atualizarInspecao, observarInspecoesDoInspecionado, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { observarPareceresDoMilitar, statusEfetivo, type ParecerRecord } from '../../services/firestorePareceres';
import { observarEventosInspecionado, registrarEventoInspecionado, ROTULO_ACAO_INSPECIONADO, type EventoInspecionado } from '../../services/eventosInspecionado';
import { urlDoExame } from '../../services/examesIS';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { carregarCid, carregarCorposQuadros, carregarOms, type CorposQuadros, type OrganizacaoMilitar } from '../../utils/corposQuadros';
import { indiceCidAbreviado } from '../../utils/periciaMenorLista';
import { saldoAcumulado } from '../../utils/periciaMenorRegras';
import {
  ROTULO_TIPO_PERICIA, cidsFrequentes, contagemTermino, diaMes, diasEntreISO, faixa12Meses, partesCid, postoDoInspecionado, resumoPericias, tipoDaPericia,
} from '../../utils/periciaMenorResumo';
import {
  afastamentosDaIS, cidsDaIS, faixaPeriodos12Meses, guiaInicial, itensDaGuia, listaCidsDasIS, pareceresDasIS, resumoISNoAno,
  type GuiaFicha, type TipoAfastamentoIS,
} from '../../utils/fichaInspecionado';
import { classeDoExame, ROTULO_TIPO } from '../../utils/examesIS';
import { STATUS_IS, statusEfetivoIS, dataHoraBr, situacaoDoStatus } from '../../utils/inspecoes';
import { getDriveEmbedUrl, isGoogleDriveUrl } from '../../utils/googleDrive';
import { extrairNomeInspecionado, formatCelular, formatCpf, formatDataBr, formatNip, idadeEmAnos } from '../../utils/format';
import { hojeISO } from '../../utils/dados';

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
const dias = (n: number) => `${n} dia${n !== 1 ? 's' : ''}`;
/** O iframe do modal não abre a página /view do Drive: usa a de preview embutido. */
const urlParaModal = (url: string) => (isGoogleDriveUrl(url) ? getDriveEmbedUrl(url) ?? url : url);

interface ItemLinha { chave: string; data: string; icone: string; titulo: string; detalhe: React.ReactNode; tag?: React.ReactNode; tipo: 'is' | 'pericias'; abrir: () => void }

const LinhaDoTempo: React.FC<{ item: ItemLinha }> = ({ item }) => (
  <button type="button" onClick={item.abrir} aria-haspopup="dialog" className="w-full text-left flex items-start gap-3 px-4 md:px-5 py-3 hover:bg-thead transition-colors">
    <span className="material-symbols-outlined text-[22px] text-navy shrink-0 mt-0.5" aria-hidden="true">{item.icone}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-xs text-ink-3 tabular-nums">{item.data ? dataBR(item.data) : '—'}</span>
      <span className="block text-sm font-bold text-navy break-words">{item.titulo}</span>
      <span className="block text-xs text-ink-3 break-words">{item.detalhe}</span>
    </span>
    {item.tag && <span className="shrink-0 max-w-[45%] text-right">{item.tag}</span>}
    <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">chevron_right</span>
  </button>
);

const CartaoSituacao: React.FC<{ icone: string; titulo: React.ReactNode; detalhe: React.ReactNode; tag?: React.ReactNode; onClick?: () => void }> = ({ icone, titulo, detalhe, tag, onClick }) => {
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
  const classe = 'w-full flex items-start gap-3 p-4 bg-white border border-line rounded-xl text-left';
  if (onClick) return <li><button type="button" onClick={onClick} className={`${classe} hover:border-navy transition-colors`}>{corpo}</button></li>;
  return <li className={classe}>{corpo}</li>;
};

const Dado: React.FC<{ rotulo: string; valor?: string | number | null }> = ({ rotulo, valor }) => (
  <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">{rotulo}</dt><dd className="text-sm text-ink text-right break-words min-w-0 tabular-nums">{valor ?? '—'}</dd></div>
);

/** Linha clicável de documento (PDF) num card de apoio. */
const LinhaDocumento: React.FC<{ icone: string; titulo: string; detalhe: React.ReactNode; tag?: React.ReactNode; onClick?: () => void; carregando?: boolean }> = ({ icone, titulo, detalhe, tag, onClick, carregando }) => {
  const corpo = (
    <>
      <span className={`material-symbols-outlined text-[20px] text-navy shrink-0 mt-0.5 ${carregando ? 'animate-spin' : ''}`} aria-hidden="true">{carregando ? 'progress_activity' : icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink break-words">{titulo}</span>
        <span className="block text-xs text-ink-3 break-words tabular-nums">{detalhe}</span>
      </span>
      {tag && <span className="shrink-0">{tag}</span>}
    </>
  );
  const classe = 'w-full text-left flex items-start gap-3 px-4 md:px-5 py-2.5 min-h-[44px]';
  return onClick
    ? <li><button type="button" onClick={onClick} aria-haspopup="dialog" className={`${classe} hover:bg-thead transition-colors`}>{corpo}</button></li>
    : <li className={classe}>{corpo}</li>;
};

/** Card de lista do apoio: vazio mostra o EmptyState dentro do card. */
const CardLista: React.FC<{ titulo: string; vazio: { icone: string; titulo: string; descricao?: string }; n: number; children: React.ReactNode }> = ({ titulo, vazio, n, children }) => (
  <Card padding="none" as="section" title={<>{titulo}{n > 0 && <span className="text-ink-3 font-semibold"> · {n}</span>}</>}>
    {n === 0
      ? <div className="-mt-4"><EmptyState icon={vazio.icone} title={vazio.titulo} description={vazio.descricao} /></div>
      : <ul className="divide-y divide-line border-t border-line">{children}</ul>}
  </Card>
);

/** Faixa dos últimos 12 meses (um quadradinho por mês) com legenda de dois tipos. */
function Faixa12Meses<T extends string>({ meses, legenda, rotulo }: { meses: { chave: string; rotulo: string; tipo: T | null }[]; legenda: { tipo: T; rotulo: string; classe: string }[]; rotulo: string }) {
  const classeDe = (t: T | null) => legenda.find(l => l.tipo === t)?.classe ?? 'bg-line';
  return (
    <Card title="Últimos 12 meses" actions={(
      <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-ink-3">
        {legenda.map(l => <span key={l.tipo} className="inline-flex items-center gap-1"><span className={`w-3 h-3 rounded-sm ${l.classe}`} aria-hidden="true" />{l.rotulo}</span>)}
      </span>
    )}>
      <ol className="grid grid-cols-12 gap-0.5 sm:gap-1" aria-label={rotulo}>
        {meses.map(m => (
          <li key={m.chave} className="flex flex-col items-center gap-1 min-w-0">
            <span className={`w-full h-5 rounded ${classeDe(m.tipo)}`} aria-hidden="true" />
            <span className="text-xs font-semibold text-ink-3 truncate max-w-full">{m.rotulo}<span className="sr-only">: {legenda.find(l => l.tipo === m.tipo)?.rotulo ?? 'nenhum'}</span></span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const LEGENDA_IS: { tipo: TipoAfastamentoIS; rotulo: string; classe: string }[] = [
  { tipo: 'lts', rotulo: 'LTS', classe: 'bg-navy' },
  { tipo: 'restricoes', rotulo: 'Restrições', classe: 'bg-gold' },
];
const LEGENDA_PM: { tipo: 'dispensa' | 'restricoes'; rotulo: string; classe: string }[] = [
  { tipo: 'dispensa', rotulo: 'Dispensa total', classe: 'bg-navy' },
  { tipo: 'restricoes', rotulo: 'Restrições', classe: 'bg-gold' },
];

const tituloExame = (e: ExameDaFicha) => e.itens.map(i => i.titulo || ROTULO_TIPO[i.tipo]).filter(Boolean).join(' · ') || e.nomeArquivo || 'PDF';
const dataExame = (e: ExameDaFicha) => e.itens.find(i => i.data)?.data || isoDe(e.enviadoEm);

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
  const isSelId = params.get('is');
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
  const [cidAbrev, setCidAbrev] = useState<Map<string, string> | null>(null);
  const [novaPericia, setNovaPericia] = useState(false);
  const [editando, setEditando] = useState(false);
  const [verCadastro, setVerCadastro] = useState(false);
  const [verEventos, setVerEventos] = useState(false);
  const [pdf, setPdf] = useState<{ titulo: string; url: string } | null>(null);
  const [abrindoExame, setAbrindoExame] = useState<string | null>(null);
  const [parecerPara, setParecerPara] = useState<{ is: InspecaoRecord; inicial?: ParecerRecord } | null>(null);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [postos, setPostos] = useState<CorposQuadros['postos']>();
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4000); };

  useEffect(() => (podeFicha && nip ? observarMilitar(nip, setMilitar, () => setMilitar(null)) : undefined), [nip, podeFicha]);
  useEffect(() => (secoes.pericias && nip ? observarPericiasDoMilitar(nip, setPericias, () => setPericias([])) : undefined), [nip, secoes.pericias]);
  useEffect(() => (secoes.inspecoes && nip ? observarInspecoesDoInspecionado(nip, setInspecoes, () => setInspecoes([])) : undefined), [nip, secoes.inspecoes]);
  useEffect(() => (secoes.pareceres && nip ? observarPareceresDoMilitar(nip, setPareceres, () => setPareceres([])) : undefined), [nip, secoes.pareceres]);
  useEffect(() => (secoes.eventos && nip ? observarEventosInspecionado(nip, setEventos, () => setEventos([])) : undefined), [nip, secoes.eventos]);
  useEffect(() => {
    if (!secoes.pericias && !secoes.inspecoes) return;
    let vivo = true;
    carregarCid().then(l => { if (vivo) setCidAbrev(indiceCidAbreviado(l)); }).catch(() => { /* só o código */ });
    return () => { vivo = false; };
  }, [secoes.pericias, secoes.inspecoes]);
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

  // Guia ativa: ?guia=is|pm; sem ela, IS (ou Perícias Menores, se só houver perícias).
  const visGuias = { is: secoes.inspecoes || secoes.pareceres, pm: secoes.pericias };
  const guia: GuiaFicha = guiaInicial(params.get('guia'), visGuias, { is: inspecoes.length, pm: pericias.length });
  const exames = useExamesDasIS(inspecoes, secoes.inspecoes && guia === 'is');

  // Cabeçalho mínimo: do cadastro ou, sem cadastro, do texto copiado no registro mais recente.
  const textoRegistro = pericias[0]?.inspecionado || inspecoes[0]?.inspecionado || pareceres[0]?.inspecionado || '';
  const nome = militar?.nome || extrairNomeInspecionado(textoRegistro) || formatNip(nip);
  const posto = militar?.pgq || postoDoInspecionado(textoRegistro, extrairNomeInspecionado(textoRegistro));
  const om = militar?.om || pericias[0]?.om || '';
  useBreadcrumbs(nome ? [{ label: nome }] : null);
  const tituloNaTopbar = useTituloPagina(nome);

  const resumo = useMemo(() => resumoPericias(pericias, hoje), [pericias, hoje]);
  const faixaPM = useMemo(() => faixa12Meses(pericias, hoje), [pericias, hoje]);
  const cidsPM = useMemo(() => cidsFrequentes(pericias, cidAbrev, Number.POSITIVE_INFINITY), [pericias, cidAbrev]);
  const saldo = useMemo(() => saldoAcumulado(pericias, hoje), [pericias, hoje]);
  const homologados = useMemo(() => pericias.filter(p => p.homologacao), [pericias]);
  const resumoIS = useMemo(() => resumoISNoAno(inspecoes as unknown as Record<string, unknown>[], hoje), [inspecoes, hoje]);
  const periodosIS = useMemo(() => inspecoes.flatMap(i => afastamentosDaIS(i as unknown as Record<string, unknown>)), [inspecoes]);
  const faixaIS = useMemo(() => faixaPeriodos12Meses(periodosIS, hoje, ['lts', 'restricoes'] as const), [periodosIS, hoje]);
  const pareceresIS = useMemo(() => pareceresDasIS(pareceres, inspecoes.map(i => i.id)), [pareceres, inspecoes]);
  const atestadosIS = useMemo(() => exames.filter(e => classeDoExame(e) === 'atestado_relatorio'), [exames]);
  const examesIS = useMemo(() => exames.filter(e => classeDoExame(e) === 'laudo_exame'), [exames]);
  const cidsIS = useMemo(() => listaCidsDasIS(inspecoes.map(i => ({
    is: i.is,
    cids: cidsDaIS(i as unknown as Record<string, unknown>, exames.filter(e => e.isId === i.id).flatMap(e => e.itens.map(it => it.texto))),
  }))), [inspecoes, exames]);
  const [agora] = useState(() => Date.now());

  const vigente = pericias.find(p => p.dataTermino >= hoje);
  const isEmCurso = inspecoes.find(i => STATUS_IS[statusEfetivoIS(i, hoje)].situacao !== 'finalizada');
  const pareceresPendentes = pareceresIS.filter(p => statusEfetivo(p, agora) !== 'concluido');
  const periciaSel = pericias.find(p => p.id === sel) ?? null;
  const isSel = inspecoes.find(i => i.id === isSelId) ?? null;

  const itens: ItemLinha[] = useMemo(() => [
    ...pericias.map<ItemLinha>(p => {
      const cid = partesCid(p, cidAbrev);
      const c = contagemTermino(p.dataTermino, hoje);
      return {
        chave: `pm-${p.id}`, data: p.dataAtestado, icone: 'personal_injury', tipo: 'pericias',
        titulo: atestado ? 'Atestado registrado' : p.homologacao ? 'Atestado homologado' : 'Perícia menor registrada',
        detalhe: <>{dias(p.tempoHomologado)} · {ROTULO_TIPO_PERICIA[tipoDaPericia(p.dispensas)]}{cid.codigo || cid.descricao ? ' · ' : ''}<CidCodigo codigo={cid.codigo} descricao={cid.descricao} /></>,
        tag: c.tom !== 'passado' ? <TextoContagem contagem={c} /> : <StatusTag tone="muted">Concluída</StatusTag>,
        abrir: () => definir({ sel: p.id, aba: null, is: null }),
      };
    }),
    ...inspecoes.map<ItemLinha>(i => {
      const st = STATUS_IS[statusEfetivoIS(i, hoje)];
      const periodos = afastamentosDaIS(i as unknown as Record<string, unknown>);
      return {
        chave: `is-${i.id}`, data: (i.dataEntrevista || i.dataAbertura || '').slice(0, 10), icone: 'event_available', tipo: 'is',
        titulo: `IS ${i.is}${i.dataEntrevista ? ` · entrevista em ${dataHoraBr(i.dataEntrevista)}` : ' · aberta'}`,
        detalhe: [i.finalidade, i.laudo, ...periodos.map(p => `${p.tipo === 'lts' ? 'LTS' : 'Restrições'} ${dias(p.dias)}`), i.peritoNome].filter(Boolean).join(' · '),
        tag: <StatusTag tone={st.tom}>{st.rotulo}</StatusTag>,
        abrir: () => definir({ is: i.id, sel: null, aba: null }),
      };
    }),
  ].sort((a, b) => b.data.localeCompare(a.data)), [pericias, inspecoes, cidAbrev, hoje, atestado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!podeFicha) return <AccessDenied pagina="Ficha do inspecionado" />;
  if (militar === undefined) {
    return <div className="flex flex-1 items-center justify-center py-20"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando ficha" /></div>;
  }
  if (militar === null && !textoRegistro) {
    return <Container className="py-8"><EmptyState icon="person_search" title="Inspecionado não encontrado" description="Não há cadastro nem registros com este NIP." /></Container>;
  }

  // Ações (4d): a principal do perfil vira primária/FAB; o resto vai para o ⋮. Pareceres só a partir de uma IS
  // (no detalhe da IS), nunca soltos na ficha.
  const podePericia = canUseFeature('pericia-menor.novo', perfil);
  const podeIS = secoes.inspecoes && canUseFeature('inspecoes.cadastrar', perfil);
  const acoes = [
    podePericia && { id: 'pericia', rotulo: atestado ? 'Atestado' : 'Perícia Menor', icone: 'add', onClick: () => setNovaPericia(true) },
    podeIS && { id: 'is', rotulo: 'Abrir IS', icone: 'event_available', onClick: () => navigate(`/inspecoes?novo=manual&inspecionado=${nip}`) },
  ].filter(Boolean) as { id: string; rotulo: string; icone: string; onClick: () => void }[];
  const [principal, ...secundarias] = acoes;
  const menu: ItemMenu[] = [
    ...(!isDesktop ? secundarias.map(a => ({ rotulo: a.rotulo, icone: a.icone, onClick: a.onClick })) : []),
    { rotulo: 'Dados cadastrais', icone: 'badge', onClick: () => setVerCadastro(true) },
    ...(perfil === 'admin' && militar ? [{ rotulo: 'Editar cadastro', icone: 'edit', onClick: () => setEditando(true) }] : []),
    ...(secoes.eventos ? [{ rotulo: 'Registro de eventos', icone: 'history', onClick: () => setVerEventos(true) }] : []),
    { rotulo: 'Imprimir resumo', icone: 'print', onClick: () => window.print() },
    ...(secoes.cadastro ? [{ rotulo: 'Abrir em Inspecionados', icone: 'groups', onClick: () => navigate('/inspecionados') }] : []),
  ];

  const tipo = militar ? tipoDoInspecionado(militar) : 'militar';
  const idade = idadeEmAnos(militar?.dataNascimento);
  const linhaId = [posto, formatNip(nip), om, tipo === 'dependente' ? 'dependente' : tipo === 'pensionista' ? 'pensionista' : null, idade !== null ? `${idade} anos` : null].filter(Boolean).join(' · ');
  const titular = tipo === 'dependente' && militar?.titularId ? (
    <> · titular <Link to={fichaPath(militar.titularId)} className="font-bold text-blue underline underline-offset-2">{militar.titularNome || formatNip(militar.titularId)}</Link></>
  ) : null;

  const dadosCadastro: DadoCadastro[] = secoes.cadastro && militar ? [
    { rotulo: 'Posto/Graduação', valor: militar.pgq },
    { rotulo: 'NIP', valor: formatNip(nip) },
    { rotulo: 'OM', valor: militar.om },
    { rotulo: 'Situação', valor: militar.ativo ? 'Ativo' : 'Inativo' },
    ...(tipo === 'militar' ? [{ rotulo: 'Vínculo', valor: militar.temporario ? 'Temporário' : (militar.rm1 || militar.refo) ? 'Inativo' : 'Carreira' }] : []),
    ...(tipo === 'dependente' ? [{ rotulo: 'Titular', valor: militar.titularNome || (militar.titularId ? formatNip(militar.titularId) : '') }] : []),
    { rotulo: 'Especialidade', valor: militar.especialidade },
    { rotulo: 'Nascimento', valor: [formatDataBr(militar.dataNascimento), idade !== null ? `(${idade} anos)` : ''].filter(Boolean).join(' ') },
    { rotulo: 'Serviço do HNRe', valor: militar.servico_label },
    { rotulo: 'E-mail', valor: militar.email },
    { rotulo: 'Celular', valor: formatCelular(militar.celular) },
    { rotulo: 'CPF', valor: formatCpf(militar.cpf) },
  ] : [
    { rotulo: 'Posto/Graduação', valor: posto },
    { rotulo: 'NIP', valor: formatNip(nip) },
    { rotulo: 'OM', valor: om },
  ];
  const avisoCadastro = !militar ? 'Sem cadastro em Inspecionados: dados copiados do registro mais recente.'
    : !secoes.cadastro ? 'Os demais dados cadastrais ficam na página Inspecionados.' : undefined;

  // ---- Guias ----
  const opcoesGuia = [
    ...(visGuias.is ? [{ value: 'is' as GuiaFicha, label: 'Inspeções de Saúde', icon: 'event_available', badge: inspecoes.length, badgeTone: 'neutro' as const }] : []),
    ...(visGuias.pm ? [{ value: 'pm' as GuiaFicha, label: atestado ? 'Atestados' : 'Perícias Menores', icon: 'personal_injury', badge: pericias.length, badgeTone: 'neutro' as const }] : []),
  ];
  const semRegistros = guia === 'is' ? inspecoes.length === 0 : pericias.length === 0;
  const visiveis = itensDaGuia(itens, guia);

  const situacao = (guia === 'pm' ? [
    vigente && (() => {
      const c = contagemTermino(vigente.dataTermino, hoje);
      return <CartaoSituacao key="pm" icone="personal_injury" titulo={`${ROTULO_TIPO_PERICIA[tipoDaPericia(vigente.dispensas)]} até ${diaMes(vigente.dataTermino)}`}
        detalhe={`${atestado ? 'Atestado' : 'Perícia'} de ${diaMes(vigente.dataAtestado)} · saldo ${saldo.restante} de 30 dias`} tag={<TextoContagem contagem={c} curto />}
        onClick={() => definir({ sel: vigente.id, aba: null, is: null })} />;
    })(),
  ] : [
    isEmCurso && (() => {
      const st = STATUS_IS[statusEfetivoIS(isEmCurso, hoje)];
      return <CartaoSituacao key="is" icone="event_available" titulo={`IS ${isEmCurso.is} · ${st.rotulo.toLocaleLowerCase('pt-BR')}`} detalhe={isEmCurso.finalidade} tag={<StatusTag tone={st.tom}>{st.rotulo}</StatusTag>} onClick={() => definir({ is: isEmCurso.id, sel: null, aba: null })} />;
    })(),
    pareceresPendentes[0] && (() => {
      const p = pareceresPendentes[0];
      const st = statusEfetivo(p, agora);
      const desde = isoDe(p.criadoEm);
      return <CartaoSituacao key="pa" icone="assignment" titulo={`Parecer de ${p.especialidade}`} detalhe={`IS ${p.is ?? ''} · solicitado${desde ? ` em ${diaMes(desde)} · ${diasEntreISO(desde, hoje)} dias` : ''}${pareceresPendentes.length > 1 ? ` · +${pareceresPendentes.length - 1} pendente${pareceresPendentes.length > 2 ? 's' : ''}` : ''}`} tag={<StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag>} onClick={p.pdfUrl ? () => setPdf({ titulo: `Parecer de ${p.especialidade}`, url: urlParaModal(p.pdfUrl) }) : undefined} />;
    })(),
  ]).filter(Boolean);

  const abrirExame = async (e: ExameDaFicha) => {
    setAbrindoExame(e.id);
    try { setPdf({ titulo: `${tituloExame(e)} — IS ${e.is}`, url: await urlDoExame(e) }); }
    catch { avisar('Não foi possível abrir o PDF.', 'error'); }
    finally { setAbrindoExame(null); }
  };
  const linhaExame = (e: ExameDaFicha, icone: string) => (
    <LinhaDocumento key={`${e.isId}-${e.id}`} icone={icone} titulo={tituloExame(e)} carregando={abrindoExame === e.id}
      detalhe={[`IS ${e.is}`, dataExame(e) ? dataBR(dataExame(e)) : '', e.itens.find(i => i.emissor)?.emissor].filter(Boolean).join(' · ')}
      onClick={() => abrirExame(e)} />
  );

  const linhaDoTempo = (
    <Card padding="none" as="section" title={`${guia === 'is' ? 'Inspeções de Saúde' : atestado ? 'Atestados' : 'Perícias menores'} · ${visiveis.length}`}>
      <ul className="divide-y divide-line border-t border-line">{visiveis.map(i => <li key={i.chave}><LinhaDoTempo item={i} /></li>)}</ul>
    </Card>
  );

  const principalCol = guia === 'is' ? (
    <div className="space-y-4 md:space-y-6">
      <Faixa12Meses meses={faixaIS} legenda={LEGENDA_IS} rotulo="LTS e restrições por mês nos últimos 12 meses" />
      {linhaDoTempo}
    </div>
  ) : (
    <div className="space-y-4 md:space-y-6">
      <Faixa12Meses meses={faixaPM} legenda={LEGENDA_PM} rotulo={`${atestado ? 'Atestados' : 'Perícias'} por mês nos últimos 12 meses`} />
      {linhaDoTempo}
    </div>
  );

  const doLaudo = periodosIS.some(p => p.origem === 'laudo');
  const apoioIS = (
    <div className="space-y-4 md:space-y-6">
      <Card title={`Resumo de ${resumoIS.ano}`}>
        <dl className="divide-y divide-line">
          <Dado rotulo="Inspeções de Saúde no ano" valor={resumoIS.inspecoes} />
          <Dado rotulo="Dias de LTS" valor={resumoIS.diasLts} />
          <Dado rotulo="Dias de Restrições" valor={resumoIS.diasRestricoes} />
        </dl>
        {doLaudo && <p className="text-xs text-ink-3 mt-2">Períodos lidos do texto do laudo das IS.</p>}
      </Card>
      <CardLista titulo="Atestados e relatórios médicos" n={atestadosIS.length}
        vazio={{ icone: 'note_alt', titulo: 'Nenhum atestado ou relatório', descricao: 'Os enviados em "Enviar exames" nas IS aparecem aqui.' }}>
        {atestadosIS.map(e => linhaExame(e, 'note_alt'))}
      </CardLista>
      {secoes.pareceres && (
        <CardLista titulo="Pareceres médicos" n={pareceresIS.length} vazio={{ icone: 'assignment', titulo: 'Nenhum parecer pedido nas IS' }}>
          {pareceresIS.map(p => {
            const st = statusEfetivo(p, agora);
            const desde = isoDe(p.criadoEm);
            return (
              <LinhaDocumento key={p.id} icone="assignment" titulo={p.especialidade}
                detalhe={[p.is ? `IS ${p.is}` : '', desde ? dataBR(desde) : '', p.pdfUrl ? '' : 'sem PDF'].filter(Boolean).join(' · ')}
                tag={<StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag>}
                onClick={p.pdfUrl ? () => setPdf({ titulo: `Parecer de ${p.especialidade}${p.is ? ` — IS ${p.is}` : ''}`, url: urlParaModal(p.pdfUrl) }) : undefined} />
            );
          })}
        </CardLista>
      )}
      <CardLista titulo="Exames" n={examesIS.length}
        vazio={{ icone: 'lab_profile', titulo: 'Nenhum exame enviado', descricao: 'Os laudos de exame enviados nas IS aparecem aqui.' }}>
        {examesIS.map(e => linhaExame(e, 'lab_profile'))}
      </CardLista>
      <CardLista titulo="CIDs" n={cidsIS.length} vazio={{ icone: 'medical_information', titulo: 'Nenhum CID registrado nas IS' }}>
        {cidsIS.map(c => {
          const partes = partesCid({ cidCodigo: c.codigo.replace('.', '') }, cidAbrev);
          return (
            <li key={c.codigo} className="flex justify-between gap-3 px-4 md:px-5 py-2 text-sm">
              <CidCodigo codigo={partes.codigo || c.codigo} descricao={partes.descricao} className="min-w-0" />
              <span className="text-xs text-ink-3 tabular-nums shrink-0">IS {c.inspecoes.join(', ')}</span>
            </li>
          );
        })}
      </CardLista>
    </div>
  );

  const apoioPM = (
    <div className="space-y-4 md:space-y-6">
      <Card title="Resumo">
        <table className="w-full text-sm tabular-nums">
          <caption className="sr-only">Dias de dispensa total e de restrições {atestado ? 'dos atestados' : 'das perícias menores'}</caption>
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
      <CardLista titulo="Atestados homologados" n={homologados.length} vazio={{ icone: 'note_alt', titulo: 'Nenhum atestado homologado' }}>
        {homologados.map(p => {
          const cid = partesCid(p, cidAbrev);
          return (
            <LinhaDocumento key={p.id} icone="note_alt" titulo={`${dataBR(p.dataAtestado)} · ${dias(p.tempoHomologado)} homologado${p.tempoHomologado !== 1 ? 's' : ''}`}
              detalhe={[cid.codigo || cid.descricao, p.medicoEmissor, p.pdfUrl ? '' : 'sem PDF'].filter(Boolean).join(' · ')}
              onClick={p.pdfUrl ? () => setPdf({ titulo: `Atestado de ${dataBR(p.dataAtestado)}`, url: urlParaModal(p.pdfUrl) }) : undefined} />
          );
        })}
      </CardLista>
      <CardLista titulo={atestado ? 'CIDs dos atestados' : 'CIDs das perícias menores'} n={cidsPM.length} vazio={{ icone: 'medical_information', titulo: 'Nenhum CID registrado' }}>
        {cidsPM.map(c => (
          <li key={c.chave} className="flex justify-between gap-3 px-4 md:px-5 py-2 text-sm">
            <CidCodigo codigo={c.codigo} descricao={c.descricao} className="min-w-0" />
            <span className="text-ink-3 tabular-nums shrink-0">{c.n}×</span>
          </li>
        ))}
      </CardLista>
    </div>
  );

  const fecharIS = () => definir({ is: null });
  const aoParecerGerado = async (is: InspecaoRecord, n: string) => {
    setParecerPara(null);
    avisar(`Pedido de parecer de ${n} gerado.`);
    const atual = inspecoes.find(i => i.id === is.id) ?? is;
    if (!fasesDeEntrevista(atual)) return;
    try {
      await atualizarInspecao(atual.id, { status: 'parecer_solicitado' });
      if (atual.dataEntrevista && situacaoDoStatus('parecer_solicitado') !== atual.situacao) {
        sincronizarAgendaIS({ ...atual, status: 'parecer_solicitado', situacao: situacaoDoStatus('parecer_solicitado') }).then(r => { if (!r.ok) avisar(`Google Agenda não atualizado: ${r.erro}`, 'error'); });
      }
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível alterar o status da IS.', 'error');
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="pt-4 md:pt-8 pb-28 md:pb-10 space-y-4 md:space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`${tituloNaTopbar ? 'hidden md:block ' : ''}text-h1 font-extrabold text-navy leading-tight`}>
              <button type="button" onClick={() => setVerCadastro(true)} aria-haspopup="dialog" title="Ver dados cadastrais"
                className="text-left inline-flex items-center gap-1 rounded-lg hover:underline underline-offset-4 decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue">
                <span className="break-words">{nome}</span>
                <span className="material-symbols-outlined text-[24px] text-ink-3 shrink-0" aria-hidden="true">expand_more</span>
              </button>
            </h1>
            <div className="text-sm text-ink-3 mt-1 tabular-nums">
              {/* No celular o nome vai para a topbar: a linha de identificação é o gatilho do top sheet. */}
              <button type="button" onClick={() => setVerCadastro(true)} aria-haspopup="dialog" className="md:hidden text-left inline-flex items-center gap-1 min-h-[44px]">
                <span>{linhaId}</span>
                <span className="material-symbols-outlined text-[20px] text-ink-3" aria-hidden="true">expand_more</span>
              </button>
              <span className="hidden md:inline">{linhaId}</span>
              {titular}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MenuAcoes rotulo="Mais ações da ficha" itens={menu} />
            {isDesktop && secundarias.map(a => <Button key={a.id} variant="secondary" icon={a.icone} onClick={a.onClick}>{a.rotulo}</Button>)}
            {principal && <Button icon={principal.icone} onClick={principal.onClick} className="hidden md:inline-flex">{principal.rotulo}</Button>}
          </div>
        </div>
        {principal && <FabAcoes acoes={[{ id: principal.id, rotulo: principal.rotulo, icone: principal.icone, onClick: principal.onClick }]} />}

        {opcoesGuia.length > 1 && (
          <div className="sticky top-0 z-sticky -mx-4 md:-mx-6 xl:-mx-8 px-4 md:px-6 xl:px-8 py-2 bg-canvas border-b border-line print:static">
            <div className="overflow-x-auto -mx-1 px-1">
              <Segmented<GuiaFicha> papel="tab" idBase="ficha-guia" ariaLabel="Registros do inspecionado" options={opcoesGuia} value={guia}
                onChange={g => definir({ guia: g })} className="min-w-full sm:min-w-0" fullWidth={!isDesktop} />
            </div>
          </div>
        )}

        <div id="ficha-guia-painel" role={opcoesGuia.length > 1 ? 'tabpanel' : undefined} aria-labelledby={opcoesGuia.length > 1 ? `ficha-guia-aba-${guia}` : undefined} className="space-y-4 md:space-y-6">
          {semRegistros ? (
            <Card>
              <EmptyState
                icon={guia === 'is' ? 'event_busy' : 'personal_injury'}
                title={guia === 'is' ? 'Nenhuma Inspeção de Saúde registrada' : atestado ? 'Nenhum atestado registrado' : 'Nenhuma Perícia Menor registrada'}
                description={`${nome} não tem ${guia === 'is' ? 'Inspeções de Saúde' : atestado ? 'atestados' : 'Perícias Menores'} registradas.`}
              />
            </Card>
          ) : (
            <>
              {situacao.length > 0 && (
                <section aria-label="Situação atual">
                  <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">{situacao}</ul>
                </section>
              )}
              <GradePainel principal={principalCol} apoio={guia === 'is' ? apoioIS : apoioPM} rotuloApoio={guia === 'is' ? 'Resumo das Inspeções de Saúde' : 'Resumo das Perícias Menores'} />
            </>
          )}
        </div>
      </Container>

      {verCadastro && (
        <CadastroTopSheet
          titulo={nome} subtitulo={<span className="tabular-nums">{linhaId}{titular}</span>} dados={dadosCadastro} aviso={avisoCadastro}
          onEditar={perfil === 'admin' && militar ? () => { setVerCadastro(false); setEditando(true); } : undefined}
          onClose={() => setVerCadastro(false)}
        />
      )}
      {verEventos && secoes.eventos && (
        <Drawer title="Registro de eventos" icon="history" onClose={() => setVerEventos(false)}
          tituloExtra={<span className="inline-flex items-center gap-1 text-xs text-ink-3"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>só Admin</span>}>
          {eventos.length === 0 ? <EmptyState icon="history" title="Nenhum evento registrado" /> : (
            <ul className="divide-y divide-line -mt-2">
              {eventos.map(e => (
                <li key={e.id} className="py-2.5 text-sm">
                  <span className="text-ink"><strong className="text-navy">{e.usuario || 'Usuário'}</strong> {ROTULO_ACAO_INSPECIONADO[e.acao as keyof typeof ROTULO_ACAO_INSPECIONADO] ?? e.acao}{e.ref && e.acao !== 'ficha.abrir' ? ` (${e.ref})` : ''}</span>
                  <span className="block text-xs text-ink-3 tabular-nums">{quandoEvento(e.em, hoje)}</span>
                </li>
              ))}
            </ul>
          )}
        </Drawer>
      )}
      {periciaSel && (
        <PericiaMenorPainel
          pericia={periciaSel} historico={pericias} hoje={hoje} cidAbrev={cidAbrev} modo="sheet" termos={t}
          aba={abaPericia} onAba={a => definir({ aba: a === 'historico' ? 'historico' : null })}
          onSelecionar={id => definir({ sel: id })} onFechar={() => definir({ sel: null, aba: null })}
          onNova={podePericia ? () => setNovaPericia(true) : undefined}
        />
      )}
      {isSel && !parecerPara && (
        <InspecaoDetalhe
          inspecao={isSel}
          om={militar?.om || om}
          permissoes={{
            editar: canUseFeature('inspecoes.editar', perfil),
            // A minuta MSG depende da lista de inspecionados e dos destinatários (página Inspeções de Saúde).
            minuta: false,
            parecer: secoes.pareceres && canUseFeature('pareceres.gerar', perfil),
            entrevista: podeUsarEntrevista(perfil),
            exames: canUseFeature('inspecoes.enviarExames', perfil),
          }}
          onClose={fecharIS}
          onMinuta={() => { /* desligada na ficha */ }}
          onSolicitarParecer={() => setParecerPara({ is: isSel })}
          onDuplicarParecer={p => setParecerPara({ is: isSel, inicial: p })}
          onSituacaoMudou={is => { sincronizarAgendaIS(is).then(r => { if (!r.ok) avisar(`IS atualizada, mas o Google Agenda não: ${r.erro}`, 'error'); }); }}
          onAviso={avisar}
        />
      )}
      {parecerPara && (
        <NovoParecerForm
          inicial={parecerPara.inicial}
          prefill={{ militarId: parecerPara.is.inspecionadoId, finalidade: parecerPara.is.finalidade }}
          vinculoIS={{ isId: parecerPara.is.id, is: parecerPara.is.is }}
          onClose={() => setParecerPara(null)}
          onGerado={n => { void aoParecerGerado(parecerPara.is, n); }}
        />
      )}
      {pdf && <PdfFullscreenModal title={pdf.titulo} url={pdf.url} onClose={() => setPdf(null)} />}
      {novaPericia && podePericia && (
        <NovaPericiaMenorForm titulo={t.novo} militarInicial={nip} onClose={() => setNovaPericia(false)}
          onRegistrado={n => { setNovaPericia(false); avisar(atestado ? `Atestado de ${n} registrado.` : `Perícia menor de ${n} registrada.`); }} />
      )}
      {editando && militar && perfil === 'admin' && (
        <MilitarEdicao militar={militar} oms={oms} postos={postos} onClose={() => setEditando(false)}
          onSalvo={n => { setEditando(false); avisar(`Dados de ${n} atualizados.`); }} />
      )}
    </div>
  );
};

export { LinhaRegistroPericia };
