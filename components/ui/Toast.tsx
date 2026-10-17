// Ficheiro: components/ui/Toast.tsx
// Aviso transitório (role=status, anunciado por leitores de tela). Use para
// confirmações e avisos; erros de validação ficam inline no campo. Com `acao`
// (ex.: "Desfazer") o aviso oferece reverter a operação enquanto está na tela.
import React from 'react';

interface ToastProps {
  message: string | null;
  tone?: 'success' | 'error';
  acao?: { rotulo: string; onClick: () => void } | null;
}

export const Toast: React.FC<ToastProps> = ({ message, tone = 'success', acao }) => {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-[72px] right-4 z-toast max-w-[90vw] bg-navy text-white pl-4 pr-2 py-1.5 min-h-[44px] rounded-xl shadow-lg flex items-center gap-2 text-sm border border-white/20 animate-fade-in"
    >
      <span className={`material-symbols-outlined text-[20px] shrink-0 ${tone === 'error' ? 'text-wine-200' : 'text-gold'}`} aria-hidden="true">
        {tone === 'error' ? 'error' : 'check_circle'}
      </span>
      <span className="font-semibold py-1.5">{message}</span>
      {acao && (
        <button type="button" onClick={acao.onClick} className="shrink-0 min-h-[44px] px-3 rounded-lg font-bold text-gold hover:bg-white/10 underline underline-offset-2">
          {acao.rotulo}
        </button>
      )}
    </div>
  );
};
