// Ficheiro: components/inspecoes/entrevista/FluxoGravacaoEntrevista.tsx
// Fluxo completo, em tela cheia no celular, da gravação da entrevista da IS (contrato em
// config/entrevistas.ts):
//   1. Preparação — participantes, finalidade, consentimento; cria o documento no Firestore
//      (`inspecoes/{isId}/entrevistas/{id}`, situação "aguardando_envio");
//   2. Gravação — MediaRecorder, pedaços de 5 s guardados no aparelho (IndexedDB);
//   3. Envio — Storage direto ou reserva pelo servidor, depois /api/entrevistas/processar;
//   4. Enviado — a transcrição segue no servidor; o perito pode fechar.
// Gravações desta IS que ficaram no aparelho sem envio aparecem no passo 1 com "Reenviar".
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/Dialog';
import { useNav } from '../../../context/NavContext';
import { useEscapeEmpilhado } from '../../../hooks/useEscapeEmpilhado';
import { extrairNomeInspecionado } from '../../../utils/format';
import { podeUsarEntrevista } from '../../../config/entrevistas';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { criarEntrevista } from '../../../services/entrevistasIS';
import { apagarGravacaoLocal, listarPendentes, type GravacaoLocal } from '../../../services/gravacaoLocal';
import { GravacaoPreparacao, type DadosPreparacao } from './GravacaoPreparacao';
import { GravacaoGravador } from './GravacaoGravador';
import { GravacaoEnvio } from './GravacaoEnvio';
import { GravacaoPendencias } from './GravacaoPendencias';

type Etapa =
  | { tipo: 'preparacao' }
  | { tipo: 'gravacao'; entrevistaId: string }
  | { tipo: 'envio'; entrevistaId: string }
  | { tipo: 'enviado'; entrevistaId: string };

const TITULO_ETAPA: Record<Etapa['tipo'], string> = {
  preparacao: 'Preparar a gravação',
  gravacao: 'Gravação da entrevista',
  envio: 'Enviando a gravação',
  enviado: 'Gravação enviada',
};

interface Props {
  is: InspecaoRecord;
  onClose: () => void;
  onConcluido: (entrevistaId: string) => void;
}

export const FluxoGravacaoEntrevista: React.FC<Props> = ({ is, onClose, onConcluido }) => {
  const nav = useNav();
  const usuario = nav?.authUser ?? null;
  const tituloId = useId();
  const painel = useRef<HTMLDivElement>(null);

  const [etapa, setEtapa] = useState<Etapa>({ tipo: 'preparacao' });
  const [salvando, setSalvando] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);
  const [pendentes, setPendentes] = useState<GravacaoLocal[]>([]);
  const [descartando, setDescartando] = useState<GravacaoLocal | null>(null);
  const [gravandoAgora, setGravandoAgora] = useState(false);
  const [pedidoSaida, setPedidoSaida] = useState(0);

  const nomeInspecionado = extrairNomeInspecionado(is.inspecionado);
  const rotulo = `IS ${is.is}${nomeInspecionado ? ` — ${nomeInspecionado}` : ''}`;

  const carregarPendentes = useCallback(() => {
    listarPendentes(is.id).then(setPendentes).catch(() => setPendentes([]));
  }, [is.id]);
  useEffect(() => { carregarPendentes(); }, [carregarPendentes]);

  useEffect(() => { painel.current?.focus(); }, [etapa.tipo]);

  const fechar = useCallback(() => {
    // Durante a gravação, o gravador confirma antes de sair (e guarda o que foi gravado).
    if (etapa.tipo === 'gravacao' && gravandoAgora) { setPedidoSaida(n => n + 1); return; }
    // Durante o envio, o fluxo só fecha pelos botões da própria etapa (falha → "Enviar depois").
    if (etapa.tipo === 'envio') return;
    onClose();
  }, [etapa.tipo, gravandoAgora, onClose]);
  useEscapeEmpilhado(fechar, !descartando);

  const avancar = async (dados: DadosPreparacao) => {
    if (!usuario) return;
    setSalvando(true);
    setErroCriar(null);
    try {
      const entrevistaId = await criarEntrevista(is.id, dados, { uid: usuario.uid, nome: usuario.usuario || usuario.nome });
      setEtapa({ tipo: 'gravacao', entrevistaId });
    } catch (e: any) {
      setErroCriar(e?.code === 'permission-denied'
        ? 'Sem permissão para gravar entrevistas desta IS.'
        : 'Não foi possível registrar a entrevista. Verifique a conexão e tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const enviado = useCallback((entrevistaId: string) => {
    setEtapa({ tipo: 'enviado', entrevistaId });
    onConcluido(entrevistaId);
  }, [onConcluido]);

  const descartar = async () => {
    const g = descartando;
    setDescartando(null);
    if (!g) return;
    await apagarGravacaoLocal(g.entrevistaId).catch(() => {});
    carregarPendentes();
  };

  const semPermissao = !usuario || !podeUsarEntrevista(usuario.perfil);
  const inicial: DadosPreparacao = {
    participantes: [
      { nome: usuario?.usuario || usuario?.nome || '', papel: 'perito' },
      { nome: nomeInspecionado, papel: 'inspecionado' },
    ],
    finalidade: is.finalidade || '',
  };

  return (
    <div
      ref={painel} role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1}
      className="fixed inset-0 z-dialog bg-canvas flex flex-col focus:outline-none animate-fade-in"
    >
      <header className="shrink-0 bg-navy text-white px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-[20px] text-gold shrink-0" aria-hidden="true">mic</span>
          <div className="min-w-0">
            <h2 id={tituloId} className="font-heading font-bold text-base text-white truncate">{TITULO_ETAPA[etapa.tipo]}</h2>
            <p className="text-xs text-white/80 truncate">{rotulo}</p>
          </div>
        </div>
        {etapa.tipo !== 'envio' && (
          <button
            type="button" onClick={fechar} aria-label="Fechar"
            className="shrink-0 w-11 h-11 -mr-2 flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        )}
      </header>

      {semPermissao ? (
        <div className="flex-1 px-4 py-8 text-center text-sm text-ink-3">
          A gravação de entrevistas é restrita aos membros da junta (Médicos JRS e Admin).
        </div>
      ) : etapa.tipo === 'preparacao' ? (
        <>
          <GravacaoPendencias
            pendentes={pendentes}
            onReenviar={entrevistaId => setEtapa({ tipo: 'envio', entrevistaId })}
            onDescartar={setDescartando}
          />
          <GravacaoPreparacao inicial={inicial} salvando={salvando} erroEnvio={erroCriar} onAvancar={avancar} />
        </>
      ) : etapa.tipo === 'gravacao' ? (
        <GravacaoGravador
          isId={is.id} entrevistaId={etapa.entrevistaId} rotulo={rotulo}
          onEncerrada={() => setEtapa({ tipo: 'envio', entrevistaId: etapa.entrevistaId })}
          onSair={onClose}
          onEmCurso={setGravandoAgora}
          pedirSaida={pedidoSaida}
        />
      ) : etapa.tipo === 'envio' ? (
        <GravacaoEnvio
          entrevistaId={etapa.entrevistaId}
          onEnviado={() => enviado(etapa.entrevistaId)}
          onDepois={onClose}
        />
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-10 flex flex-col items-center text-center gap-3" role="status">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-green-700" aria-hidden="true">check_circle</span>
            </div>
            <h3 className="font-heading font-bold text-h2 text-navy">Enviado</h3>
            <p className="text-sm text-ink max-w-md">
              A transcrição leva alguns minutos; você pode fechar. O resultado aparece na seção de entrevista desta IS,
              no celular ou no computador.
            </p>
          </div>
          <div className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button fullWidth icon="done" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      )}

      {descartando && (
        <ConfirmDialog
          title="Descartar a gravação?"
          message="O áudio guardado neste aparelho será apagado e não poderá ser recuperado."
          confirmLabel="Descartar"
          destructive
          onConfirm={descartar}
          onCancel={() => setDescartando(null)}
        />
      )}
    </div>
  );
};
