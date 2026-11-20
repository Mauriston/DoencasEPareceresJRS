// Ficheiro: components/ficha/FichaInspecionado.tsx
// Ficha do inspecionado (/inspecionados/:nip — auditoria v3, seção 9; MF1–MF4, PM6, PM8, PMD3).
// Uma página com o que o perfil pode ver (components/ficha/permissoes.ts — sem abas fantasmas):
//   cabeçalho (nome no título — tocar no nome abre o sheet do topo com os dados cadastrais; posto · NIP · OM
//   na descrição; ⋮ com "Registros de eventos" só para o Admin) · abas "Inspeções de Saúde" | "Perícias Menores".
//   A aba escolhida filtra a coluna principal (períodos dos últimos 12 meses — LTS/Restrições das IS ou
//   Dispensas/Restrições das perícias — e a linha do tempo) e os cards da coluna de apoio:
//     IS: resumo do ano (IS, dias de LTS, dias de restrições), atestados/relatórios, pareceres, exames e CID;
//     Perícias Menores: resumo (dispensas e restrições), atestados homologados e CID.
//   Aba sem registros: só o aviso "Este inspecionado não tem …", sem cards.
// Tocar numa IS ou perícia da linha do tempo abre o detalhe num Drawer à direita (bottom sheet no celular)
// sem sair da ficha. PDFs (atestados, pareceres, exames) abrem no modal em tela cheia.
// Leitura limitada às consultas por NIP (where militarId/inspecionadoId == nip), nunca a coleção inteira (MF2);
// exames, atestados, afastamentos (LTS/Restrições) e CID das IS vêm de services/fichaDados.ts (examesIS + afastamentosIS).
// Abrir a ficha grava o evento "abriu a ficha" (quem e quando) em militares/{nip}/eventos (best effort).
// Substitui a antiga página de histórico da Perícia Menor (/pericia-menor/historico/<nip> redireciona para cá).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container } from '../ui/Page';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Drawer } from '../ui/Drawer';
import { SheetTopo } from '../ui/SheetTopo';
import { Segmented } from '../ui/Segmented';
import { FabAcoes } from '../ui/Fab';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { StatusTag } from '../ui/StatusTag';
import { EmptyState } from '../ui/EmptyState';
import { AccessDenied } from '../ui/AccessDenied';
import { Toast } from '../ui/Toast';
import { GradePainel } from '../ui/Grade';
import { PdfFullscreenModal } from '../PdfFullscreenModal';
import { CidCodigo, SaldoAcumulado, TextoContagem } from '../periciaMenor/partes';
import { LinhaRegistroPericia, PericiaMenorPainel, type AbaPericia } from '../periciaMenor/PericiaMenorPainel';
import { NovaPericiaMenorForm } from '../periciaMenor/NovaPericiaMenorForm';
import { InspecaoDetalhe } from '../inspecoes/InspecaoDetalhe';
import { MilitarEdicao } from '../Militares';
import { useTituloPagina } from '../shell/TituloPagina';
import { secoesDaFicha, podeAbrirFicha } from './permissoes';
import { useNav } from '../../context/NavContext';
import { useBreadcrumbs } from '../../context/BreadcrumbContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { canUseFeature } from '../../config/permissions';
import { termosPericia } from '../../config/termosPericia';
import { fichaPath } from '../../config/routes';
import { observarMilitar, tipoDoInspecionado, type MilitarRecord } from '../../services/firestoreMilitares';
import { observarPericiasDoMilitar, dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { observarInspecoesDoInspecionado, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { observarPareceresDoMilitar, statusEfetivo, type ParecerRecord } from '../../services/firestorePareceres';
import { observarEventosInspecionado, registrarEventoInspecionado, ROTULO_ACAO_INSPECIONADO, type EventoInspecionado } from '../../services/eventosInspecionado';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import {
  DADOS_IS_VAZIOS, agruparCidsIS, carregarDadosISDaFicha, faixa12MesesIS, resumoIS, urlParaModal, type DadosISDaFicha,
} from '../../services/fichaDados';
import { urlDoExame, type DocumentoDaIS } from '../../services/examesIS';
import { ROTULO_AFASTAMENTO_IS } from '../../utils/afastamentosIS';
import { carregarCid, carregarCorposQuadros, carregarOms, type CorposQuadros, type OrganizacaoMilitar } from '../../utils/corposQuadros';
import { indiceCidAbreviado } from '../../utils/periciaMenorLista';
import { saldoAcumulado } from '../../utils/periciaMenorRegras';
import {
  ROTULO_TIPO_PERICIA, cidsFrequentes, contagemTermino, diaMes, diasEntreISO, faixa12Meses, partesCid, postoDoInspecionado, resumoPericias, tipoDaPericia,
} from '../../utils/periciaMenorResumo';
import { STATUS_IS, statusEfetivoIS, dataHoraBr } from '../../utils/inspecoes';
import { extrairNomeInspecionado, formatCelular, formatCpf, formatDataBr, formatIdentidadeMilitar, formatNip, idadeEmAnos } from '../../utils/format';
import { hojeISO } from '../../utils/dados';

type AbaFicha = 'is' | 'pm';
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

interface ItemLinha { chave: string; data: string; icone: string; titulo: string; detalhe: React.ReactNode; tag?: React.ReactNode; abrir: () => void; rotulo: string }

const LinhaDoTempo: React.FC<{ item: ItemLinha }> = ({ item }) => (
  <button type="button" onClick={item.abrir} aria-label={item.rotulo} aria-haspopup="dialog"
    className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-thead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold">
    <span className="material-symbols-outlined text-[22px] text-navy shrink-0 mt-0.5" aria-hidden="true">{item.icone}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-xs text-ink-3 tabular-nums">{item.data ? dataBR(item.data) : 'sem data'}</span>
      <span className="block text-sm font-bold text-navy break-words">{item.titulo}</span>
      <span className="block text-xs text-ink-3 break-words">{item.detalhe}</span>
    </span>
    {item.tag && <span className="shrink-0">{item.tag}</span>}
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
  const classe = 'w-full min-w-0 flex items-start gap-3 p-4 bg-white border border-line rounded-xl text-left';
  return (
    <li className="min-w-0">
      {onClick
        ? <button type="button" onClick={onClick} aria-haspopup="dialog" className={`${classe} hover:border-navy transition-colors`}>{corpo}</button>
        : <div className={classe}>{corpo}</div>}
    </li>
  );
};

/** Item de uma lista de documentos (card da coluna de apoio). */
interface ItemDoc { chave: string; titulo: string; detalhe?: React.ReactNode; onClick?: () => void; icone?: string }

/** Vazio compacto para os cards da coluna de apoio (o EmptyState do DS é para a área principal). */
const VazioCompacto: React.FC<{ icone: string; texto: string }> = ({ icone, texto }) => (
  <p className="px-5 pb-4 flex items-center gap-2 text-sm text-ink-3">
    <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">{icone}</span>{texto}
  </p>
);

const Contagem: React.FC<{ n: number }> = ({ n }) => (
  <span className="ml-1.5 min-w-5 h-5 px-1.5 rounded-full bg-thead text-ink-3 text-xs inline-flex items-center justify-center tabular-nums align-middle">{n}</span>
);

const CardDocumentos: React.FC<{ titulo: string; icone: string; itens: ItemDoc[]; vazio: string }> = ({ titulo, icone, itens, vazio }) => (
  <Card padding="none" as="section" title={<>{titulo}<Contagem n={itens.length} /></>}>
    {itens.length === 0 ? <VazioCompacto icone={icone} texto={vazio} /> : (
      <ul className="divide-y divide-line border-t border-line">
        {itens.map(i => {
          const corpo = (
            <>
              <span className="material-symbols-outlined text-[22px] text-navy shrink-0" aria-hidden="true">{i.icone ?? icone}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-navy break-words">{i.titulo}</span>
                {i.detalhe && <span className="block text-xs text-ink-3 break-words">{i.detalhe}</span>}
              </span>
              {i.onClick && <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">open_in_full</span>}
            </>
          );
          return (
            <li key={i.chave}>
              {i.onClick
                ? <button type="button" onClick={i.onClick} aria-haspopup="dialog" className="w-full min-h-[44px] text-left flex items-start gap-3 px-5 py-3 hover:bg-thead transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold">{corpo}</button>
                : <div className="flex items-start gap-3 px-5 py-3">{corpo}</div>}
            </li>
          );
        })}
      </ul>
    )}
  </Card>
);

const Campo: React.FC<{ rotulo: string; valor?: string | null; mono?: boolean }> = ({ rotulo, valor, mono }) => (valor ? (
  <div className="min-w-0">
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className={`text-sm text-ink break-words ${mono ? 'tabular-nums' : ''}`}>{valor}</dd>
  </div>
) : null);

const Dado: React.FC<{ rotulo: string; valor: React.ReactNode }> = ({ rotulo, valor }) => (
  <div className="flex justify-between gap-3 py-1.5"><dt className="text-xs text-ink-3">{rotulo}</dt><dd className="text-sm text-ink text-right break-words min-w-0 tabular-nums">{valor}</dd></div>
);

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
  const [pericias, setPericias] = useState<PericiaMenorRecord[] | null>(null);
  const [inspecoes, setInspecoes] = useState<InspecaoRecord[] | null>(null);
  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  const [dadosIs, setDadosIs] = useState<DadosISDaFicha>(DADOS_IS_VAZIOS);
  const [eventos, setEventos] = useState<EventoInspecionado[]>([]);
  const [cidAbrev, setCidAbrev] = useState<Map<string, string> | null>(null);
  const [novaPericia, setNovaPericia] = useState(false);
  const [editando, setEditando] = useState(false);
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [eventosAbertos, setEventosAbertos] = useState(false);
  const [pdf, setPdf] = useState<{ titulo: string; url: string } | null>(null);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [postos, setPostos] = useState<CorposQuadros['postos']>();
  const [toast, setToast] = useState<{ msg: string; tom: 'success' | 'error' } | null>(null);
  const avisar = (msg: string, tom: 'success' | 'error' = 'success') => { setToast({ msg, tom }); window.setTimeout(() => setToast(null), 4000); };

  useEffect(() => (podeFicha && nip ? observarMilitar(nip, setMilitar, () => setMilitar(null)) : undefined), [nip, podeFicha]);
  useEffect(() => (secoes.pericias && nip ? observarPericiasDoMilitar(nip, setPericias, () => setPericias([])) : undefined), [nip, secoes.pericias]);
  useEffect(() => (secoes.inspecoes && nip ? observarInspecoesDoInspecionado(nip, setInspecoes, () => setInspecoes([])) : undefined), [nip, secoes.inspecoes]);
  useEffect(() => (secoes.pareceres && nip ? observarPareceresDoMilitar(nip, setPareceres, () => setPareceres([])) : undefined), [nip, secoes.pareceres]);
  useEffect(() => (secoes.eventos && nip ? observarEventosInspecionado(nip, setEventos, () => setEventos([])) : undefined), [nip, secoes.eventos]);
  // Exames, atestados, afastamentos e CID das IS (leitura única): recarrega quando muda alguma IS da pessoa
  // (nova IS, status, laudo, CID — ex.: um exame enviado ou a IS finalizada no Drawer de detalhe).
  const chaveIs = (inspecoes ?? []).map(i => [i.id, i.status, i.laudo, (i as { cid?: string }).cid ?? '', i.atualizadoEm?.toMillis?.() ?? ''].join('|')).join(',');
  useEffect(() => {
    if (!secoes.inspecoes || !nip || !chaveIs) { setDadosIs(DADOS_IS_VAZIOS); return; }
    let vivo = true;
    carregarDadosISDaFicha(nip).then(d => { if (vivo) setDadosIs(d); });
    return () => { vivo = false; };
  }, [chaveIs, nip, secoes.inspecoes, isSelId]);
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

  const listaPm = pericias ?? [];
  const listaIs = inspecoes ?? [];

  // Cabeçalho mínimo: do cadastro ou, sem cadastro, do texto copiado no registro mais recente.
  const textoRegistro = listaPm[0]?.inspecionado || listaIs[0]?.inspecionado || pareceres[0]?.inspecionado || '';
  const nome = militar?.nome || extrairNomeInspecionado(textoRegistro) || formatNip(nip);
  const posto = militar?.pgq || postoDoInspecionado(textoRegistro, extrairNomeInspecionado(textoRegistro));
  const om = militar?.om || listaPm[0]?.om || '';
  useBreadcrumbs(nome ? [{ label: nome }] : null);
  const tituloNaTopbar = useTituloPagina(nome);

  const resumo = useMemo(() => resumoPericias(listaPm, hoje), [listaPm, hoje]);
  const faixa = useMemo(() => faixa12Meses(listaPm, hoje), [listaPm, hoje]);
  const cidsPm = useMemo(() => cidsFrequentes(listaPm, cidAbrev, Number.POSITIVE_INFINITY), [listaPm, cidAbrev]);
  const saldo = useMemo(() => saldoAcumulado(listaPm, hoje), [listaPm, hoje]);
  const periodosIs = dadosIs.afastamentos;
  const faixaIs = useMemo(() => faixa12MesesIS(periodosIs, hoje), [periodosIs, hoje]);
  const resumoIs = useMemo(() => resumoIS(listaIs, periodosIs, hoje), [listaIs, periodosIs, hoje]);
  const cidsIs = useMemo(() => agruparCidsIS(dadosIs.cids), [dadosIs.cids]);
  const [agora] = useState(() => Date.now());

  // Aba: a escolhida (?ver=is|pm) entre as que o perfil vê; sem escolha, IS (ou Perícias, sem acesso às IS).
  const abasDisponiveis: AbaFicha[] = [...(secoes.inspecoes ? ['is' as const] : []), ...(secoes.pericias ? ['pm' as const] : [])];
  const verParam = params.get('ver');
  const aba: AbaFicha | null = abasDisponiveis.includes(verParam as AbaFicha) ? verParam as AbaFicha : abasDisponiveis[0] ?? null;

  const vigente = listaPm.find(p => p.dataTermino >= hoje);
  const isEmCurso = listaIs.find(i => STATUS_IS[statusEfetivoIS(i, hoje)].situacao !== 'finalizada');
  const pareceresPendentes = pareceres.filter(p => statusEfetivo(p, agora) !== 'concluido');
  const periciaSel = listaPm.find(p => p.id === sel) ?? null;
  const isSel = listaIs.find(i => i.id === isSelId) ?? null;

  const itensIs: ItemLinha[] = useMemo(() => listaIs.map<ItemLinha>(i => {
    const st = STATUS_IS[statusEfetivoIS(i, hoje)];
    return {
      chave: `is-${i.id}`, data: (i.dataEntrevista || i.dataAbertura || '').slice(0, 10), icone: 'event_available',
      titulo: `IS ${i.is}${i.dataEntrevista ? ` · entrevista em ${dataHoraBr(i.dataEntrevista)}` : ' · aberta'}`,
      detalhe: [i.finalidade, i.laudo, i.amp, i.peritoNome].filter(Boolean).join(' · '),
      tag: <StatusTag tone={st.tom}>{st.rotulo}</StatusTag>, rotulo: `Abrir detalhes da IS ${i.is}`,
      abrir: () => definir({ is: i.id, sel: null, aba: null }),
    };
  }).sort((a, b) => b.data.localeCompare(a.data)), [listaIs, hoje]); // eslint-disable-line react-hooks/exhaustive-deps

  const itensPm: ItemLinha[] = useMemo(() => listaPm.map<ItemLinha>(p => {
    const cid = partesCid(p, cidAbrev);
    const c = contagemTermino(p.dataTermino, hoje);
    return {
      chave: `pm-${p.id}`, data: p.dataAtestado, icone: 'personal_injury',
      titulo: atestado ? 'Atestado registrado' : 'Perícia menor registrada',
      detalhe: <>{dias(p.tempoHomologado)} · {ROTULO_TIPO_PERICIA[tipoDaPericia(p.dispensas)]}{cid.codigo || cid.descricao ? ' · ' : ''}<CidCodigo codigo={cid.codigo} descricao={cid.descricao} /></>,
      tag: c.tom !== 'passado' ? <TextoContagem contagem={c} /> : <StatusTag tone="muted">Concluída</StatusTag>,
      rotulo: `Abrir ${atestado ? 'atestado' : 'perícia'} de ${dataBR(p.dataAtestado)}`,
      abrir: () => definir({ sel: p.id, aba: null, is: null }),
    };
  }).sort((a, b) => b.data.localeCompare(a.data)), [listaPm, cidAbrev, hoje, atestado]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!podeFicha) return <AccessDenied pagina="Ficha do inspecionado" />;
  if (militar === undefined) {
    return <div className="flex flex-1 items-center justify-center py-20"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando ficha" /></div>;
  }
  if (militar === null && !textoRegistro) {
    return <Container className="py-8"><EmptyState icon="person_search" title="Inspecionado não encontrado" description="Não há cadastro nem registros com este NIP." /></Container>;
  }

  const abrirPdf = (titulo: string, url: string) => setPdf({ titulo, url: urlParaModal(url) });
  const abrirExame = async (e: DocumentoDaIS) => {
    try { setPdf({ titulo: `${e.titulo || e.nomeArquivo || 'Documento'} — IS ${e.isNumero}`, url: e.url || await urlDoExame(e) }); }
    catch { avisar('Não foi possível abrir o PDF. Tente novamente.', 'error'); }
  };

  // Ações (4d): a principal do perfil vira primária/FAB; o resto vai para o ⋮. Pareceres só a partir de uma IS.
  const podePericia = canUseFeature('pericia-menor.novo', perfil);
  const podeIS = secoes.inspecoes && canUseFeature('inspecoes.cadastrar', perfil);
  const acoes = [
    podePericia && { id: 'pericia', rotulo: atestado ? 'Atestado' : 'Perícia Menor', icone: 'add', onClick: () => setNovaPericia(true) },
    podeIS && { id: 'is', rotulo: 'Abrir IS', icone: 'event_available', onClick: () => navigate(`/inspecoes?novo=manual&inspecionado=${nip}`) },
  ].filter(Boolean) as { id: string; rotulo: string; icone: string; onClick: () => void }[];
  const [principal, ...secundarias] = acoes;
  const menu: ItemMenu[] = [
    ...(!isDesktop ? secundarias.map(a => ({ rotulo: a.rotulo, icone: a.icone, onClick: a.onClick })) : []),
    ...(secoes.cadastro && militar ? [{ rotulo: 'Dados cadastrais', icone: 'id_card', onClick: () => setCadastroAberto(true) }] : []),
    ...(perfil === 'admin' && militar ? [{ rotulo: 'Editar cadastro', icone: 'edit', onClick: () => setEditando(true) }] : []),
    ...(secoes.eventos ? [{ rotulo: 'Registros de eventos', icone: 'history', onClick: () => setEventosAbertos(true) }] : []),
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
  const nomeClicavel = secoes.cadastro && !!militar;
  const botaoNome = (classe: string) => (
    <button type="button" onClick={() => setCadastroAberto(true)} aria-haspopup="dialog" title="Ver dados cadastrais"
      className={`group text-left inline-flex items-start gap-1 rounded hover:underline underline-offset-4 decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${classe}`}>
      <span className="min-w-0 break-words">{nome}</span>
      <span className="sr-only">: ver dados cadastrais</span>
      <span className="material-symbols-outlined text-[24px] text-ink-3 group-hover:text-navy shrink-0 mt-0.5" aria-hidden="true">expand_more</span>
    </button>
  );

  // ---------- Aba Inspeções de Saúde ----------
  const pareceresIs = pareceres.map<ItemDoc>(p => {
    const st = statusEfetivo(p, agora);
    const pedido = isoDe(p.criadoEm);
    return {
      chave: `pa-${p.id}`, titulo: `Parecer de ${p.especialidade}`, icone: 'assignment',
      detalhe: <>{[p.is ? `IS ${p.is}` : null, pedido ? `pedido em ${dataBR(pedido)}` : null].filter(Boolean).join(' · ')}{' '}<StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag></>,
      onClick: p.pdfUrl ? () => abrirPdf(`Parecer de ${p.especialidade} — ${nome}`, p.pdfUrl) : undefined,
    };
  });
  const docExame = (e: DocumentoDaIS): ItemDoc => ({
    chave: `ex-${e.isId}-${e.exameId}`, titulo: e.titulo || e.nomeArquivo || 'Documento',
    detalhe: [`IS ${e.isNumero}`, e.data ? dataBR(e.data) : null].filter(Boolean).join(' · '),
    onClick: e.caminho ? () => { void abrirExame(e); } : undefined,
  });
  const atestadosIs = dadosIs.atestados.map(docExame);
  const examesIs = dadosIs.exames.map(docExame);

  const situacaoIs = [
    isEmCurso && (() => {
      const st = STATUS_IS[statusEfetivoIS(isEmCurso, hoje)];
      return <CartaoSituacao key="is" icone="event_available" titulo={`IS ${isEmCurso.is} · ${st.rotulo.toLocaleLowerCase('pt-BR')}`} detalhe={isEmCurso.finalidade} tag={<StatusTag tone={st.tom}>{st.rotulo}</StatusTag>} onClick={() => definir({ is: isEmCurso.id, sel: null, aba: null })} />;
    })(),
    secoes.pareceres && pareceresPendentes[0] && (() => {
      const p = pareceresPendentes[0];
      const st = statusEfetivo(p, agora);
      const desde = isoDe(p.criadoEm);
      return <CartaoSituacao key="pa" icone="assignment" titulo={`Parecer de ${p.especialidade}`} detalhe={`solicitado${desde ? ` em ${diaMes(desde)} · ${diasEntreISO(desde, hoje)} dias` : ''}${pareceresPendentes.length > 1 ? ` · +${pareceresPendentes.length - 1} pendente${pareceresPendentes.length > 2 ? 's' : ''}` : ''}`} tag={<StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag>} />;
    })(),
  ].filter(Boolean);

  const faixaCard = (titulo: string, meses: { chave: string; rotulo: string; forte: boolean; fraco: boolean; texto: string }[], legendaForte: string, legendaFraca: string) => (
    <Card title={titulo} actions={(
      <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-navy" aria-hidden="true" />{legendaForte}</span>
        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gold" aria-hidden="true" />{legendaFraca}</span>
      </span>
    )}>
      <ol className="grid grid-cols-12 gap-0.5 sm:gap-1" aria-label={`${titulo}: períodos por mês`}>
        {meses.map(m => (
          <li key={m.chave} className="flex flex-col items-center gap-1 min-w-0">
            <span className={`w-full h-5 rounded ${m.forte ? 'bg-navy' : m.fraco ? 'bg-gold' : 'bg-line'}`} aria-hidden="true" />
            <span className="text-[10px] sm:text-xs font-semibold text-ink-3">{m.rotulo}<span className="sr-only">: {m.texto}</span></span>
          </li>
        ))}
      </ol>
    </Card>
  );

  const linhaDoTempo = (titulo: string, itens: ItemLinha[]) => (
    <Card padding="none" as="section" title={<>{titulo}<Contagem n={itens.length} /></>}>
      <ul className="divide-y divide-line border-t border-line">{itens.map(i => <li key={i.chave}><LinhaDoTempo item={i} /></li>)}</ul>
    </Card>
  );

  const situacaoBloco = (itens: React.ReactNode[]) => itens.length > 0 && (
    <section aria-label="Situação atual">
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">{itens}</ul>
    </section>
  );

  const conteudoIs = (
    <div className="space-y-6">
      {situacaoBloco(situacaoIs)}
      <GradePainel
        rotuloApoio="Resumo das Inspeções de Saúde"
        principal={(
          <div className="space-y-6">
            {faixaCard('Últimos 12 meses', faixaIs.map(m => ({ chave: m.chave, rotulo: m.rotulo, forte: m.tipo === 'lts', fraco: m.tipo === 'restricoes', texto: m.tipo === 'lts' ? 'LTS' : m.tipo === 'restricoes' ? 'Restrições' : 'nenhum período' })), 'LTS', 'Restrições')}
            {periodosIs.length > 0 && (
              <Card title="Períodos de LTS e restrições">
                <ul className="space-y-1.5">
                  {periodosIs.map((p, k) => (
                    <li key={`${p.isId}-${p.dataInicio}-${k}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                      <span className="min-w-0 tabular-nums">
                        {p.tipo === 'lts' ? <StatusTag tone="navyOutline" dot={false}>{ROTULO_AFASTAMENTO_IS.lts}</StatusTag> : <StatusTag tone="attention">{ROTULO_AFASTAMENTO_IS.restricoes}</StatusTag>}
                        <span className="ml-2 text-ink">{dataBR(p.dataInicio)} a {dataBR(p.dataFim)}</span>
                      </span>
                      <span className="text-xs text-ink-3 tabular-nums">{dias(p.dias)} · IS {p.isNumero}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {linhaDoTempo('Linha do tempo das Inspeções de Saúde', itensIs)}
          </div>
        )}
        apoio={(
          <div className="space-y-6">
            <Card as="section" title={`Em ${resumoIs.ano}`}>
              <dl className="divide-y divide-line">
                <Dado rotulo="Inspeções de Saúde" valor={<><strong className="text-navy">{resumoIs.isNoAno}</strong><span className="text-ink-3"> · {resumoIs.isTotal} no total</span></>} />
                <Dado rotulo="Dias de LTS" valor={<><strong className="text-navy">{resumoIs.lts.ano}</strong><span className="text-ink-3"> · {resumoIs.lts.total} no total</span></>} />
                <Dado rotulo="Dias de restrições" valor={<><strong className="text-navy">{resumoIs.restricoes.ano}</strong><span className="text-ink-3"> · {resumoIs.restricoes.total} no total</span></>} />
              </dl>
              <p className="text-xs text-ink-3 mt-2">Afastamentos das IS de Verificações e Términos com TIS assinado.</p>
            </Card>
            <CardDocumentos titulo="Atestados e relatórios médicos" icone="note_alt" itens={atestadosIs} vazio="Nenhum atestado ou relatório enviado." />
            {secoes.pareceres && <CardDocumentos titulo="Pareceres solicitados" icone="assignment" itens={pareceresIs} vazio="Nenhum parecer solicitado." />}
            <CardDocumentos titulo="Exames enviados" icone="labs" itens={examesIs} vazio="Nenhum exame enviado." />
            <Card padding="none" as="section" title={<>CID registrados<Contagem n={cidsIs.length} /></>}>
              {cidsIs.length === 0 ? <VazioCompacto icone="medical_information" texto="Nenhum CID registrado nas IS." /> : (
                <ul className="px-5 pb-4 space-y-1.5">
                  {cidsIs.map(c => <li key={c.chave} className="flex justify-between gap-3 text-sm"><span className="min-w-0 break-words text-ink">{c.texto}<span className="block text-xs text-ink-3">IS {c.isNumeros.join(', ')}</span></span><span className="text-ink-3 tabular-nums shrink-0">{c.n}×</span></li>)}
                </ul>
              )}
            </Card>
          </div>
        )}
      />
    </div>
  );

  // ---------- Aba Perícias Menores ----------
  const atestadosPm = listaPm.filter(p => p.homologacao !== false).map<ItemDoc>(p => ({
    chave: `at-${p.id}`, titulo: `${atestado ? 'Atestado' : 'Atestado homologado'} de ${dataBR(p.dataAtestado)}`, icone: 'picture_as_pdf',
    detalhe: `${dias(p.tempoHomologado)} homologado${p.tempoHomologado !== 1 ? 's' : ''} · ${ROTULO_TIPO_PERICIA[tipoDaPericia(p.dispensas)]}${p.pdfUrl ? '' : ' · sem PDF'}`,
    onClick: p.pdfUrl ? () => abrirPdf(`Atestado de ${dataBR(p.dataAtestado)} — ${nome}`, p.pdfUrl!) : undefined,
  }));
  const situacaoPm = [
    vigente && (() => {
      const c = contagemTermino(vigente.dataTermino, hoje);
      return <CartaoSituacao key="pm" icone="personal_injury" titulo={`${ROTULO_TIPO_PERICIA[tipoDaPericia(vigente.dispensas)]} até ${diaMes(vigente.dataTermino)}`}
        detalhe={`${atestado ? 'Atestado' : 'Perícia'} de ${diaMes(vigente.dataAtestado)} · saldo ${saldo.restante} de 30 dias`} tag={<TextoContagem contagem={c} curto />}
        onClick={() => definir({ sel: vigente.id, aba: null, is: null })} />;
    })(),
  ].filter(Boolean);
  const conteudoPm = (
    <div className="space-y-6">
      {situacaoBloco(situacaoPm)}
      <GradePainel
        rotuloApoio={`Resumo das ${atestado ? 'atestados' : 'perícias menores'}`}
        principal={(
          <div className="space-y-6">
            {faixaCard('Últimos 12 meses', faixa.map(m => ({ chave: m.chave, rotulo: m.rotulo, forte: m.tipo === 'dispensa', fraco: m.tipo === 'restricoes', texto: m.tipo ? ROTULO_TIPO_PERICIA[m.tipo] : 'nenhuma' })), 'Dispensa total', 'Restrições')}
            {linhaDoTempo(`Linha do tempo ${atestado ? 'dos atestados' : 'das Perícias Menores'}`, itensPm)}
          </div>
        )}
        apoio={(
          <div className="space-y-6">
            <Card as="section" title="Resumo">
              <div className="overflow-x-auto">
                <table className="w-full text-sm tabular-nums">
                  <caption className="sr-only">Dias de dispensa total e de restrições por {atestado ? 'atestados' : 'Perícias Menores'}</caption>
                  <thead className="text-xs text-ink-3">
                    <tr><th scope="col" className="text-left font-semibold pb-1">Dias</th><th scope="col" className="text-right font-semibold pb-1">30 dias</th><th scope="col" className="text-right font-semibold pb-1">12 meses</th><th scope="col" className="text-right font-semibold pb-1">Total</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {([['Dispensa', resumo.dispensa], ['Restrições', resumo.restricoes]] as const).map(([rot, l]) => (
                      <tr key={rot}><th scope="row" className="text-left font-semibold text-ink py-1.5">{rot}</th><td className="text-right">{l.d30}</td><td className="text-right font-bold text-navy">{l.m12}</td><td className="text-right">{l.total}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-ink-3 mt-2">{resumo.registros} registro{resumo.registros !== 1 ? 's' : ''} · {resumo.vigentes} vigente{resumo.vigentes !== 1 ? 's' : ''} · {resumo.vdf} com VDF</p>
              <SaldoAcumulado usados={saldo.usados} restante={saldo.restante} className="mt-4" />
            </Card>
            <CardDocumentos titulo="Atestados homologados" icone="note_alt" itens={atestadosPm} vazio="Nenhum atestado homologado." />
            <Card padding="none" as="section" title={<>CID {atestado ? 'dos atestados' : 'das Perícias Menores'}<Contagem n={cidsPm.length} /></>}>
              {cidsPm.length === 0 ? <VazioCompacto icone="medical_information" texto="Nenhum CID registrado." /> : (
                <ul className="px-5 pb-4 space-y-1.5">
                  {cidsPm.map(c => <li key={c.chave} className="flex justify-between gap-3 text-sm"><CidCodigo codigo={c.codigo} descricao={c.descricao} className="min-w-0" /><span className="text-ink-3 tabular-nums shrink-0">{c.n}×</span></li>)}
                </ul>
              )}
            </Card>
          </div>
        )}
      />
    </div>
  );

  const carregando = aba === 'is' ? inspecoes === null : aba === 'pm' ? pericias === null : false;
  const vazio = aba === 'is' ? listaIs.length === 0 : aba === 'pm' ? listaPm.length === 0 : true;
  const textoVazio = aba === 'is'
    ? 'Este inspecionado não tem Inspeções de Saúde registradas.'
    : atestado ? 'Este inspecionado não tem atestados registrados.' : 'Este inspecionado não tem Perícias Menores registradas.';
  const permissoesIS = {
    editar: canUseFeature('inspecoes.editar', perfil),
    minuta: false, parecer: false, entrevista: false,
    exames: canUseFeature('inspecoes.enviarExames', perfil),
  };

  return (
    <div className={`flex flex-col flex-1 ${principal ? 'pb-24 md:pb-0' : ''}`}>
      <Toast message={toast?.msg ?? null} tone={toast?.tom} />
      <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`${tituloNaTopbar ? 'hidden md:block ' : ''}text-h1 font-extrabold text-navy leading-tight`}>
              {nomeClicavel ? botaoNome('') : nome}
            </h1>
            {tituloNaTopbar && nomeClicavel && <div className="md:hidden text-base font-bold text-navy">{botaoNome('')}</div>}
            <div className="text-sm text-ink-3 mt-1">{descricao}</div>
          </div>
          <div className="flex flex-row flex-wrap items-center justify-end gap-2 shrink-0">
            <MenuAcoes rotulo="Mais ações da ficha" itens={menu} />
            {isDesktop && secundarias.map(a => <Button key={a.id} variant="secondary" icon={a.icone} onClick={a.onClick}>{a.rotulo}</Button>)}
            {principal && <Button icon={principal.icone} onClick={principal.onClick} className="hidden md:inline-flex">{principal.rotulo}</Button>}
          </div>
        </header>

        {aba && abasDisponiveis.length > 1 && (
          <Segmented<AbaFicha>
            ariaLabel="Histórico do inspecionado" papel="tab" idBase="ficha" fullWidth className="md:w-auto md:inline-flex"
            value={aba} onChange={v => definir({ ver: v === abasDisponiveis[0] ? null : v })}
            options={[
              { value: 'is', label: 'Inspeções de Saúde', icon: 'event_available', badge: listaIs.length, badgeTone: 'neutro' },
              { value: 'pm', label: atestado ? 'Atestados' : 'Perícias Menores', icon: 'personal_injury', badge: listaPm.length, badgeTone: 'neutro' },
            ]}
          />
        )}
        {aba && abasDisponiveis.length === 1 && (
          <h2 className="text-h2 font-bold text-navy">{aba === 'is' ? 'Inspeções de Saúde' : atestado ? 'Atestados' : 'Perícias Menores'}</h2>
        )}

        {aba && (
          <div id="ficha-painel" role={abasDisponiveis.length > 1 ? 'tabpanel' : undefined} aria-labelledby={abasDisponiveis.length > 1 ? `ficha-aba-${aba}` : undefined}>
            {carregando
              ? <div className="flex justify-center py-12"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando registros" /></div>
              : vazio
                ? <p className="py-8 text-center text-sm text-ink-3">{textoVazio}</p>
                : aba === 'is' ? conteudoIs : conteudoPm}
          </div>
        )}

        {!aba && secoes.pareceres && (
          <CardDocumentos titulo="Pareceres solicitados" icone="assignment" itens={pareceresIs} vazio="Nenhum parecer solicitado." />
        )}
      </Container>

      {principal && <div className="md:hidden"><FabAcoes acoes={[{ id: principal.id, rotulo: principal.rotulo, icone: principal.icone, onClick: principal.onClick }]} /></div>}

      {cadastroAberto && militar && (
        <SheetTopo
          title="Dados cadastrais" icon="id_card" onClose={() => setCadastroAberto(false)}
          tituloExtra={<StatusTag tone={militar.ativo ? 'success' : 'muted'}>{militar.ativo ? 'Ativo' : 'Inativo'}</StatusTag>}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setCadastroAberto(false)}>Fechar</Button>
              {perfil === 'admin' && <Button icon="edit" onClick={() => { setCadastroAberto(false); setEditando(true); }}>Editar cadastro</Button>}
            </>
          )}
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            <div className="flex items-center gap-4 sm:block shrink-0">
              <div className="w-20 h-20 rounded-full bg-thead border border-line overflow-hidden flex items-center justify-center">
                {militar.fotoUrl ? <img src={militar.fotoUrl} alt={`Foto de ${militar.nome}`} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[40px] text-ink-4" aria-hidden="true">person</span>}
              </div>
              <div className="sm:hidden min-w-0">
                <p className="text-base font-bold text-navy break-words">{militar.nome}</p>
                <p className="text-sm text-ink-2">{militar.pgq}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="hidden sm:block text-base font-bold text-navy break-words">{militar.nome}</p>
              <p className="hidden sm:block text-sm text-ink-2 mb-3">{militar.pgq}</p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                <Campo rotulo="NIP" valor={formatNip(militar.nip || nip)} mono />
                <Campo rotulo="OM" valor={militar.om} />
                <Campo rotulo="Tipo" valor={tipo === 'dependente' ? 'Dependente' : tipo === 'pensionista' ? 'Pensionista' : 'Militar'} />
                {tipo === 'militar' && <Campo rotulo="Vínculo" valor={militar.temporario ? 'Temporário' : (militar.rm1 || militar.refo) ? 'Inativo' : 'Carreira'} />}
                <Campo rotulo="Titular" valor={militar.titularNome ? `${militar.titularPosto ?? ''} ${militar.titularNome}`.trim() : undefined} />
                <Campo rotulo="Nome de guerra" valor={militar.nomeGuerra} />
                <Campo rotulo="Especialidade" valor={militar.especialidade} />
                <Campo rotulo="Nascimento" valor={formatDataBr(militar.dataNascimento)} />
                <Campo rotulo="Serviço do HNRe" valor={militar.servico_label} />
                <Campo rotulo="E-mail" valor={militar.email} />
                <Campo rotulo="E-mail pessoal" valor={militar.emailPessoal} />
                <Campo rotulo="Celular" valor={formatCelular(militar.celular)} mono />
                <Campo rotulo="CPF" valor={formatCpf(militar.cpf)} mono />
                <Campo rotulo="Identidade militar" valor={formatIdentidadeMilitar(militar.identidadeMilitar)} mono />
                <Campo rotulo="CRM-PE" valor={militar.crm} />
                <Campo rotulo="RQE" valor={militar.rqe} />
              </dl>
            </div>
          </div>
        </SheetTopo>
      )}

      {eventosAbertos && secoes.eventos && (
        <Drawer title="Registros de eventos" icon="history" onClose={() => setEventosAbertos(false)}
          tituloExtra={<span className="inline-flex items-center gap-1 text-xs text-ink-3"><span className="material-symbols-outlined text-[16px]" aria-hidden="true">lock</span>só Admin</span>}
          footer={<Button variant="secondary" onClick={() => setEventosAbertos(false)}>Fechar</Button>}>
          {eventos.length === 0 ? <p className="text-sm text-ink-3">Nenhum evento registrado.</p> : (
            <ul className="divide-y divide-line">
              {eventos.map(e => (
                <li key={e.id} className="py-2 text-sm">
                  <span className="text-ink"><strong className="text-navy">{e.usuario || 'Usuário'}</strong> {ROTULO_ACAO_INSPECIONADO[e.acao as keyof typeof ROTULO_ACAO_INSPECIONADO] ?? e.acao}{e.ref && e.acao !== 'ficha.abrir' ? ` (${e.ref})` : ''}</span>
                  <span className="block text-xs text-ink-3 tabular-nums">{quandoEvento(e.em, hoje)}</span>
                </li>
              ))}
            </ul>
          )}
        </Drawer>
      )}

      {isSel && (
        <InspecaoDetalhe
          inspecao={isSel} om={om} permissoes={permissoesIS}
          onClose={() => definir({ is: null })}
          onMinuta={() => { /* minuta: na página Inspeções de Saúde */ }}
          onSolicitarParecer={() => { /* parecer: na página Inspeções de Saúde */ }}
          onDuplicarParecer={() => { /* parecer: na página Inspeções de Saúde */ }}
          onSituacaoMudou={is => { sincronizarAgendaIS(is).then(r => { if (!r.ok) avisar(`IS atualizada, mas o Google Agenda não: ${r.erro}`, 'error'); }); }}
          onAviso={avisar}
        />
      )}

      {periciaSel && (
        <PericiaMenorPainel
          pericia={periciaSel} historico={listaPm} hoje={hoje} cidAbrev={cidAbrev} modo="sheet" termos={t}
          aba={abaPericia} onAba={a => definir({ aba: a === 'historico' ? 'historico' : null })}
          onSelecionar={id => definir({ sel: id })} onFechar={() => definir({ sel: null, aba: null })}
          onNova={podePericia ? () => setNovaPericia(true) : undefined}
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
