// Ficheiro: components/administracao/NoCorpo.tsx
// Renderiza no <body> (portal). As subpáginas da Administração ficam dentro do GradeIndice, cujo `@container`
// passaria a ser o bloco de contenção dos `position: fixed` (Dialog, Drawer, Toast, FAB) — ver components/ui/Grade.tsx.
import React from 'react';
import { createPortal } from 'react-dom';

export const NoCorpo: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  typeof document === 'undefined' ? <>{children}</> : createPortal(children, document.body);
