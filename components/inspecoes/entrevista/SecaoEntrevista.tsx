// Ficheiro: components/inspecoes/entrevista/SecaoEntrevista.tsx
// Cards "Entrevista Gravada" da Conclusão da IS (só Admin e user_medicos — quem monta decide com
// `podeUsarEntrevista`): um card compacto por entrevista (data, sem hora), que abre o resultado; some
// quando não há entrevista. A gravação é pedida pelo botão "Gravar Entrevista" do rodapé do detalhe
// (estado `gravacao` no pai): no celular abre o fluxo de gravação; no computador, o envio por
// notificação para o celular. Pela rota /inspecoes/:isId/entrevista (o push leva a ela), o fluxo abre
// sozinho uma vez. Enquanto montada, avança o processamento da entrevista em andamento
// (useAcompanharEntrevista). Entrevista criada cujo áudio não foi enviado aparece como "Não enviada" e,
// se a gravação ainda estiver neste aparelho (IndexedDB), oferece "Reenviar".
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { matchPath, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { FluxoGravacaoEntrevista } from './FluxoGravacaoEntrevista';
import { EnviarParaCelularDialog } from './EnviarParaCelularDialog';
import { ResultadoEntrevista } from './ResultadoEntrevista';
import { observarEntrevistas, useAcompanharEntrevista } from '../../../services/entrevistasIS';
import { listarPendentes } from '../../../services/gravacaoLocal';
import { podeGravarNoDispositivo } from '../../../utils/dispositivo';
import type { EntrevistaRecord } from '../../../config/entrevistas';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { dataHoraEntrevista, entrevistaEmAndamento, naoEnviada, rotuloSituacao } from '../../../utils/entrevistas';

export type PedidoGravacao = 'fluxo' | 'celular' | null;

interface Props {
  is: InspecaoRecord;
  /** Gravação pedida pelo rodapé do detalhe (ou aberta pela rota do push). */
  gravacao: PedidoGravacao;
  onGravacao: (g: PedidoGravacao) => void;
}

const ROTA_GRAVAR = '/inspecoes/:isId/entrevista';

/** Card compacto (não ocupa a largura toda): título e, abaixo, a data em menor destaque. */
export const cardConclusaoClass = 'inline-flex items-center gap-2 rounded-lg border border-line bg-white hover:bg-thead px-3 py-2 min-h-[44px] text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold';

/** Pedido do rodapé "Gravar Entrevista": grava no aparelho que tem microfone; senão, envia para o celular. */
export const pedidoDeGravacao = (): PedidoGravacao => (podeGravarNoDispositivo() ? 'fluxo' : 'celular');

export const SecaoEntrevista: React.FC<Props> = ({ is, gravacao, onGravacao }) => {
  const [lista, setLista] = useState<EntrevistaRecord[] | null>(null);
  const [erro, setErro] = useState('');
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const gravando = gravacao === 'fluxo';
  const podeGravar = podeGravarNoDispositivo();
  const podeIniciar = is.status !== 'cancelada' && is.status !== 'tis_assinado';

  useEffect(() => {
    setLista(null);
    setErro('');
    return observarEntrevistas(is.id, setLista, () => setErro('Entrevistas indisponíveis.'));
  }, [is.id]);

  // Gravações deste aparelho ainda não enviadas (relidas quando a lista muda ou o fluxo fecha).
  const [pendentesLocais, setPendentesLocais] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (gravando) return;
    let vivo = true;
    listarPendentes(is.id)
      .then(l => { if (vivo) setPendentesLocais(new Set(l.map(g => g.entrevistaId))); })
      .catch(() => { if (vivo) setPendentesLocais(new Set()); });
    return () => { vivo = false; };
  }, [is.id, lista, gravando]);

  const emAndamento = lista ? entrevistaEmAndamento<EntrevistaRecord>(lista) : null;
  useAcompanharEntrevista(is.id, emAndamento);

  // Aberto pelo push (rota /inspecoes/:isId/entrevista) num celular que grava: abre o fluxo uma vez.
  const params = useParams<{ isId?: string }>();
  const { pathname } = useLocation();
  const autoAberto = useRef(false);
  const isIdDaRota = params.isId ?? matchPath(ROTA_GRAVAR, pathname)?.params.isId;
  const rotaDeGravacao = /\/entrevista\/?$/.test(pathname) && isIdDaRota === is.id;
  useEffect(() => {
    if (autoAberto.current || !rotaDeGravacao || !podeGravar || !podeIniciar) return;
    autoAberto.current = true;
    onGravacao('fluxo');
  }, [rotaDeGravacao, podeGravar, podeIniciar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sem áudio enviado não há resultado a mostrar.
  const aberta = abertaId ? lista?.find(x => x.id === abertaId && !naoEnviada(x)) ?? null : null;
  const dataCurta = (en: EntrevistaRecord) => dataHoraEntrevista(en.criadoPor?.em).slice(0, 10);

  return (
    <>
      {erro && <p role="alert" className="w-full text-xs font-semibold text-wine">{erro}</p>}
      {(lista ?? []).map(en => naoEnviada(en) ? (
        <span key={en.id} className={`${cardConclusaoClass} hover:bg-white`}>
          <span className="material-symbols-outlined text-[20px] text-ink-4 shrink-0" aria-hidden="true">cloud_off</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">Entrevista Gravada</span>
            <span className="block text-xs text-ink-3">{dataCurta(en)} · não enviada</span>
          </span>
          {pendentesLocais.has(en.id) && podeGravar && (
            <Button variant="ghost" icon="cloud_upload" onClick={() => onGravacao('fluxo')}>Reenviar</Button>
          )}
        </span>
      ) : (
        <button key={en.id} type="button" onClick={() => setAbertaId(en.id)} className={cardConclusaoClass}>
          <span className="material-symbols-outlined text-[20px] text-navy shrink-0" aria-hidden="true">record_voice_over</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-navy">Entrevista Gravada</span>
            <span className="block text-xs text-ink-3">{dataCurta(en)}{en.situacao !== 'pronta' ? ` · ${rotuloSituacao(en.situacao).toLowerCase()}` : ''}</span>
          </span>
        </button>
      ))}

      {/* Portais: o detalhe da IS é um Drawer que se move com transform (bottom sheet arrastável). */}
      {aberta && <ResultadoEntrevista is={is} entrevista={aberta} onClose={() => setAbertaId(null)} />}
      {gravando && createPortal(
        <FluxoGravacaoEntrevista
          is={is}
          onClose={() => onGravacao(null)}
          onConcluido={id => { onGravacao(null); setAbertaId(id); }}
        />,
        document.body,
      )}
      {gravacao === 'celular' && createPortal(<EnviarParaCelularDialog isId={is.id} onClose={() => onGravacao(null)} />, document.body)}
    </>
  );
};
