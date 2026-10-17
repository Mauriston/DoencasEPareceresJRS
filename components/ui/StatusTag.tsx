// Ficheiro: components/ui/StatusTag.tsx
// Tag de estado do DS: pílula de 12px com o estado SEMPRE escrito por extenso
// (nunca uma sigla de uma letra) e a cor vinda de uma paleta fixa de estados —
// verde = favorável/concluído, vinho = desfavorável/vigente, ouro-ink =
// atenção, neutro = sem resultado. O ponto colorido reforça a cor para quem
// não a distingue.
import React from 'react';

export type StatusTone = 'success' | 'danger' | 'attention' | 'neutral' | 'navy' | 'navyOutline' | 'muted';

const TONES: Record<StatusTone, { box: string; dot: string }> = {
  success: { box: 'bg-green/10 text-green-700', dot: 'bg-green' },
  danger: { box: 'bg-wine/10 text-wine', dot: 'bg-wine' },
  attention: { box: 'bg-gold/20 text-gold-ink', dot: 'bg-gold' },
  neutral: { box: 'bg-thead text-ink-3 border border-line', dot: 'bg-ink-4' },
  navy: { box: 'bg-navy text-white', dot: 'bg-white' },
  navyOutline: { box: 'bg-white text-navy border border-navy', dot: 'bg-transparent border border-navy' },
  muted: { box: 'bg-thead text-ink-3', dot: 'bg-ink-5' },
};

interface StatusTagProps {
  tone: StatusTone;
  children: React.ReactNode;
  /** Mostra o ponto colorido antes do texto (padrão). */
  dot?: boolean;
  title?: string;
  className?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ tone, children, dot = true, title, className = '' }) => {
  const t = TONES[tone];
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[20px] text-xs font-bold leading-none whitespace-nowrap tracking-[0.03em] ${t.box} ${className}`}
    >
      {dot && <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />}
      {children}
    </span>
  );
};
