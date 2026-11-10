// Ficheiro: components/inspecoes/FiltroPopover.tsx
// Botão de filtro da barra das Inspeções de Saúde (altura de controle do DS, ícone + rótulo que resume a
// seleção + seta) que abre um popover ancorado logo abaixo. O popover é um diálogo não modal: fecha com
// Esc (devolvendo o foco ao botão) ou com clique fora; ao abrir, foca a opção marcada (ou o primeiro controle).
import React, { useEffect, useId, useRef, useState } from 'react';

interface FiltroPopoverProps {
  /** Nome do filtro (aria-label do popover e prefixo acessível do botão), ex.: "Situação". */
  nome: string;
  icone: string;
  /** Resumo da seleção mostrado no botão, ex.: "Em andamento", "2 situações". */
  resumo: string;
  className?: string;
  /** Conteúdo do popover; recebe `fechar` para fechar após uma escolha. */
  children: (fechar: () => void) => React.ReactNode;
}

export const FiltroPopover: React.FC<FiltroPopoverProps> = ({ nome, icone, resumo, className = '', children }) => {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const id = useId();

  const fechar = () => { setAberto(false); botao.current?.focus(); };

  useEffect(() => {
    if (!aberto) return;
    (painel.current?.querySelector<HTMLElement>('input:checked') ?? painel.current?.querySelector<HTMLElement>('input:not([disabled]), button:not([disabled])'))?.focus();
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); fechar(); } };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla, true);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', tecla, true); };
  }, [aberto]);

  return (
    <div ref={raiz} className={`relative ${className}`}>
      <button
        ref={botao} type="button" onClick={() => setAberto(a => !a)}
        aria-haspopup="dialog" aria-expanded={aberto} aria-controls={aberto ? id : undefined} aria-label={`${nome}: ${resumo}`} title={nome}
        className={`w-full min-h-[44px] inline-flex items-center gap-2 bg-white border rounded-lg pl-3 pr-2 py-2 text-sm text-ink whitespace-nowrap hover:border-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${aberto ? 'border-navy' : 'border-line'}`}
      >
        <span className="material-symbols-outlined text-[20px] text-ink-3" aria-hidden="true">{icone}</span>
        <span className="flex-1 min-w-0 truncate text-left font-semibold">{resumo}</span>
        <span className={`material-symbols-outlined text-[20px] text-ink-3 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true">expand_more</span>
      </button>
      {aberto && (
        <div ref={painel} id={id} role="dialog" aria-label={nome} className="absolute left-0 top-full mt-1 z-dropdown min-w-full w-max max-w-[calc(100vw-2rem)] bg-white border border-line rounded-lg shadow-xl py-1">
          {children(fechar)}
        </div>
      )}
    </div>
  );
};
