// Ficheiro: components/inspecoes/guias/GuiasExamesCard.tsx
// Bloco "Guias de exames" no detalhe da IS (InspecaoDetalhe → cards da Conclusão). Só para a equipe (Admin,
// médicos JRS/MPI e Secretaria — quem lê o PDF em storage.rules) e só nas finalidades com exames mínimos:
//  - card "Guias de exames" (páginas e exames por grupo): o clique abre o PDF em nova aba (services/abrirPdf)
//    (Storage inspecoes/{isId}/guias/guias-exames.pdf);
//  - caixa única "Guias entregues ao inspecionado?": marcar grava a entrega presencial de hoje e Aberta →
//    Realizando Exames; desmarcar desfaz. Entregue por e-mail: marcada, "por e-mail em dd/mm/aaaa" (só leitura);
//  - botão de baixa ênfase "Enviar por e-mail" / "Reenviar por e-mail" (EnviarGuiasDialog);
//  - sem guias (geração falhou, IS antiga): "Gerar guias" (GerarGuiasDialog);
//  - IS finalizada cujas guias já foram apagadas pelo servidor: "Guias apagadas 15 dias após a finalização".
// Marcar a entrega e enviar e-mail: Admin e Secretaria (inspecoes.enviarEmails); gerar: quem cadastra IS.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../ui/Button';
import { abrirPdf as abrirPdfNovaAba } from '../../../services/abrirPdf';
import { cardConclusaoClass } from '../entrevista/SecaoEntrevista';
import { useNav } from '../../../context/NavContext';
import { canUseFeature } from '../../../config/permissions';
import { registrarEntregaGuias, type InspecaoRecord } from '../../../services/firestoreInspecoes';
import { observarMilitar, type MilitarRecord } from '../../../services/firestoreMilitares';
import { emailDoInspecionado } from '../../../services/emailResultadoIS';
import { caminhoGuiasExames, urlDasGuias } from '../../../services/guiasExames';
import { finalidadeTemExamesMinimos } from '../../../utils/guiasExames';
import {
  casarFinalidadeAnexoO, entregaEditavel, rotuloEmailGuias, situacaoGuias, textoEntregaGuias, type EstadoEntregaGuias,
} from '../../../utils/guiasExamesIS';
import { hojeISO } from '../../../utils/inspecoes';
import { GerarGuiasDialog } from './GerarGuiasDialog';
import { EnviarGuiasDialog } from './EnviarGuiasDialog';

const PERFIS_EQUIPE = ['admin', 'user_medicos', 'user_medicos_mpi', 'user_secretaria'];

interface Props {
  is: InspecaoRecord;
  onAviso: (msg: string, tom?: 'success' | 'error') => void;
}

const dataDoTimestamp = (t: unknown): string => {
  const d = (t as { toDate?: () => Date } | null)?.toDate?.();
  return d ? d.toLocaleDateString('pt-BR') : '';
};

export const GuiasExamesCard: React.FC<Props> = ({ is, onAviso }) => {
  const nav = useNav();
  const usuario = nav?.authUser;
  const perfil = usuario?.perfil;
  const ehEquipe = !!perfil && PERFIS_EQUIPE.includes(perfil);
  const podeEnviar = canUseFeature('inspecoes.enviarEmails', perfil);
  const podeGerar = ehEquipe && canUseFeature('inspecoes.cadastrar', perfil);

  const temExames = (() => { const f = casarFinalidadeAnexoO(is.finalidade); return !!f && finalidadeTemExamesMinimos(f); })();
  const situacao = situacaoGuias(is, temExames);
  const visivel = ehEquipe && situacao !== 'nao_se_aplica';

  // Cadastro do inspecionado (e-mail, sexo e nascimento) só quando o bloco aparece.
  const [militar, setMilitar] = useState<MilitarRecord | null>(null);
  useEffect(() => {
    if (!visivel || situacao === 'apagadas' || !is.inspecionadoId) return;
    return observarMilitar(is.inspecionadoId, setMilitar, () => setMilitar(null));
  }, [visivel, situacao, is.inspecionadoId]);

  // Caixa de entrega: reflete o clique na hora (o banco confirma pelo onSnapshot).
  const [entregaLocal, setEntregaLocal] = useState<EstadoEntregaGuias | null>(null);
  useEffect(() => { setEntregaLocal(null); }, [is.guiasEntregues, is.guiasEntreguesVia, is.guiasEntreguesEm]);
  const entrega: EstadoEntregaGuias = entregaLocal ?? is;
  const [salvandoEntrega, setSalvandoEntrega] = useState(false);

  const [abrindo, setAbrindo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [gerando, setGerando] = useState(false);

  if (!visivel) return null;

  if (situacao === 'apagadas') {
    return (
      <p className="w-full flex items-center gap-2 text-xs text-ink-3">
        <span className="material-symbols-outlined text-[18px] text-ink-4" aria-hidden="true">auto_delete</span>
        Guias apagadas 15 dias após a finalização.
      </p>
    );
  }

  const abrirPdf = async () => {
    setAbrindo(true);
    try { await abrirPdfNovaAba(() => urlDasGuias(is.guiasExames?.caminho || caminhoGuiasExames(is.id))); }
    catch { onAviso('Não foi possível abrir as guias.', 'error'); }
    finally { setAbrindo(false); }
  };

  const mudarEntrega = async (marcar: boolean) => {
    if (!usuario) return;
    const antes = entrega;
    setEntregaLocal(marcar
      ? { ...antes, guiasEntregues: true, guiasEntreguesEm: hojeISO(), guiasEntreguesVia: 'presencial', guiasEntreguesPor: usuario.usuario }
      : { ...antes, guiasEntregues: false, guiasEntreguesEm: '', guiasEntreguesVia: undefined, guiasEntreguesPor: '' });
    setSalvandoEntrega(true);
    try {
      await registrarEntregaGuias(is, marcar, usuario.usuario, hojeISO());
      onAviso(marcar ? `IS ${is.is}: guias entregues.${is.status === 'aberta' ? ' Status: Realizando Exames.' : ''}` : `IS ${is.is}: entrega das guias desfeita.`);
    } catch (e: any) {
      setEntregaLocal(null);
      onAviso(e?.message || 'Não foi possível registrar a entrega.', 'error');
    } finally {
      setSalvandoEntrega(false);
    }
  };

  const guias = is.guiasExames;
  const totalExames = guias?.grupos.reduce((n, g) => n + g.exames.length, 0) ?? 0;
  const geradoEm = dataDoTimestamp(guias?.geradoEm);
  const editavel = podeEnviar && entregaEditavel({ ...entrega, situacao: is.situacao }) && !salvandoEntrega;
  const complemento = textoEntregaGuias(entrega);
  const ativa = is.situacao !== 'finalizada';

  return (
    <section aria-label="Guias de exames" className="w-full space-y-2">
      {guias ? (
        <>
          <button type="button" onClick={() => { void abrirPdf(); }} disabled={abrindo} aria-busy={abrindo || undefined} className={cardConclusaoClass}>
            <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">lab_profile</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-navy">Guias de exames</span>
              <span className="block text-xs text-ink-3">
                {abrindo ? 'Abrindo…' : [`${guias.paginas} pág.`, `${totalExames} exame${totalExames !== 1 ? 's' : ''}`, geradoEm].filter(Boolean).join(' · ')}
              </span>
            </span>
          </button>
          {guias.grupos.length > 0 && (
            <dl className="space-y-1 text-xs">
              {guias.grupos.map(g => (
                <div key={g.grupo} className="flex flex-wrap gap-x-1">
                  <dt className="font-bold text-ink">{g.grupo}:</dt>
                  <dd className="text-ink-3 min-w-0 break-words">{g.exames.join(', ')}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <label className={`flex items-center gap-3 min-h-[44px] ${editavel ? 'cursor-pointer' : 'cursor-default'}`}>
              <input
                type="checkbox" className="w-5 h-5 shrink-0 accent-navy" checked={!!entrega.guiasEntregues} disabled={!editavel}
                onChange={e => { void mudarEntrega(e.target.checked); }}
              />
              <span className="text-sm">
                <span className="font-semibold text-ink">Guias entregues ao inspecionado?</span>
                {complemento && <span className="block text-xs text-ink-3">{complemento}</span>}
              </span>
            </label>
            {podeEnviar && ativa && (
              <Button variant="ghost" size="sm" icon="forward_to_inbox" onClick={() => setEnviando(true)}>{rotuloEmailGuias(!!is.emailGuiasEnviadoEm)}</Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`${cardConclusaoClass} hover:bg-white`}>
            <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">lab_profile</span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-navy">Guias de exames</span>
              <span className="block text-xs text-ink-3">Ainda não geradas</span>
            </span>
          </span>
          {podeGerar && <Button variant="secondary" size="sm" icon="lab_profile" onClick={() => setGerando(true)}>Gerar guias</Button>}
        </div>
      )}


      {enviando && createPortal(
        <EnviarGuiasDialog
          inspecao={is} emailCadastrado={emailDoInspecionado(militar ?? undefined)}
          onClose={() => setEnviando(false)}
          onEnviado={msg => { setEnviando(false); onAviso(msg); }}
        />,
        document.body,
      )}

      {gerando && createPortal(
        <GerarGuiasDialog
          is={is} militar={militar}
          onClose={() => setGerando(false)}
          onConcluido={r => { setGerando(false); onAviso(r.gerado ? `Guias de exames da IS ${is.is} geradas.` : r.motivo || 'Esta IS não tem guias de exames.', r.gerado ? 'success' : 'error'); }}
        />,
        document.body,
      )}
    </section>
  );
};
