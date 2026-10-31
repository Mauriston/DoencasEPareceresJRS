// Ficheiro: hooks/useBackToTop.ts
// "Voltar ao topo": observa o container de rolagem do shell (não a janela).
import { useCallback, useEffect, useState } from 'react';
import { getMainScroller } from '@/utils/dom';

export const useBackToTop = (limite = 250) => {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    const el = getMainScroller();
    if (!el) return;
    const aoRolar = () => setVisivel(el.scrollTop > limite);
    el.addEventListener('scroll', aoRolar, { passive: true });
    aoRolar();
    return () => el.removeEventListener('scroll', aoRolar);
  }, [limite]);
  const irAoTopo = useCallback(() => getMainScroller()?.scrollTo({ top: 0, behavior: 'smooth' }), []);
  return { visivel, irAoTopo };
};
