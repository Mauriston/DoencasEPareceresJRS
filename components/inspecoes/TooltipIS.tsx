// Ficheiro: components/inspecoes/TooltipIS.tsx
// Rich tooltip (padrão Material 3) do calendário de IS: cartão pequeno, com um subtítulo e os dados um
// por linha (rótulo curto + valor). Fica junto ao evento (abaixo; acima se não couber), sem sair da
// tela, e não captura o ponteiro — não atrapalha clique nem arraste. Aparece com o mouse sobre o evento
// e com o foco por teclado; em toque não aparece (o toque abre o detalhe direto).
import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface LinhaTooltip { rotulo: string; valor: string }

interface Props {
  id: string;
  /** Retângulo do evento na tela (getBoundingClientRect). */
  alvo: DOMRect;
  titulo?: string;
  linhas: LinhaTooltip[];
}

const MARGEM = 8;
const ESPACO = 6;

export const TooltipIS: React.FC<Props> = ({ id, alvo, titulo, linhas }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const vw = window.innerWidth; const vh = window.innerHeight;
    const left = Math.min(Math.max(MARGEM, alvo.left), Math.max(MARGEM, vw - width - MARGEM));
    const abaixo = alvo.bottom + ESPACO;
    const acima = alvo.top - ESPACO - height;
    const top = abaixo + height <= vh - MARGEM || acima < MARGEM ? Math.min(abaixo, Math.max(MARGEM, vh - height - MARGEM)) : acima;
    setPos({ left, top });
  }, [alvo]);

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className="fixed z-dropdown pointer-events-none w-max max-w-[18rem] bg-white text-ink border border-line rounded-lg shadow-lg px-3 py-2 text-xs leading-snug"
      style={{ left: pos?.left ?? alvo.left, top: pos?.top ?? alvo.bottom + ESPACO, visibility: pos ? 'visible' : 'hidden' }}
    >
      {titulo && <p className="text-sm font-bold text-navy mb-1">{titulo}</p>}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5">
        {linhas.map(l => (
          <React.Fragment key={l.rotulo}>
            <dt className="font-semibold text-ink-3">{l.rotulo}</dt>
            <dd className="text-ink break-words">{l.valor || '—'}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>,
    document.body,
  );
};
