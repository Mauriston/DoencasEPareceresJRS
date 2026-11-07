// Ficheiro: components/inspecoes/entrevista/GravacaoEnvio.tsx
// Passo 3 do fluxo de gravação: envia o áudio guardado no aparelho (Storage direto ou, se a rede
// bloquear, a reserva pelo servidor), pede o processamento e mostra o progresso. Em caso de falha,
// a gravação continua no aparelho e pode ser reenviada agora ou depois.
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/Button';
import { enviarGravacao, type ProgressoEnvio } from '../../../services/entrevistasIS';

const ROTULO_ETAPA: Record<ProgressoEnvio['etapa'], string> = {
  preparando: 'Preparando o áudio…',
  storage: 'Enviando o áudio…',
  reserva: 'Enviando o áudio pelo servidor do app (rota alternativa)…',
  processando: 'Pedindo a transcrição…',
};

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

interface Props {
  entrevistaId: string;
  /** Servidor aceitou o processamento. */
  onEnviado: () => void;
  /** Deixar para depois (a gravação fica pendente no aparelho). */
  onDepois: () => void;
}

export const GravacaoEnvio: React.FC<Props> = ({ entrevistaId, onEnviado, onDepois }) => {
  const [progresso, setProgresso] = useState<ProgressoEnvio>({ etapa: 'preparando', enviados: 0, total: 0 });
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const iniciada = useRef(-1);
  const aoEnviado = useRef(onEnviado);
  aoEnviado.current = onEnviado;

  useEffect(() => {
    // StrictMode monta os efeitos duas vezes: o envio de cada tentativa sai uma vez só.
    if (iniciada.current === tentativa) return;
    iniciada.current = tentativa;
    setErro(null);
    enviarGravacao(entrevistaId, setProgresso)
      .then(() => aoEnviado.current())
      .catch((e: any) => {
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        setErro(offline ? 'O celular está sem internet. A gravação continua guardada neste aparelho.' : (e?.message || 'Não foi possível enviar a gravação.'));
      });
  }, [entrevistaId, tentativa]);

  const pct = progresso.total > 0 ? Math.round((progresso.enviados / progresso.total) * 100) : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center text-center gap-4">
        {erro ? (
          <>
            <div className="w-14 h-14 rounded-full bg-wine/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-wine" aria-hidden="true">cloud_off</span>
            </div>
            <h3 className="font-heading font-bold text-h3 text-navy">O envio não foi concluído</h3>
            <p role="alert" className="text-sm text-wine font-semibold max-w-md">{erro}</p>
            <p className="text-sm text-ink-3 max-w-md">
              Nada foi perdido: a gravação está guardada neste aparelho. Tente de novo agora ou, mais tarde, abra a
              gravação desta IS neste mesmo celular e toque em “Reenviar”.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-thead flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px] text-navy animate-pulse" aria-hidden="true">cloud_upload</span>
            </div>
            <h3 className="font-heading font-bold text-h3 text-navy" aria-live="polite">{ROTULO_ETAPA[progresso.etapa]}</h3>
            <div className="w-full max-w-sm">
              <div
                className="h-3 rounded-full bg-thead overflow-hidden border border-line" role="progressbar"
                aria-label="Progresso do envio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct ?? undefined}
                aria-valuetext={pct !== null ? `${pct}%` : ROTULO_ETAPA[progresso.etapa]}
              >
                <div
                  className={`h-full rounded-full bg-navy transition-all duration-300 ${pct === null ? 'w-1/3 animate-pulse' : ''}`}
                  style={pct !== null ? { width: `${pct}%` } : undefined}
                />
              </div>
              {pct !== null && <p className="text-xs text-ink-3 mt-1 tabular-nums">{pct}% · {mb(progresso.enviados)} de {mb(progresso.total)}</p>}
            </div>
            <p className="text-sm text-ink-3 max-w-md">Mantenha o app aberto até o fim do envio.</p>
          </>
        )}
      </div>
      {erro && (
        <div className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
          <Button fullWidth icon="refresh" onClick={() => setTentativa(t => t + 1)}>Tentar de novo</Button>
          <Button fullWidth variant="secondary" onClick={onDepois}>Enviar depois</Button>
        </div>
      )}
    </div>
  );
};
