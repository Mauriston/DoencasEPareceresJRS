// Ficheiro: hooks/useIsDesktop.ts
import { useEffect, useState } from 'react';

/** Observa o breakpoint md (768px) do Tailwind em JS, para comportamentos
 * (motion, atalhos de teclado, etc.) que só devem valer no desktop. */
export const useIsDesktop = (): boolean => {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const handler = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isDesktop;
};
