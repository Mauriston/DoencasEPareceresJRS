// Ficheiro: components/ficha/inspecoes/useMenuISHistorico.tsx
// Menu ⋮ de cada item do histórico da aba Inspeções de Saúde da Ficha do inspecionado (painel de apoio). Reúne as
// ações que ficavam na barra inferior do painel principal, com as mesmas regras de exibição:
//  - "Reabrir IS": IS concluída (TIS assinado); função inspecoes.editar e (função inspecoes.reabrir ou quem concluiu);
//  - "Agendar IS"/"Reagendar IS": função inspecoes.agendar; Aberta/Realizando Exames, Faltou ou Agendada que ainda dá
//    para remarcar (as regras do menu da página Inspeções de Saúde);
//  - "Excluir" (perigo): função inspecoes.excluir, só IS não finalizada; a exclusão é completa, no servidor
//    (excluirInspecaoCompleta — POST /api/inspecoes/excluir), com confirmação.
// Competência: user_medicos só nas IS de JRS e user_medicos_mpi só nas de MPI (sem competência, sem menu).
import React, { useState } from 'react';
import { ConfirmDialog } from '../../ui/Dialog';
import type { ItemMenu } from '../../ui/MenuAcoes';
import { canUseFeature } from '../../../config/permissions';
import { atualizarInspecao, excluirInspecaoCompleta, type InspecaoRecord } from '../../../services/firestoreInspecoes';
import { removerEventoAgendaIS } from '../../../services/agendaGoogleIS';
import { registrarEventoInspecionado } from '../../../services/eventosInspecionado';
import { podeArrastarIS } from '../../../utils/calendarioIS';
import { aguardaAgendamento } from '../../../utils/inspecoes';
import { motivoNaoExcluir } from '../../../utils/exclusaoIS';
import { perfilCompetenteIS } from '../../../utils/documentosIS';
import { patchReabrirIS, podeReabrirIS } from '../../../utils/conclusaoIS';

interface Opcoes {
  perfil: string | undefined;
  uid: string | undefined;
  onAgendar: (is: InspecaoRecord) => void;
  /** Depois de reabrir (sincroniza o Google Agenda). */
  onSituacaoMudou: (is: InspecaoRecord) => void;
  /** Depois de excluir (limpa o registro aberto se era esta IS). */
  onExcluida: (is: InspecaoRecord) => void;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

export const useMenuISHistorico = ({ perfil, uid, onAgendar, onSituacaoMudou, onExcluida, onAviso }: Opcoes) => {
  const [excluindo, setExcluindo] = useState<InspecaoRecord | null>(null);

  const reabrir = async (is: InspecaoRecord) => {
    const patch = patchReabrirIS(is);
    if (!patch) return;
    try {
      await atualizarInspecao(is.id, patch as never);
      onAviso(`IS ${is.is} reaberta.`);
      if (is.inspecionadoId) registrarEventoInspecionado(is.inspecionadoId, 'is.reabrir', `IS ${is.id}`);
      if (is.dataEntrevista) onSituacaoMudou({ ...is, ...patch } as InspecaoRecord);
    } catch (e: any) {
      onAviso(e?.message || 'Não foi possível reabrir a IS.', 'error');
    }
  };

  const excluir = async (is: InspecaoRecord) => {
    setExcluindo(null);
    try {
      if (is.eventoAgendaId) await removerEventoAgendaIS(is);
      await excluirInspecaoCompleta(is);
      onExcluida(is);
      onAviso(`IS ${is.is} excluída.`);
    } catch (e: any) {
      onAviso(e?.message || 'Não foi possível excluir a IS.', 'error');
    }
  };

  const menuDe = (is: InspecaoRecord): ItemMenu[] => {
    if (!perfilCompetenteIS(perfil, is.amp)) return [];
    const reabrivel = canUseFeature('inspecoes.editar', perfil) && podeReabrirIS(is, uid, canUseFeature('inspecoes.reabrir', perfil));
    const agendar = canUseFeature('inspecoes.agendar', perfil) && (aguardaAgendamento(is.status) || is.status === 'faltou' || podeArrastarIS(is));
    const podeExcluir = is.situacao !== 'finalizada' && !motivoNaoExcluir({ perfil, temFuncao: canUseFeature('inspecoes.excluir', perfil), situacao: is.situacao });
    return [
      ...(reabrivel ? [{ rotulo: 'Reabrir IS', icone: 'lock_open', onClick: () => { void reabrir(is); } }] : []),
      ...(agendar ? [{
        rotulo: aguardaAgendamento(is.status) && !is.dataEntrevista ? 'Agendar IS' : 'Reagendar IS', icone: 'event', onClick: () => onAgendar(is),
      }] : []),
      ...(podeExcluir ? [{ rotulo: 'Excluir', icone: 'delete', perigo: true, onClick: () => setExcluindo(is) }] : []),
    ];
  };

  const dialogos = excluindo && (
    <ConfirmDialog
      title={`Excluir a IS ${excluindo.is}?`}
      message="A IS e tudo o que é dela serão apagados: exames, entrevistas, e-mails e mensagens registradas, guias, pedidos de parecer vinculados, o horário reservado e o evento do Google Agenda. Esta ação não pode ser desfeita."
      confirmLabel="Excluir" destructive
      onConfirm={() => { void excluir(excluindo); }} onCancel={() => setExcluindo(null)}
    />
  );
  return { menuDe, dialogos };
};
