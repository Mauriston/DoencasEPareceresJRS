// Ficheiro: components/scanner/EditorCantos.tsx
// Ajuste manual dos 4 cantos do documento (substitui o recorte retangular do react-image-crop): cada canto
// é arrastado livremente — com lupa ampliada sob o dedo — e a área é retificada em perspectiva depois.
// Teclado: Tab entre os cantos e setas para mover (Shift = passo maior).
import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { convexo, limitarPonto, type Cantos, type Ponto } from '../../utils/scanner/geometria';

interface Props {
  imagem: string;
  largura: number;
  altura: number;
  cantos: Cantos;
  onAlterar: (c: Cantos) => void;
}

const NOMES = ['superior esquerdo', 'superior direito', 'inferior direito', 'inferior esquerdo'];
/** Raio do toque e da lupa em pixels de tela. */
const RAIO_TOQUE = 22;
const RAIO_LUPA = 56;
const ZOOM = 2.5;

export const EditorCantos: React.FC<Props> = ({ imagem, largura, altura, cantos, onAlterar }) => {
  const svg = useRef<SVGSVGElement>(null);
  const [ativo, setAtivo] = useState<number | null>(null);
  const idClip = useId().replace(/:/g, '');

  /** Pixels de imagem por pixel de tela (o SVG escala a imagem para caber) — mantém alças e lupa no tamanho do dedo. */
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = svg.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min(r.width / largura, r.height / altura);
      if (s > 0) setK(1 / s);
    };
    medir();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [largura, altura]);

  const paraImagem = (ev: React.PointerEvent): Ponto | null => {
    const el = svg.current;
    const m = el?.getScreenCTM();
    if (!el || !m) return null;
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const mover = (i: number, p: Ponto) => {
    const novos = cantos.map((c, k) => (k === i ? limitarPonto(p, largura, altura) : c)) as Cantos;
    onAlterar(novos);
  };

  const aoTeclar = (i: number) => (ev: React.KeyboardEvent) => {
    const passo = (ev.shiftKey ? 0.05 : 0.01) * Math.max(largura, altura);
    const d: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    const v = d[ev.key];
    if (!v) return;
    ev.preventDefault();
    mover(i, { x: cantos[i].x + v[0], y: cantos[i].y + v[1] });
  };

  const valido = convexo(cantos);
  const pontos = cantos.map(p => `${p.x},${p.y}`).join(' ');
  const lupa = ativo !== null ? cantos[ativo] : null;
  // Lupa acima do dedo (ou abaixo, se não couber).
  const rL = RAIO_LUPA * k;
  const lupaCentro = lupa ? { x: Math.min(largura - rL, Math.max(rL, lupa.x)), y: lupa.y - rL * 2.2 < rL ? lupa.y + rL * 2.2 : lupa.y - rL * 2.2 } : null;

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      <svg
        ref={svg}
        viewBox={`0 0 ${largura} ${altura}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full flex-1 min-h-0 touch-none select-none"
        onPointerMove={ev => { if (ativo !== null) { const p = paraImagem(ev); if (p) mover(ativo, p); } }}
        onPointerUp={() => setAtivo(null)}
        onPointerCancel={() => setAtivo(null)}
        role="group"
        aria-label="Ajuste dos cantos do documento"
      >
        <image href={imagem} x={0} y={0} width={largura} height={altura} />
        <path
          d={`M0,0H${largura}V${altura}H0Z M${pontos.split(' ').join(' L')} Z`}
          fillRule="evenodd" className="fill-black/50" aria-hidden="true"
        />
        <polygon points={pontos} fill="none" strokeWidth={3 * k} className={valido ? 'stroke-gold' : 'stroke-wine'} aria-hidden="true" />
        {cantos.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y} r={RAIO_TOQUE * k}
              className={`fill-gold/30 ${valido ? 'stroke-gold' : 'stroke-wine'} cursor-grab focus:outline-none focus-visible:fill-gold/60`}
              strokeWidth={3 * k}
              tabIndex={0}
              role="button"
              aria-label={`Canto ${NOMES[i]} — arraste ou use as setas`}
              onPointerDown={ev => { ev.preventDefault(); (ev.target as Element).setPointerCapture?.(ev.pointerId); setAtivo(i); }}
              onKeyDown={aoTeclar(i)}
            />
          </g>
        ))}
        {lupa && lupaCentro && (
          <g aria-hidden="true" pointerEvents="none">
            <defs>
              <clipPath id={`lupa-${idClip}`}><circle cx={lupaCentro.x} cy={lupaCentro.y} r={rL} /></clipPath>
            </defs>
            <g clipPath={`url(#lupa-${idClip})`}>
              <rect x={lupaCentro.x - rL} y={lupaCentro.y - rL} width={rL * 2} height={rL * 2} className="fill-white" />
              <g transform={`translate(${lupaCentro.x - lupa.x * ZOOM} ${lupaCentro.y - lupa.y * ZOOM}) scale(${ZOOM})`}>
                <image href={imagem} x={0} y={0} width={largura} height={altura} />
                <polygon points={pontos} fill="none" strokeWidth={(2 * k) / ZOOM} className="stroke-gold" />
              </g>
            </g>
            <circle cx={lupaCentro.x} cy={lupaCentro.y} r={rL} fill="none" strokeWidth={3 * k} className="stroke-white" />
            <path d={`M${lupaCentro.x - 8 * k},${lupaCentro.y}H${lupaCentro.x + 8 * k}M${lupaCentro.x},${lupaCentro.y - 8 * k}V${lupaCentro.y + 8 * k}`} strokeWidth={2 * k} className="stroke-wine" />
          </g>
        )}
      </svg>
      {!valido && <p role="alert" className="text-center text-xs font-semibold text-white bg-wine rounded-lg px-3 py-1 self-center">Os cantos se cruzaram — ajuste para formar um quadrilátero.</p>}
    </div>
  );
};
