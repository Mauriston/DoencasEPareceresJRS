// Ficheiro: components/ui/Toast.tsx
// Aviso transitório (role=status, anunciado por leitores de tela). Use para
// confirmações e avisos; erros de validação ficam inline no campo.
import React from 'react';

interface ToastProps {
  message: string | null;
  tone?: 'success' | 'error';
}

export const Toast: React.FC<ToastProps> = ({ message, tone = 'success' }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[72px] right-4 z-toast max-w-[90vw] bg-navy text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm border border-white/20 animate-fade-in"
    >
      <span className={`material-symbols-outlined text-[20px] shrink-0 ${tone === 'error' ? 'text-wine-200' : 'text-gold'}`} aria-hidden="true">
        {tone === 'error' ? 'error' : 'check_circle'}
      </span>
      <span className="font-semibold">{message}</span>
    </div>
  );
};
