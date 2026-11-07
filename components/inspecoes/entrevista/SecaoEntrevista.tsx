// Ficheiro: components/inspecoes/entrevista/SecaoEntrevista.tsx
// Seção "Entrevista gravada" do detalhe da IS (só Admin e user_medicos — quem monta decide com
// `podeUsarEntrevista`). Lista as entrevistas da IS (todas, de qualquer perito da junta), abre o
// resultado de cada uma e oferece a gravação: no celular, "Gravar entrevista"; no computador,
// "Gravar pelo celular" (QR para abrir esta IS no celular). Pela rota /inspecoes/:isId/entrevista
// (o QR leva a ela), o fluxo de gravação abre sozinho uma vez. Enquanto montada, avança o
// processamento da entrevista em andamento (useAcompanharEntrevista). Entrevista criada cujo áudio
// não foi enviado aparece como "Não enviada" (sem abrir o resultado) e, se a gravação ainda estiver
// neste aparelho (IndexedDB, services/gravacaoLocal.ts), oferece "Reenviar" (o fluxo lista as pendências).
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { matchPath, useLocation, useParams } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { StatusTag } from '../../ui/StatusTag';
import { FluxoGravacaoEntrevista } from './FluxoGravacaoEntrevista';
import { AbrirNoCelularDialog } from './AbrirNoCelularDialog';
import { ResultadoEntrevista } from './ResultadoEntrevista';
import { observarEntrevistas, useAcompanharEntrevista } from '../../../services/entrevistasIS';
import { listarPendentes } from '../../../services/gravacaoLocal';
import { podeGravarNoDispositivo } from '../../../utils/dispositivo';
import type { EntrevistaRecord } from '../../../config/entrevistas';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { dataHoraEntrevista, entrevistaEmAndamento, formatarDuracao, naoEnviada, rotuloSituacao, tomSituacao } from '../../../utils/entrevistas';

interface Props {
  is: InspecaoRecord;
}

const ROTA_GRAVAR = '/inspecoes/:isId/entrevista';

export const SecaoEntrevista: React.FC<Props> = ({ is }) => {
  const [lista, setLista] = useState<EntrevistaRecord[] | null>(null);
  const [erro, setErro] = useState('');
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);
  const [qrAberto, setQrAberto] = useState(false);
  const podeGravar = podeGravarNoDispositivo();
  const podeIniciar = is.status !== 'cancelada';

  useEffect(() => {
    setLista(null);
    setErro('');
    return observarEntrevistas(is.id, setLista, () => setErro('Não foi possível carregar as entrevistas desta IS.'));
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

  // Aberto pelo QR (rota /inspecoes/:isId/entrevista) num celular que grava: abre o fluxo uma vez.
  const params = useParams<{ isId?: string }>();
  const { pathname } = useLocation();
  const autoAberto = useRef(false);
  const isIdDaRota = params.isId ?? matchPath(ROTA_GRAVAR, pathname)?.params.isId;
  const rotaDeGravacao = /\/entrevista\/?$/.test(pathname) && isIdDaRota === is.id;
  useEffect(() => {
    if (autoAberto.current || !rotaDeGravacao || !podeGravar || !podeIniciar) return;
    autoAberto.current = true;
    setGravando(true);
  }, [rotaDeGravacao, podeGravar, podeIniciar]);

  // Sem áudio enviado não há resultado a mostrar.
  const aberta = abertaId ? lista?.find(x => x.id === abertaId && !naoEnviada(x)) ?? null : null;

  return (
    <section aria-labelledby={`titulo-entrevista-${is.id}`} className="space-y-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`titulo-entrevista-${is.id}`} className="text-xs font-bold uppercase tracking-wide text-ink-3">Entrevista gravada</h3>
        {podeIniciar && (podeGravar
          ? <Button icon="mic" onClick={() => setGravando(true)}>Gravar entrevista</Button>
          : <Button variant="secondary" icon="qr_code_2" onClick={() => setQrAberto(true)}>Gravar pelo celular</Button>)}
      </div>

      {erro ? (
        <p role="alert" className="text-sm font-semibold text-wine">{erro}</p>
      ) : lista === null ? (
        <p className="text-sm text-ink-3" aria-busy="true">Carregando entrevistas…</p>
      ) : lista.length === 0 ? (
        <p className="text-xs text-ink-3">Nenhuma entrevista gravada.</p>
      ) : (
        <ul className="space-y-2">
          {lista.map(en => naoEnviada(en) ? (
            <li key={en.id} className="rounded-lg border border-line bg-paper p-3 min-h-[44px] flex flex-wrap items-center gap-3">
              <span className="material-symbols-outlined text-[24px] text-ink-4 shrink-0" aria-hidden="true">cloud_off</span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-ink">{dataHoraEntrevista(en.criadoPor?.em) || 'Entrevista'}</span>
                <span className="block text-xs text-ink-3">
                  Gravada por {en.criadoPor?.nome || '—'}
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <StatusTag tone="neutral">Não enviada</StatusTag>
                {pendentesLocais.has(en.id) && podeGravar && (
                  <Button variant="secondary" icon="cloud_upload" onClick={() => setGravando(true)}>Reenviar</Button>
                )}
              </span>
            </li>
          ) : (
            <li key={en.id}>
              <button
                type="button"
                onClick={() => setAbertaId(en.id)}
                className="w-full text-left rounded-lg border border-line bg-white hover:bg-thead p-3 min-h-[44px] flex items-center gap-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              >
                <span className="material-symbols-outlined text-[24px] text-navy shrink-0" aria-hidden="true">record_voice_over</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-navy">
                    {dataHoraEntrevista(en.criadoPor?.em) || 'Entrevista'}
                    {en.audio?.duracaoSeg ? <span className="font-normal text-ink-3"> · {formatarDuracao(en.audio.duracaoSeg)}</span> : null}
                  </span>
                  <span className="block text-xs text-ink-3 truncate">Gravada por {en.criadoPor?.nome || '—'}</span>
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <StatusTag tone={tomSituacao(en.situacao)}>{rotuloSituacao(en.situacao)}</StatusTag>
                  {en.revisada && <StatusTag tone="success" dot={false}>Revisada</StatusTag>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Portais: o detalhe da IS é um Drawer que se move com transform (bottom sheet arrastável). */}
      {aberta && <ResultadoEntrevista is={is} entrevista={aberta} onClose={() => setAbertaId(null)} />}
      {gravando && createPortal(
        <FluxoGravacaoEntrevista
          is={is}
          onClose={() => setGravando(false)}
          onConcluido={id => { setGravando(false); setAbertaId(id); }}
        />,
        document.body,
      )}
      {qrAberto && createPortal(<AbrirNoCelularDialog isId={is.id} aberto={qrAberto} onClose={() => setQrAberto(false)} />, document.body)}
    </section>
  );
};
