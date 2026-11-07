// Ficheiro: components/inspecoes/entrevista/ResultadoFalantes.tsx
// "Confirmar falantes": o Speech-to-Text separa as vozes em rótulos (F1, F2…) sem saber quem é
// quem. Para cada rótulo mostramos a primeira fala e um menu com os participantes, pré-selecionado
// pela sugestão da IA (`mapaFalantes`). Confirmar grava `mapaFalantes` + `falantesConfirmados`.
import React, { useMemo, useState } from 'react';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { ROTULO_PAPEL, type EntrevistaRecord } from '../../../config/entrevistas';
import { formatarTempo, mapaInicial, primeirasFalas } from '../../../utils/entrevistas';

interface Props {
  entrevista: EntrevistaRecord;
  salvando: boolean;
  onConfirmar: (mapa: Record<string, string>) => void;
  onCancelar?: () => void;
  onOuvir?: (seg: number) => void;
}

export const ResultadoFalantes: React.FC<Props> = ({ entrevista: e, salvando, onConfirmar, onCancelar, onOuvir }) => {
  const rotulos = useMemo(() => primeirasFalas(e.transcricao), [e.transcricao]);
  const [mapa, setMapa] = useState<Record<string, string>>(() => mapaInicial(e.transcricao, e.participantes, e.mapaFalantes));

  if (rotulos.length === 0) return null;

  const enviar = (ev: React.FormEvent) => {
    ev.preventDefault();
    // Rótulo sem nome escolhido não entra no mapa (aparece como "Falante n").
    onConfirmar(Object.fromEntries(Object.entries(mapa).filter(([, nome]) => nome)));
  };

  return (
    <section aria-labelledby="titulo-falantes" className="rounded-xl border border-gold bg-gold/10 p-4 space-y-3">
      <div>
        <h3 id="titulo-falantes" className="font-heading font-bold text-h3 text-navy">Confirmar falantes</h3>
        <p className="text-xs text-ink-3 mt-1">
          A transcrição separou {rotulos.length} {rotulos.length === 1 ? 'voz' : 'vozes'}. Indique quem é quem pela primeira fala de cada uma;
          os nomes passam a valer na transcrição e nas citações.
        </p>
      </div>
      <form onSubmit={enviar} className="space-y-3">
        {rotulos.map(({ rotulo, fala }) => (
          <div key={rotulo} className="rounded-lg bg-white border border-line p-3 space-y-2">
            <p className="text-xs text-ink-3">
              <span className="font-bold text-navy">{rotulo}</span>
              {' · primeira fala em '}
              {onOuvir ? (
                <button type="button" onClick={() => onOuvir(fala.inicioSeg)} className="font-mono font-bold text-navy underline min-h-[24px]" aria-label={`Ouvir a partir de ${formatarTempo(fala.inicioSeg)}`}>
                  {formatarTempo(fala.inicioSeg)}
                </button>
              ) : <span className="font-mono">{formatarTempo(fala.inicioSeg)}</span>}
            </p>
            <blockquote className="text-sm text-ink border-l-2 border-line pl-3 italic">“{fala.texto}”</blockquote>
            <Field label={`Quem é ${rotulo}?`}>
              {a => (
                <select {...a} value={mapa[rotulo] ?? ''} onChange={ev => setMapa(m => ({ ...m, [rotulo]: ev.target.value }))}>
                  <option value="">Não identificado</option>
                  {e.participantes.map(p => <option key={p.nome} value={p.nome}>{p.nome} ({ROTULO_PAPEL[p.papel] ?? p.papel})</option>)}
                </select>
              )}
            </Field>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 justify-end">
          {onCancelar && <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>}
          <Button type="submit" icon="how_to_reg" loading={salvando}>Confirmar</Button>
        </div>
      </form>
    </section>
  );
};
