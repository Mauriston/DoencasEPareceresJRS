// Ficheiro: components/ui/ProgressBar.tsx
// Progresso horizontal com o número escrito ("5 de 12 finalizados"): substitui
// o anel de % em branco sobre card tingido.
import React from 'react';

interface ProgressBarProps {
  atual: number;
  total: number;
  /** Texto após os números (ex.: "finalizados"). */
  unidade?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ atual, total, unidade = '', className = '' }) => {
  const pct = total > 0 ? Math.round((atual / total) * 100) : 0;
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-ink-3 mb-1">{atual} de {total}{unidade ? ` ${unidade}` : ''}</p>
      <div className="h-2 rounded-full bg-thead overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={atual}>
        <div className="h-full rounded-full bg-navy transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
