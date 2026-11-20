// Ficheiro: components/ficha/inspecoes/useAcoesISFicha.tsx
// Ações da barra inferior da aba Inspeções de Saúde da Ficha do inspecionado (antes das da própria IS —
// InspecaoDetalhe acrescenta "Gravar entrevista", "Reabrir IS" e "Concluir IS") e os atalhos para as abas dos
// documentos (no lugar dos cards de documentos do drawer):
//  - "Excluir" (destrutivo, à esquerda): função inspecoes.excluir, só IS não finalizada; a exclusão é completa, no
//    servidor (excluirInspecaoCompleta — POST /api/inspecoes/excluir);
//  - "Agendar IS"/"Reagendar IS": as regras do menu da página Inspeções de Saúde;
//  - "Enviar PDF ▾" (com data de entrevista, sem Laudo e IS não finalizada): Exames · Atestados e Laudos · Resposta de Parecer
//    (só com pedido de parecer da IS não concluído). Sempre confirma e navega pelo contrato
//    definir({ aba, criar, is, reg: null }) — o estado "Criar novo" é de cada aba;
//  - "Gerar Documento ▾": Pedido de Parecer → aba Pareceres (criar: 'pedido'); os demais pelo registro
//    documentos/registro.tsx (formulário → confirmar e-mail → servidor → PDF em nova aba; ficam na aba Outros);
//  - "Minutar MSG" (IS concluída; função inspecoes.gerarMinuta): MinutarMsgIS; registrada, abre a aba Mensagens.
import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/Dialog';
import { MenuAcoes, type ItemMenu } from '../../ui/MenuAcoes';
import type { AcaoBarraFicha } from '../CascaPainelFicha';
import { MinutarMsgIS } from './MinutarMsgIS';
import { useGerarDocumentoIS } from './documentos/useGerarDocumentoIS';
import { canUseFeature } from '../../../config/permissions';
import { excluirInspecaoCompleta, type InspecaoRecord } from '../../../services/firestoreInspecoes';
import { observarExamesDaIS } from '../../../services/examesIS';
import { observarEntrevistas } from '../../../services/entrevistasIS';
import { observarEmailsDaIS } from '../../../services/historicoEmailsIS';
import { observarPareceresDaIS, type ParecerRecord } from '../../../services/firestorePareceres';
import { removerEventoAgendaIS } from '../../../services/agendaGoogleIS';
import { podeArrastarIS } from '../../../utils/calendarioIS';
import { aguardaAgendamento } from '../../../utils/inspecoes';
import { motivoNaoExcluir } from '../../../utils/exclusaoIS';
import { podeMinutarMsg } from '../../../utils/mensagensIS';
import type { AbaFicha, EstadoAbaFicha } from '../../../utils/fichaInspecionado';

type Definir = (m: Record<string, string | null>) => void;
type CriarPdf = 'exames' | 'atestados' | 'resposta';
const DESTINO_PDF: Record<CriarPdf, { aba: AbaFicha; rotulo: string }> = {
  exames: { aba: 'exames', rotulo: 'Exames' },
  atestados: { aba: 'atestados', rotulo: 'Atestados e Laudos' },
  resposta: { aba: 'pareceres', rotulo: 'Resposta de Parecer' },
};
interface Opcoes {
  is: InspecaoRecord;
  perfil: string | undefined;
  abas: Record<AbaFicha, EstadoAbaFicha>;
  definir: Definir;
  om?: string;
  vinculo?: string;
  feminino?: boolean;
  onAgendar: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const useAcoesISFicha = ({ is, perfil, abas, definir, om, vinculo, feminino, onAgendar, onAviso }: Opcoes) => {
  const [pareceres, setPareceres] = useState<ParecerRecord[]>([]);
  const [confirmarPdf, setConfirmarPdf] = useState<CriarPdf | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [minutando, setMinutando] = useState(false);
  useEffect(() => observarPareceresDaIS(is.id, setPareceres, () => setPareceres([])), [is.id]);
  // Atalhos "Ver …" só com registros da IS (transcrições/entrevistas, exames, e-mails).
  const [temTranscricoes, setTemTranscricoes] = useState(false);
  const [temExames, setTemExames] = useState(false);
  const [temEmails, setTemEmails] = useState(false);
  useEffect(() => observarEntrevistas(is.id, l => setTemTranscricoes(l.length > 0), () => setTemTranscricoes(false)), [is.id]);
  useEffect(() => observarExamesDaIS(is.id, l => setTemExames(l.length > 0), () => setTemExames(false)), [is.id]);
  useEffect(() => observarEmailsDaIS(is.id, l => setTemEmails(l.length > 0), () => setTemEmails(false)), [is.id]);

  const finalizada = is.situacao === 'finalizada';
  const habilitada = (a: AbaFicha) => abas[a].habilitada;
  const ir = (aba: AbaFicha, extra: Record<string, string | null> = {}) =>
    definir({ aba, reg: null, is: null, sel: null, guia: null, gravar: null, criar: null, ...extra });

  // Excluir: função inspecoes.excluir (Admin sempre), só IS não finalizada.
  const podeExcluir = !finalizada && !motivoNaoExcluir({ perfil, temFuncao: canUseFeature('inspecoes.excluir', perfil), situacao: is.situacao });
  // Agendar (Aberta/Realizando Exames) ou Reagendar (Faltou; Agendada que ainda dá para remarcar).
  const agendar = canUseFeature('inspecoes.agendar', perfil) && (aguardaAgendamento(is.status) || is.status === 'faltou' || podeArrastarIS(is));
  // Enviar PDF: com data de entrevista, IS não finalizada e Laudo ainda vazio.
  const parecerAberto = pareceres.some(p => p.status !== 'concluido');
  const itensPdf: ItemMenu[] = !is.dataEntrevista || finalizada || !!is.laudo?.trim() || !canUseFeature('inspecoes.enviarExames', perfil) ? [] : [
    ...(habilitada('exames') ? [{ rotulo: 'Exames', icone: 'lab_profile', onClick: () => setConfirmarPdf('exames' as const) }] : []),
    ...(habilitada('atestados') ? [{ rotulo: 'Atestados e Laudos', icone: 'note_alt', onClick: () => setConfirmarPdf('atestados' as const) }] : []),
    ...(parecerAberto && habilitada('pareceres') ? [{ rotulo: 'Resposta de Parecer', icone: 'assignment_turned_in', onClick: () => setConfirmarPdf('resposta' as const) }] : []),
  ];
  // Gerar Documento: Pedido de Parecer (IS não finalizada; função pareceres.gerar e a aba Pareceres) e os documentos do
  // registro (documentos/registro.tsx; finalizada → só Termo de Recurso e Laudo Pericial).
  const podePedido = !finalizada && canUseFeature('pareceres.gerar', perfil) && habilitada('pareceres');
  const docs = useGerarDocumentoIS(is, { perfil, om, vinculo }, onAviso);
  const itensDocumento: ItemMenu[] = [
    ...(podePedido ? [{ rotulo: 'Pedido de Parecer', icone: 'assignment_add', onClick: () => ir('pareceres', { criar: 'pedido', is: is.id }) }] : []),
    ...docs.itens,
  ];
  const minuta = podeMinutarMsg(is) && canUseFeature('inspecoes.gerarMinuta', perfil);

  const acoes: AcaoBarraFicha[] = [
    ...(podeExcluir ? [{ id: 'excluir', rotulo: 'Excluir', icone: 'delete', variante: 'destructive' as const, onClick: () => setExcluindo(true), loading: apagando }] : []),
    ...(agendar ? [{
      id: 'agendar', rotulo: aguardaAgendamento(is.status) && !is.dataEntrevista ? 'Agendar IS' : 'Reagendar IS', icone: 'event',
      variante: 'secondary' as const, onClick: () => onAgendar(is),
    }] : []),
    ...(minuta ? [{ id: 'minuta', rotulo: 'Minutar MSG', icone: 'mail', variante: 'secondary' as const, onClick: () => setMinutando(true) }] : []),
    ...(itensDocumento.length ? [{ id: 'documento', node: <MenuAcoes rotulo="Gerar Documento" botao={{ texto: 'Gerar Documento', icone: 'post_add' }} classeGatilho="w-full sm:w-auto" itens={itensDocumento} /> }] : []),
    ...(itensPdf.length ? [{ id: 'pdf', node: <MenuAcoes rotulo="Enviar PDF" botao={{ texto: 'Enviar PDF', icone: 'upload_file' }} classeGatilho="w-full sm:w-auto" itens={itensPdf} /> }] : []),
  ];

  // Atalhos para as abas dos documentos da IS (no lugar dos cards do drawer).
  const atalho = (aba: AbaFicha, rotulo: string, icone: string, extra: Record<string, string | null> = {}) =>
    habilitada(aba) ? <Button key={aba} variant="ghost" size="sm" icon={icone} onClick={() => ir(aba, extra)}>{rotulo}</Button> : null;
  const atalhos = (
    <nav aria-label="Documentos da IS" className="flex flex-wrap gap-1 empty:hidden">
      {temTranscricoes && atalho('transcricoes', 'Ver transcrições', 'record_voice_over')}
      {pareceres.length > 0 && atalho('pareceres', 'Ver pareceres', 'assignment')}
      {temExames && atalho('exames', 'Ver exames', 'lab_profile', { is: is.id })}
      {is.guiasExames && atalho('guias', 'Ver guias', 'receipt_long', { reg: is.id })}
      {temEmails && atalho('emails', 'Ver e-mails', 'mail')}
    </nav>
  );

  const excluir = async () => {
    setExcluindo(false);
    setApagando(true);
    try {
      if (is.eventoAgendaId) await removerEventoAgendaIS(is);
      await excluirInspecaoCompleta(is);
      definir({ reg: null, is: null });
      onAviso(`IS ${is.is} excluída.`);
    } catch (e: any) {
      onAviso(e?.message || 'Não foi possível excluir a IS.', 'error');
    } finally {
      setApagando(false);
    }
  };

  const dialogos = (
    <>
      {excluindo && (
        <ConfirmDialog
          title={`Excluir a IS ${is.is}?`}
          message="A IS e tudo o que é dela serão apagados: exames, entrevistas, e-mails e mensagens registradas, guias, pedidos de parecer vinculados, o horário reservado e o evento do Google Agenda. Esta ação não pode ser desfeita."
          confirmLabel="Excluir" destructive
          onConfirm={() => { void excluir(); }} onCancel={() => setExcluindo(false)}
        />
      )}
      {confirmarPdf && (
        <ConfirmDialog
          title={`Enviar PDF — ${DESTINO_PDF[confirmarPdf].rotulo}`}
          message={`Enviar PDF de ${DESTINO_PDF[confirmarPdf].rotulo.toLowerCase()} para a IS ${is.is}? O formulário abre na aba ${DESTINO_PDF[confirmarPdf].aba === 'pareceres' ? 'Pareceres' : DESTINO_PDF[confirmarPdf].rotulo}.`}
          confirmLabel="Continuar"
          onConfirm={() => { const c = confirmarPdf; setConfirmarPdf(null); ir(DESTINO_PDF[c].aba, { criar: c, is: is.id }); }}
          onCancel={() => setConfirmarPdf(null)}
        />
      )}
      {docs.dialogos}
      {minutando && (
        <MinutarMsgIS
          is={is} om={om} vinculo={vinculo} feminino={feminino} onAviso={onAviso} onClose={() => setMinutando(false)}
          onRegistrada={id => { setMinutando(false); ir('mensagens', { reg: id }); }}
        />
      )}
    </>
  );

  return { acoes, atalhos, dialogos };
};
