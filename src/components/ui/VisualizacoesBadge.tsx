// Ficheiro: components/ui/VisualizacoesBadge.tsx
// Selo "olho + total de visualizações" dos cards de Vídeos e Infográficos (só o Admin vê).
// Passar o mouse (ou focar/tocar) abre a lista de quem visualizou, com quantas vezes e quando.
import React, { useEffect, useRef, useState } from 'react';
import type { VisualizacaoExtra } from '@/services/firestoreExtras';

const quando = (v: VisualizacaoExtra) =>
  v.ultimaEm?.toDate?.().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) ?? '';

export const VisualizacoesBadge: React.FC<{ lista: VisualizacaoExtra[]; className?: string }> = ({ lista, className = '' }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const total = lista.reduce((n, v) => n + (v.vezes || 0), 0);

  // No toque (sem hover), o clique abre/fecha; tocar fora fecha.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  if (total === 0) return null;
  const rotulo = `${total} visualizaç${total !== 1 ? 'ões' : 'ão'} por ${lista.length} pessoa${lista.length !== 1 ? 's' : ''}`;

  return (
    <div
      ref={raiz}
      className={`group/vis relative ${className}`}
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
    >
      <button
        type="button"
        aria-label={rotulo}
        aria-expanded={aberto}
        onClick={e => { e.stopPropagation(); setAberto(a => !a); }}
        onFocus={() => setAberto(true)}
        onBlur={() => setAberto(false)}
        className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded-full bg-black/55 text-white text-xs font-bold hover:bg-black/75 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">visibility</span>
        {total}
      </button>
      {aberto && (
        <div role="tooltip" className="absolute left-0 top-full mt-1 z-30 w-64 max-w-[80vw] bg-white border border-line rounded-lg shadow-xl text-left">
          <p className="px-3 pt-2 pb-1 text-xs font-bold text-navy">{rotulo}</p>
          <ul className="max-h-56 overflow-y-auto divide-y divide-line">
            {lista.map(v => (
              <li key={v.id} className="flex items-baseline justify-between gap-2 px-3 py-1.5">
                <span className="min-w-0 truncate text-xs font-semibold text-ink">{v.nome}</span>
                <span className="shrink-0 text-[11px] text-ink-3">{v.vezes > 1 ? `${v.vezes}× · ` : ''}{quando(v)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
