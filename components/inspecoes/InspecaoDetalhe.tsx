// Ficheiro: components/inspecoes/InspecaoDetalhe.tsx
// Ficha de uma IS em barra lateral (bottom sheet no mobile). Título "IS nº" com o chip do status ao lado.
// Editável:
//  1. Dados da IS: inspecionado · OM (negrito), finalidade, abertura, data da entrevista e data do laudo.
//     IS Aberta sem data de entrevista: a Finalidade é o único campo editável (o mesmo menu em cascata do
//     cadastro; grava finalidade, grupo e AMP sozinha) e a Conclusão aparece só em leitura (campos vazios ocultos).
//  2. Conclusão da IS (salva sozinha, sem botão; só com data de entrevista — utils/conclusaoIS.ts): cards da entrevista gravada e dos pareceres pedidos a
//     partir desta IS, Prints do SINAIS (opcional — conclusao/PrintsSinaisIS: a IA completa os campos vazios),
//     Laudo, CID (Verificações e Términos: obrigatório para o DS-1a — conclusao/CampoCidIS), Auditoria | JSD,
//     Restrições (MultiSelectCombobox com chips; opcional, só em Verificações e Términos com o Laudo mencionando
//     "restrições"), Nº do TIS, DS-1a, Data da Conclusão (aparece com o DS-1a: hoje, editável, nunca anterior à
//     Data do laudo) e Observações. O status muda automaticamente (regras puras em utils/conclusaoIS.ts), mas a IS
//     só é FINALIZADA pelo botão "Concluir IS" (desabilitado até o DS-1a e os demais obrigatórios): grava
//     dataConclusao, concluidaPor e TIS assinado. Finalizada uma IS de Verificações e Términos, a IA calcula em
//     segundo plano os afastamentos (LTS/Restrições — services/afastamentosIS.ts), mostrados aqui em leitura.
// Não editável (TIS assinado ou cancelada — até "Reabrir IS": função inspecoes.reabrir ou quem concluiu — ou sem
// permissão): os dados numa tabela vertical (rótulo | valor) e, abaixo, os cards da entrevista gravada e dos pareceres.
// E-mails: botões de envio (EmailsDaIS, montado pela página) e a seção "E-mails enviados" (emails/HistoricoEmailsIS),
// visível a todos que acessam a página.
// Guias de exames (finalidades com exames mínimos — guias/GuiasExamesCard): PDF, entrega ao inspecionado e envio por e-mail.
// Exames: PDFs enviados pelo rodapé ("Exames", até a IS ser finalizada); a IA identifica o documento e o
// laudo fica na íntegra para copiar (exames/ExamesDaIS).
// Rodapé (AcoesRodape: linha no desktop, FAB no mobile): Reabrir IS · Minuta MSG · Parecer · Exames · Gravar entrevista · Concluir IS (cada um
// só quando cabe). Fecha no X ou fora.
// casca="inline" (Ficha do inspecionado): o mesmo conteúdo no painel principal da página (CascaPainelFicha), sem
// Drawer nem "Fechar"; as ações vão para a barra inferior da aba, depois das `acoesExtras` da página (botões ou
// botões-menu). Sem os cards dos documentos gerados (entrevista, pareceres, guias, exames, e-mails): no lugar,
// os atalhos da página (`atalhosDocumentos`: botões ghost que levam às abas dos documentos).
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Drawer } from '../ui/Drawer';
import { ButtonLink } from '../ui/Button';
import { fichaPath } from '../../config/routes';
import { podeAbrirFicha } from '../ficha/permissoes';
import { AcoesRodape, type AcaoRodape } from '../ui/AcoesRodape';
import { CascaPainelFicha, type AcaoBarraFicha } from '../ficha/CascaPainelFicha';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { StatusTag } from '../ui/StatusTag';
import { tomStatusIS } from './listaIS';
import { MultiSelectCombobox } from '../ui/MultiSelectCombobox';
import { SecaoEntrevista, cardConclusaoClass, pedidoDeGravacao, type PedidoGravacao } from './entrevista/SecaoEntrevista';
import { ParecerDetalhe } from '../pareceres/ParecerDetalhe';
import { CampoFinalidadeIS, useFinalidadesIS } from './InspecaoForm';
import { useNav } from '../../context/NavContext';
import { ExamesDaIS } from './exames/ExamesDaIS';
import { EnviarExamesISDialog } from './exames/EnviarExamesISDialog';
import { HistoricoEmailsIS } from './emails/HistoricoEmailsIS';
import { GuiasExamesCard } from './guias/GuiasExamesCard';
import { CampoCidIS } from './conclusao/CampoCidIS';
import { PrintsSinaisIS } from './conclusao/PrintsSinaisIS';
import { atualizarInspecao, type InspecaoDoc, type InspecaoRecord } from '../../services/firestoreInspecoes';
import { registrarEventoInspecionado } from '../../services/eventosInspecionado';
import { marcarConcluido, observarPareceresDaIS, statusEfetivo, type ParecerRecord } from '../../services/firestorePareceres';
import { carregarCid, carregarRestricoesIS, type CidItem } from '../../utils/corposQuadros';
import type { PreenchimentoPrints } from '../../utils/importacaoIS';
import { ROTULO_AFASTAMENTO_IS, type AfastamentoIS } from '../../utils/afastamentosIS';
import {
  STATUS_IS, statusEfetivoIS, dataBr, formatTis, tisValido, prefixoAnoTis, hojeISO, dataDeEntrevista,
} from '../../utils/inspecoes';
import {
  dataConclusaoInicial, erroDataConclusao, motivoNaoConcluir, patchConcluirIS, patchReabrirIS, podeReabrirIS,
  encaminhamentoDoStatus, exigeCid, faltaCid, juntarRestricoes, mostraEncaminhamento, mostraRestricoes, opcoesDeRestricoes, patchCid, patchConclusao,
  patchEncaminhamento, patchFinalidade, podeEditarConclusao, podeEditarFinalidade, separarRestricoes,
  type CampoConclusao, type Encaminhamento, type EstadoConclusao,
} from '../../utils/conclusaoIS';

export interface PermissoesDetalheIS {
  editar: boolean;
  minuta: boolean;
  parecer: boolean;
  /** Entrevista gravada (Admin e user_medicos). */
  entrevista: boolean;
  /** Enviar exames em PDF (inspecoes.enviarExames); ver/copiar os laudos é de quem abre a IS. */
  exames: boolean;
  /** "Reabrir IS" concluída (função inspecoes.reabrir); quem concluiu a IS sempre pode. */
  reabrir?: boolean;
}

interface Props {
  inspecao: InspecaoRecord;
  /** Sigla da OM do inspecionado. */
  om?: string;
  permissoes: PermissoesDetalheIS;
  onClose: () => void;
  onMinuta: () => void;
  onSolicitarParecer: () => void;
  onDuplicarParecer: (p: ParecerRecord) => void;
  /** A situação (Em andamento/Finalizada) mudou: o evento do Google Agenda muda de título e cor. */
  onSituacaoMudou: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
  /** Seção de e-mails da IS (botões de envio e cards dos já enviados — EmailsDaIS), montada pela página. */
  emails?: React.ReactNode;
  /** 'drawer' (padrão): barra lateral/bottom sheet. 'inline': painel principal da Ficha do inspecionado. */
  casca?: 'drawer' | 'inline';
  /** Só em casca="inline": ações da página que entram na barra inferior antes das da IS (ex.: "Agendar IS", "Excluir", botões-menu). */
  acoesExtras?: AcaoBarraFicha[];
  /** Só em casca="inline": no lugar dos cards dos documentos gerados (atalhos para as abas dos documentos). */
  atalhosDocumentos?: React.ReactNode;
  /**
   * "Gravar entrevista": sem a prop, abre a gravação aqui mesmo; com uma função, ela substitui o fluxo (a Ficha leva à
   * aba Transcrições); null esconde o botão.
   */
  onGravarEntrevista?: (() => void) | null;
}

/** Minuta MSG: com Nº do TIS e DS-1a, ou IS cancelada. */
export const mostraMinutaMsg = (is: Pick<InspecaoRecord, 'tis' | 'ds1a' | 'status'>): boolean => (!!is.tis?.trim() && !!is.ds1a?.trim()) || is.status === 'cancelada';
/** Parecer e Gravar entrevista: só com a IS Agendada ou Reagendada. */
export const fasesDeEntrevista = (is: Pick<InspecaoRecord, 'status'>): boolean => is.status === 'agendada' || is.status === 'reagendada';

const Linha: React.FC<{ rotulo: string; children?: React.ReactNode; className?: string }> = ({ rotulo, children, className = '' }) => (
  <div className={className}>
    <dt className="text-xs font-semibold text-ink-3">{rotulo}</dt>
    <dd className="text-sm text-ink break-words">{children || '—'}</dd>
  </div>
);

/** Linha da tabela vertical (modo leitura): rótulo em fundo acinzentado à esquerda, valor à direita. */
const LinhaTabela: React.FC<{ rotulo: string; children?: React.ReactNode }> = ({ rotulo, children }) => (
  <tr>
    <th scope="row" className="w-[38%] sm:w-[32%] bg-thead px-3 py-2.5 text-left align-top text-xs font-semibold text-ink">{rotulo}</th>
    <td className="px-3 py-2.5 align-top text-sm text-ink break-words">{children || '—'}</td>
  </tr>
);

const ATRASO_AUTOSAVE_MS = 1000;

/** Campos da Conclusão sempre como texto (docs antigos podem não ter algum). */
const comPadroes = (i: InspecaoRecord): EstadoConclusao => ({
  status: i.status, dataEntrevista: i.dataEntrevista || '', finalidade: i.finalidade || '', grupoFinalidade: i.grupoFinalidade || '',
  dataLaudo: i.dataLaudo || '', laudo: i.laudo || '', restricoes: i.restricoes || '', tis: i.tis || '', ds1a: i.ds1a || '', observacoes: i.observacoes || '',
  cid: i.cid || '',
});

/** "LTS · 30 dias (10/11/2026 a 09/12/2026)" — afastamento calculado pela IA. */
const textoAfastamento = (a: AfastamentoIS): string =>
  `${ROTULO_AFASTAMENTO_IS[a.tipo]} · ${a.dias} dia${a.dias !== 1 ? 's' : ''} (${dataBr(a.dataInicio)} a ${dataBr(a.dataTermino)})${a.restricoes.length ? ` — ${a.restricoes.join(', ')}` : ''}`;

/** Campo de texto com gravação automática: ~1 s sem digitar ou ao sair do campo. */
const useCampoAuto = (remoto: string, salvar: (valor: string) => void) => {
  const [valor, setValor] = useState(remoto);
  const editando = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const atual = useRef(valor);
  const salvarRef = useRef(salvar);
  salvarRef.current = salvar;

  // Mudança vinda do banco (outro campo apagou este, outro usuário…) só entra fora da digitação.
  useEffect(() => { if (!editando.current) { setValor(remoto); atual.current = remoto; } }, [remoto]);

  const confirmar = () => {
    if (timer.current !== undefined) { window.clearTimeout(timer.current); timer.current = undefined; }
    salvarRef.current(atual.current);
  };
  // Fechou o detalhe com gravação pendente: grava.
  useEffect(() => () => { if (timer.current !== undefined) confirmar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    valor,
    onChange: (v: string) => {
      editando.current = true;
      atual.current = v;
      setValor(v);
      if (timer.current !== undefined) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(confirmar, ATRASO_AUTOSAVE_MS);
    },
    onBlur: () => { editando.current = false; confirmar(); },
  };
};

type EstadoGravacao = 'ocioso' | 'salvando' | 'salvo' | 'erro';

export const InspecaoDetalhe: React.FC<Props> = ({ inspecao: is, om, permissoes, onClose, onMinuta, onSolicitarParecer, onDuplicarParecer, onSituacaoMudou, onAviso, emails, casca = 'drawer', acoesExtras = [], atalhosDocumentos, onGravarEntrevista }) => {
  const nav = useNav();
  const efetivo = statusEfetivoIS(is);
  const info = STATUS_IS[efetivo];
  const estadoConclusao = comPadroes(is);
  // Conclusão: só com data de entrevista (até finalizar). Aberta sem data: só a Finalidade.
  const conclusaoEditavel = permissoes.editar && podeEditarConclusao(estadoConclusao);
  // Com as guias de exames já geradas para a finalidade, ela não muda mais (as guias seguem a finalidade).
  const finalidadeEditavel = permissoes.editar && podeEditarFinalidade(estadoConclusao) && !is.guiasExames;
  const somenteLeitura = !conclusaoEditavel && !finalidadeEditavel;

  const [restricoesOpcoes, setRestricoesOpcoes] = useState<string[]>([]);
  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  const [enviandoExames, setEnviandoExames] = useState(false);
  const [parecerAbertoId, setParecerAbertoId] = useState<string | null>(null);
  const [gravacao, setGravacao] = useState<PedidoGravacao>(null);
  const [estado, setEstado] = useState<EstadoGravacao>('ocioso');
  const [erroTis, setErroTis] = useState('');

  useEffect(() => { carregarRestricoesIS().then(l => setRestricoesOpcoes(opcoesDeRestricoes(l))).catch(() => setRestricoesOpcoes([])); }, []);
  useEffect(() => observarPareceresDaIS(is.id, setPareceres, () => setPareceres([])), [is.id]);

  // Estado mais recente da IS (banco + gravações já disparadas): as regras partem dele.
  const atualRef = useRef<InspecaoRecord>(is);
  useEffect(() => { atualRef.current = is; }, [is]);
  const pareceresRef = useRef(pareceres);
  pareceresRef.current = pareceres;
  const fila = useRef<Promise<void>>(Promise.resolve());

  /** Grava, em fila, o patch calculado a partir do estado mais recente. */
  const gravar = (calcular: (atual: InspecaoRecord) => { patch: Partial<InspecaoDoc>; concluirPareceres: boolean }) => {
    fila.current = fila.current.then(async () => {
      const atual = atualRef.current;
      const { patch, concluirPareceres } = calcular(atual);
      if (Object.keys(patch).length === 0) return;
      atualRef.current = { ...atual, ...patch };
      setEstado('salvando');
      try {
        await atualizarInspecao(atual.id, patch);
        setEstado('salvo');
        if (patch.situacao && patch.situacao !== atual.situacao && atual.dataEntrevista) onSituacaoMudou({ ...atualRef.current });
        if (concluirPareceres) {
          const abertos = pareceresRef.current.filter(p => p.status === 'solicitado');
          await Promise.all(abertos.map(p => marcarConcluido(p.id, true, nav?.authUser?.nome || ''))).catch(() => onAviso('Parecer não marcado como concluído.', 'error'));
        }
      } catch (e: any) {
        atualRef.current = atual;
        setEstado('erro');
        onAviso(e?.message || 'Não foi possível salvar.', 'error');
      }
    });
  };
  const gravarCampo = (campo: CampoConclusao, valor: string) => gravar(atual => patchConclusao(comPadroes(atual), campo, valor, hojeISO()));

  const laudo = useCampoAuto(is.laudo || '', v => gravarCampo('laudo', v));
  const ds1a = useCampoAuto(is.ds1a || '', v => gravarCampo('ds1a', v));
  const observacoes = useCampoAuto(is.observacoes || '', v => gravarCampo('observacoes', v));
  const tis = useCampoAuto(is.tis || '', v => {
    const t = v.trim();
    if (t === (atualRef.current.tis || '')) { setErroTis(''); return; }
    if (t && !tisValido(t)) { setErroTis(`Formato ${prefixoAnoTis()}.000.N`); return; }
    setErroTis('');
    gravarCampo('tis', t);
  });

  // Finalidade (IS Aberta sem entrevista): a tela reflete a escolha na hora; grava finalidade, grupo e AMP.
  const { gruposMenu, achar } = useFinalidadesIS(finalidadeEditavel);
  const [finalidadeLocal, setFinalidadeLocal] = useState(is.finalidade || '');
  useEffect(() => { setFinalidadeLocal(is.finalidade || ''); }, [is.finalidade]);
  const mudarFinalidade = (nome: string) => {
    const nova = achar(nome);
    if (!nova) return;
    setFinalidadeLocal(nova.finalidade);
    gravar(atual => ({
      patch: patchFinalidade({ finalidade: atual.finalidade || '', grupoFinalidade: atual.grupoFinalidade || '', amp: atual.amp || '', peritoUid: atual.peritoUid || '', restricoes: atual.restricoes || '' }, nova),
      concluirPareceres: false,
    }));
  };

  const comEncaminhamento = mostraEncaminhamento(estadoConclusao);
  // Restrições: aparecem assim que o Laudo digitado menciona "restrições" (o autosave grava o Laudo antes).
  const comRestricoes = mostraRestricoes({ grupoFinalidade: estadoConclusao.grupoFinalidade, laudo: conclusaoEditavel ? laudo.valor : estadoConclusao.laudo });
  // CID (Verificações e Términos): obrigatório para finalizar; a tela reflete a escolha na hora.
  const comCid = exigeCid(estadoConclusao);
  const [cidLocal, setCidLocal] = useState(is.cid || '');
  useEffect(() => { setCidLocal(is.cid || ''); }, [is.cid]);
  const semCid = faltaCid({ grupoFinalidade: estadoConclusao.grupoFinalidade, cid: cidLocal });
  const escolherCid = (c: CidItem | null) => {
    setCidLocal(c?.DESCRABREV ?? '');
    gravar(atual => ({ patch: patchCid(comPadroes(atual), c ? { descrAbrev: c.DESCRABREV, subcat: c.SUBCAT } : null), concluirPareceres: false }));
  };

  // Data da Conclusão (aparece com o DS-1a): hoje, editável; só é gravada pelo "Concluir IS".
  const [dataConclusao, setDataConclusao] = useState(() => dataConclusaoInicial(is.dataConclusao));
  const [concluindo, setConcluindo] = useState(false);
  const quem = nav?.authUser ? { uid: nav.authUser.uid, usuario: nav.authUser.usuario || nav.authUser.nome || '' } : null;
  /** "Concluir IS": grava (em fila, depois dos campos pendentes) TIS assinado, a Data da Conclusão e quem concluiu. */
  const concluirIS = () => {
    if (!quem) return;
    setConcluindo(true);
    const data = dataConclusao;
    gravar(atual => {
      const estado = comPadroes(atual);
      const patch = patchConcluirIS(estado, data, quem);
      if (!patch) { onAviso(motivoNaoConcluir(estado, data) || 'Não foi possível concluir a IS.', 'error'); return { patch: {}, concluirPareceres: false }; }
      return { patch: patch as Partial<InspecaoDoc>, concluirPareceres: false };
    });
    void fila.current.then(() => {
      setConcluindo(false);
      if (atualRef.current.status === 'tis_assinado') {
        onAviso(`IS ${is.is} concluída.`);
        if (is.inspecionadoId) registrarEventoInspecionado(is.inspecionadoId, 'is.concluir', `IS ${is.id}`);
      }
    });
  };
  /** "Reabrir IS": volta a Em andamento (status coerente) e apaga a Data da Conclusão e quem concluiu. */
  const reabrirIS = () => {
    gravar(atual => ({ patch: (patchReabrirIS(comPadroes(atual)) ?? {}) as Partial<InspecaoDoc>, concluirPareceres: false }));
    void fila.current.then(() => {
      if (atualRef.current.status !== 'tis_assinado') {
        onAviso(`IS ${is.is} reaberta.`);
        if (is.inspecionadoId) registrarEventoInspecionado(is.inspecionadoId, 'is.reabrir', `IS ${is.id}`);
      }
    });
  };

  // Prints do SINAIS: completa só os campos vazios, na ordem das regras (Laudo → CID → Restrições → TIS → DS-1a).
  const preencherDosPrints = async (p: PreenchimentoPrints): Promise<string[]> => {
    if (p.laudo) gravarCampo('laudo', p.laudo);
    if (p.laudo && p.dataLaudo) gravar(atual => ({ patch: atual.laudo === p.laudo && atual.dataLaudo !== p.dataLaudo ? { dataLaudo: p.dataLaudo } : {}, concluirPareceres: false }));
    if (p.cidCodigo) {
      // TODO(integração frente D): trocar pelo acharCidDoSinais(codigo, lista) de utils/importacaoIS.ts.
      const c = await carregarCid().then(l => l.find(x => x.SUBCAT.toUpperCase() === p.cidCodigo)).catch(() => undefined);
      if (c && !atualRef.current.cid) escolherCid(c);
    }
    if (p.restricoes) gravarCampo('restricoes', p.restricoes);
    if (p.tis && tisValido(p.tis)) gravarCampo('tis', p.tis);
    if (p.ds1a) gravarCampo('ds1a', p.ds1a);
    if (p.dataConclusao) setDataConclusao(p.dataConclusao);
    await fila.current;
    const r = atualRef.current;
    return [
      p.laudo && r.laudo === p.laudo ? 'Laudo' : '',
      p.cidCodigo && r.cid ? 'CID' : '',
      p.restricoes && r.restricoes ? 'Restrições' : '',
      p.tis && r.tis === p.tis ? 'Nº do TIS' : '',
      p.ds1a && r.ds1a === p.ds1a ? 'DS-1a' : '',
      p.dataConclusao ? 'Data da Conclusão' : '',
    ].filter(Boolean);
  };
  // Restrições: a tela reflete o clique na hora (o banco confirma depois pelo onSnapshot).
  const [restricoesLocal, setRestricoesLocal] = useState(is.restricoes || '');
  useEffect(() => { setRestricoesLocal(is.restricoes || ''); }, [is.restricoes]);
  const restricoesMarcadas = separarRestricoes(restricoesLocal);
  const mudarRestricoes = (lista: string[]) => {
    const texto = juntarRestricoes(lista);
    setRestricoesLocal(texto);
    gravarCampo('restricoes', texto);
  };

  const parecerAberto = parecerAbertoId ? pareceres.find(p => p.id === parecerAbertoId) ?? null : null;
  const dataParecer = (p: ParecerRecord) => p.criadoEm?.toDate?.().toLocaleDateString('pt-BR') ?? dataBr(hojeISO());

  // Exames: envio (e remoção) só enquanto a IS não está finalizada.
  const isAtiva = is.situacao !== 'finalizada';
  const podeEnviarExames = permissoes.exames && isAtiva && !!nav?.authUser;
  // Concluir IS: sempre visível na IS em andamento editável; desabilitado até o DS-1a (e os demais obrigatórios).
  const comDs1a = !!ds1a.valor.trim();
  const erroData = comDs1a ? erroDataConclusao(dataConclusao, is.dataLaudo || '') : '';
  const motivoConcluir = motivoNaoConcluir({ ...estadoConclusao, ds1a: ds1a.valor, cid: cidLocal }, dataConclusao);
  const reabrivel = permissoes.editar && podeReabrirIS(is, nav?.authUser?.uid, !!permissoes.reabrir);
  const acoes: AcaoRodape[] = [
    ...(reabrivel ? [{ id: 'reabrir', rotulo: 'Reabrir IS', icone: 'lock_open', variante: 'secondary' as const, onClick: reabrirIS }] : []),
    ...(permissoes.minuta && mostraMinutaMsg(is) ? [{ id: 'minuta', rotulo: 'Minuta MSG', icone: 'mail', variante: 'secondary' as const, onClick: onMinuta }] : []),
    ...(permissoes.parecer && fasesDeEntrevista(is) ? [{ id: 'parecer', rotulo: 'Parecer', icone: 'assignment_add', variante: 'secondary' as const, onClick: onSolicitarParecer }] : []),
    ...(podeEnviarExames ? [{ id: 'exames', rotulo: 'Exames', icone: 'upload_file', variante: 'secondary' as const, onClick: () => setEnviandoExames(true) }] : []),
    ...(permissoes.entrevista && fasesDeEntrevista(is) && onGravarEntrevista !== null
      ? [{ id: 'gravar', rotulo: 'Gravar entrevista', icone: 'mic', variante: (conclusaoEditavel ? 'secondary' : 'primary') as AcaoRodape['variante'], onClick: onGravarEntrevista ?? (() => setGravacao(pedidoDeGravacao())) }] : []),
    ...(conclusaoEditavel && quem ? [{
      id: 'concluir', rotulo: 'Concluir IS', icone: 'task_alt', variante: 'primary' as const, onClick: concluirIS,
      disabled: !!motivoConcluir || concluindo, loading: concluindo,
    }] : []),
  ];

  const encaminhamento = encaminhamentoDoStatus(is.status);
  const textoLaudo = is.laudo?.trim() || '';
  const textoObservacoes = is.observacoes?.trim() || '';
  const restricoesGravadas = separarRestricoes(is.restricoes || '');
  const afastamentos = is.afastamentos ?? [];

  const indicadorGravacao = (
    <span role="status" className={`text-xs ${estado === 'erro' ? 'font-semibold text-wine' : 'text-ink-3'}`}>
      {estado === 'salvando' ? 'Salvando…' : estado === 'salvo' ? 'Salvo' : estado === 'erro' ? 'Erro' : ''}
    </span>
  );

  const cards = casca === 'inline' ? (atalhosDocumentos ?? null) : (
    <>
    <div className="flex flex-wrap gap-2 empty:hidden">
      {permissoes.entrevista && <SecaoEntrevista is={is} gravacao={gravacao} onGravacao={setGravacao} />}
      {pareceres.map(p => (
        <button key={p.id} type="button" onClick={() => setParecerAbertoId(p.id)} className={cardConclusaoClass}>
          <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">assignment</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-navy">Parecer solicitado</span>
            <span className="block text-xs text-ink-3">{dataParecer(p)}{statusEfetivo(p) === 'concluido' ? ' · concluído' : ''}</span>
          </span>
        </button>
      ))}
    </div>
    <GuiasExamesCard is={is} onAviso={onAviso} />
    <ExamesDaIS isId={is.id} podeApagar={podeEnviarExames} onAviso={onAviso} />
    {emails}
    <HistoricoEmailsIS is={is} />
    </>
  );

  const corpo = (
    <>
      {somenteLeitura ? (
        <div className="space-y-4">
          <section aria-labelledby={`dados-is-${is.id}`} className="space-y-3">
            <h3 id={`dados-is-${is.id}`} className="text-h3 font-bold text-navy">Dados da IS</h3>
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full table-fixed border-collapse">
                <tbody className="divide-y divide-line">
                  {casca !== 'inline' && (
                    <LinhaTabela rotulo="Inspecionado">
                      {is.inspecionado ? <><span className="font-bold">{is.inspecionado}</span>{om ? ` · ${om}` : ''}</> : ''}
                    </LinhaTabela>
                  )}
                  <LinhaTabela rotulo="Finalidade">{is.finalidade}</LinhaTabela>
                  <LinhaTabela rotulo="Abertura IS">{is.dataAbertura ? dataBr(is.dataAbertura) : ''}</LinhaTabela>
                  <LinhaTabela rotulo="Entrevista">{is.dataEntrevista ? dataBr(dataDeEntrevista(is.dataEntrevista)) : ''}</LinhaTabela>
                  <LinhaTabela rotulo="Laudo">
                    {textoLaudo ? (
                      <>
                        <span className="block whitespace-pre-line">{textoLaudo}</span>
                        {is.dataLaudo && <span className="block mt-1 text-xs text-ink-3">Data do laudo: {dataBr(is.dataLaudo)}</span>}
                      </>
                    ) : ''}
                  </LinhaTabela>
                  {comEncaminhamento && encaminhamento && (
                    <LinhaTabela rotulo="Encaminhamento">{encaminhamento === 'jsd' ? 'JSD' : 'Auditoria'}</LinhaTabela>
                  )}
                  {is.cid?.trim() && <LinhaTabela rotulo="CID">{is.cid}</LinhaTabela>}
                  {restricoesGravadas.length > 0 && <LinhaTabela rotulo="Restrições">{restricoesGravadas.join(', ')}</LinhaTabela>}
                  {afastamentos.length > 0 && (
                    <LinhaTabela rotulo="Afastamentos (IA)">
                      {afastamentos.map((a, i) => <span key={i} className="block">{textoAfastamento(a)}</span>)}
                    </LinhaTabela>
                  )}
                  <LinhaTabela rotulo="Nº do TIS">{is.tis?.trim() ? <span className="tabular-nums">{is.tis}</span> : ''}</LinhaTabela>
                  <LinhaTabela rotulo="DS-1a">{is.ds1a?.trim() || ''}</LinhaTabela>
                  {is.dataConclusao && (
                    <LinhaTabela rotulo="Data da Conclusão">
                      {dataBr(is.dataConclusao)}{is.concluidaPor?.usuario ? <span className="text-ink-3"> · concluída por {is.concluidaPor.usuario}</span> : null}
                    </LinhaTabela>
                  )}
                  {textoObservacoes && <LinhaTabela rotulo="Observações"><span className="whitespace-pre-line">{textoObservacoes}</span></LinhaTabela>}
                  <LinhaTabela rotulo="Status"><StatusTag tone={tomStatusIS(efetivo)}>{info.rotulo}</StatusTag></LinhaTabela>
                </tbody>
              </table>
            </div>
          </section>
          {cards}
        </div>
      ) : (
      <div className="space-y-6">

        <section aria-labelledby={`dados-is-${is.id}`} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 id={`dados-is-${is.id}`} className="text-h3 font-bold text-navy">Dados da IS</h3>
            {finalidadeEditavel && indicadorGravacao}
          </div>
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
            {casca !== 'inline' && (
              <Linha rotulo="Inspecionado" className="col-span-3">
                {is.inspecionado ? <><span className="font-bold">{is.inspecionado}</span>{om ? ` · ${om}` : ''}</> : ''}
              </Linha>
            )}
            {!finalidadeEditavel && <Linha rotulo="Finalidade" className="col-span-3">{is.finalidade}</Linha>}
          </dl>
          {finalidadeEditavel && (
            <div>
              <CampoFinalidadeIS value={finalidadeLocal} onChange={mudarFinalidade} gruposMenu={gruposMenu} />
              {is.amp && <p className="mt-1 text-xs text-ink-3">Competência da {is.amp} (definida pela finalidade).</p>}
            </div>
          )}
          <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
            <Linha rotulo="Abertura IS">{dataBr(is.dataAbertura)}</Linha>
            <Linha rotulo="Entrevista">{is.dataEntrevista ? dataBr(dataDeEntrevista(is.dataEntrevista)) : ''}</Linha>
            <Linha rotulo="Laudo">{dataBr(is.dataLaudo)}</Linha>
          </dl>
        </section>

        <section aria-labelledby={`conclusao-is-${is.id}`} className="space-y-4 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-2">
            <h3 id={`conclusao-is-${is.id}`} className="text-h3 font-bold text-navy">Conclusão da IS</h3>
            {conclusaoEditavel && indicadorGravacao}
          </div>

          {cards}

          {!conclusaoEditavel ? (
            <>
              <p className="text-xs text-ink-3">A Conclusão fica editável depois que a entrevista for agendada.</p>
              {(textoLaudo || is.cid?.trim() || restricoesGravadas.length > 0 || is.tis?.trim() || is.ds1a?.trim() || textoObservacoes || (comEncaminhamento && encaminhamento)) && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {textoLaudo && (
                    <Linha rotulo="Laudo" className="col-span-2">
                      <span className="block whitespace-pre-line">{textoLaudo}</span>
                      {is.dataLaudo && <span className="block mt-1 text-xs text-ink-3">Data do laudo: {dataBr(is.dataLaudo)}</span>}
                    </Linha>
                  )}
                  {comEncaminhamento && encaminhamento && <Linha rotulo="Encaminhamento" className="col-span-2">{encaminhamento === 'jsd' ? 'JSD' : 'Auditoria'}</Linha>}
                  {is.cid?.trim() && <Linha rotulo="CID" className="col-span-2">{is.cid}</Linha>}
                  {restricoesGravadas.length > 0 && <Linha rotulo="Restrições" className="col-span-2">{restricoesGravadas.join(', ')}</Linha>}
                  {is.tis?.trim() && <Linha rotulo="Nº do TIS"><span className="tabular-nums">{is.tis}</span></Linha>}
                  {is.ds1a?.trim() && <Linha rotulo="DS-1a">{is.ds1a}</Linha>}
                  {textoObservacoes && <Linha rotulo="Observações" className="col-span-2"><span className="whitespace-pre-line">{textoObservacoes}</span></Linha>}
                </dl>
              )}
            </>
          ) : (
          <>

          <PrintsSinaisIS
            isId={is.id} inspecionadoId={is.inspecionadoId || ''} finalidade={is.finalidade || ''} dataAbertura={is.dataAbertura || ''}
            atual={() => { const a = atualRef.current; return { grupoFinalidade: a.grupoFinalidade || '', laudo: a.laudo || '', dataLaudo: a.dataLaudo || '', restricoes: a.restricoes || '', tis: a.tis || '', ds1a: a.ds1a || '', cid: a.cid || '', dataConclusao: a.dataConclusao || '' }; }}
            onPreencher={preencherDosPrints}
          />

          <Field label="Laudo">
            {a => <textarea {...a} value={laudo.valor} onChange={e => laudo.onChange(e.target.value)} onBlur={laudo.onBlur} className={`${a.className} min-h-[88px]`} />}
          </Field>

          {comCid && (
            <CampoCidIS valor={cidLocal} onEscolher={escolherCid} erro={semCid && laudo.valor.trim() ? 'Informe o CID: obrigatório para finalizar a IS (DS-1a).' : undefined} />
          )}

          {comEncaminhamento && (
            <fieldset disabled={!!is.tis?.trim()} className="disabled:opacity-60">
              <Segmented<Encaminhamento | ''>
                ariaLabel="Encaminhamento"
                value={encaminhamento ?? ''}
                onChange={v => { if (v) gravar(atual => ({ patch: patchEncaminhamento(comPadroes(atual), v), concluirPareceres: false })); }}
                options={[{ value: 'auditoria', label: 'Auditoria' }, { value: 'jsd', label: 'JSD' }]}
              />
            </fieldset>
          )}

          {comRestricoes && (
            <MultiSelectCombobox label="Restrições" opcoes={restricoesOpcoes} selecionadas={restricoesMarcadas} onChange={mudarRestricoes} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nº do TIS" error={erroTis}>
              {a => (
                <input
                  {...a} type="text" inputMode="numeric" value={tis.valor} disabled={!is.laudo?.trim()}
                  onChange={e => { tis.onChange(formatTis(e.target.value, tis.valor)); setErroTis(''); }} onBlur={tis.onBlur}
                  placeholder={`${prefixoAnoTis()}.000.0`} maxLength={14} className={`${a.className} tabular-nums`}
                />
              )}
            </Field>
            <Field label="DS-1a" help={semCid && is.tis?.trim() && !is.ds1a?.trim() ? 'Informe o CID antes do DS-1a.' : undefined}>
              {a => <input {...a} type="text" value={ds1a.valor} disabled={!is.tis?.trim() || (semCid && !is.ds1a?.trim())} onChange={e => ds1a.onChange(e.target.value)} onBlur={ds1a.onBlur} autoComplete="off" />}
            </Field>
            {comDs1a && (
              <Field label="Data da Conclusão" error={erroData || undefined} help={erroData ? undefined : 'Gravada ao concluir a IS.'}>
                {a => <input {...a} type="date" value={dataConclusao} min={is.dataLaudo || undefined} onChange={e => setDataConclusao(e.target.value)} />}
              </Field>
            )}
          </div>

          <Field label="Observações">
            {a => <textarea {...a} value={observacoes.valor} onChange={e => observacoes.onChange(e.target.value)} onBlur={observacoes.onBlur} className={`${a.className} min-h-[72px]`} />}
          </Field>
          </>
          )}
        </section>
      </div>
      )}

      {enviandoExames && nav?.authUser && createPortal(
        <EnviarExamesISDialog isId={is.id} usuario={{ uid: nav.authUser.uid, usuario: nav.authUser.usuario }} onClose={() => setEnviandoExames(false)} />,
        document.body,
      )}

      {parecerAberto && createPortal(
        <ParecerDetalhe
          parecer={parecerAberto}
          podeGerar={permissoes.parecer}
          onClose={() => setParecerAbertoId(null)}
          onAbrirPdf={() => { window.open(parecerAberto.pdfUrl, '_blank', 'noopener,noreferrer'); }}
          onConcluir={concluido => {
            marcarConcluido(parecerAberto.id, concluido, concluido ? nav?.authUser?.nome || '' : '')
              .then(() => onAviso(concluido ? 'Parecer concluído.' : 'Parecer reaberto.'))
              .catch((e: any) => onAviso(e?.message || 'Não foi possível alterar o parecer.', 'error'));
          }}
          onDuplicar={() => { setParecerAbertoId(null); onDuplicarParecer(parecerAberto); }}
        />,
        document.body,
      )}
    </>
  );

  const chipStatus = <StatusTag tone={tomStatusIS(efetivo)}>{info.rotulo}</StatusTag>;
  if (casca === 'inline') {
    return (
      <CascaPainelFicha titulo={`IS ${is.is}`} icone="event_available" tituloExtra={chipStatus} subtitulo={is.finalidade} acoes={[...acoesExtras, ...acoes]}>
        {corpo}
      </CascaPainelFicha>
    );
  }
  return (
    <Drawer
      title={`IS ${is.is}`}
      icon="event_available"
      onClose={onClose}
      tituloExtra={chipStatus}
      acoesTopo={is.inspecionadoId && podeAbrirFicha(nav?.authUser?.perfil)
        ? <ButtonLink to={fichaPath(is.inspecionadoId)} variant="ghost" size="sm" icon="id_card" aria-label={`Abrir ficha de ${is.inspecionado || 'inspecionado'}`}>Abrir ficha</ButtonLink>
        : undefined}
      footer={acoes.length > 0 ? <AcoesRodape acoes={acoes} /> : undefined}
    >
      {corpo}
    </Drawer>
  );
};
