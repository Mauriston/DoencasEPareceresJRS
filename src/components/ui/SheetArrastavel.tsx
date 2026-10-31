// Ficheiro: components/ui/SheetArrastavel.tsx
// Painel de bottom sheet (mobile) que também fecha deslizando para baixo: o painel acompanha o
// dedo e, ao soltar, fecha se foi arrastado o bastante (ou rápido), senão volta ao lugar. O
// arrasto só começa se o conteúdo rolável interno estiver no topo — rolar a lista não fecha o
// sheet. Os botões "X" continuam funcionando. Use em todo bottom sheet da visão mobile.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
  /** false = sem gesto (ex.: desktop ou sheet travado). */
  ativo?: boolean;
}

const LIMITE_PX = 100;      // distância mínima para fechar
const LIMITE_VELOCIDADE = 0.6; // px/ms

/** Há rolagem interna acima do ponto tocado? (então o gesto é rolar, não fechar) */
const rolavelNaoNoTopo = (alvo: EventTarget | null, raiz: HTMLElement): boolean => {
  let el = alvo as HTMLElement | null;
  while (el && el !== raiz) {
    const estilo = window.getComputedStyle(el);
    if ((estilo.overflowY === 'auto' || estilo.overflowY === 'scroll') && el.scrollHeight > el.clientHeight && el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
};

export const SheetArrastavel = forwardRef<HTMLDivElement, Props>(({ onClose, ativo = true, style, children, ...rest }, ref) => {
  const painel = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => painel.current as HTMLDivElement);
  const fechar = useRef(onClose);
  fechar.current = onClose;

  useEffect(() => {
    const el = painel.current;
    if (!el || !ativo) return;
    let y0 = 0, t0 = 0, dy = 0, arrastando = false, bloqueado = false;

    const inicio = (e: TouchEvent) => {
      if (e.touches.length !== 1) { bloqueado = true; return; }
      y0 = e.touches[0].clientY; t0 = e.timeStamp; dy = 0; arrastando = false;
      bloqueado = rolavelNaoNoTopo(e.target, el);
    };
    const move = (e: TouchEvent) => {
      if (bloqueado) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0) { if (arrastando) { el.style.transform = ''; arrastando = false; } return; }
      // Rolagem interna que começou no topo: só assume o gesto quando for para baixo.
      arrastando = true;
      if (e.cancelable) e.preventDefault();
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
    };
    const fim = (e: TouchEvent) => {
      if (!arrastando) return;
      arrastando = false;
      const velocidade = dy / Math.max(1, e.timeStamp - t0);
      el.style.transition = 'transform .2s ease-out';
      if (dy > LIMITE_PX || velocidade > LIMITE_VELOCIDADE) {
        el.style.transform = 'translateY(100%)';
        window.setTimeout(() => fechar.current(), 180);
      } else {
        el.style.transform = '';
      }
    };
    el.addEventListener('touchstart', inicio, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', fim);
    el.addEventListener('touchcancel', fim);
    return () => {
      el.removeEventListener('touchstart', inicio);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', fim);
      el.removeEventListener('touchcancel', fim);
    };
  }, [ativo]);

  return <div ref={painel} style={{ touchAction: ativo ? 'pan-y' : undefined, ...style }} {...rest}>{children}</div>;
});
SheetArrastavel.displayName = 'SheetArrastavel';
