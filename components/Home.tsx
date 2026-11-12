// Ficheiro: components/Home.tsx
// Início como PAINEL DE TRABALHO (auditoria v2, N4/G3/L4): "Precisa de atenção" (pareceres
// atrasados, concurso em andamento, IS marcadas para hoje, senha temporária),
// "Últimos documentos gerados" (só Secretaria: fila do que foi enviado para impressão),
// "Pareceres não concluídos" e "Perícias Menores Vigentes" (cada um só aparece
// quando há itens), "Acesso rápido" (até 6 páginas, editável e guardado no
// aparelho), "Próximas férias" e "Avisos" (Casos Periciais e instalação do app — antes eram diálogos em
// sequência no login). O menu lateral já lista as páginas: a Home não o repete.
// Tudo respeita a matriz de permissões: cada bloco só aparece para quem tem acesso.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuAcoes } from './ui/MenuAcoes';
import { Container } from './ui/Page';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { StatusTag, type StatusTone } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { NavContext, getPrimeiroNome } from '../context/NavContext';
import { getNavCategories } from '../config/navigation';
import { termosPericia } from '../config/termosPericia';
import { LinkPdf } from './ui/LinkPdf';
import { canAccessPage, canUseFeature } from '../config/permissions';
import { pathForView, concursoPath, concursosDiaPath } from '../config/routes';
import { observarConcursos, type ConcursoRecord } from '../services/firestoreConcursos';
import { observarPareceres, statusEfetivo, type ParecerRecord } from '../services/firestorePareceres';
import { observarInspecoes, type InspecaoRecord } from '../services/firestoreInspecoes';
import { observarAfastamentos, type AfastamentoRecord } from '../services/afastamentos';
import { podeVerFerias, statusEfetivo as statusDoAfastamento } from '../utils/afastamentos';
import { MAX_RAPIDO, FORA_DO_RAPIDO, chaveEscolhaLocal, lerEscolha, contarAcessos, diasForaDaJanela, inicioDaQuinzena, resolverAcessoRapido, type EscolhaRapido } from '../utils/acessoRapido';
import { observarAcessoRapido, salvarEscolhaRapido, podarAcessos, type DocAcessoRapido } from '../services/acessoRapido';
import { AgendaInspecoesCard } from './home/AgendaInspecoesCard';
import { CardFaltasHNRe } from './inspecoes/CardFaltasHNRe';
import { EnviarExamesModal } from './concursos/ExamesCandidato';
import { useDiasConcursos } from '../hooks/useDiasConcursos';
import { hojeISO, dataDeEntrevista, horaDeEntrevista, dataBr } from '../utils/inspecoes';
import { observarPericiasMenores, statusPericia, dataBR, type PericiaMenorRecord } from '../services/firestorePericiasMenores';
import { extrairNomeInspecionado } from '../utils/format';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { observarDocumentosPendentes, marcarDocumentoAberto, type DocumentoGerado } from '../services/documentosGerados';
import { urlVisualizacao } from '../services/driveConcursos';
import type { NavItem } from '../types';
import { observarEscalaAPartirDe, type EscalaDia } from '../services/firestoreEscala';
import { servicosDoUsuario, type FuncaoEscala } from '../utils/escalaSpa';

const SEMANA_ABR = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
/** Ícone e cor de cada função da Escala SVÇ no card "Próximos serviços". */
const FUNCAO_ESCALA: Record<FuncaoEscala, { icone: string; rotulo: string }> = {
  'Supervisão': { icone: 'shield_person', rotulo: 'Supervisão 24 h' },
  'Retém supervisão': { icone: 'person_pin', rotulo: 'Retém da supervisão' },
  'Dia': { icone: 'light_mode', rotulo: 'Plantão dia (12 h)' },
  'Retém dia': { icone: 'person_pin', rotulo: 'Retém do plantão dia' },
  'Noite': { icone: 'dark_mode', rotulo: 'Plantão noite (12 h)' },
  'Retém noite': { icone: 'person_pin', rotulo: 'Retém do plantão noite' },
};

interface Atencao {
  id: string;
  icone: string;
  titulo: string;
  detalhe: string;
  tag: string;
  tom: StatusTone;
  to: string;
}

const PADRAO_RAPIDO: NavItem[] = ['guide', 'exames', 'dgpm406', 'concursosJRS', 'concursos'];

const saudacao = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
const dataPorExtenso = (): string => {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Card da Início. Com `link`, o título (cabeçalho) leva à página correspondente. */
const Secao: React.FC<{ id: string; titulo: string; badge?: number; badgeRotulo?: string; acao?: React.ReactNode; link?: string; children: React.ReactNode }> = ({ id, titulo, badge, badgeRotulo = 'pendentes', acao, link, children }) => (
  <section aria-labelledby={id} className="bg-white border border-line rounded-xl">
    <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
      <h2 id={id} className="text-h3 font-bold text-navy flex items-center gap-2">
        {link ? (
          <Link to={link} className="inline-flex items-center gap-1 min-h-[44px] -my-2 hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold rounded">
            {titulo}
            <span className="material-symbols-outlined text-[20px] text-ink-4" aria-hidden="true">chevron_right</span>
          </Link>
        ) : titulo}
        {!!badge && <span className="min-w-[24px] h-6 px-2 rounded-full bg-wine text-white text-xs font-bold leading-6 text-center" aria-label={`${badge} ${badgeRotulo}`}>{badge}</span>}
      </h2>
      {acao}
    </div>
    {children}
  </section>
);

const ICONE_DOCUMENTO: Record<string, string> = {
  'termo-recurso': 'gavel',
  'termo-cientificacao': 'task',
  'solicitacao-parecer': 'stethoscope',
  'solicitacao-exames': 'biotech',
  'pedido-parecer': 'description',
};
const MAX_DOCUMENTOS = 5;
/** Card "Perícias Menores Vigentes": só as mais antigas; o badge do título traz o total. */
const MAX_VIGENTES_CARD = 4;

/** Documento gerado ainda não aberto (fila de impressão da Secretaria): abrir o PDF o tira da lista. */
const LinhaDocumentoGerado: React.FC<{ d: DocumentoGerado; onAbrir: (d: DocumentoGerado) => void }> = ({ d, onAbrir }) => (
  <a
    href={urlVisualizacao(d.pdfUrl)} target="_blank" rel="noopener noreferrer" onClick={() => onAbrir(d)}
    className="flex items-center gap-3 px-4 min-h-[56px] py-2 hover:bg-thead transition-colors"
  >
    <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{ICONE_DOCUMENTO[d.tipo] || 'description'}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-navy truncate">{d.titulo}</span>
      <span className="block text-xs text-ink-3 truncate">{d.detalhe}{d.remetente ? ` · ${d.remetente}` : ''}</span>
    </span>
    <span className="text-xs text-ink-3 shrink-0">{d.criadoEm ? d.criadoEm.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'agora'}</span>
    <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">print</span>
  </a>
);

/** Versão enxuta da linha no celular (< md): outro detalhe (pode ser vazio) e outra tag; sem a coluna de data. */
interface LinhaCompacta { detalhe: string; tag: React.ReactNode }

/** Linha de documento: abre o PDF (nova aba; atestados num modal em tela cheia no desktop) quando existe; senão leva à página do assunto. */
const LinhaDocumento: React.FC<{ icone: string; titulo: string; detalhe: string; data: string; link: string; to: string; tag: React.ReactNode; compactoMobile?: LinhaCompacta; tituloPdf?: string }> = ({ icone, titulo, detalhe, data, link, to, tag, compactoMobile: m, tituloPdf }) => {
  const soDesktop = m ? 'hidden md:block' : 'block';
  const corpo = (
    <>
      <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-navy truncate">{titulo}</span>
        <span className={`${soDesktop} text-xs text-ink-3 truncate`}>{detalhe}</span>
        {m?.detalhe && <span className="block md:hidden text-xs text-ink-3 truncate">{m.detalhe}</span>}
      </span>
      <span className={`${m ? 'hidden md:inline' : ''} text-xs text-ink-3 shrink-0`}>{data}</span>
      {m ? <><span className="hidden md:inline-flex shrink-0">{tag}</span><span className="md:hidden shrink-0 inline-flex">{m.tag}</span></> : tag}
      <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">{link ? 'open_in_new' : 'chevron_right'}</span>
    </>
  );
  const classe = 'flex items-center gap-3 px-4 min-h-[56px] py-2 hover:bg-thead transition-colors';
  if (link && tituloPdf) return <LinkPdf url={link} tituloPdf={tituloPdf} className={classe}>{corpo}</LinkPdf>;
  return link
    ? <a href={link} target="_blank" rel="noopener noreferrer" className={classe}>{corpo}</a>
    : <Link to={to} className={classe}>{corpo}</Link>;
};

export const Home: React.FC = () => {
  const nav = useContext(NavContext);
  const authUser = nav?.authUser || null;
  const perfil = authUser?.perfil;
  const periciaMenorVigentes = nav?.periciaMenorVigentes || 0;
  const isDesktop = useIsDesktop();

  const categorias = getNavCategories(perfil, periciaMenorVigentes, isDesktop);
  const paginas = categorias.flatMap(c => c.subitems);
  const primeiroNome = getPrimeiroNome(authUser);

  const podeConcursos = canAccessPage('concursosJRS', perfil);
  const podePareceres = canAccessPage('pareceres', perfil);
  const podeInspecoes = canAccessPage('inspecoes', perfil);
  const podePericiaMenor = canAccessPage('pericia-menor', perfil);
  // Botão primário da Início: "+ Abrir IS" (substitui "Novo parecer"), para quem pode cadastrar IS.
  const podeAbrirIS = podeInspecoes && canUseFeature('inspecoes.cadastrar', perfil);
  const navegar = useNavigate();
  const podeNovaPericia = canUseFeature('pericia-menor.novo', perfil);
  const termosPm = termosPericia(perfil);
  const podeEnviarExames = podeConcursos && canUseFeature('concursosJRS.enviarExamesCandidato', perfil);
  // Envio dos exames de um candidato direto da Home: o candidato é escolhido no
  // próprio sheet, entre os dos concursos em andamento (ver `enviarExames` abaixo).
  const [enviarExames, setEnviarExames] = useState(false);

  const [concursos, setConcursos] = useState<ConcursoRecord[]>([]);
  useEffect(() => (podeConcursos ? observarConcursos(setConcursos, () => { /* silencioso: não bloqueia a Home */ }) : undefined), [podeConcursos]);
  const emAndamento = concursos.filter(c => c.status === 'em_andamento');
  // O botão de enviar exames só existe quando há concurso em andamento: fora disso
  // não há candidato a quem anexar os laudos.
  const mostrarEnviarExames = podeEnviarExames && emAndamento.length > 0;

  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  useEffect(() => (podePareceres ? observarPareceres(setPareceres, () => { /* silencioso */ }) : undefined), [podePareceres]);
  const atrasados = useMemo(() => pareceres.filter(p => statusEfetivo(p) === 'atrasado'), [pareceres]);

  // Inspeções de Saúde agendadas: item de atenção (hoje) e mini calendário (o card "Próximas Inspeções" saiu).
  const [inspecoes, setInspecoes] = useState<InspecaoRecord[]>([]);
  useEffect(() => (podeInspecoes ? observarInspecoes(setInspecoes, () => { /* silencioso */ }) : undefined), [podeInspecoes]);
  // Quem acessa Concursos: além da agenda, alimenta o item "IS de concurso atrasadas" de Precisa de atenção.
  // (user_medicos_geral não tem acesso às IS de concursos: nada de concurso aparece para ele.)
  const { dias: diasConcursos } = useDiasConcursos(podeConcursos);
  const hoje = hojeISO();
  const proximas = useMemo(() => inspecoes
    .filter(i => i.dataEntrevista && i.status !== 'cancelada' && i.situacao !== 'finalizada' && dataDeEntrevista(i.dataEntrevista) >= hoje)
    .sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista) || a.is - b.is), [inspecoes, hoje]);
  const deHoje = useMemo(() => proximas.filter(i => dataDeEntrevista(i.dataEntrevista) === hoje), [proximas, hoje]);
  const nomeDe = (i: InspecaoRecord) => i.inspecionado.replace(/^.*?\d{2}\.\d{4}\.\d{2}\s*/, '') || i.inspecionado;

  // Pareceres ainda não concluídos (solicitados e atrasados), os mais antigos primeiro.
  const naoConcluidos = useMemo(() => pareceres
    .filter(p => p.status !== 'concluido')
    .sort((a, b) => (a.criadoEm?.toMillis?.() ?? 0) - (b.criadoEm?.toMillis?.() ?? 0)), [pareceres]);

  // Perícias menores vigentes (dispensa em curso), as que terminam primeiro no topo.
  const [pericias, setPericias] = useState<PericiaMenorRecord[]>([]);
  useEffect(() => (podePericiaMenor ? observarPericiasMenores(setPericias, () => { /* silencioso */ }) : undefined), [podePericiaMenor]);
  const vigentes = useMemo(() => pericias.filter(p => statusPericia(p) === 'vigente').sort((a, b) => a.dataTermino.localeCompare(b.dataTermino)), [pericias]);
  // Card da Início: as vigentes mais antigas (pela data do atestado) primeiro.
  const vigentesMaisAntigas = useMemo(() => [...vigentes].sort((a, b) => a.dataAtestado.localeCompare(b.dataAtestado)).slice(0, MAX_VIGENTES_CARD), [vigentes]);
  // user_medicos_geral: no lugar das vigentes, os últimos atestados registrados pelo próprio usuário.
  const ehMedicoGeral = perfil === 'user_medicos_geral';
  const meusAtestados = useMemo(() => (ehMedicoGeral
    ? pericias.filter(p => p.peritoUid === authUser?.uid)
      .sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0) || b.dataAtestado.localeCompare(a.dataAtestado))
    : []), [pericias, ehMedicoGeral, authUser?.uid]);

  // Escala SVÇ: próximos serviços do usuário (supervisão, retém, plantões), a partir de hoje.
  const podeEscala = canAccessPage('escala', perfil);
  const [escala, setEscala] = useState<EscalaDia[]>([]);
  useEffect(() => (podeEscala ? observarEscalaAPartirDe(hoje, 62, setEscala, () => { /* silencioso */ }) : undefined), [podeEscala, hoje]);
  const meusServicos = useMemo(() => servicosDoUsuario(escala, authUser?.usuario).slice(0, 5), [escala, authUser?.usuario]);

  // Férias (página Férias, coleção "afastamentos"): só o tipo Férias com status "Em gozo" ou "Confirmada" (status
  // automático, utils/afastamentos.ts; gozadas e programadas não entram) — em gozo primeiro, depois as confirmadas
  // pela data de início. Só para Admin, médicos JRS/MPI e Secretaria; o card só aparece quando há registro.
  const mostraFerias = podeVerFerias(perfil);
  const [afastamentos, setAfastamentos] = useState<AfastamentoRecord[]>([]);
  useEffect(() => (mostraFerias ? observarAfastamentos(setAfastamentos, () => { /* silencioso */ }) : undefined), [mostraFerias]);
  const ferias = useMemo(() => afastamentos
    .filter(a => a.tipo === 'ferias' && a.dataInicio && a.dataFim)
    .map(a => ({ a, st: statusDoAfastamento(a, hoje) }))
    .filter(x => x.st === 'em_gozo' || x.st === 'confirmada')
    .sort((x, y) => (x.st === y.st ? 0 : x.st === 'em_gozo' ? -1 : 1) || x.a.dataInicio.localeCompare(y.a.dataInicio)),
  [afastamentos, hoje]);

  // Últimos documentos gerados (só Secretaria): fila do que foi enviado para impressão e ainda não abriu.
  const ehSecretaria = perfil === 'user_secretaria';
  const [documentos, setDocumentos] = useState<DocumentoGerado[]>([]);
  const [todosDocumentos, setTodosDocumentos] = useState(false);
  useEffect(() => (ehSecretaria ? observarDocumentosPendentes(setDocumentos) : undefined), [ehSecretaria]);
  const abrirDocumento = (d: DocumentoGerado) => {
    void marcarDocumentoAberto(d.id, authUser?.usuario || authUser?.nome || '');
    setDocumentos(prev => prev.filter(x => x.id !== d.id));
  };

  const atencao: Atencao[] = [];
  if (authUser?.senhaTemporaria) {
    atencao.push({ id: 'senha', icone: 'key', titulo: 'Senha temporária', detalhe: 'Altere a senha inicial por uma só sua.', tag: 'Segurança', tom: 'danger', to: '/perfil' });
  }
  if (podePareceres && atrasados.length > 0) {
    const esps = Array.from(new Set(atrasados.map(p => p.especialidade))).slice(0, 3).join(', ');
    atencao.push({
      id: 'pareceres', icone: 'assignment_late', titulo: `${atrasados.length} parecer${atrasados.length !== 1 ? 'es' : ''} atrasado${atrasados.length !== 1 ? 's' : ''}`,
      detalhe: `Sem conclusão há 20 dias ou mais${esps ? ` · ${esps}` : ''}`, tag: 'Atrasado', tom: 'danger', to: '/pareceres',
    });
  }
  if (podeInspecoes && deHoje.length > 0) {
    const agora = new Date().toTimeString().slice(0, 5);
    const proxima = deHoje.find(i => horaDeEntrevista(i.dataEntrevista) >= agora) ?? deHoje[0];
    atencao.push({
      id: 'is-hoje', icone: 'event_available', titulo: `${deHoje.length} inspeç${deHoje.length !== 1 ? 'ões' : 'ão'} marcada${deHoje.length !== 1 ? 's' : ''} para hoje`,
      detalhe: `${horaDeEntrevista(proxima.dataEntrevista)} · ${nomeDe(proxima)}${deHoje.length > 1 ? ` e mais ${deHoje.length - 1}` : ''}`, tag: 'Hoje', tom: 'attention', to: '/inspecoes',
    });
  }
  // IS de concurso agendadas para hoje (todos os concursos do dia): abre a tabela do dia.
  // IS de concurso atrasadas: agendadas antes de hoje e ainda não finalizadas (quem acessa Concursos).
  const diasAtrasados = podeConcursos ? diasConcursos.filter(d => d.data < hoje) : [];
  const qtdAtrasadas = diasAtrasados.reduce((n, d) => n + d.candidatos.filter(c => !c.finalizado).length, 0);
  if (qtdAtrasadas > 0) {
    const nomes = [...new Set(diasAtrasados.filter(d => d.candidatos.some(c => !c.finalizado)).map(d => d.nome))];
    atencao.push({
      id: 'is-atrasadas', icone: 'event_busy',
      titulo: `${qtdAtrasadas} IS de concurso atrasada${qtdAtrasadas !== 1 ? 's' : ''}`,
      detalhe: `Agendadas antes de hoje e não finalizadas · ${nomes.length === 1 ? nomes[0] : `${nomes.length} concursos`}`,
      tag: 'Atrasadas', tom: 'danger', to: '/concursos/atrasadas',
    });
  }
  const concursosHoje = diasConcursos.filter(d => d.data === hoje);
  if (podeConcursos && concursosHoje.length > 0) {
    const totalHoje = concursosHoje.reduce((n, d) => n + d.total, 0);
    const feitas = concursosHoje.reduce((n, d) => n + d.candidatos.filter(c => c.finalizado).length, 0);
    atencao.push({
      id: 'is-concurso-hoje', icone: 'groups', titulo: `${totalHoje} inspeç${totalHoje !== 1 ? 'ões' : 'ão'} de concurso para hoje`,
      detalhe: `${concursosHoje.map(d => d.nome).join(' e ')} · ${feitas} de ${totalHoje} finalizada${feitas !== 1 ? 's' : ''}`,
      tag: 'Hoje', tom: feitas === totalHoje ? 'success' : 'attention', to: concursosDiaPath(hoje),
    });
  }
  // Perícias menores vigentes não entram em "Precisa de atenção": ficam só no card próprio (Perícias Menores Vigentes).
  if (podeConcursos && emAndamento.length > 0) {
    atencao.push({
      id: 'concurso', icone: 'fact_check', titulo: emAndamento.length === 1 ? emAndamento[0].nome : `${emAndamento.length} concursos em andamento`,
      detalhe: emAndamento.length === 1 ? 'Concurso em andamento · planilha de candidatos' : 'Planilhas de candidatos', tag: 'Em andamento', tom: 'navy',
      to: emAndamento.length === 1 ? concursoPath(emAndamento[0].id) : '/concursos',
    });
  }

  // Acesso rápido: escolha do usuário ou o padrão do perfil; para quem acessa mais de 6 páginas, renovado a cada
  // quinzena pelas mais acessadas (utils/acessoRapido.ts). Escolha e acessos no Firestore, por usuário
  // (services/acessoRapido.ts). Inspeções de Saúde nunca entra.
  const uid = authUser?.uid ?? '';
  const [docRapido, setDocRapido] = useState<DocAcessoRapido | null>(null);
  useEffect(() => (uid ? observarAcessoRapido(uid, setDocRapido, () => setDocRapido({ escolha: null, acessos: {} })) : undefined), [uid]);
  const [editandoRapido, setEditandoRapido] = useState(false);
  const [rascunho, setRascunho] = useState<NavItem[]>([]);
  const mapa = new Map(paginas.map(p => [p.id, p]));
  const idsPaginas = paginas.map(p => p.id).join(',');
  const resolvidoRapido = useMemo(() => {
    if (!docRapido) return null;
    // Primeira vez no Firestore: aproveita a escolha antiga guardada neste aparelho.
    let salvo = docRapido.escolha;
    if (!salvo) { try { salvo = lerEscolha(localStorage.getItem(chaveEscolhaLocal(uid))); } catch { /* sem localStorage */ } }
    return resolverAcessoRapido({ salvo, disponiveis: paginas.map(p => p.id), contagem: contarAcessos(docRapido.acessos, hoje), hoje, padrao: PADRAO_RAPIDO });
  }, [docRapido, idsPaginas, hoje, uid]); // eslint-disable-line react-hooks/exhaustive-deps
  // Renovação da quinzena: guarda a nova escolha; e apaga os dias de acesso fora da janela de 28 dias.
  useEffect(() => {
    if (!uid || !resolvidoRapido?.salvar) return;
    salvarEscolhaRapido(uid, resolvidoRapido.salvar).catch(() => { /* tenta de novo na próxima abertura */ });
  }, [uid, resolvidoRapido?.salvar?.semana, resolvidoRapido?.salvar?.ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!uid || !docRapido) return;
    podarAcessos(uid, diasForaDaJanela(docRapido.acessos, hoje)).catch(() => { /* silencioso */ });
  }, [uid, docRapido, hoje]);
  const rapido = (resolvidoRapido?.ids ?? []).filter(id => mapa.has(id)).map(id => mapa.get(id)!);
  const salvarRapido = () => {
    const escolha: EscolhaRapido = { ids: rascunho, semana: inicioDaQuinzena(hoje) };
    setDocRapido(d => (d ? { ...d, escolha } : d));
    salvarEscolhaRapido(uid, escolha).catch(() => { /* a escolha volta ao recarregar */ });
    setEditandoRapido(false);
  };
  const renovaRapido = paginas.filter(p => !FORA_DO_RAPIDO.includes(p.id)).length > MAX_RAPIDO;

  const mostrarAvisos = !!nav?.avisos?.casosPendente || !!nav?.avisos?.pwaPendente;

  return (
    <Container size="data" className="py-6 md:py-8 pb-10 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="eyebrow">{dataPorExtenso()}</p>
          <h1 className="text-display font-extrabold text-navy">{saudacao()}, {primeiroNome || 'Perito'}</h1>
        </div>
        {(podeNovaPericia && podePericiaMenor || podeAbrirIS || mostrarEnviarExames) && (
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            {mostrarEnviarExames && <button type="button" onClick={() => setEnviarExames(true)} className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-white text-navy border border-navy hover:bg-thead transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>Exames Concursos</button>}
            {podeNovaPericia && podePericiaMenor && <Link to="/pericia-menor?novo=1" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg text-sm font-bold bg-white text-navy border border-navy hover:bg-thead transition-colors"><span className="material-symbols-outlined text-[20px]" aria-hidden="true">add</span>{termosPm.pagina === 'Atestados' ? 'Atestado' : 'Perícia Menor'}</Link>}
            {podeAbrirIS && (
              <MenuAcoes
                rotulo="Abrir IS" botao={{ texto: 'Abrir IS', icone: 'add', primario: true }}
                itens={[
                  { rotulo: 'Manualmente', icone: 'edit_note', onClick: () => navegar('/inspecoes?novo=manual') },
                  { rotulo: 'Enviar print', icone: 'photo_camera', onClick: () => navegar('/inspecoes?novo=print') },
                ]}
              />
            )}
          </div>
        )}
      </header>

      <div className="@container">
        <div className="grid grid-cols-1 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            <Secao id="home-atencao" titulo="Precisa de atenção">
              {atencao.length > 0 ? (
                <ul className="divide-y divide-line">
                  {atencao.map(a => (
                    <li key={a.id}>
                      <Link to={a.to} className="flex items-center gap-3 px-4 min-h-[64px] py-3 hover:bg-thead transition-colors">
                        <span className="w-10 h-10 rounded-lg bg-thead flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{a.icone}</span></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-navy truncate">{a.titulo}</span>
                          <span className="block text-xs text-ink-3 truncate">{a.detalhe}</span>
                        </span>
                        <StatusTag tone={a.tom} className="shrink-0">{a.tag}</StatusTag>
                        <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">chevron_right</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState icon="task_alt" title="Nada pendente" description={podeConcursos ? 'Não há pareceres atrasados, inspeções de hoje nem concursos em andamento ou de hoje para você agora.' : 'Nada pendente para você agora.'} />
              )}
            </Secao>

            {/* Agenda de inspeções: calendário + eventos do dia (concursos como um evento por turno). */}
            {podeInspecoes && (
              <Secao id="home-agenda" titulo="Agenda de inspeções">
                <AgendaInspecoesCard inspecoes={inspecoes} diasConcursos={diasConcursos} concursosClicaveis={podeConcursos} />
              </Secao>
            )}

            {ehSecretaria && (
              <Secao
                id="home-documentos" titulo="Últimos documentos gerados" badge={documentos.length}
                acao={documentos.length > MAX_DOCUMENTOS ? <button type="button" onClick={() => setTodosDocumentos(true)} className="min-h-[44px] px-2 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver todos</button> : undefined}
              >
                {documentos.length === 0 ? (
                  <EmptyState icon="print" title="Nada para imprimir" description="Termos e solicitações enviados para impressão aparecem aqui até serem abertos." />
                ) : (
                  <ul className="divide-y divide-line">
                    {documentos.slice(0, MAX_DOCUMENTOS).map(d => <li key={d.id}><LinhaDocumentoGerado d={d} onAbrir={abrirDocumento} /></li>)}
                  </ul>
                )}
              </Secao>
            )}

            {/* Faltas do HNRe ainda não comunicadas à Divisão de Pessoal (só Admin e Secretaria; some sem pendências). */}
            {podeInspecoes && (perfil === 'admin' || ehSecretaria) && <CardFaltasHNRe inspecoes={inspecoes} Secao={Secao} />}

            {podePareceres && naoConcluidos.length > 0 && (
              <Secao id="home-pareceres" titulo={`Pareceres não concluídos (${naoConcluidos.length})`} acao={<Link to="/pareceres" className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver pareceres</Link>}>
                <ul className="divide-y divide-line">
                  {naoConcluidos.slice(0, 6).map(p => {
                    const atrasado = statusEfetivo(p) === 'atrasado';
                    return (
                      <li key={p.id}>
                        <LinhaDocumento
                          icone="description" titulo={extrairNomeInspecionado(p.inspecionado)} detalhe={`Parecer · ${p.especialidade}`}
                          data={p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? ''} link={p.pdfUrl} to="/pareceres"
                          tag={<StatusTag tone={atrasado ? 'danger' : 'navyOutline'} className="shrink-0">{atrasado ? 'Atrasado' : 'Solicitado'}</StatusTag>}
                        />
                      </li>
                    );
                  })}
                </ul>
                {naoConcluidos.length > 6 && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{naoConcluidos.length - 6} em Pareceres.</p>}
              </Secao>
            )}

            {podePericiaMenor && ehMedicoGeral && meusAtestados.length > 0 && (
              <Secao id="home-meus-atestados" titulo="Últimos atestados" acao={<Link to="/pericia-menor/historico" className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver atestados</Link>}>
                <ul className="divide-y divide-line">
                  {meusAtestados.slice(0, 6).map(p => {
                    const vigente = statusPericia(p) === 'vigente';
                    return (
                      <li key={p.id}>
                        <LinhaDocumento
                          icone="personal_injury" titulo={extrairNomeInspecionado(p.inspecionado)} detalhe={`${dataBR(p.dataAtestado)} · ${p.tempoHomologado} dia${p.tempoHomologado !== 1 ? 's' : ''} · ${p.cid}`}
                          data={`até ${dataBR(p.dataTermino)}`} link={p.pdfUrl} tituloPdf={`Atestado — ${extrairNomeInspecionado(p.inspecionado)}`} to="/pericia-menor/historico"
                          tag={<StatusTag tone={vigente ? 'danger' : 'success'} className="shrink-0">{vigente ? 'Vigente' : 'Concluída'}</StatusTag>}
                          // Celular: só "Fim: dd/mm/aaaa" nas vigentes e o chip só com a bolinha (texto para leitor de tela).
                          compactoMobile={{
                            detalhe: vigente ? `Fim: ${dataBR(p.dataTermino)}` : '',
                            tag: (
                              <span className={`inline-flex items-center justify-center w-7 h-6 rounded-full ${vigente ? 'bg-wine/10' : 'bg-green/10'}`} title={vigente ? 'Vigente' : 'Concluída'}>
                                <span className={`w-2 h-2 rounded-full ${vigente ? 'bg-wine' : 'bg-green'}`} aria-hidden="true" />
                                <span className="sr-only">{vigente ? 'Vigente' : 'Concluída'}</span>
                              </span>
                            ),
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
                {meusAtestados.length > 6 && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{meusAtestados.length - 6} em Atestados.</p>}
              </Secao>
            )}

            {podePericiaMenor && !ehMedicoGeral && vigentes.length > 0 && (
              <Secao id="home-pericias" titulo={termosPm.pagina === 'Atestados' ? 'Atestados vigentes' : 'Perícias Menores Vigentes'} badge={vigentes.length} badgeRotulo="vigentes" acao={<Link to="/pericia-menor/historico" className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">{termosPm.pagina === 'Atestados' ? 'Ver atestados' : 'Ver perícias'}</Link>}>
                <ul className="divide-y divide-line">
                  {vigentesMaisAntigas.map(p => (
                    <li key={p.id}>
                      <LinhaDocumento
                        icone="personal_injury" titulo={extrairNomeInspecionado(p.inspecionado)} detalhe={`${termosPm.pagina} · ${p.cid}`}
                        data={`até ${dataBR(p.dataTermino)}`} link={p.pdfUrl} tituloPdf={`Atestado — ${extrairNomeInspecionado(p.inspecionado)}`} to="/pericia-menor/historico"
                        tag={<StatusTag tone="danger" className="shrink-0">Vigente</StatusTag>}
                      />
                    </li>
                  ))}
                </ul>
                {vigentes.length > MAX_VIGENTES_CARD && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{vigentes.length - MAX_VIGENTES_CARD} em {termosPm.pagina}.</p>}
              </Secao>
            )}
          </div>

          <div className="space-y-6 min-w-0">
            {podeEscala && meusServicos.length > 0 && (
              <Secao id="home-escala" titulo="Próximos serviços" acao={<Link to={pathForView('escala')} className="text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Ver escala</Link>}>
                <Link to={pathForView('escala')} className="block hover:bg-thead/60 transition-colors" aria-label="Abrir a Escala SVÇ">
                  <ul className="divide-y divide-line">
                    {meusServicos.map(s => {
                      const [y, m, d] = s.data.split('-').map(Number);
                      const dow = new Date(y, m - 1, d).getDay();
                      const f = FUNCAO_ESCALA[s.funcao];
                      return (
                        <li key={s.data + s.funcao} className="flex items-center gap-3 px-4 min-h-[56px] py-2">
                          <span className="w-11 shrink-0 text-center">
                            <span className="block text-base font-extrabold text-navy leading-none">{String(d).padStart(2, '0')}/{String(m).padStart(2, '0')}</span>
                            <span className="block text-[11px] font-semibold text-ink-3">{s.data === hoje ? 'hoje' : SEMANA_ABR[dow]}</span>
                          </span>
                          <span className="material-symbols-outlined text-[22px] text-navy shrink-0" aria-hidden="true">{f.icone}</span>
                          <span className="min-w-0 flex-1 text-sm font-bold text-navy truncate">{f.rotulo}</span>
                          {s.data === hoje && <StatusTag tone="attention" className="shrink-0">Hoje</StatusTag>}
                        </li>
                      );
                    })}
                  </ul>
                </Link>
              </Secao>
            )}

            <Secao
              id="home-rapido" titulo="Acesso rápido"
              acao={<button type="button" onClick={() => { setRascunho(rapido.map(r => r.id)); setEditandoRapido(true); }} className="min-h-[44px] px-2 text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Editar</button>}
            >
              <div className="grid grid-cols-2 gap-2 p-3 pt-1">
                {rapido.map(r => (
                  <Link key={r.id} to={pathForView(r.id)} className="flex flex-col items-start gap-2 min-h-[80px] p-3 rounded-lg border border-line hover:border-navy transition-colors">
                    <span className="material-symbols-outlined text-[24px] text-navy" aria-hidden="true">{r.icon}</span>
                    <span className="text-sm font-bold text-navy leading-tight">{r.label}</span>
                  </Link>
                ))}
              </div>
            </Secao>


            {mostraFerias && ferias.length > 0 && (
              <Secao id="home-ferias" titulo="Próximas férias" link="/ferias">
                <ul className="divide-y divide-line">
                  {ferias.slice(0, 6).map(({ a: f, st }) => (
                    <li key={f.id} className="flex items-center gap-3 px-4 min-h-[56px] py-2">
                      <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">beach_access</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-navy truncate">{f.usuario}</span>
                        <span className="block text-xs text-ink-3 truncate">{dataBr(f.dataInicio)} a {dataBr(f.dataFim)} · {f.duracaoDias} dia{f.duracaoDias !== 1 ? 's' : ''}{f.referencia ? ` · ref. ${f.referencia}` : ''}</span>
                      </span>
                      <StatusTag tone={st === 'em_gozo' ? 'attention' : 'navy'} className="shrink-0">{st === 'em_gozo' ? 'Em gozo' : 'Confirmada'}</StatusTag>
                    </li>
                  ))}
                </ul>
                {ferias.length > 6 && <Link to="/ferias" className="block px-4 py-2 min-h-[44px] text-xs font-bold text-blue underline underline-offset-2 hover:text-navy border-t border-line">+{ferias.length - 6} período{ferias.length - 6 !== 1 ? 's' : ''} de férias na página Férias</Link>}
              </Secao>
            )}

            {mostrarAvisos && (
              <Secao id="home-avisos" titulo="Avisos">
                <ul className="divide-y divide-line">
                  {nav?.avisos?.casosPendente && (
                    <li className="flex items-start gap-3 px-4 py-3">
                      <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">quiz</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-navy">Casos Periciais</span>
                        <span className="block text-xs text-ink-3">24 questões comentadas sobre a DGPM-406. Faça quando puder.</span>
                        <Link to={pathForView('casos')} className="inline-flex items-center min-h-[44px] text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">Responder</Link>
                      </span>
                    </li>
                  )}
                  {nav?.avisos?.pwaPendente && (
                    <li className="flex items-start gap-3 px-4 py-3">
                      <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">install_mobile</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-navy">Use no celular</span>
                        <span className="block text-xs text-ink-3">{isDesktop ? 'Abra o QR code e instale o app na tela inicial.' : 'Instale o app na tela inicial do aparelho.'}</span>
                        <button type="button" onClick={() => nav?.abrirInstalacaoApp()} className="inline-flex items-center min-h-[44px] text-sm font-bold text-blue underline underline-offset-2 hover:text-navy">{isDesktop ? 'Mostrar QR code' : 'Ver como instalar'}</button>
                      </span>
                    </li>
                  )}
                </ul>
              </Secao>
            )}
          </div>
        </div>
      </div>

      {enviarExames && (
        <EnviarExamesModal
          concursos={emAndamento}
          usuarioNome={authUser?.nome}
          onClose={() => setEnviarExames(false)}
        />
      )}

      {todosDocumentos && (
        <Dialog title={`Últimos documentos gerados (${documentos.length})`} icon="print" size="lg" onClose={() => setTodosDocumentos(false)}>
          {documentos.length === 0 ? (
            <p className="text-ink-3 text-center py-6">Nenhum documento pendente.</p>
          ) : (
            <ul className="-mx-5 -my-5 divide-y divide-line">
              {documentos.map(d => <li key={d.id}><LinhaDocumentoGerado d={d} onAbrir={abrirDocumento} /></li>)}
            </ul>
          )}
        </Dialog>
      )}

      {editandoRapido && (
        <Dialog
          title="Acesso rápido" icon="bolt" onClose={() => setEditandoRapido(false)}
          footer={<><Button variant="secondary" onClick={() => setEditandoRapido(false)}>Cancelar</Button><Button onClick={salvarRapido}>Salvar</Button></>}
        >
          <p className="text-ink-3 mb-3">
            Escolha até {MAX_RAPIDO} páginas. A escolha fica guardada na sua conta.
            {renovaRapido && ' A cada 15 dias o card é renovado com as páginas que você mais acessou nas últimas 4 semanas.'}
          </p>
          <ul className="space-y-1" role="group" aria-label="Páginas do acesso rápido">
            {paginas.map(p => {
              // Inspeções de Saúde nunca entra no Acesso rápido: aparece sempre desabilitada.
              const proibida = FORA_DO_RAPIDO.includes(p.id);
              const marcado = !proibida && rascunho.includes(p.id);
              const cheio = proibida || (!marcado && rascunho.length >= MAX_RAPIDO);
              return (
                <li key={p.id}>
                  <label className={`flex items-center gap-3 min-h-[44px] px-2 rounded-lg ${cheio ? 'opacity-50' : 'cursor-pointer hover:bg-thead'}`} title={proibida ? 'Inspeções de Saúde não entra no Acesso rápido.' : undefined}>
                    <input type="checkbox" checked={marcado} disabled={cheio} onChange={() => setRascunho(r => (marcado ? r.filter(x => x !== p.id) : [...r, p.id]))} className="w-5 h-5 accent-navy" />
                    <span className="material-symbols-outlined text-[20px] text-ink-3" aria-hidden="true">{p.icon}</span>
                    <span className="text-sm font-semibold text-ink">{p.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Dialog>
      )}
    </Container>
  );
};
