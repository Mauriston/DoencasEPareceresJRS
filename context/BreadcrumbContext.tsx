// Ficheiro: context/BreadcrumbContext.tsx
// Migalhas extras de uma página (ex.: o nome da doença ou do concurso aberto),
// anexadas pela topbar ao caminho Categoria › Página que vem da navegação.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface Crumb {
  label: string;
  /** Sem `to`, a migalha é só texto (nível atual ou categoria). */
  to?: string;
}

interface BreadcrumbContextType {
  extras: Crumb[];
  setExtras: (crumbs: Crumb[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({ extras: [], setExtras: () => {} });

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [extras, setExtras] = useState<Crumb[]>([]);
  const value = useMemo(() => ({ extras, setExtras }), [extras]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
};

export const useBreadcrumbExtras = () => useContext(BreadcrumbContext).extras;

/** A página declara suas migalhas extras; são removidas ao sair dela. */
export const useBreadcrumbs = (crumbs: Crumb[] | null) => {
  const { setExtras } = useContext(BreadcrumbContext);
  const chave = JSON.stringify(crumbs);
  useEffect(() => {
    if (!crumbs) return;
    setExtras(crumbs);
    return () => setExtras([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, setExtras]);
};
