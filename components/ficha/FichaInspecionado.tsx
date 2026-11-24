// Ficheiro: components/ficha/FichaInspecionado.tsx
// Ficha do inspecionado (/inspecionados/:nip — auditoria v3, seção 9; MF1–MF4, PM6, PM8, PMD3).
// Reformulação de 16/11/2026 (estrutura; as regras de cada aba nova vêm depois):
//   cabeçalho (o nome abre o top sheet com os dados cadastrais; ⋮ com "Registro de eventos" só do Admin) ·
//   barra de abas sublinhadas, SEM contagens, fixa no topo ao rolar — Inspeções de Saúde · Perícias Menores ·
//   Atestados e Laudos · Pareceres · Exames · Guias · Emails · Mensagens · Outros · Transcrições
//   (permissões em components/ficha/permissoes.ts → abasDaFicha; Outros = documentos gerados nas IS, todos menos user_medicos_geral; Transcrições
//   só para quem grava entrevista e habilitada pela função "ficha.transcricoes") ·
//   grade 8 + 4 (a partir de xl; empilhada abaixo):
//     - PAINEL PRINCIPAL (esquerda): o registro aberto da aba — o detalhe que antes abria num Drawer
//       (InspecaoDetalhe e PericiaMenorPainel em casca/modo "inline") ou o painel da aba nova — e, embaixo,
//       a BARRA DE AÇÕES da aba (CascaPainelFicha/BarraAcoesFicha);
//     - PAINEL DE APOIO (direita): um card único com o HISTÓRICO da aba (menu secundário, com rolagem);
//       tocar num item abre o registro no painel principal.
//   Guias: uma linha por IS com guias de exames geradas (finalidade e IS; data de assinatura) — o painel
//   principal mostra as páginas do PDF em carrossel e a barra Confirmar entrega · Enviar por email ▾ · Imprimir
//   (components/ficha/guias/PainelGuias.tsx).
//   Pareceres: o pedido e, se houver, a resposta (pareceres/PainelParecer.tsx). ?criar=pedido&is=<isId> abre o "Pedido de
//   Parecer" (NovoParecerForm; PDF gerado e guardado pelo servidor) e ?criar=resposta&is=<isId>, a "Resposta de Parecer"
//   (pareceres/RespostaParecerForm.tsx: PDF transcrito pela IA; o pedido passa a Concluído). Trocar de aba/registro limpa o "criar".
//   Cabeçalho: "Abrir IS ▾" (botão primário; Manualmente · Por print do SINAIS) leva à aba Inspeções de Saúde e abre o
//   formulário no painel principal (AbrirISFicha; no celular, bottom sheet), com o pós-criação da página Inspeções.
//   Inspeções de Saúde: painel e barra em components/ficha/inspecoes/PainelISFicha.tsx (sem o campo Inspecionado nem
//   os cards dos documentos — atalhos para as abas); "Agendar IS"/"Reagendar IS" abre o AgendarISFicha (depois, o
//   e-mail de agendamento); "Minutar MSG" registrada leva à aba Mensagens (mensagensIS — PainelMensagemIS).
//   Emails: um item por e-mail enviado que envolve o inspecionado (todas as IS dele e envios ligados ao NIP), do
//   mais recente; o painel principal mostra o e-mail como saiu, num iframe sandbox sem scripts
//   (components/ficha/emails/PainelEmail.tsx; dados em useEmailsDaFicha). Sem barra de ações.
//   Transcrições: IS a gravar (Agendada/Reagendada) e entrevistas gravadas; a gravação e a revisão acontecem no
//   painel principal (components/ficha/transcricoes/PainelTranscricoes.tsx).
//   Exames / Atestados e Laudos: painel do PDF com a transcrição copiável e a barra Zimbra SEC-JRS · Imprimir; com
//   ?criar=<aba>&is=<isId> (botão "Enviar PDF" da aba IS) e IS não finalizada, o estado "Criar novo" com o campo de
//   upload (components/ficha/exames/; regras em utils/examesFicha.ts). Trocar de aba ou de registro limpa o "criar".
//   Ao abrir a página ou trocar de aba, o painel principal mostra o registro MAIS RECENTE, ou o aviso de que
//   não há registros para o inspecionado. Aba e registro ficam na URL (?aba=…&reg=…; ?is= / ?sel= / ?guia=
//   antigos continuam valendo).
// Os PDFs abrem em nova aba (services/abrirPdf). Afastamentos das IS: adaptador único afastamentosDaIS (utils/fichaInspecionado.ts).
// Leitura limitada às consultas por NIP (where militarId/inspecionadoId == nip), nunca a coleção inteira (MF2).
// Abrir a ficha grava o evento "abriu a ficha" (quem e quando) em militares/{nip}/eventos (best effort).
// Substitui a antiga página de histórico da Perícia Menor (/pericia-menor/historico/<nip> redireciona para cá).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Container, TOPBAR_ACOES_ID } from '../ui/Page';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FabAcoes } from '../ui/Fab';
import { MenuAcoes, type ItemMenu } from '../ui/MenuAcoes';
import { AbasSublinhadas } from '../periciaMenor/partes';
import { StatusTag } from '../ui/StatusTag';
import { EmptyState } from '../ui/EmptyState';
import { AccessDenied } from '../ui/AccessDenied';
import { Toast } from '../ui/Toast';
import { Drawer } from '../ui/Drawer';
import type { AcaoRodape } from '../ui/AcoesRodape';
import { useTituloPagina } from '../shell/TituloPagina';
import { abrirPdf } from '../../services/abrirPdf';
import { LinhaRegistroPericia, PericiaMenorPainel } from '../periciaMenor/PericiaMenorPainel';
import { ExcluirPericiaDialog } from '../periciaMenor/ExcluirPericiaDialog';
import { podeExcluirPericia } from '../../utils/exclusaoPericia';
import { NovaPericiaMenorForm } from '../periciaMenor/NovaPericiaMenorForm';
import { fasesDeEntrevista } from '../inspecoes/InspecaoDetalhe';
import { NovoParecerForm } from '../pareceres/NovoParecerForm';
import { MilitarEdicao } from '../Militares';
import { CadastroTopSheet, type DadoCadastro } from './CadastroTopSheet';
import { CascaPainelFicha } from './CascaPainelFicha';
import { PainelGuias } from './guias/PainelGuias';
import { PainelParecer } from './pareceres/PainelParecer';
import { RespostaParecerForm } from './pareceres/RespostaParecerForm';
import { PainelTranscricoes } from './transcricoes/PainelTranscricoes';
import { PainelCriarDocumentos } from './exames/PainelCriarDocumentos';
import { PainelDocumentoIS, tituloDoDocumento } from './exames/PainelDocumentoIS';
import { PainelAtestadoPM } from './exames/PainelAtestadoPM';
import { examesMinimosDaIS, isParaCriar, podeExcluirDocumentoIS } from '../../utils/examesFicha';
import { ApoioAfastamentos, PainelAfastamentos } from './afastamentos/PainelAfastamentos';
import { PainelEmail } from './emails/PainelEmail';
import { useEmailsDaFicha } from './emails/useEmailsDaFicha';
import { horaDoEnvio, isoDoEnvio } from '../../utils/emailsEnviados';
import { AgendarISFicha } from './AgendarISFicha';
import { AbrirISFicha, type ModoAbrirIS } from './AbrirISFicha';
import { PainelISFicha } from './inspecoes/PainelISFicha';
import { PainelMensagemIS } from './inspecoes/PainelMensagemIS';
import { AssessorIAModal } from './assessor/AssessorIAModal';
import { LogoClaude, SimboloClaude } from '../ui/LogoClaude';
import { isDoAssessor, podeUsarAssessorIA } from '../../utils/assessorIA';
import { observarMensagensDoInspecionado, type MensagemISRecord } from '../../services/mensagensIS';
import { GerarGuiasDialog } from '../inspecoes/guias/GerarGuiasDialog';
import { FINALIDADE_ANEXO_O_INCDEF } from '../../utils/guiasExamesIS';
import { usaMinutaIncapacidadeDefinitiva } from '../../utils/minutaMensagemResultado';
import { PosCriacaoIS, deveTentarGuias } from '../inspecoes/guias/PosCriacaoIS';
import { EnviarAgendamentoDialog } from '../inspecoes/EnviarAgendamentoDialog';
import type { DadosInspecionadoIS } from '../inspecoes/InspecaoForm';
import { avisarAgendamento, observarAgendamentos } from '../../services/emailAgendamentoIS';
import { agendamentoJaEnviado, ehElegivelAgendamento } from '../../utils/emailAgendamentoIS';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { useEntrevistasDasIS, type EntrevistaDaFicha } from './useEntrevistasDasIS';
import { HistoricoAgrupadoIS, agruparPorIS } from './HistoricoAgrupadoIS';
import { useExamesDasIS, type ExameDaFicha } from './useExamesDasIS';
import { useDocumentosDasIS } from './useDocumentosDasIS';
import { PainelDocumentoGerado } from './outros/PainelDocumentoGerado';
import { abasDaFicha, secoesDaFicha, podeAbrirFicha } from './permissoes';
import { useNav } from '../../context/NavContext';
import { useBreadcrumbs } from '../../context/BreadcrumbContext';
import { canUseFeature } from '../../config/permissions';
import { termosPericia } from '../../config/termosPericia';
import { fichaPath } from '../../config/routes';
import { observarMilitar, tipoDoInspecionado, vinculoDoInspecionado, type MilitarRecord } from '../../services/firestoreMilitares';
import { observarPericiasDoMilitar, dataBR, type PericiaMenorRecord } from '../../services/firestorePericiasMenores';
import { atualizarInspecao, observarInspecoesDoInspecionado, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { rotuloSituacao } from '../../utils/entrevistas';
import { observarPareceresDoMilitar, statusEfetivo, type ParecerRecord } from '../../services/firestorePareceres';
import { modoCriarParecer, pedidosPendentes } from '../../utils/pareceres';
import { observarEventosInspecionado, registrarEventoInspecionado, ROTULO_ACAO_INSPECIONADO, type EventoInspecionado } from '../../services/eventosInspecionado';
import { emailDoInspecionado } from '../../services/emailResultadoIS';
import { sincronizarAgendaIS } from '../../services/agendaGoogleIS';
import { carregarCid, carregarCorposQuadros, carregarOms, type CorposQuadros, type OrganizacaoMilitar } from '../../utils/corposQuadros';
import { indiceCidAbreviado } from '../../utils/periciaMenorLista';
import { diaMes, partesCid, postoDoInspecionado } from '../../utils/periciaMenorResumo';
import { ABAS_FICHA, abaFichaInicial, afastamentosDaIS, registroSelecionado, type AbaFicha } from '../../utils/fichaInspecionado';
import { categoriaDoItem, classeDoExame, ROTULO_CATEGORIA, ROTULO_CLASSE, ROTULO_TIPO } from '../../utils/examesIS';
import { aguardaAgendamento, dataHoraBr, situacaoDoStatus } from '../../utils/inspecoes';
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

/** Rótulo, ícone e textos de cada aba (o título do histórico e o aviso de "sem registros"). */
const DEF_ABA: Record<AbaFicha, { rotulo: string; icone: string; historico: string; vazio: string }> = {
  is: { rotulo: 'Inspeções de Saúde', icone: 'event_available', historico: 'Inspeções de Saúde', vazio: 'Inspeções de Saúde registradas' },
  pm: { rotulo: 'Perícia Menor', icone: 'personal_injury', historico: 'Perícias Menores', vazio: 'Perícias Menores registradas' },
  afastamentos: { rotulo: 'Afastamentos', icone: 'event_busy', historico: 'Afastamentos', vazio: 'afastamentos registrados' },
  atestados: { rotulo: 'Atestados e Laudos', icone: 'note_alt', historico: 'Atestados e Laudos', vazio: 'atestados ou laudos registrados' },
  pareceres: { rotulo: 'Pareceres', icone: 'assignment', historico: 'Pareceres', vazio: 'pareceres registrados' },
  exames: { rotulo: 'Exames', icone: 'lab_profile', historico: 'Exames', vazio: 'exames registrados' },
  guias: { rotulo: 'Guias', icone: 'receipt_long', historico: 'Guias', vazio: 'guias registradas' },
  emails: { rotulo: 'Emails', icone: 'mail', historico: 'Emails', vazio: 'e-mails registrados' },
  mensagens: { rotulo: 'Mensagens', icone: 'chat', historico: 'Mensagens', vazio: 'mensagens registradas' },
  outros: { rotulo: 'Outros', icone: 'folder_open', historico: 'Outros', vazio: 'outros registros' },
  transcricoes: { rotulo: 'Transcrições', icone: 'mic', historico: 'Transcrições', vazio: 'transcrições registradas' },
};

/** Item do histórico (painel de apoio). */
interface ItemHistorico {
  id: string; data: string; icone: string; titulo: string; detalhe: React.ReactNode; tag?: React.ReactNode;
  /** Sem a linha de data no topo (a data já vem no detalhe — ex.: Guias). */
  semData?: boolean;
  /** font-variation-settings do ícone (Material Symbols). */
  iconeEstilo?: React.CSSProperties;
  /** IS do registro (abas agrupadas por IS: Exames, Outros e Atestados e Laudos). */
  isId?: string;
  /** Dentro do grupo da IS (Atestados e Laudos): "documento e especialidade" e o nome do emissor. */
  tituloAgrupado?: string;
  detalheAgrupado?: React.ReactNode;
}

/** Ícones de estado do histórico (IS e Pareceres), com os eixos do Material Symbols definidos pela JRS. */
/** Só o nome do emissor, sem o registro no conselho ("Dr(a). Fulano CRM 123 PE" → "Dr(a). Fulano"). */
const nomeDoEmissor = (emissor: string): string => {
  const sem = String(emissor || '').split(/\s*[-–—|(,]?\s*\b(?:CRM|CRP|RQE|COREN|CREFITO|CRN|CRO|CRFa|CREFONO)\b/i)[0].replace(/[\s\-–—|,(]+$/, '').trim();
  // "Clínica X - Dr(a). Fulano": fica só o profissional.
  const i = sem.search(/\bDra?\.|\bDr\(a\)\./i);
  return i > 0 ? sem.slice(i).trim() : sem;
};

const ICONE_ESTADO = {
  pendente: { icone: 'pending_actions', estilo: { fontVariationSettings: "'FILL' 1, 'wght' 700, 'GRAD' -25, 'opsz' 40" } },
  andamento: { icone: 'edit_square', estilo: { fontVariationSettings: "'FILL' 0, 'wght' 700, 'GRAD' -25, 'opsz' 40" } },
  finalizado: { icone: 'lock', estilo: { fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' -25, 'opsz' 48" } },
} as const;

const LinhaHistorico: React.FC<{ item: ItemHistorico; atual: boolean; onAbrir: () => void }> = ({ item, atual, onAbrir }) => (
  <button type="button" onClick={onAbrir} aria-current={atual || undefined}
    className={`w-full text-left flex items-start gap-3 px-4 py-3 border-l-[3px] transition-colors ${atual ? 'border-gold bg-thead' : 'border-transparent hover:bg-thead'}`}>
    <span className="material-symbols-outlined text-[20px] text-navy shrink-0 mt-0.5" style={item.iconeEstilo} aria-hidden="true">{item.icone}</span>
    <span className="min-w-0 flex-1">
      {!item.semData && <span className="block text-xs text-ink-3 tabular-nums">{item.data ? dataBR(item.data) : '—'}</span>}
      <span className="block text-sm font-bold text-navy break-words">{item.titulo}</span>
      <span className="block text-xs text-ink-3 break-words">{item.detalhe}</span>
    </span>
    {item.tag && <span className="shrink-0 max-w-[40%] text-right">{item.tag}</span>}
  </button>
);

const Dado: React.FC<{ rotulo: string; children?: React.ReactNode; largo?: boolean }> = ({ rotulo, children, largo }) => (
  <div className={largo ? 'col-span-2' : undefined}>
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink break-words">{children || '—'}</dd>
  </div>
);

const tituloExame = (e: ExameDaFicha) => tituloDoDocumento(e);
const dataExame = (e: ExameDaFicha) => e.itens.find(i => i.data)?.data || isoDe(e.enviadoEm);
const idExame = (e: ExameDaFicha) => `${e.isId}:${e.id}`;
/** Todas as datas/ordens de IS na Ficha seguem a DATA DA ENTREVISTA (IS não agendada: sem data, no fim). */
const dataIS = (i: InspecaoRecord) => (i.dataEntrevista || '').slice(0, 10);

export const FichaInspecionado: React.FC = () => {
  const { nip: nipParam = '' } = useParams();
  const nip = decodeURIComponent(nipParam).replace(/\D/g, '');
  const nav = useNav();
  const [periciaExcluindo, setPericiaExcluindo] = useState<PericiaMenorRecord | null>(null);
  const [periciaEditando, setPericiaEditando] = useState<PericiaMenorRecord | null>(null);
  const navigate = useNavigate();
  const perfil = nav?.authUser?.perfil;
  const secoes = secoesDaFicha(perfil);
  const estadoAbas = abasDaFicha(perfil);
  const podeFicha = podeAbrirFicha(perfil);
  const t = termosPericia(perfil);
  const atestado = t.singular === 'atestado';
  const [hoje] = useState(() => hojeISO());
  const [params, setParams] = useSearchParams();
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
  /** Assessor IA (chat em tela cheia): só Admin e médicos, com IS em andamento. */
  const [assessorAberto, setAssessorAberto] = useState(false);
  /** "Editar IS" (câmera) do menu do Claude: prints escolhidos para a IS `isId` (lidos no painel da aba IS). */
  const [printsSinais, setPrintsSinais] = useState<{ id: number; isId: string; arquivos: File[] } | null>(null);
  const inputPrintsRef = useRef<HTMLInputElement>(null);
  const alvoPrintsRef = useRef<string>('');
  const [parecerPara, setParecerPara] = useState<{ is: InspecaoRecord; inicial?: ParecerRecord } | null>(null);
  const [agendando, setAgendando] = useState<InspecaoRecord | null>(null);
  const [mensagens, setMensagens] = useState<MensagemISRecord[]>([]);
  /** "Abrir IS" do cabeçalho: formulário aberto (no painel principal da aba IS; no celular, bottom sheet). */
  const [abrindoIS, setAbrindoIS] = useState<ModoAbrirIS | null>(null);
  const [guiasIncdef, setGuiasIncdef] = useState<InspecaoRecord | null>(null);
  const [posCriacao, setPosCriacao] = useState<{ is: InspecaoRecord; dados: DadosInspecionadoIS } | null>(null);
  const isDesktop = useIsDesktop();
  // E-mail de agendamento (Admin e Secretaria): depois de agendar ou abrir uma IS já agendada pela ficha,
  // a mesma pergunta da página Inspeções de Saúde (fila de avisos de services/emailAgendamentoIS.ts).
  const podeEmailsIS = canUseFeature('inspecoes.enviarEmails', perfil);
  const [filaAgendamento, setFilaAgendamento] = useState<{ isId: string; dataEntrevista: string }[]>([]);
  useEffect(() => (podeEmailsIS ? observarAgendamentos(a => setFilaAgendamento(f => [...f.filter(x => x.isId !== a.isId), a])) : undefined), [podeEmailsIS]);
  const [oms, setOms] = useState<OrganizacaoMilitar[]>([]);
  const [postos, setPostos] = useState<CorposQuadros['postos']>();
  const [toast, setToast] = useState<{ msg: string; tone: 'success' | 'error' } | null>(null);
  const avisar = (msg: string, tone: 'success' | 'error' = 'success') => { setToast({ msg, tone }); window.setTimeout(() => setToast(null), tone === 'error' ? 7000 : 4000); };
  const principalRef = useRef<HTMLDivElement>(null);

  useEffect(() => (podeFicha && nip ? observarMilitar(nip, setMilitar, () => setMilitar(null)) : undefined), [nip, podeFicha]);
  // A aba Afastamentos (só leitura) lê IS e perícias mesmo sem acesso às páginas de origem (ex.: User Médicos Geral).
  const comAfastamentos = estadoAbas.afastamentos.visivel;
  const lerPericias = secoes.pericias || comAfastamentos;
  const lerIS = secoes.inspecoes || comAfastamentos;
  useEffect(() => (lerPericias && nip ? observarPericiasDoMilitar(nip, setPericias, () => setPericias([])) : undefined), [nip, lerPericias]);
  useEffect(() => (lerIS && nip ? observarInspecoesDoInspecionado(nip, setInspecoes, () => setInspecoes([])) : undefined), [nip, lerIS]);
  useEffect(() => (secoes.pareceres && nip ? observarPareceresDoMilitar(nip, setPareceres, () => setPareceres([])) : undefined), [nip, secoes.pareceres]);
  useEffect(() => (estadoAbas.mensagens.habilitada && nip ? observarMensagensDoInspecionado(nip, setMensagens, () => setMensagens([])) : undefined), [nip, estadoAbas.mensagens.habilitada]);
  useEffect(() => (secoes.eventos && nip ? observarEventosInspecionado(nip, setEventos, () => setEventos([])) : undefined), [nip, secoes.eventos]);
  useEffect(() => {
    if (!lerPericias && !comAfastamentos) return;
    let vivo = true;
    carregarCid().then(l => { if (vivo) setCidAbrev(indiceCidAbreviado(l)); }).catch(() => { /* só o código */ });
    return () => { vivo = false; };
  }, [lerPericias, comAfastamentos]);
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

  // ---- Aba e registro abertos ----
  const listaAbas = ABAS_FICHA.map(id => estadoAbas[id]);
  const aba = abaFichaInicial(
    { aba: params.get('aba'), is: params.get('is'), sel: params.get('sel'), guia: params.get('guia') },
    listaAbas, { is: inspecoes.length, pm: pericias.length },
  );
  const pedido = params.get('reg') || (aba === 'is' ? params.get('is') : aba === 'pm' ? params.get('sel') : null);
  const exames = useExamesDasIS(inspecoes, secoes.inspecoes && (aba === 'atestados' || aba === 'exames'));
  const entrevistas = useEntrevistasDasIS(inspecoes, estadoAbas.transcricoes.habilitada && aba === 'transcricoes');
  const documentosIS = useDocumentosDasIS(inspecoes, estadoAbas.outros.habilitada && aba === 'outros');
  const emails = useEmailsDaFicha(nip, inspecoes, estadoAbas.emails.habilitada && aba === 'emails');

  // Cabeçalho mínimo: do cadastro ou, sem cadastro, do texto copiado no registro mais recente.
  const textoRegistro = pericias[0]?.inspecionado || inspecoes[0]?.inspecionado || pareceres[0]?.inspecionado || '';
  const nome = militar?.nome || extrairNomeInspecionado(textoRegistro) || formatNip(nip);
  const posto = militar?.pgq || postoDoInspecionado(textoRegistro, extrairNomeInspecionado(textoRegistro));
  const om = militar?.om || pericias[0]?.om || '';
  useBreadcrumbs(nome ? [{ label: nome }] : null);
  const tituloNaTopbar = useTituloPagina(nome);
  // Celular: o ⋮ vai para a topbar (slot #topbar-acoes, no lugar do sino) e o menu do Claude vira itens do FAB.
  const [slotTopbar, setSlotTopbar] = useState<HTMLElement | null>(null);
  useEffect(() => { setSlotTopbar(document.getElementById(TOPBAR_ACOES_ID)); }, []);

  // Listas de cada aba, do mais recente para o mais antigo.
  const isOrdenadas = useMemo(() => [...inspecoes].sort((a, b) => (b.dataEntrevista || '').localeCompare(a.dataEntrevista || '')), [inspecoes]);
  const isPorEntrevista = useMemo(() => isOrdenadas
    .map(i => ({ id: i.id, titulo: i.finalidade || `IS ${i.is}`, data: dataIS(i) ? formatDataBr(dataIS(i)) : '' })), [isOrdenadas]);
  const pmOrdenadas = useMemo(() => [...pericias].sort((a, b) => (b.dataAtestado || '').localeCompare(a.dataAtestado || '')), [pericias]);
  const pareceresOrdenados = useMemo(() => [...pareceres].sort((a, b) => (b.criadoEm?.toMillis?.() ?? 0) - (a.criadoEm?.toMillis?.() ?? 0)), [pareceres]);
  const atestadosIS = useMemo(() => exames.filter(e => classeDoExame(e) === 'atestado_relatorio'), [exames]);
  const examesIS = useMemo(() => exames.filter(e => classeDoExame(e) === 'laudo_exame'), [exames]);
  const [agora] = useState(() => Date.now());
  /** IS cujas guias foram geradas (ainda com o registro `guiasExames`), da assinatura mais recente para a mais antiga. */
  const isComGuias = useMemo(() => inspecoes.filter(i => !!i.guiasExames)
    .sort((a, b) => (b.guiasExames?.geradoEm?.toMillis?.() ?? 0) - (a.guiasExames?.geradoEm?.toMillis?.() ?? 0)), [inspecoes]);

  // Histórico da aba IS: todas as IS, pela data da entrevista (as não agendadas, sem data, no topo).
  const itensIS = useMemo<ItemHistorico[]>(() => [...isOrdenadas.filter(i => !i.dataEntrevista), ...isOrdenadas.filter(i => !!i.dataEntrevista)].map(i => {
    // Aberta e não agendada → pending_actions; finalizada (ou cancelada) → lock; demais → edit_square.
    const estado = i.situacao === 'finalizada' || i.status === 'cancelada' ? ICONE_ESTADO.finalizado
      : aguardaAgendamento(i.status) && !i.dataEntrevista ? ICONE_ESTADO.pendente : ICONE_ESTADO.andamento;
    return {
      id: i.id, data: dataIS(i), icone: estado.icone, iconeEstilo: estado.estilo, semData: true,
      titulo: i.finalidade || `IS ${i.is}`,
      detalhe: i.dataEntrevista ? dataHoraBr(i.dataEntrevista) : '',
    };
  }), [isOrdenadas]);
  const itensPM = useMemo<ItemHistorico[]>(() => pmOrdenadas.map(p => {
    const cid = partesCid(p, cidAbrev);
    const homologado = !atestado && !!p.homologacao;
    // Registrado: data e dias do atestado; homologado: data da homologação (registro) e dias homologados.
    const dataRef = homologado ? isoDe(p.criadoEm) : p.dataAtestado;
    const dias = homologado ? p.tempoHomologado : p.tempoAtestado;
    return {
      id: p.id, data: p.dataAtestado, icone: 'personal_injury', semData: true,
      titulo: homologado ? 'ATESTADO HOMOLOGADO' : 'ATESTADO REGISTRADO',
      detalhe: <>{cid.codigo && cid.descricao ? `${cid.codigo} (${cid.descricao})` : cid.codigo || cid.descricao}<br />{dataRef ? dataBR(dataRef) : '—'}</>,
      tag: Number.isFinite(dias) ? <strong className="text-sm text-navy tabular-nums whitespace-nowrap">{dias} {dias === 1 ? 'dia' : 'dias'}</strong> : undefined,
    };
  }), [pmOrdenadas, cidAbrev, atestado]);
  const itemExame = (e: ExameDaFicha, icone: string): ItemHistorico => ({
    id: idExame(e), data: dataExame(e), icone, titulo: tituloExame(e), isId: e.isId,
    // Exames: agrupados por IS no histórico (sem nº da IS nem data na linha).
    ...(icone === 'lab_profile' ? { semData: true, detalhe: e.itens.find(i => i.emissor)?.emissor || '' }
      : { detalhe: [`IS ${e.is}`, e.itens.find(i => i.emissor)?.emissor].filter(Boolean).join(' · ') }),
  });
  // Atestados e Laudos: PDFs de atestado/relatório enviados nas IS + atestados das Perícias Menores (homologação),
  // numa lista única da data de emissão mais recente para a mais antiga.
  const pmComAtestado = useMemo(() => (secoes.pericias ? pmOrdenadas.filter(p => !!p.pdfUrl) : []), [pmOrdenadas, secoes.pericias]);
  const itensAtestados = useMemo<ItemHistorico[]>(() => {
    const linha = (categoria: string, especialidade: string | undefined, data: string, emissor: string) => (
      <>{[categoria, especialidade].filter(Boolean).join(' ')}<br />{[data ? dataBR(data) : '—', emissor].filter(Boolean).join(' | ')}</>
    );
    const doIS = atestadosIS.map(e => {
      const it = e.itens.find(i => i.data) ?? e.itens[0];
      const is = inspecoes.find(i => i.id === e.isId);
      const data = dataExame(e);
      return {
        id: idExame(e), data, icone: 'note_alt', semData: true, isId: e.isId,
        titulo: `IS ${(is?.finalidade || String(e.is)).toUpperCase()}`,
        detalhe: linha(it ? ROTULO_CATEGORIA[categoriaDoItem(it)] : 'Laudo', e.itens.find(i => i.especialidade)?.especialidade, data, e.itens.find(i => i.emissor)?.emissor || ''),
        tituloAgrupado: [it ? ROTULO_CATEGORIA[categoriaDoItem(it)] : 'Laudo', e.itens.find(i => i.especialidade)?.especialidade].filter(Boolean).join(' ').toUpperCase(),
        detalheAgrupado: nomeDoEmissor(e.itens.find(i => i.emissor)?.emissor || '') || '—',
      };
    });
    const daPM = pmComAtestado.map(p => {
      const t = p.transcricao;
      const data = t?.dataEmissao || p.dataAtestado;
      return {
        id: `pm:${p.id}`, data, icone: 'personal_injury', semData: true, titulo: 'PERÍCIA MENOR',
        detalhe: linha(ROTULO_CATEGORIA[t?.categoria ?? 'atestado'], t?.especialidade || p.especialidade, data, t?.emissor || p.medicoEmissor || ''),
      };
    });
    return [...doIS, ...daPM].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [atestadosIS, pmComAtestado, inspecoes]); // eslint-disable-line react-hooks/exhaustive-deps
  const itensExames = useMemo(() => examesIS.map(e => itemExame(e, 'lab_profile')), [examesIS]); // eslint-disable-line react-hooks/exhaustive-deps
  const itensPareceres = useMemo<ItemHistorico[]>(() => pareceresOrdenados.map(p => {
    const st = statusEfetivo(p, agora);
    return {
      id: p.id, data: isoDe(p.criadoEm), titulo: `Parecer de ${p.especialidade}`,
      ...(st === 'concluido' ? { icone: ICONE_ESTADO.finalizado.icone, iconeEstilo: ICONE_ESTADO.finalizado.estilo }
        : { icone: ICONE_ESTADO.pendente.icone, iconeEstilo: ICONE_ESTADO.pendente.estilo }),
      detalhe: [p.is ? `IS ${p.is}` : '', p.finalidade, p.pdfUrl ? '' : 'sem PDF'].filter(Boolean).join(' · '),
      tag: <StatusTag tone={TOM_PARECER[st]}>{ROTULO_PARECER[st]}</StatusTag>,
    };
  }), [pareceresOrdenados, agora]);

  const itensGuias: ItemHistorico[] = isComGuias.map(i => ({
    id: i.id, data: isoDe(i.guiasExames?.geradoEm), icone: 'receipt_long', semData: true,
    titulo: `${i.finalidade || 'IS'} · IS ${i.is}`,
    detalhe: isoDe(i.guiasExames?.geradoEm) ? `Guias assinadas em ${dataBR(isoDe(i.guiasExames?.geradoEm))}` : 'Guias geradas',
    tag: i.guiasEntregues ? <StatusTag tone="success">Entregues</StatusTag> : undefined,
  }));

  const itensEmails: ItemHistorico[] = emails.map(e => ({
    id: e.id, data: isoDoEnvio(e.enviadoEmMs), icone: e.legado ? 'mail' : 'mark_email_read',
    titulo: e.rotulo, semData: true,
    detalhe: e.enviadoEmMs ? `${dataBR(isoDoEnvio(e.enviadoEmMs))} ${horaDoEnvio(e.enviadoEmMs)}` : '—',
  }));

  // Mensagens tramitadas registradas a partir da minuta das IS ("Minutar MSG"), da mais recente para a mais antiga.
  const itensMensagens: ItemHistorico[] = mensagens.map(m => ({
    id: m.id, data: isoDe(m.registradoEm), icone: 'chat', titulo: m.assunto || `Mensagem da IS ${m.is}`,
    detalhe: [`IS ${m.is}`, m.registradoPor?.usuario ? `registrada por ${m.registradoPor.usuario}` : ''].filter(Boolean).join(' · '),
  }));

  // Outros: documentos gerados nas IS (Gerar Documento ▾), do mais recente para o mais antigo.
  const itensOutros: ItemHistorico[] = documentosIS.map(d => {
    const dt = d.criadoEmMs ? new Date(d.criadoEmMs) : null;
    return {
      id: `${d.isId}/${d.id}`, icone: 'description', titulo: d.titulo, isId: d.isId, semData: true,
      data: dt ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` : '',
      detalhe: [d.resumo, d.emailEnviado ? 'enviado por e-mail' : ''].filter(Boolean).join(' · '),
    };
  });

  // Transcrições: primeiro as IS Agendadas/Reagendadas (a gravar), depois as entrevistas gravadas.
  const isAGravar = isOrdenadas.filter(i => fasesDeEntrevista(i));
  const itensTranscricoes: ItemHistorico[] = [
    ...isAGravar.map(i => ({
      id: `is:${i.id}`, data: dataIS(i), icone: 'mic', titulo: `Gravar entrevista · IS ${i.is}`,
      detalhe: [i.finalidade, i.dataEntrevista ? `entrevista em ${dataHoraBr(i.dataEntrevista)}` : ''].filter(Boolean).join(' · '),
    })),
    ...entrevistas.map((e: EntrevistaDaFicha) => ({
      id: `${e.isId}/${e.id}`, data: isoDe(e.criadoPor?.em as never), icone: 'record_voice_over', titulo: `Entrevista · IS ${e.is}`,
      detalhe: [e.finalidade, e.criadoPor?.nome].filter(Boolean).join(' · '),
      tag: e.situacao !== 'pronta' ? <StatusTag tone={e.situacao === 'erro' ? 'danger' : 'muted'}>{rotuloSituacao(e.situacao)}</StatusTag> : undefined,
    })),
  ];

  if (!podeFicha) return <AccessDenied pagina="Ficha do inspecionado" />;
  if (militar === undefined) {
    return <div className="flex flex-1 items-center justify-center py-20"><span className="w-6 h-6 border-2 border-line border-t-navy rounded-full animate-spin" role="status" aria-label="Carregando ficha" /></div>;
  }
  if (militar === null && !textoRegistro) {
    return <Container className="py-8"><EmptyState icon="person_search" title="Inspecionado não encontrado" description="Não há cadastro nem registros com este NIP." /></Container>;
  }

  // Ações gerais da ficha (⋮). As de cada aba vão para a barra inferior do painel principal.
  const podePericia = canUseFeature('pericia-menor.novo', perfil);
  const podeIS = secoes.inspecoes && canUseFeature('inspecoes.cadastrar', perfil);
  const isAssessor: InspecaoRecord[] = podeUsarAssessorIA(perfil) ? isDoAssessor(inspecoes) : [];
  // Menu do Claude: a IS aberta na aba IS (se em andamento) ou a mais recente em andamento.
  const isAlvoClaude = isAssessor.find(i => i.id === params.get('reg')) ?? isAssessor[0];
  const printBloqueado = !isAlvoClaude ? '' : isAlvoClaude.ds1a?.trim() ? 'A IS já tem DS-1a.' : !isAlvoClaude.dataEntrevista ? 'A IS ainda não foi agendada.' : '';
  const itensClaude: ItemMenu[] = [
    { rotulo: 'Assessor IA', icone: <SimboloClaude tamanho={18} />, onClick: () => setAssessorAberto(true) },
    {
      rotulo: 'Editar IS', icone: 'photo_camera', desabilitado: !!printBloqueado,
      dica: printBloqueado || (isAlvoClaude && isAssessor.length > 1 ? `IS ${isAlvoClaude.is}` : undefined),
      onClick: () => { if (!isAlvoClaude) return; alvoPrintsRef.current = isAlvoClaude.id; inputPrintsRef.current?.click(); },
    },
  ];
  const editarIS = itensClaude[1];
  // Guias INCDEF: a IS aberta na aba (ou a mais recente) de VDF/Término de Incapacidade com "Incapaz definitivamente para o SAM".
  const ehIncdef = (i: InspecaoRecord) => usaMinutaIncapacidadeDefinitiva({ finalidade: i.finalidade || '', laudo: i.laudo });
  const isIncdef = secoes.inspecoes ? ((aba === 'is' ? isOrdenadas.find(i => i.id === pedido && ehIncdef(i)) : undefined) ?? isOrdenadas.find(ehIncdef)) : undefined;
  const menu: ItemMenu[] = [
    { rotulo: 'Dados cadastrais', icone: 'badge', onClick: () => setVerCadastro(true) },
    ...(secoes.eventos ? [{ rotulo: 'Registro de eventos', icone: 'history', onClick: () => setVerEventos(true) }] : []),
    ...(isIncdef && canUseFeature('inspecoes.cadastrar', perfil) ? [{ rotulo: 'Gerar Guias INCDEF', icone: 'receipt_long', onClick: () => setGuiasIncdef(isIncdef) }] : []),
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

  // ---- Abas ----
  const opcoesAbas = listaAbas.filter(a => a.visivel).map(a => ({
    id: a.id, rotulo: a.id === 'pm' && atestado ? 'Atestados' : DEF_ABA[a.id].rotulo,
    desabilitada: !a.habilitada, dica: a.habilitada ? undefined : 'Em breve',
  }));
  const trocarAba = (id: AbaFicha) => { setAbrindoIS(null); setNovaPericia(false); setPericiaEditando(null); definir({ aba: id, reg: null, is: null, sel: null, guia: null, gravar: null, criar: null }); };
  const abrirRegistro = (id: string) => {
    setAbrindoIS(null); setNovaPericia(false); setPericiaEditando(null);
    definir({ reg: id, is: null, sel: null, gravar: null, criar: null });
    // Empilhado (abaixo de xl), o painel principal fica acima do histórico: rola até ele.
    if (typeof window !== 'undefined' && !window.matchMedia('(min-width: 1280px)').matches) {
      requestAnimationFrame(() => principalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };

  const itensDaAba: Record<AbaFicha, ItemHistorico[]> = {
    afastamentos: [],
    is: itensIS, pm: itensPM, atestados: itensAtestados, pareceres: itensPareceres, exames: itensExames,
    guias: itensGuias, emails: itensEmails, mensagens: itensMensagens, outros: itensOutros, transcricoes: itensTranscricoes,
  };
  // Exames, Outros e Atestados e Laudos: histórico agrupado por IS (da entrevista mais recente para a mais antiga;
  // "Sem IS" no fim). Em Atestados e Laudos só a IS com 2 ou mais PDFs vira grupo; o resto fica solto.
  const agrupada = aba === 'exames' || aba === 'outros' || aba === 'atestados';
  const gruposIS = agrupada ? agruparPorIS(itensDaAba[aba], i => i.isId, isPorEntrevista) : [];
  const historico = agrupada ? gruposIS.flatMap(g => g.itens) : aba ? itensDaAba[aba] : [];
  const isPedida = agrupada ? params.get('is') : null;
  const atual = registroSelecionado(historico, pedido ?? gruposIS.find(g => g.id === isPedida)?.itens[0]?.id);
  const dadosAfastamentos = {
    inspecoes, pericias, hoje, cidAbrev, atestado, comIS: lerIS, comPericias: lerPericias,
  };

  // Exames / Atestados e Laudos — "Criar novo": só com ?criar=<aba>&is=<IS não finalizada do inspecionado>.
  const criarIS = isParaCriar<InspecaoRecord>({ aba, criar: params.get('criar'), is: params.get('is'), podeEnviar: canUseFeature('inspecoes.enviarExames', perfil) }, inspecoes);
  const formCriar = criarIS && nav?.authUser && (aba === 'exames' || aba === 'atestados') && (
    <PainelCriarDocumentos
      key={`${aba}:${criarIS.id}`} aba={aba} is={criarIS} casca={isDesktop ? 'inline' : 'drawer'}
      examesMinimos={aba === 'exames' ? examesMinimosDaIS(criarIS, militar) : []}
      recebidos={exames.filter(e => e.isId === criarIS.id).flatMap(e => e.itens.map(i => i.exameMinimo || '')).filter(Boolean)}
      usuario={{ uid: nav.authUser.uid, usuario: nav.authUser.usuario }}
      onClose={() => definir({ criar: null, is: null, reg: null })}
      onAbrir={id => definir({ criar: null, is: null, reg: id })}
    />
  );

  // "Abrir IS" (cabeçalho): vai para a aba Inspeções de Saúde e abre o formulário no painel principal.
  const abrirIS = (modo: ModoAbrirIS) => { setNovaPericia(false); setPericiaEditando(null); definir({ aba: 'is', reg: null, is: null, sel: null, guia: null, gravar: null, criar: null }); setAbrindoIS(modo); };
  const formAbrirIS = abrindoIS && (
    <AbrirISFicha
      modo={abrindoIS} nip={nip} casca={isDesktop ? 'inline' : 'drawer'} onAviso={avisar}
      onClose={() => setAbrindoIS(null)}
      onCriada={(is, dados) => {
        setAbrindoIS(null);
        definir({ aba: 'is', reg: is.id });
        if (deveTentarGuias(is) || podeEmailsIS) setPosCriacao({ is, dados });
        else if (is.dataEntrevista) avisarAgendamento(is, is.dataEntrevista);
      }}
      onGravadasPorPrint={unica => { setAbrindoIS(null); if (unica) definir({ aba: 'is', reg: unica.id }); }}
    />
  );
  // O primeiro aviso da fila cuja IS (deste inspecionado, já atualizada) ainda pede o e-mail daquela data.
  const agendamentoAtual = filaAgendamento.map(item => {
    const is = inspecoes.find(i => i.id === item.isId);
    return is && is.dataEntrevista === item.dataEntrevista && ehElegivelAgendamento(is) && !agendamentoJaEnviado(is) ? is : null;
  }).find(Boolean) ?? null;
  const tirarDaFila = (isId: string) => setFilaAgendamento(f => f.filter(x => x.isId !== isId));
  // "+ Perícia Menor" (cabeçalho): vai para a aba Perícia Menor e abre o formulário no painel principal (no celular,
  // bottom sheet).
  const novaPericiaAbrir = () => { setAbrindoIS(null); setPericiaEditando(null); definir({ aba: 'pm', reg: null, is: null, sel: null, guia: null, gravar: null, criar: null }); setNovaPericia(true); };
  // Edição de uma perícia (Admin ou o perito responsável): no painel principal da aba (no celular, bottom sheet).
  const formEditarPericia = periciaEditando && (
    <NovaPericiaMenorForm
      key={`editar-${periciaEditando.id}`} titulo={atestado ? 'Editar atestado' : 'Editar perícia menor'} editar={periciaEditando}
      casca={isDesktop ? 'inline' : 'drawer'} onClose={() => setPericiaEditando(null)}
      onRegistrado={n => { setPericiaEditando(null); avisar(`${atestado ? 'Atestado' : 'Perícia menor'} de ${n} atualizad${atestado ? 'o' : 'a'}.`); }}
    />
  );
  const formNovaPericia = novaPericia && podePericia && (
    <NovaPericiaMenorForm titulo={t.novo} militarInicial={nip} casca={isDesktop ? 'inline' : 'drawer'} onClose={() => setNovaPericia(false)}
      onRegistrado={n => { setNovaPericia(false); definir({ aba: 'pm', reg: null }); avisar(atestado ? `Atestado de ${n} registrado.` : `Perícia menor de ${n} registrada.`); }} />
  );

  /** Painel principal sem registro: o aviso da aba (com as ações que não dependem de um registro). */
  const semRegistro = (a: AbaFicha, acoes: AcaoRodape[] = [], acaoVazio?: React.ReactNode) => (
    <CascaPainelFicha rotulo={DEF_ABA[a].rotulo} acoes={acoes}>
      <EmptyState icon={DEF_ABA[a].icone} title={`Nenhum registro em ${a === 'pm' && atestado ? 'Atestados' : DEF_ABA[a].rotulo}`}
        description={`${nome} não tem ${a === 'pm' && atestado ? 'atestados registrados' : DEF_ABA[a].vazio}.`} action={acaoVazio} />
    </CascaPainelFicha>
  );

  const painelDocumento = (a: 'atestados' | 'exames', lista: ExameDaFicha[]) => {
    if (criarIS && isDesktop) return formCriar;
    const e = lista.find(x => idExame(x) === atual?.id);
    if (!e) return semRegistro(a);
    // Excluir (só na aba Atestados e Laudos): Admin ou quem enviou o PDF, enquanto a IS não estiver finalizada.
    const isDoc = inspecoes.find(i => i.id === e.isId);
    const isFinalizada = !isDoc || isDoc.situacao === 'finalizada'; // IS não carregada: não mostra
    const podeExcluir = a === 'atestados' && podeExcluirDocumentoIS(e, nav?.authUser, isFinalizada);
    return <PainelDocumentoIS key={idExame(e)} aba={a} exame={e} podeZimbra={canUseFeature('ficha.zimbraSecretaria', perfil)} podeExcluir={podeExcluir}
      validade={{ referencia: (isDoc?.dataEntrevista || '').slice(0, 10) || hojeISO(), finalidade: isDoc?.finalidade || '' }} onAviso={avisar} />;
  };

  // ---- Pareceres: pedido e resposta (contrato de navegação ?aba=pareceres&criar=pedido|resposta&is=<isId>) ----
  // O painel do pedido (com a resposta, se houver) está em pareceres/PainelParecer.tsx; "Pedido de Parecer" é o
  // NovoParecerForm (PDF gerado e guardado pelo servidor) e "Resposta de Parecer", o RespostaParecerForm. Trocar de aba
  // ou de registro limpa o "criar". No celular, os formulários abrem em bottom sheet.
  const podePedidoParecer = secoes.pareceres && canUseFeature('pareceres.gerar', perfil);
  const podeRespostaParecer = secoes.pareceres && canUseFeature('pareceres.resposta', perfil);
  const criarParecer = modoCriarParecer(aba, params.get('criar'));
  const isCriarId = criarParecer ? params.get('is') : null;
  const isDoCriar = isCriarId ? inspecoes.find(i => i.id === isCriarId) ?? null : null;
  const fecharCriarParecer = () => definir({ criar: null, is: null });
  const usuarioAtual = nav?.authUser;
  const formCriarParecer = (() => {
    if (criarParecer === 'pedido' && podePedidoParecer) {
      if (isCriarId && !isDoCriar) return null; // a IS do link ainda não chegou (ou não é deste inspecionado)
      return (
        <NovoParecerForm
          key={`pedido:${isDoCriar?.id ?? ''}`} casca={isDesktop ? 'inline' : 'drawer'}
          prefill={{ militarId: isDoCriar?.inspecionadoId || nip, finalidade: isDoCriar?.finalidade ?? '' }}
          vinculoIS={isDoCriar ? { isId: isDoCriar.id, is: isDoCriar.is } : undefined}
          onClose={fecharCriarParecer}
          onGerado={(n, _url, id) => {
            definir({ criar: null, is: null, reg: id });
            if (isDoCriar) void aoParecerGerado(isDoCriar, n);
            else avisar(`Pedido de parecer de ${n} gerado.`);
          }}
        />
      );
    }
    if (criarParecer === 'resposta' && podeRespostaParecer && usuarioAtual) {
      return (
        <RespostaParecerForm
          key={`resposta:${isCriarId ?? ''}`} casca={isDesktop ? 'inline' : 'drawer'}
          pendentes={pedidosPendentes(pareceres, isCriarId)} inicialId={params.get('reg')} is={isDoCriar?.is ?? null}
          usuario={{ uid: usuarioAtual.uid, usuario: usuarioAtual.usuario, nome: usuarioAtual.nome }}
          onClose={fecharCriarParecer}
          onEnviada={p => { definir({ criar: null, is: null, reg: p.id }); avisar(`Resposta do parecer de ${p.especialidade} registrada. Pedido concluído.`); }}
        />
      );
    }
    return null;
  })();

  const painelParecer = () => {
    if (formCriarParecer && isDesktop) return formCriarParecer;
    const p = pareceresOrdenados.find(x => x.id === atual?.id);
    if (!p) return semRegistro('pareceres');
    return (
      <PainelParecer
        key={p.id} parecer={p} agora={agora} podeResponder={podeRespostaParecer}
        onAbrirPdf={(_titulo, url) => { abrirPdf(url).catch(() => { /* aba fechada */ }); }}
        onResponder={() => definir({ criar: 'resposta', is: p.isId ?? null, reg: p.id })}
      />
    );
  };

  const painelPrincipal = (() => {
    if (!aba) return null;
    if (aba === 'is') {
      const isSel = isOrdenadas.find(i => i.id === atual?.id);
      if (abrindoIS && isDesktop) return formAbrirIS;
      if (!isSel) return semRegistro('is');
      return (
        <PainelISFicha
          key={isSel.id} is={isSel} perfil={perfil} abas={estadoAbas} definir={definir}
          om={militar?.om || om} vinculo={militar ? vinculoDoInspecionado(militar) : undefined} feminino={militar?.sexo === 'Feminino'}
          onAgendar={setAgendando}
          onSituacaoMudou={is => { sincronizarAgendaIS(is).then(r => { if (!r.ok) avisar(`IS atualizada, mas o Google Agenda não: ${r.erro}`, 'error'); }); }}
          onAviso={avisar}
          printsSinais={printsSinais?.isId === isSel.id ? printsSinais : null}
        />
      );
    }
    if (aba === 'pm') {
      if (novaPericia && isDesktop) return formNovaPericia;
      if (periciaEditando && isDesktop) return formEditarPericia;
      const pSel = pmOrdenadas.find(p => p.id === atual?.id);
      if (!pSel) {
        return semRegistro('pm', [], podePericia
          ? <Button variant="ghost" icon="add" onClick={novaPericiaAbrir}>{atestado ? 'Registrar atestado' : 'Registrar Perícia Menor'}</Button>
          : undefined);
      }
      return (
        <PericiaMenorPainel
          key={pSel.id} modo="inline" pericia={pSel} historico={pmOrdenadas} hoje={hoje} cidAbrev={cidAbrev} termos={t}
          aba="esta" onAba={() => { /* inline: só "Esta perícia" */ }} onSelecionar={abrirRegistro} onFechar={() => { /* inline */ }}
          onExcluir={nav?.authUser && podeExcluirPericia(pSel, { uid: nav.authUser.uid, perfil: nav.authUser.perfil }) ? () => setPericiaExcluindo(pSel) : undefined}
          onEditar={nav?.authUser && podeExcluirPericia(pSel, { uid: nav.authUser.uid, perfil: nav.authUser.perfil }) ? () => setPericiaEditando(pSel) : undefined}
          // PDF do atestado: com a aba Atestados e Laudos, abre o registro lá; sem ela (ex.: User Médicos Geral), nova guia.
          onAbrirAtestado={estadoAbas.atestados.habilitada ? () => { setPericiaEditando(null); definir({ aba: 'atestados', reg: `pm:${pSel.id}`, is: null, sel: null, guia: null, gravar: null, criar: null }); } : undefined}
        />
      );
    }
    if (aba === 'afastamentos') return <PainelAfastamentos {...dadosAfastamentos} nome={nome} />;
    if (aba === 'atestados') {
      if (atual?.id.startsWith('pm:') && !(criarIS && isDesktop)) {
        const p = pmComAtestado.find(x => `pm:${x.id}` === atual.id);
        if (p) return <PainelAtestadoPM key={p.id} pericia={p} />;
      }
      return painelDocumento('atestados', atestadosIS);
    }
    if (aba === 'exames') return painelDocumento('exames', examesIS);
    if (aba === 'pareceres') return painelParecer();
    if (aba === 'transcricoes') {
      if (!atual) return semRegistro('transcricoes');
      const [isId, entrevistaId] = atual.id.startsWith('is:') ? [atual.id.slice(3), null] : atual.id.split('/');
      const isSel = isOrdenadas.find(i => i.id === isId);
      if (!isSel) return semRegistro('transcricoes');
      const daIS = entrevistas.filter(e => e.isId === isId);
      return (
        <PainelTranscricoes
          key={atual.id} is={isSel} entrevista={entrevistaId ? daIS.find(e => e.id === entrevistaId) ?? null : null} entrevistasDaIS={daIS}
          gravar={params.get('gravar') === '1'}
          onGravar={g => definir({ gravar: g ? '1' : null })}
          onConcluido={id => definir({ gravar: null, reg: `${isId}/${id}` })}
        />
      );
    }
    if (aba === 'mensagens') {
      const m = mensagens.find(x => x.id === atual?.id);
      if (!m) return semRegistro('mensagens');
      return <PainelMensagemIS key={m.id} mensagem={m} onAviso={avisar} />;
    }
    if (aba === 'guias') {
      const isSel = isComGuias.find(i => i.id === atual?.id);
      if (!isSel) return semRegistro('guias');
      return <PainelGuias key={isSel.id} is={isSel} emailCadastrado={emailDoInspecionado(militar ?? undefined)} onAviso={avisar} />;
    }
    if (aba === 'outros') {
      const d = documentosIS.find(x => `${x.isId}/${x.id}` === atual?.id);
      return d ? <PainelDocumentoGerado key={atual!.id} doc={d} /> : semRegistro('outros');
    }
    if (aba === 'emails') {
      const e = emails.find(x => x.id === atual?.id);
      return e ? <PainelEmail key={e.id} item={e} /> : semRegistro('emails');
    }
    return semRegistro(aba);
  })();

  const painelApoio = aba === 'afastamentos' ? <ApoioAfastamentos {...dadosAfastamentos} /> : aba && (
    <Card padding="none" as="section" title={`Histórico · ${aba === 'pm' && atestado ? 'Atestados' : DEF_ABA[aba].historico}`}>
      {historico.length === 0 ? (
        <p className="px-4 md:px-5 pb-4 -mt-1 text-sm text-ink-3">Nenhum registro.</p>
      ) : agrupada ? (<React.Fragment key={aba}>
        <HistoricoAgrupadoIS grupos={gruposIS} inicial={atual?.isId ?? isPedida}
          rotulo={`Histórico de ${DEF_ABA[aba].historico}`} nomeItens={aba === 'exames' ? 'exames' : 'documentos'} soltarUnicos={aba === 'atestados'}
          idItem={i => i.id} renderItem={(i, agrupado) => (
            <LinhaHistorico item={agrupado && i.tituloAgrupado ? { ...i, titulo: i.tituloAgrupado, detalhe: i.detalheAgrupado ?? i.detalhe } : i}
              atual={i.id === atual?.id} onAbrir={() => abrirRegistro(i.id)} />
          )} />
      </React.Fragment>
      ) : (
        <ul className="divide-y divide-line border-t border-line overflow-y-auto overscroll-contain max-h-[60vh] xl:max-h-[calc(100dvh-14rem)] rounded-b-xl"
          aria-label={`Histórico de ${DEF_ABA[aba].historico}`}>
          {historico.map(i => <li key={i.id}><LinhaHistorico item={i} atual={i.id === atual?.id} onAbrir={() => abrirRegistro(i.id)} /></li>)}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col flex-1">
      <Toast message={toast?.msg ?? null} tone={toast?.tone} />
      <Container size="data" className="pt-0 md:pt-8 pb-28 md:pb-10 flex flex-col gap-4 md:gap-6">
        {opcoesAbas.length > 0 && (
          // Abas sublinhadas (ouro = ativa), sem contagens: faixa branca de borda a borda, colada na topbar como uma 2ª linha dela
          // (header navigation; no desktop o -mt-8 anula o respiro do topo do Container), com rolagem lateral.
          <div className="sticky top-0 z-sticky -mx-4 md:-mx-6 xl:-mx-8 px-4 md:px-6 xl:px-8 bg-white md:-mt-8 print:static">
            <AbasSublinhadas<AbaFicha>
              rotulo="Registros do inspecionado" idBase="ficha-guia" ativa={aba ?? 'is'} onChange={trocarAba} distribuir="nunca"
              abas={opcoesAbas}
            />
          </div>
        )}

        <div className="hidden md:flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className={`${tituloNaTopbar ? 'hidden md:block ' : ''}text-h1 font-extrabold text-navy leading-tight`}>
              <button type="button" onClick={() => setVerCadastro(true)} aria-haspopup="dialog" title="Ver dados cadastrais"
                className="text-left inline-flex items-center gap-1 rounded-lg hover:underline underline-offset-4 decoration-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue">
                <span className="break-words">{nome}</span>
                <span className="material-symbols-outlined text-[24px] text-ink-3 shrink-0" aria-hidden="true">expand_more</span>
              </button>
            </h1>
            {/* Celular: sem subtítulo nem seta — o nome vai para a topbar e os dados cadastrais abrem pelo ⋮. */}
            <div className="text-sm text-ink-3 mt-1 tabular-nums">
              <span>{linhaId}</span>
              {titular}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <MenuAcoes rotulo="Mais ações da ficha" itens={menu} />
            {/* Menu do Claude (logo, sem texto, à direita do ⋮; só no desktop — no celular são itens do FAB): Assessor IA · Editar IS. */}
            {isAssessor.length > 0 && (
              <MenuAcoes rotulo="Claude: Assessor IA e Editar IS" itens={itensClaude} botao={{ texto: 'Claude', icone: '', conteudo: <LogoClaude altura={18} /> }} />
            )}
            {/* Botões de criação no cabeçalho só a partir de md; no celular viram o FAB padrão (como em Inspeções). */}
            <div className="hidden md:flex items-center gap-2">
              {podePericia && (
                <Button variant="secondary" icon="add" onClick={novaPericiaAbrir}>{atestado ? 'Atestado' : 'Perícia Menor'}</Button>
              )}
              {podeIS && (
                <MenuAcoes rotulo="Abrir IS" botao={{ texto: 'Abrir IS', icone: 'add', primario: true }} itens={[
                  { rotulo: 'Manualmente', icone: 'edit_note', onClick: () => abrirIS('manual') },
                  { rotulo: 'Por print do SINAIS', icone: 'photo_camera', onClick: () => abrirIS('print') },
                ]} />
              )}
            </div>
          </div>
        </div>
      <input
        ref={inputPrintsRef} type="file" accept="image/*" multiple className="hidden" aria-label="Prints do SINAIS"
        onChange={e => {
          const arquivos: File[] = Array.from(e.target.files ?? []);
          e.target.value = '';
          const isId = alvoPrintsRef.current;
          if (!arquivos.length || !isId) return;
          definir({ aba: 'is', reg: isId, criar: null });
          setPrintsSinais({ id: Date.now(), isId, arquivos });
        }}
      />
        {!isDesktop && slotTopbar && createPortal(<MenuAcoes rotulo="Mais ações da ficha" itens={menu} />, slotTopbar)}
        {/* FAB do celular (a primeira ação permitida é a principal): Abrir IS · Abrir IS por print · Perícia Menor. */}
        {!isDesktop && (
          <FabAcoes acoes={[
            { id: 'abrir-is', rotulo: 'Abrir IS', ariaLabel: 'Abrir IS manualmente', icone: 'add', onClick: () => abrirIS('manual'), permitido: podeIS },
            { id: 'is-print', rotulo: 'Abrir IS', ariaLabel: 'Abrir IS pelo print do SINAIS', icone: 'photo_camera', onClick: () => abrirIS('print'), permitido: podeIS },
            { id: 'pericia', rotulo: atestado ? 'Atestado' : 'Perícia Menor', icone: 'personal_injury', onClick: novaPericiaAbrir, permitido: podePericia },
            // Itens do antigo menu do Claude: o do chat mantém o símbolo do Claude; "Editar IS" lê os prints do SINAIS.
            { id: 'assessor-ia', rotulo: 'Assessor IA', ariaLabel: 'Assessor IA', icone: 'smart_toy', iconeNode: <SimboloClaude tamanho={22} />, onClick: () => setAssessorAberto(true), permitido: isAssessor.length > 0 },
            { id: 'editar-is', rotulo: 'Editar IS', ariaLabel: 'Editar IS (prints do SINAIS)', icone: 'photo_camera', onClick: editarIS.onClick, disabled: !!printBloqueado, permitido: isAssessor.length > 0 },
          ]} />
        )}

        <div id="ficha-guia-painel" role="tabpanel" aria-labelledby={aba ? `ficha-guia-aba-${aba}` : undefined}>
          {!aba ? (
            <Card><EmptyState icon="lock" title="Nenhuma aba liberada" description="O seu perfil não tem acesso às abas da ficha." /></Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 md:gap-6 items-start">
              <div ref={principalRef} className="min-w-0 xl:col-span-8 scroll-mt-16">{painelPrincipal}</div>
              <aside aria-label={aba === 'afastamentos' ? 'Resumo dos afastamentos' : `Histórico de ${DEF_ABA[aba].historico}`} className="min-w-0 xl:col-span-4 xl:sticky xl:top-16">{painelApoio}</aside>
            </div>
          )}
        </div>
      </Container>

      {assessorAberto && isAssessor.length > 0 && (
        <AssessorIAModal
          inspecoes={isAssessor} isInicialId={params.get('reg')} perfil={perfil}
          onClose={() => setAssessorAberto(false)} onAviso={avisar}
        />
      )}
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
      {parecerPara && (
        <NovoParecerForm
          inicial={parecerPara.inicial}
          prefill={{ militarId: parecerPara.is.inspecionadoId, finalidade: parecerPara.is.finalidade }}
          vinculoIS={{ isId: parecerPara.is.id, is: parecerPara.is.is }}
          onClose={() => setParecerPara(null)}
          onGerado={n => { void aoParecerGerado(parecerPara.is, n); }}
        />
      )}
      {abrindoIS && !isDesktop && formAbrirIS}
      {criarIS && !isDesktop && formCriar}
      {!isDesktop && formCriarParecer}
      {guiasIncdef && (
        <GerarGuiasDialog
          is={guiasIncdef} militar={militar && militar.id === guiasIncdef.inspecionadoId ? militar : undefined}
          finalidadeAnexoO={FINALIDADE_ANEXO_O_INCDEF}
          onClose={() => setGuiasIncdef(null)}
          onConcluido={r => {
            const is = guiasIncdef; setGuiasIncdef(null);
            avisar(r.gerado ? `Guias INCDEF da IS ${is.is} geradas.` : r.motivo || 'Não há exames para gerar guias.', r.gerado ? 'success' : 'error');
            if (r.gerado && estadoAbas.guias.habilitada) definir({ aba: 'guias', reg: is.id, is: null, sel: null, guia: null, gravar: null, criar: null });
          }}
        />
      )}
      {posCriacao && (
        <PosCriacaoIS
          key={posCriacao.is.id}
          is={posCriacao.is} dados={posCriacao.dados} podeEmails={podeEmailsIS}
          militar={militar && militar.id === posCriacao.is.inspecionadoId ? militar : undefined}
          onAviso={avisar}
          onFim={() => { const is = posCriacao.is; setPosCriacao(null); if (is.dataEntrevista) avisarAgendamento(is, is.dataEntrevista); }}
        />
      )}
      {agendamentoAtual && !posCriacao && (
        <EnviarAgendamentoDialog
          key={`${agendamentoAtual.id}|${agendamentoAtual.dataEntrevista}`}
          inspecao={agendamentoAtual} origem="agendamento" om={militar?.om || om}
          emailCadastrado={emailDoInspecionado(militar ?? undefined)}
          onClose={() => tirarDaFila(agendamentoAtual.id)}
          onEnviado={(msg, tom) => { tirarDaFila(agendamentoAtual.id); avisar(msg, tom); }}
        />
      )}
      {agendando && (
        <AgendarISFicha inspecao={agendando} onClose={() => setAgendando(null)} onAgendada={(msg, tom) => { setAgendando(null); avisar(msg, tom); }} />
      )}
      {periciaExcluindo && perfil && (
        <ExcluirPericiaDialog
          pericia={periciaExcluindo} perfil={perfil} termo={t.singular}
          onClose={() => setPericiaExcluindo(null)}
          onExcluida={msg => { setPericiaExcluindo(null); definir({ aba: 'pm', reg: null }); avisar(msg); }}
        />
      )}
      {!isDesktop && formNovaPericia}
      {!isDesktop && formEditarPericia}
      {editando && militar && perfil === 'admin' && (
        <MilitarEdicao militar={militar} oms={oms} postos={postos} onClose={() => setEditando(false)}
          onSalvo={n => { setEditando(false); avisar(`Dados de ${n} atualizados.`); }} />
      )}
    </div>
  );

  async function aoParecerGerado(is: InspecaoRecord, n: string) {
    setParecerPara(null);
    avisar(`Pedido de parecer de ${n} gerado.`);
    const atualIS = inspecoes.find(i => i.id === is.id) ?? is;
    if (!fasesDeEntrevista(atualIS)) return;
    try {
      await atualizarInspecao(atualIS.id, { status: 'parecer_solicitado' });
      if (atualIS.dataEntrevista && situacaoDoStatus('parecer_solicitado') !== atualIS.situacao) {
        sincronizarAgendaIS({ ...atualIS, status: 'parecer_solicitado', situacao: situacaoDoStatus('parecer_solicitado') }).then(r => { if (!r.ok) avisar(`Google Agenda não atualizado: ${r.erro}`, 'error'); });
      }
    } catch (e: any) {
      avisar(e?.message || 'Não foi possível alterar o status da IS.', 'error');
    }
  }
};

export { LinhaRegistroPericia };
