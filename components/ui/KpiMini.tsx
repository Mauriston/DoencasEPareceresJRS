// Ficheiro: components/ui/KpiMini.tsx
// KPI do DS: cartão com hairline e gradiente branco→ouro (5%), rótulo de 12px
// em ink-3 e número em navy. Sem trilho colorido (o trilho é exclusivo do
// IndCard do deck) — a cor semântica, quando existe, vai só no número.
import React from 'react';

interface KpiMiniProps {
  label: string;
  value: string | number;
  /** Cor do número (classe de texto); padrão navy. */
  valueClass?: string;
  onClick?: () => void;
  hint?: string;
}

export const KpiMini: React.FC<KpiMiniProps> = ({ label, value, valueClass = 'text-navy', onClick, hint }) => {
  const corpo = (
    <>
      <p className="text-xs font-semibold text-ink-3">{label}</p>
      <p className={`text-2xl font-extrabold font-heading mt-1 leading-none ${valueClass}`}>{value}</p>
      {hint && <p className="text-xs text-ink-3 mt-1">{hint}</p>}
    </>
  );
  const base = 'text-left rounded-xl border border-line p-4 bg-gradient-to-b from-white to-gold/5';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${base} hover:border-navy transition-colors cursor-pointer`}>{corpo}</button>
  ) : (
    <div className={base}>{corpo}</div>
  );
};
