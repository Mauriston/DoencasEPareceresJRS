// Ficheiro: components/ui/CampoDataBr.tsx
// Campo de data que SEMPRE mostra dd/mm/aaaa (o <input type="date"> nativo segue o idioma do aparelho — no iPhone
// vira "1 de nov. de 2026" e estoura a largura). O texto visível é um espelho; o input nativo fica por cima,
// transparente, e continua abrindo o seletor do sistema (no desktop, também pelo showPicker ao clicar).
import React from 'react';
import { controlClass } from './Field';

interface Props {
  /** AAAA-MM-DD ('' = vazio). */
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  max?: string;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

const dataBr = (iso: string) => {
  const [a, m, d] = (iso || '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
};

export const CampoDataBr: React.FC<Props> = ({ value, onChange, min, max, id, className = '', ...rest }) => (
  <div className={`relative min-w-0 ${className}`}>
    <span aria-hidden="true" className={`${controlClass} flex items-center justify-between gap-2 tabular-nums pointer-events-none ${value ? 'text-ink' : 'text-ink-4'}`}>
      <span className="truncate">{dataBr(value) || 'dd/mm/aaaa'}</span>
      <span className="material-symbols-outlined text-[20px] text-ink-3 shrink-0">calendar_today</span>
    </span>
    <input
      id={id} type="date" value={value} min={min} max={max} aria-label={rest['aria-label']}
      onChange={e => onChange(e.target.value)}
      onClick={e => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* sem showPicker */ } }}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
    />
  </div>
);
