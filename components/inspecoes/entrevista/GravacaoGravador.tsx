// Ficheiro: components/inspecoes/entrevista/GravacaoGravador.tsx
// Passo 2 do fluxo de gravação da entrevista da IS (no celular): MediaRecorder com pedaços de 5 s
// guardados no aparelho (IndexedDB — services/gravacaoLocal.ts), tela sempre acesa (Wake Lock),
// cronômetro, medidor de nível, pausar/retomar e encerramento com confirmação. Se a trilha do
// microfone for interrompida (ex.: ligação), a gravação pausa sozinha e avisa.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/Dialog';
import { MAX_DURACAO_SEG } from '../../../config/entrevistas';
import { atualizarGravacaoLocal, iniciarGravacaoLocal, salvarPedaco, pedirArmazenamentoPersistente } from '../../../services/gravacaoLocal';

/** Ordem de preferência: Opus (Android/Chrome/Firefox) e AAC em MP4 (iPhone/Safari). */
const TIPOS_PREFERIDOS = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
const PEDACO_MS = 5_000;
/** Voz falada: 32 kbps dão boa transcrição e ~14 MB por hora. */
const BITS_POR_SEG = 32_000;

const escolherMimeType = (): string | undefined => {
  const MR = (window as any).MediaRecorder as typeof MediaRecorder | undefined;
  if (!MR || typeof MR.isTypeSupported !== 'function') return undefined;
  return TIPOS_PREFERIDOS.find(t => { try { return MR.isTypeSupported(t); } catch { return false; } });
};

const extensaoDoMime = (mime: string): string => {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mp4') || mime.includes('aac') || mime.includes('m4a')) return 'mp4';
  return 'webm';
};

export const formatarDuracao = (seg: number): string => {
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
};

type EstadoGravador = 'pronto' | 'iniciando' | 'gravando' | 'pausado' | 'encerrando';

interface WakeLockSentinelLike { release: () => Promise<void>; released?: boolean }

interface Props {
  isId: string;
  entrevistaId: string;
  /** "IS 1234 — Fulano" (identifica a pendência no aparelho). */
  rotulo: string;
  /** Gravação encerrada e guardada no aparelho: segue para o envio. */
  onEncerrada: () => void;
  /** Saiu sem enviar (o que foi gravado fica pendente no aparelho). */
  onSair: () => void;
  /** Avisa o fluxo se há gravação em curso (para confirmar antes de fechar). */
  onEmCurso?: (emCurso: boolean) => void;
  /** Pedido de fechar vindo do fluxo (botão Fechar/Esc) enquanto grava. */
  pedirSaida?: number;
}

export const GravacaoGravador: React.FC<Props> = ({ isId, entrevistaId, rotulo, onEncerrada, onSair, onEmCurso, pedirSaida }) => {
  const [estado, setEstado] = useState<EstadoGravador>('pronto');
  const [segundos, setSegundos] = useState(0);
  const [nivel, setNivel] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [trilhaEncerrada, setTrilhaEncerrada] = useState(false);
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false);
  const [confirmarSair, setConfirmarSair] = useState(false);
  const [semWakeLock, setSemWakeLock] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);
  const filaRef = useRef<Promise<void>>(Promise.resolve());
  const seqRef = useRef(0);
  const segRef = useRef(0);
  const marcoRef = useRef<number | null>(null);
  const estadoRef = useRef<EstadoGravador>('pronto');
  const paradoRef = useRef<Promise<void> | null>(null);
  const encerrarRef = useRef<(motivo?: string) => void>(() => {});

  const mudarEstado = (e: EstadoGravador) => { estadoRef.current = e; setEstado(e); };
  const emCurso = estado === 'gravando' || estado === 'pausado' || estado === 'iniciando';
  useEffect(() => { onEmCurso?.(emCurso); }, [emCurso, onEmCurso]);

  // ---------------------------------------------------------------- tela acesa
  const pedirWakeLock = useCallback(async () => {
    const wl = (navigator as any).wakeLock;
    if (!wl?.request) { setSemWakeLock(true); return; }
    try {
      if (wakeRef.current && !wakeRef.current.released) return;
      wakeRef.current = await wl.request('screen');
      setSemWakeLock(false);
    } catch { setSemWakeLock(true); }
  }, []);
  const soltarWakeLock = () => { wakeRef.current?.release().catch(() => {}); wakeRef.current = null; };

  // ---------------------------------------------------------------- cronômetro
  const acumular = () => {
    if (marcoRef.current !== null) {
      const agora = performance.now();
      segRef.current += (agora - marcoRef.current) / 1000;
      marcoRef.current = agora;
    }
  };
  useEffect(() => {
    if (estado !== 'gravando') return;
    marcoRef.current = performance.now();
    const id = window.setInterval(() => {
      acumular();
      setSegundos(segRef.current);
      if (segRef.current >= MAX_DURACAO_SEG) encerrarRef.current(`A gravação chegou ao limite de ${MAX_DURACAO_SEG / 60} minutos e foi encerrada.`);
    }, 250);
    return () => { window.clearInterval(id); acumular(); marcoRef.current = null; };
  }, [estado]);

  // ---------------------------------------------------------------- medidor de nível
  const iniciarMedidor = (stream: MediaStream) => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = new Ctx();
      ctxRef.current = ctx;
      const analisador = ctx.createAnalyser();
      analisador.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analisador);
      const dados = new Uint8Array(analisador.fftSize);
      let ultimo = 0;
      const passo = (t: number) => {
        rafRef.current = requestAnimationFrame(passo);
        if (t - ultimo < 100) return;
        ultimo = t;
        analisador.getByteTimeDomainData(dados);
        let soma = 0;
        for (let i = 0; i < dados.length; i++) { const v = (dados[i] - 128) / 128; soma += v * v; }
        const rms = Math.sqrt(soma / dados.length);
        setNivel(estadoRef.current === 'gravando' ? Math.min(1, rms * 4) : 0);
      };
      rafRef.current = requestAnimationFrame(passo);
    } catch { /* sem medidor: a gravação segue */ }
  };

  const liberarRecursos = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach(t => { t.onended = null; t.onmute = null; t.onunmute = null; t.stop(); });
    streamRef.current = null;
    soltarWakeLock();
  };

  // ---------------------------------------------------------------- controles
  const pausar = (motivo?: string) => {
    const rec = recRef.current;
    if (rec && rec.state === 'recording') {
      try { rec.requestData(); } catch { /* sem suporte */ }
      try { rec.pause(); } catch { /* já parado */ }
    }
    if (estadoRef.current === 'gravando') mudarEstado('pausado');
    if (motivo) setAviso(motivo);
  };

  const retomar = async () => {
    const rec = recRef.current;
    if (!rec || rec.state === 'inactive' || trilhaEncerrada) return;
    await ctxRef.current?.resume().catch(() => {});
    try { rec.resume(); } catch { return; }
    setAviso(null);
    mudarEstado('gravando');
    pedirWakeLock();
  };

  const iniciar = async () => {
    setErro(null);
    setAviso(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof (window as any).MediaRecorder !== 'function') {
      setErro('Este navegador não grava áudio. Use Chrome (Android) ou Safari (iPhone) atualizados.');
      return;
    }
    mudarEstado('iniciando');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (e: any) {
      mudarEstado('pronto');
      setErro(e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
        ? 'Microfone bloqueado. Libere-o nas configurações do navegador e tente de novo.'
        : e?.name === 'NotFoundError' ? 'Nenhum microfone foi encontrado neste aparelho.' : 'Não foi possível acessar o microfone.');
      return;
    }
    streamRef.current = stream;
    const tipo = escolherMimeType();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, tipo ? { mimeType: tipo, audioBitsPerSecond: BITS_POR_SEG } : { audioBitsPerSecond: BITS_POR_SEG });
    } catch {
      try { rec = new MediaRecorder(stream); } catch {
        liberarRecursos();
        mudarEstado('pronto');
        setErro('Este navegador não consegue gravar áudio neste formato.');
        return;
      }
    }
    recRef.current = rec;

    let fimDaGravacao: () => void = () => {};
    paradoRef.current = new Promise<void>(r => { fimDaGravacao = r; });
    rec.ondataavailable = ev => {
      if (!ev.data || ev.data.size === 0) return;
      const seq = seqRef.current++;
      filaRef.current = filaRef.current
        .then(() => salvarPedaco(entrevistaId, seq, ev.data, segRef.current))
        .catch(() => setAviso('Falha ao guardar parte do áudio. Encerre e envie o quanto antes.'));
    };
    rec.onstop = () => fimDaGravacao();
    rec.onerror = () => { pausar('Erro no gravador. Encerre e envie o que foi gravado.'); };

    const trilha = stream.getAudioTracks()[0];
    if (trilha) {
      trilha.onended = () => {
        setTrilhaEncerrada(true);
        pausar('Microfone desligado pelo aparelho. Toque em "Encerrar e enviar".');
      };
      trilha.onmute = () => {
        if (estadoRef.current === 'gravando') pausar('Microfone interrompido; gravação pausada. Toque em "Retomar" quando puder.');
      };
      trilha.onunmute = () => {
        if (estadoRef.current === 'pausado') setAviso('O microfone voltou. Toque em "Retomar".');
      };
    }

    try {
      rec.start(PEDACO_MS);
    } catch {
      liberarRecursos();
      mudarEstado('pronto');
      setErro('Não foi possível iniciar a gravação.');
      return;
    }
    // O Safari só preenche rec.mimeType depois do start.
    const mimeBase = ((rec.mimeType || tipo || 'audio/webm').split(';')[0] || 'audio/webm').trim();
    filaRef.current = iniciarGravacaoLocal({ entrevistaId, isId, rotulo, mimeType: mimeBase, ext: extensaoDoMime(mimeBase) })
      .catch(() => setErro('Não foi possível guardar a gravação neste aparelho (modo anônimo?).'));
    pedirArmazenamentoPersistente();
    iniciarMedidor(stream);
    mudarEstado('gravando');
    pedirWakeLock();
  };

  /** Para o gravador, espera os pedaços serem guardados e marca a gravação como finalizada. */
  const finalizar = async () => {
    mudarEstado('encerrando');
    acumular();
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch { /* já parado */ }
    }
    if (rec) await Promise.race([paradoRef.current, new Promise(r => setTimeout(r, 4_000))]);
    await filaRef.current;
    await atualizarGravacaoLocal(entrevistaId, { finalizada: true, duracaoSeg: Math.round(segRef.current) }).catch(() => {});
    liberarRecursos();
    setSegundos(segRef.current);
  };

  const encerrarEEnviar = async (motivo?: string) => {
    if (estadoRef.current === 'encerrando') return;
    setConfirmarEncerrar(false);
    if (motivo) setAviso(motivo);
    await finalizar();
    onEncerrada();
  };
  encerrarRef.current = motivo => { void encerrarEEnviar(motivo); };

  const sair = async () => {
    setConfirmarSair(false);
    if (recRef.current) await finalizar();
    onSair();
  };

  // Pedido de fechar vindo do cabeçalho do fluxo.
  const pedidoAnterior = useRef(pedirSaida);
  useEffect(() => {
    if (pedirSaida === pedidoAnterior.current) return;
    pedidoAnterior.current = pedirSaida;
    if (estadoRef.current === 'pronto') onSair();
    else if (estadoRef.current !== 'encerrando') setConfirmarSair(true);
  }, [pedirSaida, onSair]);

  // Tela acesa de volta quando o app volta ao primeiro plano; aviso ao tentar fechar a aba.
  useEffect(() => {
    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && (estadoRef.current === 'gravando' || estadoRef.current === 'pausado')) pedirWakeLock();
    };
    const antesDeSair = (e: BeforeUnloadEvent) => {
      if (estadoRef.current === 'gravando' || estadoRef.current === 'pausado') { e.preventDefault(); e.returnValue = ''; }
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('beforeunload', antesDeSair);
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('beforeunload', antesDeSair);
    };
  }, [pedirWakeLock]);

  // Desmontou no meio (ex.: navegação): para o gravador; o que foi gravado fica pendente no aparelho.
  useEffect(() => () => {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch { /* já parado */ } }
    liberarRecursos();
  }, []);

  // ---------------------------------------------------------------- tela
  const gravando = estado === 'gravando';
  const restante = Math.max(0, MAX_DURACAO_SEG - segundos);
  const rotuloEstado = estado === 'gravando' ? 'Gravando' : estado === 'pausado' ? 'Pausada' : estado === 'iniciando' ? 'Abrindo o microfone…' : estado === 'encerrando' ? 'Encerrando…' : 'Pronto para gravar';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="bg-gold/20 text-gold-ink border-b border-gold/40 px-4 py-2.5 flex items-center gap-2 text-sm font-bold" role="note">
        <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">screen_lock_portrait</span>
        Não saia do app nem bloqueie a tela durante a gravação.
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col items-center text-center gap-4">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-ink" aria-live="polite">
          <span aria-hidden="true" className={`w-3 h-3 rounded-full ${gravando ? 'bg-wine animate-pulse' : estado === 'pausado' ? 'bg-gold' : 'bg-ink-5'}`} />
          {rotuloEstado}
        </p>

        <p className="font-heading font-extrabold text-5xl tabular-nums text-navy" role="timer" aria-label={`Tempo gravado: ${formatarDuracao(segundos)}`}>
          {formatarDuracao(segundos)}
        </p>
        <p className="text-xs text-ink-3 -mt-2">Limite: {MAX_DURACAO_SEG / 60} min · restam {formatarDuracao(restante)}</p>

        <div className="w-full max-w-xs" aria-hidden="true">
          <div className="h-3 rounded-full bg-thead overflow-hidden border border-line">
            <div className={`h-full rounded-full transition-[width] duration-100 ${nivel > 0.85 ? 'bg-wine' : 'bg-green'}`} style={{ width: `${Math.round(nivel * 100)}%` }} />
          </div>
          <p className="text-xs text-ink-3 mt-1">Nível do microfone</p>
        </div>

        {aviso && (
          <div role="alert" className="w-full max-w-md rounded-xl border border-gold/50 bg-gold/10 text-gold-ink text-sm font-semibold px-3 py-2.5 flex items-start gap-2 text-left">
            <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">warning</span>
            <span>{aviso}</span>
          </div>
        )}
        {erro && (
          <div role="alert" className="w-full max-w-md rounded-xl border border-wine/40 bg-wine/10 text-wine text-sm font-semibold px-3 py-2.5 flex items-start gap-2 text-left">
            <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">error</span>
            <span>{erro}</span>
          </div>
        )}
        {semWakeLock && emCurso && (
          <p className="text-xs text-ink-3 max-w-md">Toque na tela de vez em quando para ela não apagar.</p>
        )}
      </div>

      {/* Zona do polegar: botão principal grande e "Encerrar e enviar" logo abaixo. */}
      <div className="shrink-0 border-t border-line bg-white px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
        {estado === 'pronto' || estado === 'iniciando' ? (
          <button
            type="button" onClick={iniciar} disabled={estado === 'iniciando'}
            className="w-24 h-24 rounded-full bg-wine text-white shadow-lg flex flex-col items-center justify-center gap-0.5 disabled:opacity-60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold"
            aria-label="Iniciar gravação"
          >
            <span className="material-symbols-outlined text-[40px]" aria-hidden="true">mic</span>
            <span className="text-xs font-bold">Gravar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => (gravando ? pausar() : retomar())}
            disabled={estado === 'encerrando' || (!gravando && trilhaEncerrada)}
            className={`w-24 h-24 rounded-full shadow-lg flex flex-col items-center justify-center gap-0.5 disabled:opacity-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-gold ${gravando ? 'bg-navy text-white' : 'bg-wine text-white'}`}
            aria-label={gravando ? 'Pausar gravação' : 'Retomar gravação'}
          >
            <span className="material-symbols-outlined text-[40px]" aria-hidden="true">{gravando ? 'pause' : 'mic'}</span>
            <span className="text-xs font-bold">{gravando ? 'Pausar' : 'Retomar'}</span>
          </button>
        )}
        <Button
          fullWidth icon="send" className="max-w-md"
          disabled={!(estado === 'gravando' || estado === 'pausado')}
          loading={estado === 'encerrando'}
          onClick={() => setConfirmarEncerrar(true)}
        >
          Encerrar e enviar
        </Button>
      </div>

      {confirmarEncerrar && (
        <ConfirmDialog
          title="Encerrar a gravação?"
          message={`A gravação (${formatarDuracao(segundos)}) será encerrada e enviada; não poderá ser continuada.`}
          confirmLabel="Encerrar e enviar"
          cancelLabel="Continuar gravando"
          onConfirm={() => encerrarEEnviar()}
          onCancel={() => setConfirmarEncerrar(false)}
        />
      )}
      {confirmarSair && (
        <ConfirmDialog
          title="Sair sem enviar?"
          message="O que já foi gravado fica neste aparelho para enviar depois."
          confirmLabel="Sair e enviar depois"
          cancelLabel="Continuar gravando"
          destructive
          onConfirm={sair}
          onCancel={() => setConfirmarSair(false)}
        />
      )}
    </div>
  );
};
