// Ficheiro: components/inspecoes/entrevista/GravacaoPendencias.tsx
// Gravações desta IS guardadas neste aparelho que ainda não foram aceitas pelo servidor (envio
// falhou, aba fechada no meio da gravação…): oferece "Reenviar" e "Descartar".
import React from 'react';
import { Button } from '../../ui/Button';
import { StatusTag } from '../../ui/StatusTag';
import type { GravacaoLocal } from '../../../services/gravacaoLocal';
import { formatarDuracao } from './GravacaoGravador';

const dataHora = (ms: number) =>
  new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

interface Props {
  pendentes: GravacaoLocal[];
  onReenviar: (entrevistaId: string) => void;
  onDescartar: (g: GravacaoLocal) => void;
}

export const GravacaoPendencias: React.FC<Props> = ({ pendentes, onReenviar, onDescartar }) => {
  if (pendentes.length === 0) return null;
  return (
    <section aria-labelledby="pendencias-titulo" className="mx-4 mt-4 rounded-xl border border-gold/50 bg-gold/10 p-3 space-y-3">
      <h3 id="pendencias-titulo" className="font-heading font-bold text-sm text-gold-ink flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">cloud_off</span>
        {pendentes.length === 1 ? 'Há uma gravação desta IS não enviada' : `Há ${pendentes.length} gravações desta IS não enviadas`}
      </h3>
      <ul className="space-y-2">
        {pendentes.map(g => (
          <li key={g.entrevistaId} className="rounded-lg bg-white border border-line p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-bold text-ink">{dataHora(g.criadaEm)}</span>
              <span className="text-ink-3 tabular-nums">{formatarDuracao(g.duracaoSeg)}</span>
              {g.caminhoEnviado
                ? <StatusTag tone="attention">Áudio enviado, falta processar</StatusTag>
                : !g.finalizada && <StatusTag tone="neutral">Interrompida</StatusTag>}
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" icon="cloud_upload" onClick={() => onReenviar(g.entrevistaId)}>Reenviar</Button>
              <Button className="flex-1" variant="destructive" icon="delete" onClick={() => onDescartar(g)}>Descartar</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
