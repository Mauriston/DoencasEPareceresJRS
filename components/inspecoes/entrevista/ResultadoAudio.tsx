// Ficheiro: components/inspecoes/entrevista/ResultadoAudio.tsx
// Player do áudio da entrevista. O áudio não tem URL pública (storage.rules nega leitura): vem do
// servidor (`ouvirAudio` → Blob) e toca por um blob: URL, carregado só quando o perito pede.
// O pai controla o elemento <audio> por ref para "ir ao trecho" (tempos clicáveis).
import React from 'react';
import { Button } from '../../ui/Button';
import { dataIsoBr } from '../../../utils/entrevistas';

interface Props {
  url: string | null;
  carregando: boolean;
  erro: string;
  apagarApos?: string;
  /** O prazo de retenção passou: o áudio já foi (ou está sendo) apagado do Storage. */
  apagado: boolean;
  onCarregar: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const ResultadoAudio: React.FC<Props> = ({ url, carregando, erro, apagarApos, apagado, onCarregar, audioRef }) => (
  <section aria-label="Áudio da entrevista" className="rounded-xl border border-line bg-paper p-3 space-y-2">
    {apagado && !url ? (
      <p className="text-xs text-ink-3 flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">delete_history</span>
        O áudio foi apagado em {dataIsoBr(apagarApos)} (retenção de 90 dias); a transcrição e a anamnese continuam na IS.
      </p>
    ) : url ? (
      <audio ref={audioRef} src={url} controls preload="metadata" className="w-full">
        Seu navegador não toca este áudio.
      </audio>
    ) : (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" icon="headphones" loading={carregando} onClick={onCarregar}>Carregar áudio</Button>
        <span className="text-xs text-ink-3">Os tempos da transcrição e da anamnese levam ao trecho.</span>
      </div>
    )}
    {erro && <p role="alert" className="text-xs font-semibold text-wine">{erro}</p>}
    {apagarApos && !apagado && (
      <p className="text-xs text-ink-3 flex items-center gap-1">
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">schedule</span>
        O áudio é apagado em {dataIsoBr(apagarApos)}; a transcrição e a anamnese continuam na IS.
      </p>
    )}
  </section>
);
