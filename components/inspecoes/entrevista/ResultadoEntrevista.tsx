// Ficheiro: components/inspecoes/entrevista/ResultadoEntrevista.tsx
// Resultado de uma entrevista gravada da IS (Dialog largo no computador, tela cheia no celular).
// Título "IS nº — inspecionado". Enquanto o servidor transcreve/organiza, as etapas de andamento;
// em erro, a mensagem e "Tentar novamente". Pronta: abas "Anamnese organizada" (com "Copiar" no fim)
// e "Transcrição íntegra" (com o áudio no fim). Os falantes seguem o `mapaFalantes` sugerido pela IA.
// O documento vem ao vivo do pai (observarEntrevistas).
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { Segmented } from '../../ui/Segmented';
import { Toast } from '../../ui/Toast';
import { ResultadoPainel } from './ResultadoPainel';
import { ResultadoAnamnese } from './ResultadoAnamnese';
import { ResultadoTranscricao } from './ResultadoTranscricao';
import { ResultadoAudio } from './ResultadoAudio';
import { useIsDesktop } from '../../../hooks/useIsDesktop';
import { consultarSituacao, ouvirAudio, processarEntrevista, reorganizarEntrevista } from '../../../services/entrevistasIS';
import type { EntrevistaRecord } from '../../../config/entrevistas';
import type { InspecaoRecord } from '../../../services/firestoreInspecoes';
import { hojeISO } from '../../../utils/inspecoes';
import { anamneseEfetiva, dataHoraEntrevista, textoAnamnese } from '../../../utils/entrevistas';

interface Props {
  is: InspecaoRecord;
  entrevista: EntrevistaRecord;
  onClose: () => void;
}

type Aba = 'anamnese' | 'transcricao';

const ETAPAS: { id: EntrevistaRecord['situacao']; rotulo: string }[] = [
  { id: 'aguardando_envio', rotulo: 'Envio do áudio' },
  { id: 'transcrevendo', rotulo: 'Transcrição com separação de falantes' },
  { id: 'organizando', rotulo: 'Organização da anamnese' },
];

const msgErro = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

export const ResultadoEntrevista: React.FC<Props> = ({ is, entrevista: e, onClose }) => {
  const isDesktop = useIsDesktop();
  const [aba, setAba] = useState<Aba>('anamnese');
  const [tentando, setTentando] = useState(false);
  const [aviso, setAviso] = useState<{ msg: string; tom: 'success' | 'error' } | null>(null);

  // Áudio: carregado sob demanda (blob: URL), revogado ao fechar. O player fica na aba Transcrição.
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioCarregando, setAudioCarregando] = useState(false);
  const [audioErro, setAudioErro] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const irPara = useRef<number | null>(null);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 3500);
    return () => window.clearTimeout(t);
  }, [aviso]);
  // Assim que o <audio> existe (carregou ou a aba Transcrição abriu), vai ao trecho pedido.
  useEffect(() => {
    const el = audioRef.current;
    if (!audioUrl || !el || irPara.current === null) return;
    el.currentTime = irPara.current;
    irPara.current = null;
    el.play().catch(() => { /* o navegador pode exigir um toque no play */ });
  }, [audioUrl, aba]);

  const isId = e.isId || is.id;
  const temAudio = !!e.audio && !(e.audio.apagarApos && e.audio.apagarApos <= hojeISO());

  const carregarAudio = async () => {
    setAudioCarregando(true);
    setAudioErro('');
    try {
      const blob = await ouvirAudio(isId, e.id);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err) {
      irPara.current = null;
      setAudioErro(msgErro(err, 'Não foi possível carregar o áudio.'));
    } finally {
      setAudioCarregando(false);
    }
  };

  // Tempo clicado (anamnese ou transcrição): abre a aba Transcrição (onde está o player) e toca o trecho.
  const ouvir = (seg: number) => {
    const el = audioRef.current;
    if (audioUrl && el && aba === 'transcricao') {
      el.currentTime = seg;
      el.play().catch(() => undefined);
      return;
    }
    irPara.current = seg;
    setAba('transcricao');
    if (!audioUrl && !audioCarregando) void carregarAudio();
  };

  const tentarNovamente = async () => {
    setTentando(true);
    try {
      await (
        e.transcricao?.length ? reorganizarEntrevista(isId, e.id)
          // Sem transcrição em erro: refaz do começo com o áudio que já está no servidor (caminho vazio = o servidor localiza).
          : e.situacao === 'erro' ? processarEntrevista(isId, e.id, e.audio?.caminho ?? '', e.audio?.mimeType ?? '', e.audio?.duracaoSeg ?? 0)
            : consultarSituacao(isId, e.id)
      );
      setAviso({ msg: 'Processamento retomado.', tom: 'success' });
    } catch (err) {
      setAviso({ msg: msgErro(err, 'Não foi possível concluir. Tente de novo.'), tom: 'error' });
    } finally {
      setTentando(false);
    }
  };

  const anamnese = anamneseEfetiva(e);
  const copiar = async () => {
    if (!anamnese) return;
    const cabecalho = `ANAMNESE — IS ${is.is}${e.finalidade ? ` — ${e.finalidade}` : ''}\nEntrevista de ${dataHoraEntrevista(e.criadoPor?.em)}`;
    try {
      await navigator.clipboard.writeText(textoAnamnese(anamnese, { finalidade: e.finalidade, mapaFalantes: e.mapaFalantes, cabecalho }));
      setAviso({ msg: 'Anamnese copiada.', tom: 'success' });
    } catch {
      setAviso({ msg: 'O navegador não permitiu copiar. Selecione o texto e copie manualmente.', tom: 'error' });
    }
  };

  const etapaAtual = ETAPAS.findIndex(x => x.id === e.situacao);
  const onOuvir = temAudio ? ouvir : undefined;

  return (
    <ResultadoPainel
      title={`IS ${is.is}${is.inspecionado ? ` — ${is.inspecionado}` : ''}`}
      icon="record_voice_over"
      onClose={onClose}
    >
      <Toast message={aviso?.msg ?? null} tone={aviso?.tom} />
      <div className="space-y-5">
        {/* Em andamento */}
        {etapaAtual >= 0 && (
          <section aria-live="polite" className="rounded-xl border border-line bg-paper p-4 space-y-3">
            <p className="font-bold text-navy flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] animate-spin" aria-hidden="true">progress_activity</span>
              {e.situacao === 'aguardando_envio' ? 'Aguardando o envio do áudio…' : e.situacao === 'transcrevendo' ? 'Transcrevendo…' : 'Organizando…'}
            </p>
            <ol className="space-y-1.5">
              {ETAPAS.map((et, i) => {
                const feita = i < etapaAtual;
                const atual = i === etapaAtual;
                return (
                  <li key={et.id} className={`flex items-center gap-2 text-sm ${atual ? 'font-bold text-navy' : feita ? 'text-ink' : 'text-ink-4'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${feita ? 'text-green' : ''}`} aria-hidden="true">{feita ? 'check_circle' : atual ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                    {et.rotulo}{feita ? ' — concluída' : atual ? ' — em andamento' : ''}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Erro */}
        {e.situacao === 'erro' && (
          <section role="alert" className="rounded-xl border border-wine/30 bg-wine/10 p-4 space-y-2">
            <p className="font-bold text-wine flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">error</span>
              Não foi possível concluir o processamento.
            </p>
            <p className="text-sm text-ink">{e.erro || 'Erro desconhecido.'}</p>
            <Button icon="refresh" loading={tentando} onClick={tentarNovamente}>Tentar novamente</Button>
          </section>
        )}

        {/* Pronta */}
        {e.situacao === 'pronta' && (
          <>
            <Segmented<Aba>
              ariaLabel="Conteúdo da entrevista"
              value={aba}
              onChange={setAba}
              fullWidth
              options={[
                { value: 'anamnese', label: isDesktop ? 'Anamnese organizada' : 'Anamnese' },
                { value: 'transcricao', label: isDesktop ? 'Transcrição íntegra' : 'Transcrição' },
              ]}
            />
            {aba === 'anamnese' ? (
              anamnese ? (
                <>
                  <ResultadoAnamnese anamnese={anamnese} finalidade={e.finalidade} mapaFalantes={e.mapaFalantes} onOuvir={onOuvir} />
                  <div className="flex justify-end">
                    <Button variant="secondary" icon="content_copy" onClick={copiar}>Copiar</Button>
                  </div>
                </>
              ) : <p className="text-sm text-ink-3">A anamnese ainda não foi organizada.</p>
            ) : (
              <>
                <ResultadoTranscricao falas={e.transcricao} mapaFalantes={e.mapaFalantes} onOuvir={onOuvir} />
                {temAudio && (
                  <ResultadoAudio url={audioUrl} carregando={audioCarregando} erro={audioErro} onCarregar={carregarAudio} audioRef={audioRef} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </ResultadoPainel>
  );
};
