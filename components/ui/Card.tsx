// Ficheiro: components/ui/Card.tsx
// Card do DS: fundo branco, hairline e raio 14 (sem sombra).
import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove o padding interno (listas/tabelas que vão de borda a borda). */
  flush?: boolean;
}

export const Card: React.FC<CardProps> = ({ flush = false, className = '', children, ...rest }) => (
  <div className={`bg-white border border-line rounded-xl ${flush ? 'overflow-clip' : 'p-5'} ${className}`} {...rest}>
    {children}
  </div>
);
