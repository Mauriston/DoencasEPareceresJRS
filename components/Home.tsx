// Ficheiro: components/Home.tsx
// Início como PAINEL DO DIA (auditoria v3, 2a/2d/4b/4d):
//  • PageHeader com a data na sobrelinha e a saudação como h1 de 24 px (2a; no celular o título da topbar é
//    "Início" e fica só a data — 4b); ações via Button/ButtonLink/
//    MenuAcoes (B2) com a principal do perfil por último; no celular as mesmas ações vão para o FAB (FabAcoes).
//    "Enviar exames" saiu daqui para o cabeçalho de Concursos; "+ Perícia Menor/Atestado" só para o Médicos Geral;
//  • faixa "Hoje" com até 4 contadores por perfil (ContadoresHoje): cada um declara a permissão e abre a lista já
//    filtrada; 0 continua visível; vinho só com atraso > 0;
//  • grade 8 + 4 (GradePainel): na principal, a agenda do dia (hora primeiro; cada linha abre a IS clicada — H4) e
//    "Pendências · por atraso" (pareceres, IS e perícias numa lista só — no lugar de "Precisa de atenção", H1), além
//    dos cards de perfil (documentos gerados da Secretaria, faltas do HNRe, últimos atestados do Médicos Geral);
//    no apoio, o calendário do mês com legenda (H5), Próximas férias, Próximos serviços e Avisos.
//  • No celular (< md): contadores (com seta: abrem outra página) → Pendências → Avisos → UM card com o calendário
//    e, logo abaixo, a agenda do dia escolhido (clicar no dia filtra a agenda) → cards de perfil → Próximas férias
//    por último. "Acesso rápido" saiu (H2: repetia o menu).
// Tudo respeita a matriz de permissões: cada bloco só aparece para quem tem acesso.
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuAcoes } from './ui/MenuAcoes';
import { Container, PageHeader } from './ui/Page';
import { Button, ButtonLink } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { FabAcoes, type AcaoFab } from './ui/Fab';
import { GradePainel } from './ui/Grade';
import { StatusTag } from './ui/StatusTag';
import { EmptyState } from './ui/EmptyState';
import { LinkPdf } from './ui/LinkPdf';
import { NavContext } from '../context/NavContext';
import { termosPericia } from '../config/termosPericia';
import { canAccessPage, canUseFeature } from '../config/permissions';
import { pathForView, concursoPath, concursosDiaPath } from '../config/routes';
import { observarConcursos, type ConcursoRecord } from '../services/firestoreConcursos';
import { observarPareceres, statusEfetivo, PRAZO_ATRASO_DIAS as PRAZO_PARECER_DIAS, type ParecerRecord } from '../services/firestorePareceres';
import { observarInspecoes, type InspecaoRecord } from '../services/firestoreInspecoes';
import { observarAfastamentos, type AfastamentoRecord } from '../services/afastamentos';
import { statusEfetivo as statusDoAfastamento } from '../utils/afastamentos';
import { Secao } from './home/Secao';
import { ContadoresHoje, contadoresDaFaixa, type ContadorHoje } from './home/ContadoresHoje';
import { AgendaDoDia } from './home/AgendaDoDia';
import { CalendarioMes } from './home/CalendarioMes';
import { Pendencias, type Pendencia } from './home/Pendencias';
import { CardFaltasHNRe } from './inspecoes/CardFaltasHNRe';
import { useDiasConcursos } from '../hooks/useDiasConcursos';
import { aguardaAgendamento, hojeISO, dataDeEntrevista, horaDeEntrevista, dataBr, diasEmAberto, prazoAtrasoDias, statusEfetivoIS, nomeMes } from '../utils/inspecoes';
import { finalidadeSemGrupo, nomeCurtoInspecionado } from '../utils/calendarioIS';
import { observarPericiasMenores, statusPericia, dataBR, type PericiaMenorRecord } from '../services/firestorePericiasMenores';
import { extrairNomeInspecionado } from '../utils/format';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { observarDocumentosPendentes, marcarDocumentoAberto, type DocumentoGerado } from '../services/documentosGerados';
import { urlVisualizacao } from '../services/driveConcursos';
import { observarEscalaAPartirDe, type EscalaDia } from '../services/firestoreEscala';
import { chaveNome, ehRetem, nomeExibicao, servicosDoUsuario, servicosNoMes, type FuncaoEscala } from '../utils/escalaSpa';

const SEMANA_ABR = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
/** Ícone e cor de cada função da Escala de Serviço no card "Próximos serviços". */
const FUNCAO_ESCALA: Record<FuncaoEscala, { icone: string; rotulo: string }> = {
  'Supervisão': { icone: 'shield_person', rotulo: 'Supervisão 24 h' },
  'Retém supervisão': { icone: 'person_pin', rotulo: 'Retém da supervisão' },
  'Dia': { icone: 'light_mode', rotulo: 'Plantão dia (12 h)' },
  'Retém dia': { icone: 'person_pin', rotulo: 'Retém do plantão dia' },
  'Noite': { icone: 'dark_mode', rotulo: 'Plantão noite (12 h)' },
  'Retém noite': { icone: 'person_pin', rotulo: 'Retém do plantão noite' },
};

const saudacao = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
/** Primeiro nome próprio (pula posto/graduação como "CT", "1T", "SG" e o "(Md)"). */
const primeiroNome = (nome?: string): string => {
  const partes = (nome || '').replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  const proprio = partes.find(p => p.length > 2 && !/^[A-Z0-9-]{1,4}$/.test(p)) || partes[0] || '';
  return proprio ? proprio.charAt(0).toUpperCase() + proprio.slice(1).toLowerCase() : '';
};
const dataPorExtenso = (): string => {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

const ICONE_DOCUMENTO: Record<string, string> = {
  'termo-recurso': 'gavel',
  'termo-cientificacao': 'task',
  'solicitacao-parecer': 'stethoscope',
  'solicitacao-exames': 'biotech',
  'pedido-parecer': 'description',
};
const MAX_DOCUMENTOS = 5;

/** Documento gerado ainda não aberto (fila de impressão da Secretaria): abrir o PDF o tira da lista. */
const LinhaDocumentoGerado: React.FC<{ d: DocumentoGerado; onAbrir: (d: DocumentoGerado) => void }> = ({ d, onAbrir }) => (
  <a
    href={urlVisualizacao(d.pdfUrl)} target="_blank" rel="noopener noreferrer" onClick={() => onAbrir(d)}
    className="flex items-center gap-3 px-4 min-h-[56px] py-2 border-t border-line hover:bg-thead transition-colors"
  >
    <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{ICONE_DOCUMENTO[d.tipo] || 'description'}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-navy truncate">{d.titulo}</span>
      <span className="block text-xs text-ink-3 truncate">{d.detalhe}{d.remetente ? ` · ${d.remetente}` : ''}</span>
    </span>
    <span className="text-xs text-ink-3 shrink-0 tabular-nums">{d.criadoEm ? d.criadoEm.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'agora'}</span>
    <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">print</span>
  </a>
);

/** Aviso do card "Avisos": ícone, título, texto e uma ação. */
const LinhaAviso: React.FC<{ icone: string; titulo: string; texto: string; acao: React.ReactNode }> = ({ icone, titulo, texto, acao }) => (
  <li className="flex items-start gap-3 px-4 py-3 border-t border-line">
    <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">{icone}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-navy">{titulo}</span>
      <span className="block text-xs text-ink-3">{texto}</span>
      <span className="block mt-1">{acao}</span>
    </span>
  </li>
);

export const Home: React.FC = () => {
  const nav = useContext(NavContext);
  const authUser = nav?.authUser || null;
  const perfil = authUser?.perfil;
  const isDesktop = useIsDesktop();
  const navegar = useNavigate();

  const podeConcursos = canAccessPage('concursosJRS', perfil);
  const podePareceres = canAccessPage('pareceres', perfil);
  const podeInspecoes = canAccessPage('inspecoes', perfil);
  const podePericiaMenor = canAccessPage('pericia-menor', perfil);
  const podeHistoricoPm = podePericiaMenor && canUseFeature('pericia-menor.historico', perfil);
  const podeAbrirIS = podeInspecoes && canUseFeature('inspecoes.cadastrar', perfil);
  const podeNovaPericia = podePericiaMenor && canUseFeature('pericia-menor.novo', perfil);
  const termosPm = termosPericia(perfil);
  const ehAtestado = termosPm.pagina === 'Atestados';
  const ehMedicoGeral = perfil === 'user_medicos_geral';
  const ehSecretaria = perfil === 'user_secretaria';
  const [concursos, setConcursos] = useState<ConcursoRecord[]>([]);
  useEffect(() => (podeConcursos ? observarConcursos(setConcursos, () => { /* silencioso: não bloqueia a Início */ }) : undefined), [podeConcursos]);
  const emAndamento = concursos.filter(c => c.status === 'em_andamento');

  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  useEffect(() => (podePareceres ? observarPareceres(setPareceres, () => { /* silencioso */ }) : undefined), [podePareceres]);
  const atrasados = useMemo(() => pareceres.filter(p => statusEfetivo(p) === 'atrasado'), [pareceres]);
  const naoConcluidos = useMemo(() => pareceres.filter(p => p.status !== 'concluido'), [pareceres]);

  const [inspecoes, setInspecoes] = useState<InspecaoRecord[]>([]);
  useEffect(() => (podeInspecoes ? observarInspecoes(setInspecoes, () => { /* silencioso */ }) : undefined), [podeInspecoes]);
  // Quem acessa Concursos: agenda dos concursos e "IS de concurso atrasadas".
  // (user_medicos_geral não tem acesso às IS de concursos: nada de concurso aparece para ele.)
  const { dias: diasConcursos } = useDiasConcursos(podeConcursos);
  const hoje = hojeISO();
  const [diaAgenda, setDiaAgenda] = useState(hoje);

  const isDeHoje = useMemo(() => inspecoes
    .filter(i => i.dataEntrevista && i.status !== 'cancelada' && dataDeEntrevista(i.dataEntrevista) === hoje)
    .sort((a, b) => a.dataEntrevista.localeCompare(b.dataEntrevista) || a.is - b.is), [inspecoes, hoje]);
  const semAgendamento = useMemo(() => inspecoes.filter(i => aguardaAgendamento(i.status) && !i.dataEntrevista), [inspecoes]);
  const isAtrasadas = useMemo(() => inspecoes.filter(i => statusEfetivoIS(i, hoje) === 'atrasada'), [inspecoes, hoje]);

  // Perícias menores / atestados.
  const [pericias, setPericias] = useState<PericiaMenorRecord[]>([]);
  useEffect(() => (podePericiaMenor ? observarPericiasMenores(setPericias, () => { /* silencioso */ }) : undefined), [podePericiaMenor]);
  const vigentes = useMemo(() => pericias.filter(p => statusPericia(p) === 'vigente').sort((a, b) => a.dataTermino.localeCompare(b.dataTermino)), [pericias]);
  // user_medicos_geral: os atestados registrados pelo próprio usuário.
  const meusAtestados = useMemo(() => (ehMedicoGeral
    ? pericias.filter(p => p.peritoUid === authUser?.uid)
      .sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0) || b.dataAtestado.localeCompare(a.dataAtestado))
    : []), [pericias, ehMedicoGeral, authUser?.uid]);

  // Escala de Serviço: do 1º dia do mês (para contar os serviços do mês) até ~2 meses à frente (próximos serviços).
  const podeEscala = canAccessPage('escala', perfil);
  const [escala, setEscala] = useState<EscalaDia[]>([]);
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  useEffect(() => (podeEscala ? observarEscalaAPartirDe(inicioMes, 95, setEscala, () => { /* silencioso */ }) : undefined), [podeEscala, inicioMes]);
  const escalaFutura = useMemo(() => escala.filter(d => d.data >= hoje), [escala, hoje]);
  // Só serviços de fato (Supervisão, Dia e Noite): os dias em que o usuário é retém não entram no card nem no KPI.
  const meusServicos = useMemo(() => servicosDoUsuario(escalaFutura, authUser?.usuario).filter(s => !ehRetem(s.funcao)).slice(0, 6), [escalaFutura, authUser?.usuario]);
  const escalaPorData = useMemo(() => new Map(escala.map(d => [d.data, d])), [escala]);
  const servicosMes = useMemo(() => servicosNoMes(escala, authUser?.usuario, hoje.slice(0, 7)), [escala, authUser?.usuario, hoje]);

  // Férias (coleção "afastamentos"): só o tipo Férias "Em gozo" ou "Confirmada" — em gozo primeiro, depois as
  // confirmadas pela data de início. Para quem acessa Férias; o card só aparece quando há registro.
  const mostraFerias = canAccessPage('ferias', perfil);
  const [afastamentos, setAfastamentos] = useState<AfastamentoRecord[]>([]);
  useEffect(() => (mostraFerias ? observarAfastamentos(setAfastamentos, () => { /* silencioso */ }) : undefined), [mostraFerias]);
  const ferias = useMemo(() => afastamentos
    .filter(a => a.tipo === 'ferias' && a.dataInicio && a.dataFim)
    .map(a => ({ a, st: statusDoAfastamento(a, hoje) }))
    .filter(x => x.st === 'em_gozo' || x.st === 'confirmada')
    .sort((x, y) => (x.st === y.st ? 0 : x.st === 'em_gozo' ? -1 : 1) || x.a.dataInicio.localeCompare(y.a.dataInicio)),
  [afastamentos, hoje]);

  // Últimos documentos gerados (só Secretaria): fila do que foi enviado para impressão e ainda não abriu.
  const [documentos, setDocumentos] = useState<DocumentoGerado[]>([]);
  const [todosDocumentos, setTodosDocumentos] = useState(false);
  useEffect(() => (ehSecretaria ? observarDocumentosPendentes(setDocumentos) : undefined), [ehSecretaria]);
  const abrirDocumento = (d: DocumentoGerado) => {
    void marcarDocumentoAberto(d.id, authUser?.usuario || authUser?.nome || '');
    setDocumentos(prev => prev.filter(x => x.id !== d.id));
  };

  // IS de concurso: hoje e atrasadas (agendadas antes de hoje e ainda não finalizadas).
  const concursosHoje = podeConcursos ? diasConcursos.filter(d => d.data === hoje) : [];
  const candidatosHoje = concursosHoje.reduce((n, d) => n + d.total, 0);
  const diasAtrasados = podeConcursos ? diasConcursos.filter(d => d.data < hoje && d.candidatos.some(c => !c.finalizado)) : [];
  const qtdConcursoAtrasadas = diasAtrasados.reduce((n, d) => n + d.candidatos.filter(c => !c.finalizado).length, 0);

  // ---- Faixa "Hoje" (2d): ordem de prioridade; entram os 4 primeiros que o perfil pode abrir. ----
  const agora = new Date().toTimeString().slice(0, 5);
  const proximaIS = isDeHoje.find(i => i.situacao !== 'finalizada' && horaDeEntrevista(i.dataEntrevista) >= agora);
  const terminamHoje = vigentes.filter(p => p.dataTermino === hoje).length;
  const meusVigentes = meusAtestados.filter(p => statusPericia(p) === 'vigente');
  const meusNoAno = meusAtestados.filter(p => (p.dataAtestado || '').slice(0, 4) === hoje.slice(0, 4)).length;
  const proximoServico = meusServicos[0];
  const contadores: ContadorHoje[] = contadoresDaFaixa([
    {
      id: 'is-hoje', rotulo: 'Inspeções hoje', valor: isDeHoje.length, to: '/inspecoes?situacao=hoje', permitido: podeInspecoes,
      dica: proximaIS ? `Próxima às ${horaDeEntrevista(proximaIS.dataEntrevista)} · ${nomeCurtoInspecionado(proximaIS.inspecionado)}` : isDeHoje.length ? 'Nenhuma a seguir' : 'Nenhuma agendada',
    },
    {
      id: 'pareceres-atrasados', rotulo: 'Pareceres atrasados', valor: atrasados.length, to: '/pareceres?situacao=atrasado', permitido: podePareceres,
      atraso: true, dica: `${PRAZO_PARECER_DIAS} dias ou mais sem conclusão`,
    },
    {
      id: 'is-sem-agendamento', rotulo: 'IS sem agendamento', valor: semAgendamento.length, to: '/inspecoes?situacao=sem_agendamento', permitido: podeInspecoes,
      dica: isAtrasadas.length ? `${isAtrasadas.length} além do prazo` : 'Nenhuma além do prazo', dicaAtraso: isAtrasadas.length > 0,
    },
    {
      id: 'pm-vigentes', rotulo: ehAtestado ? 'Atestados vigentes' : 'Perícias menores vigentes', valor: vigentes.length,
      to: '/pericia-menor?situacao=vigentes', permitido: podeHistoricoPm && !ehMedicoGeral,
      dica: terminamHoje ? `${terminamHoje} termina${terminamHoje !== 1 ? 'm' : ''} hoje` : 'Nenhuma termina hoje',
    },
    {
      id: 'meus-vigentes', rotulo: 'Atestados vigentes', valor: meusVigentes.length, to: '/pericia-menor?situacao=vigentes&minhas=1', permitido: podeHistoricoPm && ehMedicoGeral,
      dica: `Emitidos por mim${meusVigentes.some(p => p.dataTermino === hoje) ? ` · ${meusVigentes.filter(p => p.dataTermino === hoje).length} terminam hoje` : ''}`,
    },
    {
      id: 'meus-no-ano', rotulo: 'Atestados no ano', valor: meusNoAno, to: '/pericia-menor?minhas=1&ano=atual', permitido: podeHistoricoPm && ehMedicoGeral,
      dica: `Emitidos por mim em ${hoje.slice(0, 4)}`,
    },
    {
      id: 'servicos-no-mes', rotulo: 'Serviços no mês', valor: servicosMes, to: pathForView('escala'), permitido: podeEscala && ehMedicoGeral,
      dica: `Supervisão e plantões em ${nomeMes(hoje)} · reténs não contam`,
    },
    {
      id: 'candidatos-hoje', rotulo: 'Candidatos hoje', valor: candidatosHoje, to: concursosDiaPath(hoje), permitido: podeConcursos,
      dica: concursosHoje.length ? concursosHoje.map(d => d.nome).join(' e ') : 'Nenhum concurso hoje',
    },
    {
      id: 'concurso-atrasadas', rotulo: 'IS de concurso atrasadas', valor: qtdConcursoAtrasadas, to: '/concursos/atrasadas', permitido: podeConcursos,
      atraso: true, dica: 'Agendadas até ontem, não finalizadas',
    },
    {
      id: 'proximo-servico', rotulo: 'Meu próximo serviço', valor: proximoServico ? dataBr(proximoServico.data).slice(0, 5) : '—', to: pathForView('escala'), permitido: podeEscala,
      dica: proximoServico ? `${proximoServico.data === hoje ? 'Hoje · ' : ''}${FUNCAO_ESCALA[proximoServico.funcao].rotulo}` : 'Nenhum nos próximos 2 meses',
    },
  ]);
  const naFaixa = (id: string) => contadores.some(c => c.id === id);

  // ---- Pendências · por atraso (2a): atrasados primeiro (maior excesso), depois "termina hoje", depois o resto. ----
  const agoraMs = Date.now();
  const pendencias: (Pendencia & { ordem: number })[] = [];
  if (podePareceres) {
    naoConcluidos.forEach(p => {
      const dias = p.criadoEm?.toMillis ? Math.floor((agoraMs - p.criadoEm.toMillis()) / 86_400_000) : 0;
      const atrasado = statusEfetivo(p, agoraMs) === 'atrasado';
      const nome = extrairNomeInspecionado(p.inspecionado);
      pendencias.push({
        id: `parecer:${p.id}`, icone: atrasado ? 'assignment_late' : 'description', titulo: nome,
        detalhe: `Parecer · ${p.especialidade}${p.criadoEm?.toDate ? ` · pedido em ${p.criadoEm.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}` : ''}`,
        prazo: { texto: `${dias} de ${PRAZO_PARECER_DIAS} dias`, pct: (dias / PRAZO_PARECER_DIAS) * 100, tom: atrasado ? 'atraso' : 'prazo' },
        tag: atrasado ? { rotulo: 'Atrasado', tom: 'danger' } : { rotulo: 'Solicitado', tom: 'navyOutline' },
        to: '/pareceres', pdf: p.pdfUrl || undefined,
        ordem: atrasado ? 1000 + dias / PRAZO_PARECER_DIAS : dias / PRAZO_PARECER_DIAS,
      });
    });
  }
  if (podeInspecoes) {
    isAtrasadas.forEach(i => {
      const dias = diasEmAberto(i.dataAbertura, hoje);
      const prazo = prazoAtrasoDias(i.grupoFinalidade);
      pendencias.push({
        id: `is:${i.id}`, icone: 'event_busy', titulo: nomeCurtoInspecionado(i.inspecionado),
        detalhe: `IS ${i.is} sem agendamento · ${finalidadeSemGrupo(i.finalidade, i.grupoFinalidade) || i.finalidade}`,
        prazo: { texto: `${dias} de ${prazo} dias`, pct: 100, tom: 'atraso' },
        tag: { rotulo: 'Atrasada', tom: 'danger' }, to: `/inspecoes/${encodeURIComponent(i.id)}`,
        ordem: 1000 + dias / prazo,
      });
    });
  }
  // IS de concurso atrasadas: quando o contador não está na faixa do perfil, a pendência entra aqui (agregada).
  if (qtdConcursoAtrasadas > 0 && !naFaixa('concurso-atrasadas')) {
    const nomes = [...new Set(diasAtrasados.map(d => d.nome))];
    pendencias.push({
      id: 'concurso-atrasadas', icone: 'event_busy',
      titulo: `${qtdConcursoAtrasadas} IS de concurso atrasada${qtdConcursoAtrasadas !== 1 ? 's' : ''}`,
      detalhe: `Agendadas antes de hoje e não finalizadas · ${nomes.length === 1 ? nomes[0] : `${nomes.length} concursos`}`,
      tag: { rotulo: 'Atrasadas', tom: 'danger' }, to: '/concursos/atrasadas', ordem: 999,
    });
  }
  if (podePericiaMenor && !ehMedicoGeral) {
    vigentes.forEach((p, idx) => {
      const terminaHoje = p.dataTermino === hoje;
      const nome = extrairNomeInspecionado(p.inspecionado);
      pendencias.push({
        id: `pm:${p.id}`, icone: 'personal_injury', titulo: nome,
        detalhe: `${termosPm.pagina === 'Atestados' ? 'Atestado' : 'Perícia menor'} · ${p.cid}`,
        prazo: { texto: terminaHoje ? 'termina hoje' : `até ${dataBR(p.dataTermino)}`, pct: terminaHoje ? 100 : 50, tom: terminaHoje ? 'hoje' : 'prazo' },
        // G1/H3: "vigente" não é exceção — tag neutra; ouro só quando termina hoje.
        tag: terminaHoje ? { rotulo: 'Termina hoje', tom: 'attention' } : { rotulo: 'Vigente', tom: 'neutral' },
        to: '/pericia-menor?situacao=vigentes', pdf: p.pdfUrl || undefined, tituloPdf: `Atestado — ${nome}`,
        // Vigentes: as que terminam primeiro no topo (a lista já vem ordenada pela data de término).
        ordem: terminaHoje ? 500 : -1 - idx,
      });
    });
  }
  pendencias.sort((a, b) => b.ordem - a.ordem);
  const fontesPendencias = [podePareceres && 'Pareceres', podeInspecoes && 'IS', podePericiaMenor && !ehMedicoGeral && (ehAtestado ? 'Atestados' : 'Perícias menores')].filter(Boolean).join(' · ');
  const mostraPendencias = podePareceres || podeInspecoes || (podePericiaMenor && !ehMedicoGeral) || pendencias.length > 0;

  // ---- Ações (4d): a ordem é a prioridade; a principal é a 1ª permitida. ----
  // "+ Perícia Menor/Atestado" só fica na Início para o Médicos Geral (os demais abrem pela própria página);
  // "Enviar exames" fica no cabeçalho de Concursos.
  const rotuloPm = ehAtestado ? 'Atestado' : 'Perícia Menor';
  const acoes: AcaoFab[] = [
    { id: 'abrir-is', rotulo: 'Abrir IS', icone: 'add', to: '/inspecoes?novo=manual', permitido: podeAbrirIS },
    { id: 'pm', rotulo: rotuloPm, icone: 'personal_injury', to: '/pericia-menor?novo=1', permitido: podeNovaPericia && ehMedicoGeral },
  ];
  const permitidas = acoes.filter(a => a.permitido !== false);
  // No FAB a principal leva "+" (4d: "+ Perícia Menor", "+ Atestado").
  const acoesFab = permitidas.map((a, i) => (i === 0 ? { ...a, icone: 'add' } : a));
  const botaoDesktop = (a: AcaoFab, principal: boolean) => {
    if (a.id === 'abrir-is') {
      return (
        <MenuAcoes
          key={a.id} rotulo="Abrir IS" botao={{ texto: 'Abrir IS', icone: 'add', primario: principal }}
          itens={[
            { rotulo: 'Manualmente', icone: 'edit_note', onClick: () => navegar('/inspecoes?novo=manual') },
            { rotulo: 'Enviar print', icone: 'photo_camera', onClick: () => navegar('/inspecoes?novo=print') },
          ]}
        />
      );
    }
    const variante = principal ? 'primary' : 'secondary';
    const icone = principal ? 'add' : a.icone;
    return a.to
      ? <ButtonLink key={a.id} to={a.to} variant={variante} icon={icone}>{a.rotulo}</ButtonLink>
      : <Button key={a.id} variant={variante} icon={icone} onClick={a.onClick}>{a.rotulo}</Button>;
  };
  // Desktop: as demais à esquerda (a 2ª prioridade mais perto da principal), a principal por último.
  const acoesDesktop = permitidas.length > 0 ? (
    <>
      {permitidas.slice(1).reverse().map(a => botaoDesktop(a, false))}
      {botaoDesktop(permitidas[0], true)}
    </>
  ) : undefined;

  const cardFerias = (classe: string) => (mostraFerias && ferias.length > 0 ? (
    <Secao
      id={`home-ferias${classe ? '-apoio' : ''}`} titulo="Próximas férias" className={classe}
      acao={<ButtonLink to="/ferias" variant="ghost" size="sm">Ver férias</ButtonLink>}
    >
      <ul>
        {ferias.slice(0, 6).map(({ a: f, st }) => (
          <li key={f.id} className="flex items-center gap-3 px-4 min-h-[56px] py-2 border-t border-line">
            <span className="material-symbols-outlined text-[22px] text-navy shrink-0" aria-hidden="true">beach_access</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-navy truncate">{f.usuario}</span>
              <span className="block text-xs text-ink-3 truncate tabular-nums">{dataBr(f.dataInicio).slice(0, 5)} a {dataBr(f.dataFim).slice(0, 5)} · {plural(f.duracaoDias, 'dia', 'dias')}{f.referencia ? ` · ref. ${f.referencia}` : ''}</span>
            </span>
            <StatusTag tone={st === 'em_gozo' ? 'attention' : 'navyOutline'} className="shrink-0">{st === 'em_gozo' ? 'Em gozo' : 'Confirmada'}</StatusTag>
          </li>
        ))}
      </ul>
      {ferias.length > 6 && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{plural(ferias.length - 6, 'período', 'períodos')} de férias na página Férias.</p>}
    </Secao>
  ) : null);

  const avisoSenha = !!authUser?.senhaTemporaria;
  const avisoConcurso = podeConcursos && emAndamento.length > 0;
  const mostrarAvisos = avisoSenha || avisoConcurso || !!nav?.avisos?.casosPendente || !!nav?.avisos?.pwaPendente;

  const agenda = (embutido: boolean) => (
    <AgendaDoDia
      dia={diaAgenda} hoje={hoje} inspecoes={inspecoes} diasConcursos={diasConcursos}
      concursosClicaveis={podeConcursos} onHoje={() => setDiaAgenda(hoje)} embutido={embutido}
    />
  );
  const calendario = (embutido: boolean) => (
    <CalendarioMes hoje={hoje} selecionado={diaAgenda} onSelecionar={setDiaAgenda} inspecoes={inspecoes} diasConcursos={diasConcursos} embutido={embutido} />
  );
  const cardPendencias = mostraPendencias ? <Pendencias itens={pendencias} fontes={fontesPendencias} /> : null;

  // Cards de perfil (Secretaria, faltas do HNRe, atestados do Médicos Geral) — na coluna principal no desktop.
  const cardsPerfil = (
    <>
      {ehSecretaria && (
        <Secao
          id="home-documentos" titulo="Últimos documentos gerados" badge={documentos.length}
          acao={documentos.length > MAX_DOCUMENTOS ? <Button variant="ghost" size="sm" onClick={() => setTodosDocumentos(true)}>Ver todos</Button> : undefined}
        >
          {documentos.length === 0 ? (
            <EmptyState icon="print" title="Nada para imprimir" description="Termos e solicitações enviados para impressão aparecem aqui até serem abertos." />
          ) : (
            <ul>{documentos.slice(0, MAX_DOCUMENTOS).map(d => <li key={d.id}><LinhaDocumentoGerado d={d} onAbrir={abrirDocumento} /></li>)}</ul>
          )}
        </Secao>
      )}

      {/* Faltas do HNRe ainda não comunicadas à Divisão de Pessoal (só Admin e Secretaria; some sem pendências). */}
      {podeInspecoes && canUseFeature('inspecoes.enviarEmails', perfil) && <CardFaltasHNRe inspecoes={inspecoes} Secao={Secao} />}

      {podePericiaMenor && ehMedicoGeral && meusAtestados.length > 0 && (
        <Secao id="home-meus-atestados" titulo="Últimos atestados" acao={<ButtonLink to="/pericia-menor/historico" variant="ghost" size="sm">Ver atestados</ButtonLink>}>
          <ul>
            {meusAtestados.slice(0, 6).map(p => {
              const vigente = statusPericia(p) === 'vigente';
              const nome = extrairNomeInspecionado(p.inspecionado);
              const corpo = (
                <>
                  <span className="material-symbols-outlined text-[22px] text-navy shrink-0" aria-hidden="true">personal_injury</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-navy truncate">{nome}</span>
                    <span className="block text-xs text-ink-3 truncate tabular-nums">{dataBR(p.dataAtestado)} · {plural(p.tempoHomologado, 'dia', 'dias')} · {p.cid}{vigente ? ` · até ${dataBR(p.dataTermino)}` : ''}</span>
                  </span>
                  {/* G1: vigente é neutro; concluída em verde. */}
                  <StatusTag tone={vigente ? 'neutral' : 'success'} className="shrink-0">{vigente ? 'Vigente' : 'Concluída'}</StatusTag>
                  <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">{p.pdfUrl ? 'open_in_new' : 'chevron_right'}</span>
                </>
              );
              const classe = 'flex items-center gap-3 px-4 min-h-[56px] py-2 border-t border-line hover:bg-thead transition-colors';
              return (
                <li key={p.id}>
                  {p.pdfUrl
                    ? <LinkPdf url={p.pdfUrl} tituloPdf={`Atestado — ${nome}`} className={classe}>{corpo}</LinkPdf>
                    : <Link to="/pericia-menor/historico" className={classe}>{corpo}</Link>}
                </li>
              );
            })}
          </ul>
          {meusAtestados.length > 6 && <p className="px-4 py-2 text-xs text-ink-3 border-t border-line">+{meusAtestados.length - 6} em Atestados.</p>}
        </Secao>
      )}
    </>
  );

  // Próximos dias de serviço do usuário (sem os dias de retém), cada um com a escala completa do dia
  // (Supervisão · Dia · Noite); a função do usuário vem em tag e o nome dele destacado.
  const diasServico = useMemo(() => {
    const porDia = new Map<string, FuncaoEscala[]>();
    meusServicos.forEach(s => porDia.set(s.data, [...(porDia.get(s.data) ?? []), s.funcao]));
    return [...porDia.entries()].slice(0, 5).map(([data, funcoes]) => ({ data, funcoes, dia: escalaPorData.get(data) }));
  }, [meusServicos, escalaPorData]);
  const souEu = (n?: string) => !!n && !!authUser?.usuario && chaveNome(n) === chaveNome(authUser.usuario);
  const nomesEscala = (lista: (string | undefined)[]) => {
    const nomes = lista.filter((n): n is string => !!n);
    if (!nomes.length) return <span className="text-ink-4">—</span>;
    return nomes.map((n, i) => (
      <React.Fragment key={n + i}>
        {i > 0 && <br />}
        <span className={`font-semibold ${souEu(n) ? 'text-navy bg-gold/30 rounded px-0.5 -mx-0.5' : 'text-ink'}`}>{nomeExibicao(n)}</span>
      </React.Fragment>
    ));
  };
  // Para todos os médicos (Admin, JRS, MPI e Médicos Geral); a Secretaria não tem escala.
  const mostraEscala = podeEscala && !ehSecretaria;
  const cardEscala = (
    <>
      {mostraEscala && (
        <Secao id="home-escala" titulo="Próximos serviços" acao={<ButtonLink to={pathForView('escala')} variant="ghost" size="sm">Ver escala</ButtonLink>}>
          {diasServico.length === 0 && (
            <p className="px-4 py-4 text-sm text-ink-3 border-t border-line">Nenhum serviço seu nos próximos 2 meses{escala.length === 0 ? ' — a escala ainda não foi publicada' : ''}.</p>
          )}
          <ul>
            {diasServico.map(({ data, funcoes, dia }) => {
              const [y, m, d] = data.split('-').map(Number);
              const dow = new Date(y, m - 1, d).getDay();
              return (
                <li key={data} className="flex gap-3 px-4 py-3 border-t border-line">
                  <span className="w-12 shrink-0 text-center tabular-nums pt-0.5">
                    <span className="block text-sm font-extrabold text-navy leading-none">{String(d).padStart(2, '0')}/{String(m).padStart(2, '0')}</span>
                    <span className="block text-xs font-semibold text-ink-3">{data === hoje ? 'hoje' : SEMANA_ABR[dow]}</span>
                  </span>
                  <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {funcoes.map(f => <StatusTag key={f} tone={data === hoje ? 'attention' : 'neutral'}>{FUNCAO_ESCALA[f].rotulo}</StatusTag>)}
                    </div>
                    <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm">
                      <dt className="text-xs font-bold text-ink-3 uppercase tracking-wide pt-0.5">Supervisão</dt>
                      <dd className="min-w-0">{nomesEscala([dia?.supervisor])}</dd>
                      <dt className="text-xs font-bold text-ink-3 uppercase tracking-wide pt-0.5">Dia</dt>
                      <dd className="min-w-0">{nomesEscala(dia?.dia ?? [])}</dd>
                      <dt className="text-xs font-bold text-ink-3 uppercase tracking-wide pt-0.5">Noite</dt>
                      <dd className="min-w-0">{nomesEscala(dia?.noite ?? [])}</dd>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ul>
        </Secao>
      )}
    </>
  );

  const cardAvisos = (
    <>
      {mostrarAvisos && (
        <Secao id="home-avisos" titulo="Avisos">
          <ul>
            {avisoSenha && (
              <LinhaAviso icone="key" titulo="Senha temporária" texto="Altere a senha inicial por uma só sua." acao={<ButtonLink to="/perfil" variant="ghost" size="sm">Alterar senha</ButtonLink>} />
            )}
            {avisoConcurso && (
              <LinhaAviso
                icone="fact_check"
                titulo={emAndamento.length === 1 ? emAndamento[0].nome : `${emAndamento.length} concursos em andamento`}
                texto={emAndamento.length === 1 ? 'Concurso em andamento · planilha de candidatos' : 'Planilhas de candidatos'}
                acao={<ButtonLink to={emAndamento.length === 1 ? concursoPath(emAndamento[0].id) : '/concursos?situacao=em_andamento'} variant="ghost" size="sm">{emAndamento.length === 1 ? 'Abrir planilha' : 'Ver concursos'}</ButtonLink>}
              />
            )}
            {nav?.avisos?.casosPendente && (
              <LinhaAviso icone="quiz" titulo="Casos Periciais" texto="24 questões comentadas sobre a DGPM-406. Faça quando puder." acao={<ButtonLink to={pathForView('casos')} variant="ghost" size="sm">Responder</ButtonLink>} />
            )}
            {nav?.avisos?.pwaPendente && (
              <LinhaAviso
                icone="install_mobile" titulo="Use no celular"
                texto={isDesktop ? 'Abra o QR code e instale o app na tela inicial.' : 'Instale o app na tela inicial do aparelho.'}
                acao={<Button variant="ghost" size="sm" onClick={() => nav?.abrirInstalacaoApp()}>{isDesktop ? 'Mostrar QR code' : 'Ver como instalar'}</Button>}
              />
            )}
          </ul>
        </Secao>
      )}
    </>
  );

  // Desktop (≥ md): grade 8 + 4 — agenda, pendências e cards de perfil na principal; calendário, férias,
  // serviços e avisos no apoio. Se o container ainda empilhar (< @split), as férias sobem para logo após a agenda.
  // Médicos Geral: "Próximos serviços" logo abaixo dos contadores (é o que ele mais consulta); nos demais, no apoio.
  const principal = (
    <div className="space-y-6">
      {ehMedicoGeral && cardEscala}
      {podeInspecoes && agenda(false)}
      {cardFerias('@split:hidden')}
      {cardPendencias}
      {cardsPerfil}
    </div>
  );

  const apoio = (
    <div className="space-y-6">
      {podeInspecoes && calendario(false)}
      {cardFerias('hidden @split:block')}
      {!ehMedicoGeral && cardEscala}
      {cardAvisos}
    </div>
  );

  // Celular (< md): uma coluna — Pendências, Avisos, o calendário com a agenda do dia num só card (o dia
  // escolhido no calendário filtra a agenda logo abaixo), cards de perfil e serviços, e as férias por último.
  const colunaCelular = (
    <div className="space-y-6">
      {ehMedicoGeral && cardEscala}
      {cardPendencias}
      {cardAvisos}
      {podeInspecoes && (
        <div className="bg-white border border-line rounded-xl overflow-clip">
          {calendario(true)}
          {agenda(true)}
        </div>
      )}
      {cardsPerfil}
      {/* Próximos serviços antes de Próximas férias (celular). */}
      {!ehMedicoGeral && cardEscala}
      {cardFerias('')}
    </div>
  );

  return (
    <Container size="data" className={`py-6 md:py-8 pt-4 md:pt-8 ${permitidas.length ? 'pb-28 md:pb-10' : 'pb-10'}`}>
      <PageHeader
        title={`${saudacao()}${primeiroNome(authUser?.nome) ? `, ${primeiroNome(authUser?.nome)}` : ''}`}
        tituloTopbar="Início"
        eyebrow={dataPorExtenso()}
        actions={isDesktop ? acoesDesktop : undefined}
      />

      <div className="space-y-6">
        <ContadoresHoje contadores={contadores} />
        {isDesktop
          ? <GradePainel principal={principal} apoio={apoio} rotuloApoio="Calendário, férias e avisos" />
          : colunaCelular}
      </div>

      {/* FAB (só no celular) com a principal do perfil; fora da grade (container query quebra position:fixed). */}
      <FabAcoes acoes={acoesFab} />

      {todosDocumentos && (
        <Dialog title={`Últimos documentos gerados (${documentos.length})`} icon="print" size="lg" onClose={() => setTodosDocumentos(false)}>
          {documentos.length === 0 ? (
            <p className="text-ink-3 text-center py-6">Nenhum documento pendente.</p>
          ) : (
            <ul className="-mx-5 -my-5">
              {documentos.map(d => <li key={d.id}><LinhaDocumentoGerado d={d} onAbrir={abrirDocumento} /></li>)}
            </ul>
          )}
        </Dialog>
      )}
    </Container>
  );
};
