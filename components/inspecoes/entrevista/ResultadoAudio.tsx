// Ficheiro: components/inspecoes/entrevista/ResultadoAudio.tsx
// Áudio da entrevista, no fim da aba Transcrição. O áudio não tem URL pública (storage.rules nega
// leitura): vem do servidor (`ouvirAudio` → Blob) e toca por um blob: URL, carregado só quando o
// perito pede. O pai controla o <audio> por ref para "ir ao trecho" (tempos clicáveis) e só monta
// este componente enquanto o áudio existe no servidor.
import React from 'react';
import { Button } from '../../ui/Button';

interface Props {
  url: string | null;
  carregando: boolean;
  erro: string;
  onCarregar: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const ResultadoAudio: React.FC<Props> = ({ url, carregando, erro, onCarregar, audioRef }) => (
  <section aria-label="Áudio da entrevista" className="space-y-2">
    {url ? (
      <audio ref={audioRef} src={url} controls preload="metadata" className="w-full">
        Seu navegador não toca este áudio.
      </audio>
    ) : (
      <Button variant="secondary" icon="headphones" loading={carregando} onClick={onCarregar}>Carregar áudio</Button>
    )}
    {erro && <p role="alert" className="text-xs font-semibold text-wine">{erro}</p>}
  </section>
);
