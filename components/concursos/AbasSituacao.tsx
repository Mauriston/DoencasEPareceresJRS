// Ficheiro: components/concursos/AbasSituacao.tsx
// Vista da lista de concursos (cards × tabela) só com ícones (auditoria v3, G2/C2). As abas de situação
// que moravam aqui passaram a usar o componente único `AbasSublinhadas` (periciaMenor/partes.tsx),
// o mesmo de Inspeções, Perícia Menor, Inspecionados e Pareceres.
import React, { useRef } from 'react';

/**
 * Vista da lista só com ícones (G2): mesmo desenho do Segmented do DS, com nome acessível e
 * tooltip em cada opção (o Segmented do DS exige rótulo visível).
 */
export function VistaIcones<T extends string>({ opcoes, value, onChange, ariaLabel, className = '' }: {
  opcoes: { value: T; icone: string; rotulo: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const aoTecla = (e: React.KeyboardEvent) => {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!passo) return;
    e.preventDefault();
    const i = opcoes.findIndex(o => o.value === value);
    const prox = opcoes[(i + passo + opcoes.length) % opcoes.length];
    onChange(prox.value);
    requestAnimationFrame(() => raiz.current?.querySelectorAll<HTMLElement>('[role="radio"]')[opcoes.indexOf(prox)]?.focus());
  };
  return (
    <div ref={raiz} role="radiogroup" aria-label={ariaLabel} onKeyDown={aoTecla} className={`inline-flex gap-0.5 p-0.5 rounded-lg bg-thead border border-line ${className}`}>
      {opcoes.map(o => {
        const ativo = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={o.rotulo}
            title={o.rotulo}
            tabIndex={ativo ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`w-8 h-7 inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold ${ativo ? 'bg-navy text-white' : 'text-ink-3 hover:bg-white hover:text-navy'}`}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{o.icone}</span>
          </button>
        );
      })}
    </div>
  );
}
