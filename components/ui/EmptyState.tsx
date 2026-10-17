// Ficheiro: components/ui/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox', title, description, action }) => (
  <div className="p-10 text-center flex flex-col items-center gap-2">
    <span className="material-symbols-outlined text-[40px] text-ink-4" aria-hidden="true">{icon}</span>
    <p className="text-sm font-bold text-navy">{title}</p>
    {description && <p className="text-xs text-ink-3 max-w-sm">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
