// Ficheiro: components/inspecoes/entrevista/ResultadoTranscricao.tsx
// Transcrição íntegra: nome do falante (pelo mapaFalantes), tempo mm:ss (leva ao trecho do áudio)
// e o texto, com busca simples (ignora maiúsculas e acentos).
import React, { useMemo, useState } from 'react';
import { Field } from '../../ui/Field';
import { EmptyState } from '../../ui/EmptyState';
import type { FalaTranscrita } from '../../../config/entrevistas';
import { aplicarMapaFalantes, filtrarTranscricao, formatarTempo } from '../../../utils/entrevistas';

interface Props {
  falas: FalaTranscrita[] | undefined;
  mapaFalantes?: Record<string, string>;
  onOuvir?: (seg: number) => void;
}

export const ResultadoTranscricao: React.FC<Props> = ({ falas, mapaFalantes, onOuvir }) => {
  const [busca, setBusca] = useState('');
  const comNome = useMemo(() => aplicarMapaFalantes(falas, mapaFalantes), [falas, mapaFalantes]);
  const visiveis = useMemo(() => filtrarTranscricao(comNome, busca), [comNome, busca]);

  if (comNome.length === 0) return <EmptyState icon="subtitles_off" title="Sem transcrição" description="O áudio não teve fala reconhecida." />;

  return (
    <div className="space-y-3">
      <Field label="Buscar na transcrição" help={busca.trim() ? `${visiveis.length} de ${comNome.length} falas` : undefined}>
        {a => <input {...a} type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Palavra ou nome do falante" autoComplete="off" />}
      </Field>
      {visiveis.length === 0 ? (
        <p className="text-sm text-ink-3">Nenhuma fala com “{busca.trim()}”.</p>
      ) : (
        <ol className="space-y-2" aria-label="Falas da entrevista">
          {visiveis.map((f, i) => (
            <li key={`${f.inicioSeg}-${i}`} className="rounded-lg bg-paper border border-line p-2.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-navy">{f.nome}</span>
                {onOuvir ? (
                  <button type="button" onClick={() => onOuvir(f.inicioSeg)} className="font-mono font-bold text-navy underline min-h-[24px]" aria-label={`Ouvir a partir de ${formatarTempo(f.inicioSeg)}`}>
                    {formatarTempo(f.inicioSeg)}
                  </button>
                ) : <span className="font-mono text-ink-3">{formatarTempo(f.inicioSeg)}</span>}
              </div>
              <p className="text-sm text-ink mt-0.5 whitespace-pre-line">{f.texto}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
